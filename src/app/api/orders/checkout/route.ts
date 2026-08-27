import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { assertSameOrigin, authErrorResponse } from '@/lib/auth/apiAuth';
import { rateLimit, clientIp } from '@/lib/auth/rateLimit';
import { computeBillTotals } from '@/lib/billing';
import { orderStamps } from '@/lib/orderTime';
import { getRazorpayClient, verifyRazorpaySignature } from '@/lib/razorpayServer';
import { log } from '@/lib/logger';
import type { PaymentMode, PaymentStatus, VegStatus } from '@/types';

interface CheckoutLine {
  menuItemId?: string;
  id?: string;
  quantity?: number;
  selectedPortion?: 'single' | 'full' | 'large';
}

interface MenuRow {
  id: string;
  name: string;
  price: number;
  category: string | null;
  veg_status: VegStatus | null;
  is_available: boolean | null;
  portion_prices: Record<string, number> | null;
  max_quantity: number | null;
}

const MAX_LINES = 50;
const MAX_ORDER_TOTAL = 100_000;

function text(value: unknown, max = 200): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function safeQuantity(value: unknown, maxQuantity: number | null): number {
  const qty = Math.max(1, Math.floor(Number(value) || 1));
  return maxQuantity && maxQuantity > 0 ? Math.min(qty, maxQuantity) : qty;
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
    const lines = Array.isArray(body?.items) ? (body.items as CheckoutLine[]).slice(0, MAX_LINES) : [];

    if (!orderId || !customerName || customerPhone.replace(/\D/g, '').length < 10) {
      return NextResponse.json({ error: 'Customer details are incomplete.' }, { status: 400 });
    }
    if (lines.length === 0) {
      return NextResponse.json({ error: 'Cannot create an empty order.' }, { status: 400 });
    }
    if (paymentMode !== 'cash' && paymentMode !== 'razorpay') {
      return NextResponse.json({ error: 'Unsupported payment mode.' }, { status: 400 });
    }

    const ids = Array.from(new Set(lines.map((line) => text(line.menuItemId || line.id, 80)).filter(Boolean)));
    if (ids.length === 0) {
      return NextResponse.json({ error: 'No valid menu items were submitted.' }, { status: 400 });
    }

    const { data: menuRows, error: menuError } = await admin
      .from('menu_items')
      .select('id,name,price,category,veg_status,is_available,portion_prices,max_quantity')
      .in('id', ids);
    if (menuError) throw menuError;

    const menuById = new Map((menuRows as MenuRow[] | null || []).map((row) => [row.id, row]));
    // Consolidate duplicate product/portion lines before enforcing the product
    // cap. Otherwise fifty copies of the same line each receive max_quantity.
    const consolidated = new Map<string, CheckoutLine>();
    for (const line of lines) {
      const id = text(line.menuItemId || line.id, 80);
      const portion = ['single', 'full', 'large'].includes(String(line.selectedPortion))
        ? line.selectedPortion
        : undefined;
      const key = `${id}:${portion || 'default'}`;
      const current = consolidated.get(key);
      consolidated.set(key, {
        menuItemId: id,
        selectedPortion: portion,
        quantity: (Number(current?.quantity) || 0) + Math.max(1, Math.floor(Number(line.quantity) || 1)),
      });
    }

    const items = [...consolidated.values()].map((line) => {
      const id = text(line.menuItemId || line.id, 80);
      const menu = menuById.get(id);
      if (!menu || menu.is_available === false) return null;
      const selectedPortion = line.selectedPortion;
      const portionPrice =
        selectedPortion && menu.portion_prices ? Number(menu.portion_prices[selectedPortion]) : NaN;
      const price = Number.isFinite(portionPrice) && portionPrice > 0 ? portionPrice : Number(menu.price);
      const quantity = safeQuantity(line.quantity, menu.max_quantity);
      return {
        menuItemId: menu.id,
        name: menu.name,
        price,
        quantity,
        vegStatus: menu.veg_status || 'non-veg',
        selectedPortion,
        category: menu.category || undefined,
      };
    }).filter((item): item is NonNullable<typeof item> => !!item);

    if (items.length === 0) {
      return NextResponse.json({ error: 'No submitted items are currently available.' }, { status: 400 });
    }

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let couponCode = text(body?.couponCode, 40).toUpperCase();
    let discountValue = 0;
    let discountCap = 0;
    if (couponCode) {
      const { data: coupon } = await admin
        .from('coupons')
        .select('code,discount,max_discount,min_order,is_active')
        .eq('code', couponCode)
        .maybeSingle();
      if (coupon?.is_active && subtotal >= Number(coupon.min_order || 0)) {
        discountValue = Math.min(Math.max(Number(coupon.discount || 0), 0), 100);
        discountCap = Math.max(Number(coupon.max_discount || 0), 0);
      } else {
        couponCode = '';
      }
    }

    const rawDiscount = (subtotal * discountValue) / 100;
    const discountAmount = discountCap > 0 ? Math.min(rawDiscount, discountCap) : rawDiscount;
    const totals = computeBillTotals(subtotal, { type: 'flat', value: discountAmount });
    if (totals.grandTotal <= 0 || totals.grandTotal > MAX_ORDER_TOTAL) {
      return NextResponse.json({ error: 'Order total is invalid.' }, { status: 400 });
    }

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
    log.error('checkout_order_create_failed', { error });
    return NextResponse.json({ error: 'Could not create order.' }, { status: 500 });
  }
}
