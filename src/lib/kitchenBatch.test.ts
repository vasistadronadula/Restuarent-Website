import { describe, expect, it } from 'vitest';
import { buildKitchenBatches } from './kitchenBatch';
import type { Order } from '@/types';

const order = (id: string, minutes: number, type: Order['orderType'], tableNumber?: number): Order => ({
  id, orderId: id, customerName: 'Test', items: [{ name: 'Chicken Biryani', price: 200, quantity: 1 }],
  subtotal: 200, cgst: 5, sgst: 5, grandTotal: 210, status: 'pending', paymentMode: 'cash',
  paymentStatus: 'unpaid', orderType: type, tableNumber, createdAt: new Date(minutes * 60_000).toISOString(),
});

describe('buildKitchenBatches', () => {
  it('combines dine-in and takeaway quantities inside an anchored two-minute window', () => {
    const batches = buildKitchenBatches(
      [order('DINE-0001', 0, 'dine-in', 4), order('TAKE-0002', 1.5, 'takeaway')],
      (value) => new Date(value.createdAt!).getTime()
    );
    expect(batches).toHaveLength(1);
    expect(batches[0].totalQuantity).toBe(2);
    expect(batches[0].orders.map((entry) => entry.source)).toEqual(['Table 4', 'Takeaway']);
  });

  it('does not chain a third order beyond two minutes from the batch anchor', () => {
    const batches = buildKitchenBatches(
      [order('DINE-0001', 0, 'dine-in', 4), order('TAKE-0002', 1.5, 'takeaway'), order('TAKE-0003', 3, 'takeaway')],
      (value) => new Date(value.createdAt!).getTime()
    );
    expect(batches[0].orders).toHaveLength(2);
  });

  it('does not create a cross-source alert for two dine-in tickets', () => {
    expect(buildKitchenBatches(
      [order('DINE-0001', 0, 'dine-in', 4), order('DINE-0002', 1, 'dine-in', 5)],
      (value) => new Date(value.createdAt!).getTime()
    )).toEqual([]);
  });
});
