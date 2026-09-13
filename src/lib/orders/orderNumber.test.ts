import { describe, expect, it } from 'vitest';
import { getOrderDisplayNumber, getOrderToken } from './orderNumber';

describe('order display identity', () => {
  it('uses the full ID suffix even when a database sequence number is present', () => {
    const order = { id: 'PPR-ORD-20260913-abcdef0123456789abc0042', orderNumber: 186 };
    expect(getOrderDisplayNumber(order)).toBe('#0042');
    expect(getOrderToken(order)).toBe('0042');
  });
  it('keeps legacy hexadecimal labels consistent with printed receipts', () => {
    expect(getOrderDisplayNumber({ id: 'PPR-ORD-20260913-abcdef0123456789abcd' })).toBe('#ABCD');
    expect(getOrderToken({ id: 'PPR-ORD-20260913-abcdef0123456789abcd' })).toBe('ABCD');
  });
  it('handles missing identity without showing undefined or NaN', () => {
    expect(getOrderDisplayNumber(null)).toBe('#---');
    expect(getOrderToken({})).toBe('---');
    expect(getOrderToken({ orderNumber: NaN })).toBe('---');
    expect(getOrderDisplayNumber({ orderNumber: 42 })).toBe('#0042');
  });
});
