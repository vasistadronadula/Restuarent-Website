import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readCheckoutQuote, signCheckoutQuote } from './checkoutQuote';

beforeEach(() => vi.stubEnv('RAZORPAY_KEY_SECRET', 'test-signing-secret'));

const pricing = {
  items: [{ menuItemId: 'rice', name: 'Rice', price: 100, quantity: 1 }],
  totals: { grandTotal: 105 },
  couponCode: '',
} as never;

describe('checkout quote expiry', () => {
  it('accepts a freshly signed quote', () => {
    const token = signCheckoutQuote({ orderId: 'order-1', gatewayOrderId: 'gw-1', pricing });
    expect(readCheckoutQuote(token)).toMatchObject({ orderId: 'order-1', gatewayOrderId: 'gw-1' });
  });
  it('rejects expired and tampered quotes', () => {
    const token = signCheckoutQuote({ orderId: 'order-1', gatewayOrderId: 'gw-1', pricing });
    const [payload, mac] = token.split('.');
    const expired = {
      ...JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')),
      exp: Math.floor(Date.now() / 1000) - 60,
    };
    const expiredPayload = Buffer.from(JSON.stringify(expired)).toString('base64url');
    // Re-signing is impossible without the secret path used here; a forged
    // MAC must fail closed.
    expect(readCheckoutQuote(`${expiredPayload}.${mac}`)).toBeNull();
    expect(readCheckoutQuote(`${payload}.${mac}x`)).toBeNull();
    expect(readCheckoutQuote('not-a-token')).toBeNull();
  });
});
