import { classifyOrderCategory } from './orderCategory';
import { orderItemId } from './orderItems';
import type { MenuItem, Order } from '@/types';

/** `menuItemId → prepTime` — build once per menu payload, not once per order. */
export function buildPrepTimeMap(menuItems: MenuItem[]): Map<string, number> {
  const map = new Map<string, number>();
  menuItems.forEach((mi) => { if (mi.prepTime) map.set(mi.id, mi.prepTime); });
  return map;
}

/**
 * Minutes until an order is ready, given its current status/delay.
 *
 * Was previously duplicated as a local function on the /orders page only —
 * the checkout confirmation screen instead printed a flat "about 25
 * minutes" regardless of what was actually ordered, so a two-dish takeaway
 * and an unlimited party combo got the same estimate. `undefined` once the
 * order is delivered/cancelled — there's nothing left to estimate.
 */
export function estimateOrderMinutes(
  order: Pick<Order, 'status' | 'items' | 'delayMinutes'>,
  prepTimeMap: Map<string, number>
): number | undefined {
  if (order.status === 'delivered' || order.status === 'cancelled') return undefined;

  const categoryType = classifyOrderCategory(order.items);
  const defaultPrep = categoryType === 'beverage' ? 5 : categoryType === 'dessert' ? 8 : 15;
  const prepTimes = order.items.map((item) => prepTimeMap.get(orderItemId(item)) ?? defaultPrep);
  // A reduce, not Math.max(...prepTimes), so a very large order can't blow
  // the call stack via spread.
  const basePrep = prepTimes.reduce((max, t) => Math.max(max, t), defaultPrep);
  const totalPrep = basePrep + (order.delayMinutes || 0);

  if (order.status === 'preparing') return Math.max(3, totalPrep - 4);
  if (order.status === 'ready') return 0;
  return totalPrep;
}
