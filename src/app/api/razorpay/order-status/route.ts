import { NextResponse } from 'next/server';
import { getRazorpayClient } from '@/lib/razorpayServer';
import { assertSameOrigin, authErrorResponse } from '@/lib/auth/apiAuth';
import { rateLimit, clientIp } from '@/lib/auth/rateLimit';
import { log } from '@/lib/logger';
import { readCheckoutQuote } from '@/lib/billing/checkoutQuote';

// For UPI (QR/intent) payments, Razorpay's checkout modal can lose track of
// a successful payment — the tab loses focus while the customer is in their
// UPI app, or the customer closes the modal as soon as their app shows
// "paid" without waiting for the modal's own poll to catch up. `ondismiss`
// fires either way, so before treating that as a genuine cancellation the
// client calls this route to ask Razorpay directly whether a payment against
// the order actually went through.
//
// Guests prove possession of the server-signed checkout quote; origin checks
// and rate limits are additional protections, not proof of payment ownership.
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch (err) {
    const { body, status } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const limit = rateLimit(`razorpay:status:ip:${clientIp(request)}`, 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const quote = readCheckoutQuote(body?.checkoutToken);
    if (!quote) {
      return NextResponse.json({ error: 'A valid payment checkout token is required.' }, { status: 400 });
    }

    const instance = getRazorpayClient();
    if (!instance) {
      return NextResponse.json(
        { error: 'Online payment is not configured on the server.' },
        { status: 503 }
      );
    }

    const { items } = await instance.orders.fetchPayments(quote.gatewayOrderId);

    const successfulPayment = items.find((p) => p.status === 'captured' && p.currency === 'INR'
      && Number(p.amount) === Math.round(quote.pricing.totals.grandTotal * 100));

    if (successfulPayment) {
      return NextResponse.json({
        paid: true,
        razorpay_order_id: quote.gatewayOrderId,
        razorpay_payment_id: successfulPayment.id,
        status: successfulPayment.status,
      });
    }

    return NextResponse.json({ paid: false, pending: items.some((p) => p.status === 'authorized' || p.status === 'created') });
  } catch (error) {
    log.error('razorpay_order_status_failed', { error });
    return NextResponse.json({ error: 'Failed to fetch order status' }, { status: 500 });
  }
}
