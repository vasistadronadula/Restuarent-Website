import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { assertSameOrigin, authErrorResponse } from '@/lib/auth/apiAuth';
import { rateLimit, clientIp } from '@/lib/auth/rateLimit';
import { CheckoutValidationError, priceCheckout } from '@/lib/checkoutPricing';
import { orderStamps } from '@/lib/orderTime';
import { getRazorpayClient, verifyRazorpaySignature } from '@/lib/razorpayServer';
import { log } from '@/lib/logger';
import { getTenantContext } from '@/lib/tenantContext';
import type { PaymentMode, PaymentStatus } from '@/types';

function text(value: unknown, max = 200): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function authenticatedUserId(request: Request): Promise<string | null> {
  const header = request.headers.get('authorization');
  const token = header?.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user?.id || null;
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
    const customerPhone = text(body?.customer?.phone, 30).replace(/[^\d+ -]/g, '');
    const paymentMode = text(body?.paymentMode, 20) as PaymentMode;
    const lines = body?.items;

    if (!orderId || !customerName || customerPhone.replace(/\D/g, '').length < 10) {
      return NextResponse.json({ error: 'Customer details are incomplete.' }, { status: 400 });
    }
    if (paymentMode !== 'cash' && paymentMode !== 'razorpay') {
      return NextResponse.json({ error: 'Unsupported payment mode.' }, { status: 400 });
    }

    const { items, totals, couponCode } = await priceCheckout(admin, lines, body?.couponCode);

    let paymentStatus: PaymentStatus = 'unpaid';
    let razorpayOrderId: string | null = null;
    let razorpayPaymentId: string | null = null;
    if (paymentMode === 'razorpay') {
      razorpayOrderId = text(body?.razorpay?.razorpay_order_id, 120);
      razorpayPaymentId = text(body?.razorpay?.razorpay_payment_id, 120);
      const razorpaySignature = text(body?.razorpay?.razorpay_signature, 200);
      if (!verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
        return NextResponse.json({ error: 'Payment could not be verified.' }, { status: 402 });
      }

      const razorpay = getRazorpayClient();
      if (!razorpay) {
        return NextResponse.json({ error: 'Online payment is not configured.' }, { status: 503 });
      }
      const [gatewayOrder, gatewayPayment] = await Promise.all([
        razorpay.orders.fetch(razorpayOrderId),
        razorpay.payments.fetch(razorpayPaymentId),
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

    const userId = await authenticatedUserId(request);
    const tenant = await getTenantContext(admin);

    const { orderTime } = orderStamps();
    const { error: insertError } = await admin.from('orders').insert([{
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
      tenant_id: tenant.tenant_id,
      restaurant_id: tenant.restaurant_id,
      branch_id: tenant.branch_id,
    }]);

    if (insertError) throw insertError;

    return NextResponse.json({
      id: orderId,
      orderId,
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
    if (error instanceof CheckoutValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    log.error('checkout_order_create_failed', { error });
    return NextResponse.json({ error: 'Could not create order.' }, { status: 500 });
  }
}
