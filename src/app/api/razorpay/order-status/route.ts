import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getErrorMessage } from '@/lib/errors';

// For UPI (QR/intent) payments, Razorpay's checkout modal can lose track of
// a successful payment — the tab loses focus while the customer is in their
// UPI app, or the customer closes the modal as soon as their app shows
// "paid" without waiting for the modal's own poll to catch up. `ondismiss`
// fires either way, so before treating that as a genuine cancellation the
// client calls this route to ask Razorpay directly whether a payment against
// the order actually went through.
export async function POST(request: Request) {
  try {
    const { razorpay_order_id } = await request.json();
    if (!razorpay_order_id) {
      return NextResponse.json({ error: 'razorpay_order_id required' }, { status: 400 });
    }

    const key_id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) {
      return NextResponse.json(
        { error: 'Online payment is not configured on the server.' },
        { status: 503 }
      );
    }

    const instance = new Razorpay({ key_id, key_secret });
    const { items } = await instance.orders.fetchPayments(razorpay_order_id);

    const successfulPayment = items.find(
      (p) => p.status === 'captured' || p.status === 'authorized'
    );

    if (successfulPayment) {
      return NextResponse.json({
        paid: true,
        razorpay_payment_id: successfulPayment.id,
        status: successfulPayment.status,
      });
    }

    return NextResponse.json({ paid: false });
  } catch (error) {
    console.error('Razorpay Order Status Error:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) || 'Failed to fetch order status' },
      { status: 500 }
    );
  }
}
