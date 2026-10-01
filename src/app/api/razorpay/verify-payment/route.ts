import { NextResponse } from 'next/server';
import { getRazorpayClient, verifyRazorpaySignature } from '@/lib/billing/razorpayServer';
import { assertSameOrigin, authErrorResponse } from '@/lib/auth/apiAuth';
import { rateLimit, clientIp } from '@/lib/auth/rateLimit';
import { log } from '@/lib/logger';

/**
 * POST /api/razorpay/verify-payment
 *
 * Confirms that an order/payment id pair really carries Razorpay's signature
 * before checkout writes the order as paid. Guest checkout rules out a
 * session requirement, so the same-origin check and rate limit stand in —
 * the latter also caps how fast anyone could grind signatures, though the
 * HMAC comparison below is the real barrier.
 *
 * Beyond the signature, the response binds the proof to the gateway's own
 * record: amount, currency, capture state, and the order receipt, so a valid
 * signature for one payment can never vouch for a different amount or order.
 */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch (err) {
    const { body, status } = authErrorResponse(err);
    return NextResponse.json({ success: false, ...body }, { status });
  }

  const limit = rateLimit(`razorpay:verify:ip:${clientIp(request)}`, 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();

    if (
      typeof razorpay_order_id !== 'string' ||
      typeof razorpay_payment_id !== 'string' ||
      typeof razorpay_signature !== 'string'
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Razorpay secret key not configured on server' },
        { status: 500 }
      );
    }

    const isAuthentic = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (isAuthentic) {
      // Bind the signature to gateway state: a signature alone proves who
      // paid, not how much or for which receipt.
      const instance = getRazorpayClient();
      if (!instance) {
        return NextResponse.json({ success: true, bound: false });
      }
      try {
        const [gatewayOrder, gatewayPayment] = await Promise.all([
          instance.orders.fetch(razorpay_order_id),
          instance.payments.fetch(razorpay_payment_id),
        ]);
        return NextResponse.json({
          success: true,
          bound: true,
          amount: Number(gatewayPayment.amount ?? gatewayOrder.amount),
          currency: gatewayPayment.currency ?? gatewayOrder.currency,
          status: gatewayPayment.status,
          receipt: gatewayOrder.receipt,
          order_id: gatewayPayment.order_id,
        });
      } catch (error) {
        log.warn('razorpay_verify_binding_failed', { razorpay_order_id, error });
        return NextResponse.json({ success: true, bound: false });
      }
    }

    log.warn('razorpay_signature_mismatch', { razorpay_order_id, razorpay_payment_id });
    return NextResponse.json(
      { success: false, error: 'Invalid payment signature' },
      { status: 400 }
    );
  } catch (error) {
    log.error('razorpay_verify_failed', { error });
    return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 500 });
  }
}
