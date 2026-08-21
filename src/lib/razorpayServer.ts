import 'server-only';
import crypto from 'crypto';
import Razorpay from 'razorpay';

/**
 * razorpayServer.ts — server-side Razorpay credentials, resolved in one place.
 *
 * The key id used to be read as `NEXT_PUBLIC_RAZORPAY_KEY_ID || RAZORPAY_KEY_ID`
 * in each route. The `NEXT_PUBLIC_` copy exists so the browser can open the
 * checkout modal; a server route reaching for it first means the two can
 * silently diverge — rotate the server key alone and every route keeps
 * signing with the stale public one. Server code reads the server variable,
 * and falls back to the public copy only so an existing deployment that only
 * ever set that one keeps working.
 */
export function getRazorpayCredentials(): { key_id: string; key_secret: string } | null {
  const key_id = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) return null;
  return { key_id, key_secret };
}

export function getRazorpayClient(): Razorpay | null {
  const credentials = getRazorpayCredentials();
  if (!credentials) return null;
  return new Razorpay(credentials);
}

/**
 * Verifies Razorpay's `order_id|payment_id` HMAC.
 *
 * Constant-time: `===` on a hex digest leaks, through timing, how many
 * leading characters a guess got right — the exact feedback a forgery
 * attempt needs. `timingSafeEqual` throws on unequal lengths, so that is
 * checked separately rather than allowed to become an exception path.
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_secret || !orderId || !paymentId || !signature) return false;

  const expected = Buffer.from(
    crypto.createHmac('sha256', key_secret).update(`${orderId}|${paymentId}`).digest('hex'),
    'utf8'
  );
  const provided = Buffer.from(signature, 'utf8');

  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
}
