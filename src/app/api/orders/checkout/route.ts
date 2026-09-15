import { after, NextResponse } from 'next/server';
import { isDeepStrictEqual } from 'node:util';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { ApiAuthError, assertSameOrigin, authErrorResponse } from '@/lib/auth/apiAuth';
import { rateLimit, clientIp } from '@/lib/auth/rateLimit';
import { CheckoutValidationError, parseCheckoutLines, priceCheckout } from '@/lib/checkoutPricing';
import { orderStamps } from '@/lib/orderTime';
import { getRazorpayClient, verifyRazorpaySignature } from '@/lib/razorpayServer';
import { log } from '@/lib/logger';
import { getTenantContext, tenantInsertFields } from '@/lib/tenantContext';
import type { PaymentMode, PaymentStatus } from '@/types';
import { ORDER_ID_PATTERN } from '@/lib/idGenerator';
import { normalizePhone, validatePhone } from '@/lib/validation';
import { mapOrder } from '@/lib/queries/mappers';
import { readCheckoutQuote } from '@/lib/billing/checkoutQuote';
import { sendNewOrderPushNotification } from '@/lib/pushNotify';

function text(value: unknown, max = 200): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function authenticatedUserId(request: Request): Promise<string | null> {
  const header = request.headers.get('authorization');
  const token = header?.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  if (!header) return null;
  if (!token) throw new ApiAuthError('Invalid or expired session. Please sign in again.', 401);
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new ApiAuthError('Invalid or expired session. Please sign in again.', 401);
  return data.user.id;
}

function basketIdentity(lines: unknown) {
  return parseCheckoutLines(lines).map(line => ({
    menuItemId: line.menuItemId || line.id, quantity: line.quantity, selectedPortion: line.selectedPortion || 'full',
  }));
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch (err) {
    const { body, status } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const limit = rateLimit(`checkout:create:ip:${clientIp(request)}`, 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many checkout attempts. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Checkout is not configured on the server.' }, { status: 500 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const orderId = text(body?.orderId, 60);
    const customerName = text(body?.customer?.name, 120);
    const rawPhone = text(body?.customer?.phone, 30);
    const customerPhone = normalizePhone(rawPhone);
    const paymentMode = text(body?.paymentMode, 20) as PaymentMode;
    const lines = body?.items;

    if (!ORDER_ID_PATTERN.test(orderId) || !customerName || !rawPhone || validatePhone(rawPhone) !== null) {
      return NextResponse.json({ error: 'Customer details are incomplete.' }, { status: 400 });
    }
    if (paymentMode !== 'cash' && paymentMode !== 'razorpay') {
      return NextResponse.json({ error: 'Unsupported payment mode.' }, { status: 400 });
    }

    const quote = body?.checkoutToken ? readCheckoutQuote(body.checkoutToken) : null;
    if (body?.checkoutToken && (!quote || quote.orderId !== orderId || paymentMode !== 'razorpay')) {
      return NextResponse.json({ error: 'Invalid payment checkout token.' }, { status: 402 });
    }
    let paymentStatus: PaymentStatus = 'unpaid';
    let razorpayOrderId: string | null = null;
    let razorpayPaymentId: string | null = null;
    if (paymentMode === 'razorpay') {
      razorpayOrderId = text(body?.razorpay?.razorpay_order_id, 120);
      razorpayPaymentId = text(body?.razorpay?.razorpay_payment_id, 120);
      const razorpaySignature = text(body?.razorpay?.razorpay_signature, 200);
      if (quote ? quote.gatewayOrderId !== razorpayOrderId : !verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
        return NextResponse.json({ error: 'Payment could not be verified.' }, { status: 402 });
      }
    }

    const userId = await authenticatedUserId(request);
    const requestedItems = basketIdentity(quote?.pricing.items ?? lines);
    const requestedCoupon = quote?.pricing.couponCode ?? text(body?.couponCode, 80).toUpperCase();
    const matchesRetry = (existing: Record<string, unknown>) =>
      existing.customer_phone === customerPhone && existing.customer_name === customerName &&
      (existing.user_id || null) === userId && existing.payment_mode === paymentMode &&
      (existing.razorpay_payment_id || null) === razorpayPaymentId &&
      (existing.razorpay_order_id || null) === razorpayOrderId &&
      (existing.coupon_code || '') === requestedCoupon &&
      isDeepStrictEqual(basketIdentity(existing.items), requestedItems);

    // A committed sale is the source of truth on retry, even when staff have
    // since changed the menu price, disabled a coupon or sold out the dish.
    const { data: prior, error: lookupError } = await admin.from('orders').select('*').eq('id', orderId).maybeSingle();
    if (lookupError) throw lookupError;
    if (prior) {
      return matchesRetry(prior)
        ? NextResponse.json(mapOrder(prior))
        : NextResponse.json({ error: 'This order ID is already in use for another checkout.' }, { status: 409 });
    }

    const { items, totals, couponCode } = quote?.pricing ?? await priceCheckout(admin, lines, body?.couponCode);

    if (paymentMode === 'razorpay') {

      const razorpay = getRazorpayClient();
      if (!razorpay) {
        return NextResponse.json({ error: 'Online payment is not configured.' }, { status: 503 });
      }
      const [gatewayOrder, gatewayPayment] = await Promise.all([
        razorpay.orders.fetch(razorpayOrderId!),
        razorpay.payments.fetch(razorpayPaymentId!),
      ]);
      const expectedPaise = Math.round(totals.grandTotal * 100);
      if (
        Number(gatewayOrder.amount) !== expectedPaise ||
        gatewayOrder.currency !== 'INR' ||
        gatewayOrder.receipt !== orderId ||
        gatewayPayment.order_id !== razorpayOrderId ||
        Number(gatewayPayment.amount) !== expectedPaise ||
        gatewayPayment.currency !== 'INR' ||
        gatewayPayment.status !== 'captured'
      ) {
        return NextResponse.json({ error: 'Payment does not match this order.' }, { status: 402 });
      }
      paymentStatus = 'paid';
    }

    const tenant = await getTenantContext(admin);

    const { orderTime } = orderStamps();
    // Tenant columns are optional (added by a later migration). Only send
    // them when configured so single-restaurant databases without those
    // columns don't fail the sale with 42703 undefined_column.
    const row: Record<string, unknown> = {
      id: orderId,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: text(body?.customer?.email, 160) || customerPhone || 'GUEST',
      delivery_address: text(body?.customer?.address, 300) || 'Takeaway - Collect from Restaurant',
      order_type: 'takeaway',
      payment_mode: paymentMode,
      payment_status: paymentStatus,
      items,
      subtotal: totals.subtotal,
      cgst: totals.cgst,
      sgst: totals.sgst,
      delivery_charge: 0,
      discount: totals.discountAmount,
      grand_total: totals.grandTotal,
      status: 'pending',
      order_time: orderTime,
      coupon_code: couponCode || null,
      order_source: 'direct',
      user_id: userId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      ...tenantInsertFields(tenant),
    };
    let { error: insertError } = await admin.from('orders').insert([row]);

    // Older databases predate the optional tenant columns. Retry without
    // them rather than losing a paid sale.
    if (insertError?.code === '42703') {
      const rowWithoutTenant = { ...row };
      delete rowWithoutTenant.tenant_id;
      delete rowWithoutTenant.restaurant_id;
      delete rowWithoutTenant.branch_id;
      ({ error: insertError } = await admin.from('orders').insert([rowWithoutTenant]));
    }

    if (insertError?.code === '23505') {
      // A response can be lost after the insert commits. Reusing the full ID
      // must return the saved order, rather than cause a second sale/payment.
      const { data: existing, error } = await admin.from('orders').select('*').eq('id', orderId).maybeSingle();
      if (error) throw error;
      if (existing && matchesRetry(existing)) {
        return NextResponse.json(mapOrder(existing));
      }
      return NextResponse.json({ error: 'This order ID is already in use for another checkout.' }, { status: 409 });
    }
    if (insertError) throw insertError;

    // Guest browsers have no staff/session token for the push trigger. Schedule
    // the alert server-side only after the first insert commits, not on retries.
    after(() => sendNewOrderPushNotification(orderId));

    return NextResponse.json({
      id: orderId,
      orderId,
      customerName,
      customerPhone,
      orderType: 'takeaway',
      items,
      subtotal: totals.subtotal,
      cgst: totals.cgst,
      sgst: totals.sgst,
      discount: totals.discountAmount,
      deliveryCharge: 0,
      grandTotal: totals.grandTotal,
      paymentMode,
      paymentStatus,
      status: 'pending',
      couponCode: couponCode || undefined,
      razorpayOrderId: razorpayOrderId || undefined,
      razorpayPaymentId: razorpayPaymentId || undefined,
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      const { body, status } = authErrorResponse(error);
      return NextResponse.json(body, { status });
    }
    if (error instanceof CheckoutValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    log.error('checkout_order_create_failed', { error });
    return NextResponse.json({ error: 'Could not create order.' }, { status: 500 });
  }
}
