import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Razorpay's JS `handler` callback relies on postMessage/iframe communication
// back to this tab, which does not reliably fire for UPI/QR and some
// bank-redirect payment methods — the checkout modal shows "payment
// successful" on Razorpay's own domain and never hands control back,
// leaving the customer stuck there. Setting `callback_url` (this route) with
// `redirect: true` on the client makes Razorpay's server itself POST the
// result here once the payment finishes, so returning to the app no longer
// depends on JS running correctly in a backgrounded/killed tab.
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;

  let razorpay_order_id: string | null = null;
  let razorpay_payment_id: string | null = null;
  let razorpay_signature: string | null = null;

  try {
    const formData = await request.formData();
    razorpay_order_id = formData.get('razorpay_order_id')?.toString() || null;
    razorpay_payment_id = formData.get('razorpay_payment_id')?.toString() || null;
    razorpay_signature = formData.get('razorpay_signature')?.toString() || null;
  } catch {
    // Malformed body — fall through to the failure redirect below.
  }

  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (razorpay_order_id && razorpay_payment_id && razorpay_signature && key_secret) {
    const expectedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      const params = new URLSearchParams({
        payment: 'success',
        rp_order_id: razorpay_order_id,
        rp_payment_id: razorpay_payment_id,
      });
      return NextResponse.redirect(`${origin}/checkout?${params.toString()}`, 303);
    }
  }

  const failParams = new URLSearchParams({ payment: 'failed' });
  if (razorpay_order_id) failParams.set('rp_order_id', razorpay_order_id);
  return NextResponse.redirect(`${origin}/checkout?${failParams.toString()}`, 303);
}
