// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { reusePosCheckoutAttempt, clearPosCheckoutAttempt } from './posCheckoutAttempt';
import { generateOrderId } from '@/lib/idGenerator';
import type { Order } from '@/types';

const candidate = (): Order => {
  const id = generateOrderId();
  return { id, orderId: id, customerName: 'Counter Customer', items: [{ menuItemId: 'rice', name: 'Rice', price: 100, quantity: 1 }],
    subtotal: 100, cgst: 2.5, sgst: 2.5, grandTotal: 105, paymentMode: 'cash', paymentStatus: 'paid', status: 'pending', createdAt: new Date().toISOString() };
};
beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });
describe('POS checkout retry identity', () => {
  it('reuses the first sale ID and timestamp after a reload or lost response', () => {
    const first = reusePosCheckoutAttempt(candidate());
    expect(reusePosCheckoutAttempt({ ...candidate(), createdAt: '2026-10-01T12:00:00Z' })).toEqual(first);
  });
  it('starts a new sale when the basket changes or the previous order is confirmed', () => {
    const first = reusePosCheckoutAttempt(candidate());
    expect(reusePosCheckoutAttempt({ ...candidate(), grandTotal: 210 }).id).not.toBe(first.id);
    clearPosCheckoutAttempt();
    expect(reusePosCheckoutAttempt(candidate()).id).not.toBe(first.id);
  });
  it('treats payment metadata changes as the same sale, not a new order', () => {
    const first = reusePosCheckoutAttempt(candidate());
    expect(reusePosCheckoutAttempt({ ...candidate(), cashTendered: 500, paymentReference: 'UTR123456' })).toEqual(first);
  });
  it('shares the attempt across tabs via localStorage', () => {
    const first = reusePosCheckoutAttempt(candidate());
    expect(JSON.parse(localStorage.getItem('ppr:pos:checkout-attempt') || 'null')).toMatchObject({ id: first.id });
  });
});
