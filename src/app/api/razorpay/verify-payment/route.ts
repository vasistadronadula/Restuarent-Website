import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getErrorMessage } from '@/lib/errors';

export async function POST(request: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();

    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_secret) {
      return NextResponse.json(
        { success: false, error: 'Razorpay secret key not configured on server' },
        { status: 500 }
      );
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      return NextResponse.json({
        success: true,
        message: 'Payment signature verified successfully',
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid payment signature' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Razorpay Payment Verification Error:', error);
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) || 'Verification failed' },
      { status: 500 }
    );
  }
}
