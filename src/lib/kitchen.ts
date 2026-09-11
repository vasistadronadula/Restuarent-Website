import type { Order, PersistedOrderItem } from '@/types';
import { orderItemId } from './orderItems';

export type KitchenStage = 'pending' | 'preparing' | 'ready';
export type KitchenSort = 'fifo' | 'urgency' | 'table';
export const KITCHEN_STAGES = [
  { status: 'pending', label: 'New', action: 'Start cooking', next: 'preparing' },
  { status: 'preparing', label: 'Preparing', action: 'Mark ready', next: 'ready' },
  { status: 'ready', label: 'Ready', action: 'Handed over', next: 'delivered' },
] as const;

export function timestamp(value?: string): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function kitchenTarget(order: Order, prepTimes: Map<string, number>): number {
  return Math.max(12, ...(order.items || []).map(item => prepTimes.get(orderItemId(item)) ?? 15))
    + Math.max(0, order.delayMinutes || 0);
}

export function kitchenTiming(order: Order, now: number, target: number) {
  const received = timestamp(order.createdAt);
  const start = order.status === 'ready' ? timestamp(order.readyAt)
    : order.status === 'preparing' ? timestamp(order.preparingAt) : received;
  const age = received === null ? null : Math.max(0, (now - received) / 60000);
  const elapsed = start === null ? null : Math.max(0, Math.floor((now - start) / 60000));
  // Ready tickets have a pickup clock, not an expired preparation target.
  const late = order.status !== 'ready' && age !== null && age >= target;
  const urgent = order.status !== 'ready' && !late && age !== null && age >= target - 3;
  return { elapsed, late, urgent, age, label: order.status === 'ready' ? 'Waiting for pickup'
    : order.status === 'preparing' ? 'Cooking' : 'Waiting to start' };
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => [k, canonical(v)]));
  }
  return value;
}

/** Content identity survives reordering and separates duplicate lines. Changing
 * quantity, modifiers, or portions intentionally makes a line unprepared again.
 * The RPC validates the item and duplicate ordinal before applying this key. */
export function kitchenItemKey(items: PersistedOrderItem[], index: number): string {
  const item = canonical(items[index]);
  const signature = JSON.stringify(item);
  const occurrence = items.slice(0, index).filter(other => JSON.stringify(canonical(other)) === signature).length;
  return JSON.stringify([item, occurrence]);
}

export function sortKitchenOrders(orders: Order[], mode: KitchenSort, prepTimes: Map<string, number>): Order[] {
  const received = (order: Order) => timestamp(order.createdAt) ?? Number.MAX_SAFE_INTEGER;
  return [...orders].sort((a, b) => {
    let difference = 0;
    if (mode === 'table') difference = (a.tableNumber ?? Infinity) - (b.tableNumber ?? Infinity);
    if (mode === 'urgency') {
      const due = (o: Order) => o.status === 'ready' ? timestamp(o.readyAt) ?? received(o)
        : received(o) + kitchenTarget(o, prepTimes) * 60000;
      difference = due(a) - due(b);
    }
    return (Number.isNaN(difference) ? 0 : difference) || received(a) - received(b) || a.id.localeCompare(b.id);
  });
}
