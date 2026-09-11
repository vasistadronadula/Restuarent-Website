import type { Order } from '@/types';

export type TableOccupancy = {
  status: 'available' | 'ordered' | 'waiting_payment';
  activeOrder?: Order;
  activeOrderCount: number;
  runningBill: number;
  elapsedMinutes?: number;
};

/** Consolidates every open ticket on a table. Multiple POS rounds therefore
 * remain one visible table session instead of overwriting each other. */
export function buildTableOccupancy(
  tableNumbers: number[],
  orders: Order[],
  now: number
): Map<number, TableOccupancy> {
  const map = new Map<number, TableOccupancy>();
  tableNumbers.forEach((tableNumber) => map.set(tableNumber, {
    status: 'available', activeOrderCount: 0, runningBill: 0,
  }));

  for (const order of orders) {
    if (typeof order.tableNumber !== 'number' || ['delivered', 'cancelled'].includes(order.status)) continue;
    const current = map.get(order.tableNumber) || {
      status: 'available' as const, activeOrderCount: 0, runningBill: 0,
    };
    const createdMs = order.createdAt ? new Date(order.createdAt).getTime() : now;
    const validCreatedMs = Number.isNaN(createdMs) ? now : createdMs;
    const currentCreatedMs = current.activeOrder?.createdAt
      ? new Date(current.activeOrder.createdAt).getTime()
      : Number.NEGATIVE_INFINITY;
    const newestOrder = !current.activeOrder || validCreatedMs > currentCreatedMs
      ? order
      : current.activeOrder;
    const oldestElapsed = Math.max(
      current.elapsedMinutes || 0,
      Math.max(1, Math.floor((now - validCreatedMs) / 60_000))
    );

    map.set(order.tableNumber, {
      status: current.status === 'waiting_payment' || order.paymentStatus !== 'paid'
        ? 'waiting_payment'
        : 'ordered',
      activeOrder: newestOrder,
      activeOrderCount: current.activeOrderCount + 1,
      runningBill: current.runningBill + (order.grandTotal || order.subtotal || 0),
      elapsedMinutes: oldestElapsed,
    });
  }

  return map;
}
