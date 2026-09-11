import { describe, expect, it } from 'vitest';
import type { Order } from '@/types';
import { buildTableOccupancy } from './tableOccupancy';

function order(overrides: Partial<Order>): Order {
  return {
    id: 'ORDER-1', orderId: 'ORDER-1', customerId: 'GUEST', customerName: 'Guest',
    customerPhone: '', customerAddress: '', items: [], subtotal: 100, cgst: 0,
    sgst: 0, discount: 0, deliveryCharge: 0, grandTotal: 100, status: 'pending',
    paymentMode: 'cash', paymentStatus: 'paid', orderDate: '2026-08-27',
    orderTime: '12:00', orderSource: 'direct', orderType: 'dine-in', tableNumber: 4,
    createdAt: '2026-08-27T06:30:00.000Z', ...overrides,
  };
}

describe('buildTableOccupancy', () => {
  it('combines every open ticket and preserves the newest ticket reference', () => {
    const now = Date.parse('2026-08-27T07:00:00.000Z');
    const result = buildTableOccupancy([4], [
      order({ id: 'NEW', createdAt: '2026-08-27T06:50:00.000Z', grandTotal: 150 }),
      order({ id: 'OLD', createdAt: '2026-08-27T06:30:00.000Z', grandTotal: 100 }),
    ], now).get(4);

    expect(result).toMatchObject({
      status: 'ordered', activeOrderCount: 2, runningBill: 250,
      elapsedMinutes: 30, activeOrder: { id: 'NEW' },
    });
  });

  it('marks the table bill-due when any open ticket is unpaid', () => {
    const result = buildTableOccupancy([4], [
      order({ id: 'PAID' }),
      order({ id: 'UNPAID', paymentStatus: 'unpaid' }),
    ], Date.parse('2026-08-27T07:00:00.000Z')).get(4);

    expect(result?.status).toBe('waiting_payment');
  });

  it('ignores delivered and cancelled tickets', () => {
    const result = buildTableOccupancy([4], [
      order({ status: 'delivered' }),
      order({ status: 'cancelled' }),
    ], Date.now()).get(4);

    expect(result).toMatchObject({ status: 'available', activeOrderCount: 0, runningBill: 0 });
  });
});
