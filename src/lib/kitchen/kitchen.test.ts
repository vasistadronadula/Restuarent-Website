import { describe, expect, it } from 'vitest';
import { kitchenItemKey, kitchenTiming, kitchenTarget, sortKitchenOrders } from './kitchen';
import type { Order, PersistedOrderItem } from '@/types';

const item: PersistedOrderItem = { name: 'Biryani', menuItemId: 'rice', quantity: 2, price: 200, selectedPortion: 'full' };
const order = (overrides: Partial<Order> = {}): Order => ({ id: 'T-1', orderId: 'T-1', customerName: '', items: [item], subtotal: 400, cgst: 10, sgst: 10,
  grandTotal: 420, status: 'pending', paymentMode: 'cash', paymentStatus: 'unpaid', createdAt: '2026-08-28T10:00:00Z', ...overrides });
const now = Date.parse('2026-08-28T10:30:00Z');

describe('kitchen stage timing', () => {
  it('uses ready time for pickup waiting and never labels a ready ticket prep-overdue', () => {
    const timing = kitchenTiming(order({ status: 'ready', readyAt: '2026-08-28T10:26:00Z' }), now, 15);
    expect(timing).toMatchObject({ elapsed: 4, label: 'Waiting for pickup', late: false, urgent: false });
  });
  it('shows unknown stage time for historical tickets rather than inventing a start', () => {
    expect(kitchenTiming(order({ status: 'ready' }), now, 15).elapsed).toBeNull();
    expect(kitchenTiming(order({ status: 'preparing' }), now, 15).elapsed).toBeNull();
  });
  it('separates cooking duration from order age', () => {
    expect(kitchenTiming(order({ status: 'preparing', preparingAt: '2026-08-28T10:20:00Z' }), now, 15))
      .toMatchObject({ elapsed: 10, age: 30, late: true });
  });
  it('handles invalid and future timestamps safely', () => {
    expect(kitchenTiming(order({ createdAt: 'bad' }), now, 15)).toMatchObject({ elapsed: null, late: false });
    expect(kitchenTiming(order({ createdAt: '2026-08-29T10:00:00Z' }), now, 15).elapsed).toBe(0);
  });
  it('uses the slowest dish and adds only a nonnegative delay', () => {
    expect(kitchenTarget(order({ delayMinutes: 10 }), new Map([['rice', 25]]))).toBe(35);
  });
});

describe('kitchen item identity', () => {
  it('survives property ordering and moving a distinct line', () => {
    const other = { ...item, name: 'Roti' };
    const reordered = Object.fromEntries(Object.entries(item).reverse()) as unknown as PersistedOrderItem;
    expect(kitchenItemKey([item, other], 0)).toBe(kitchenItemKey([other, reordered], 1));
  });
  it('separates duplicate lines and resets identity after modifiers or quantity change', () => {
    expect(kitchenItemKey([item, item], 0)).not.toBe(kitchenItemKey([item, item], 1));
    for (const update of [{ quantity: 3 }, { notes: 'No nuts' }, { selectedPortion: 'single' as const }]) {
      expect(kitchenItemKey([item], 0)).not.toBe(kitchenItemKey([{ ...item, ...update }], 0));
    }
  });
});

describe('kitchen sorting', () => {
  it('sorts urgency by due time, which differs from FIFO', () => {
    const slow = order({ id: 'slow', items: [{ ...item, menuItemId: 'slow' }] });
    const fast = order({ id: 'fast', createdAt: '2026-08-28T10:05:00Z' });
    const prep = new Map([['slow', 40], ['rice', 12]]);
    expect(sortKitchenOrders([fast, slow], 'fifo', prep).map(o => o.id)).toEqual(['slow', 'fast']);
    expect(sortKitchenOrders([fast, slow], 'urgency', prep).map(o => o.id)).toEqual(['fast', 'slow']);
  });
  it('keeps a stable FIFO tie break for takeaway orders sorted by table', () => {
    const later = order({ id: 'later', createdAt: '2026-08-28T10:05:00Z' });
    expect(sortKitchenOrders([later, order()], 'table', new Map()).map(o => o.id)).toEqual(['T-1', 'later']);
  });
});
