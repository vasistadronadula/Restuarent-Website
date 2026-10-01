import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { priceCheckout } from './checkoutPricing';

export interface CheckoutQuote {
  orderId: string;
  gatewayOrderId: string;
  pricing: Awaited<ReturnType<typeof priceCheckout>>;
  /** Unix seconds after which an unpaid checkout must not be reopened. */
  exp: number;
}

/** Quotes live only long enough to complete one payment attempt. */
export const CHECKOUT_QUOTE_TTL_SECONDS = 30 * 60;
/** Allow delayed callbacks/retries to fulfill captured payments for seven days. */
export const CHECKOUT_RECOVERY_TTL_SECONDS = 7 * 24 * 60 * 60;

function signature(payload: string): string {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error('Online payment is not configured.');
  return createHmac('sha256', secret).update(`checkout-quote:v1:${payload}`).digest('base64url');
}

/** Preserve the basket approved before charging. A later menu/coupon change
 * must not prevent fulfillment of an already captured payment. The token is
 * also a bearer credential for recovering a payment whose modal callback was lost. */
export function signCheckoutQuote(quote: Omit<CheckoutQuote, 'exp'>): string {
  const withExpiry: CheckoutQuote = {
    ...quote,
    exp: Math.floor(Date.now() / 1000) + CHECKOUT_QUOTE_TTL_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(withExpiry)).toString('base64url');
  return `${payload}.${signature(payload)}`;
}

export function readCheckoutQuote(token: unknown, options: { forRecovery?: boolean } = {}): CheckoutQuote | null {
  if (typeof token !== 'string' || token.length > 100_000) return null;
  try {
    const [payload, mac, extra] = token.split('.');
    if (!payload || !mac || extra !== undefined) return null;
    const expected = Buffer.from(signature(payload));
    const provided = Buffer.from(mac);
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;
    const quote = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as CheckoutQuote;
    if (!quote.orderId || !quote.gatewayOrderId || !quote.pricing?.items?.length) return null;
    const grace = options.forRecovery ? CHECKOUT_RECOVERY_TTL_SECONDS : 0;
    if (!Number.isFinite(quote.exp) || (quote.exp + grace) * 1000 <= Date.now()) return null;
    return quote;
  } catch { return null; }
}
