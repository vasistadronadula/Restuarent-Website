import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getErrorMessage } from '@/lib/errors';

export async function POST(request: Request) {
  try {
    const { amount, currency = 'INR', receipt, notes } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const key_id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      // Deliberately NOT falling back to a manual razorpay.me link here — that
      // path let checkout mark an order "paid" with zero server-side proof
      // payment ever happened. If online payment isn't configured, the client
      // must fall back to pay-at-counter instead of pretending success.
      return NextResponse.json(
        { error: 'Online payment is not configured on the server.' },
        { status: 503 }
      );
    }

    const instance = new Razorpay({
      key_id,
      key_secret,
    });

    const options = {
      amount: Math.round(amount * 100),
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: notes || {},
    };

    const order = await instance.orders.create(options);
    return NextResponse.json(order);
  } catch (error) {
    console.error('Razorpay Create Order Error:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) || 'Failed to create Razorpay order' },
      { status: 500 }
    );
  }
}
