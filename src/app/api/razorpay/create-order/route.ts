import { NextResponse } from 'next/server';
import { getRazorpayClient } from '@/lib/razorpayServer';
import { assertSameOrigin, authErrorResponse } from '@/lib/auth/apiAuth';
import { rateLimit, clientIp } from '@/lib/auth/rateLimit';
import { log } from '@/lib/logger';

/** Sanity ceiling on a single takeaway bill, in rupees. */
const MAX_ORDER_AMOUNT = 100_000;

/**
 * POST /api/razorpay/create-order
 *
 * Checkout does not require an account — a guest can order — so this cannot
 * demand a session without breaking the flow it exists to serve. What it can
 * demand is that the request came from a page on this site, and that no
 * single client gets to create orders in a loop. Left open, this endpoint let
 * anyone mint unlimited orders against the merchant account: not a route to
 * anyone else's money, but a way to bury the Razorpay dashboard and burn the
 * account's API rate limit, which does take real payments down.
 */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch (err) {
    const { body, status } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const limit = rateLimit(`razorpay:create:ip:${clientIp(request)}`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many payment attempts. Please wait a moment and try again.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  try {
    const { amount, currency = 'INR', receipt, notes } = await request.json();

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }
    if (numericAmount > MAX_ORDER_AMOUNT) {
      return NextResponse.json({ error: 'Amount exceeds the permitted limit' }, { status: 400 });
    }
    if (currency !== 'INR') {
      return NextResponse.json({ error: 'Unsupported currency' }, { status: 400 });
    }

    const instance = getRazorpayClient();
    if (!instance) {
      // Deliberately NOT falling back to a manual razorpay.me link here — that
      // path let checkout mark an order "paid" with zero server-side proof
      // payment ever happened. If online payment isn't configured, the client
      // must fall back to pay-at-counter instead of pretending success.
      return NextResponse.json(
        { error: 'Online payment is not configured on the server.' },
        { status: 503 }
      );
    }

    const order = await instance.orders.create({
      amount: Math.round(numericAmount * 100),
      currency,
      receipt: typeof receipt === 'string' ? receipt.slice(0, 40) : `rcpt_${Date.now()}`,
      notes: notes && typeof notes === 'object' ? notes : {},
    });

    return NextResponse.json(order);
  } catch (error) {
    log.error('razorpay_create_order_failed', { error });
    // The upstream message can carry account detail — the client only needs
    // to know to fall back to pay-at-counter.
    return NextResponse.json({ error: 'Failed to create Razorpay order' }, { status: 500 });
  }
}
