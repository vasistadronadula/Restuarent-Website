import { NextResponse } from 'next/server';
import { verifyRazorpaySignature } from '@/lib/razorpayServer';
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
      return NextResponse.json({
        success: true,
        message: 'Payment signature verified successfully',
      });
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
