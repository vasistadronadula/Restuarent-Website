import type { Order } from '@/types';
import { orderItemPortion } from '@/lib/orderItems';
import { kitchenItemKey } from '@/lib/kitchen';

export const KITCHEN_BATCH_WINDOW_MS = 2 * 60 * 1000;

export interface KitchenBatchOrder {
  orderId: string;
  token: string;
  quantity: number;
  source: string;
  sourceKind: 'dine-in' | 'takeaway';
}

export interface KitchenBatch {
  key: string;
  dish: string;
  totalQuantity: number;
  orders: KitchenBatchOrder[];
}

function sourceFor(order: Order): Pick<KitchenBatchOrder, 'source' | 'sourceKind'> {
  if (order.orderType === 'dine-in') {
    return {
      sourceKind: 'dine-in',
      source: order.tableNumber ? `Table ${order.tableNumber}` : 'Dine-in',
    };
  }
  return { sourceKind: 'takeaway', source: 'Takeaway' };
}

/**
 * Builds anchored two-minute cooking batches. A batch must contain at least
 * one dine-in and one takeaway ticket; normal duplicate tickets from only one
 * service channel remain separate and do not distract the chef.
 */
export function buildKitchenBatches(
  orders: Order[],
  timestampFor: (order: Order) => number,
  windowMs = KITCHEN_BATCH_WINDOW_MS
): KitchenBatch[] {
  type Entry = KitchenBatchOrder & { timestamp: number };
  const byDish = new Map<string, Map<string, Entry>>();

  for (const order of orders) {
    if (order.status === 'ready' || order.status === 'delivered' || order.status === 'cancelled') continue;
    const timestamp = timestampFor(order);
    for (const [index, item] of (order.items || []).entries()) {
      if (order.kitchenProgress?.[kitchenItemKey(order.items, index)]) continue;
      const portion = orderItemPortion(item);
      const instructions = [order.notes?.trim(), item.notes?.trim()].filter(Boolean).join(' / ');
      const dish = `${item.name}${portion ? ` (${portion})` : ''}${instructions ? ` — ${instructions}` : ''}`;
      const key = dish.trim().toLocaleLowerCase('en-IN');
      const entries = byDish.get(key) || new Map<string, Entry>();
      const existing = entries.get(order.id);
      if (existing) {
        existing.quantity += item.quantity || 1;
      } else {
        entries.set(order.id, {
          orderId: order.id,
          token: order.id.slice(-4),
          quantity: item.quantity || 1,
          timestamp,
          ...sourceFor(order),
        });
      }
      byDish.set(key, entries);
    }
  }

  const batches: KitchenBatch[] = [];
  byDish.forEach((entryMap, key) => {
    const sorted = [...entryMap.values()].sort((a, b) => a.timestamp - b.timestamp);
    for (let start = 0; start < sorted.length;) {
      const cluster = [sorted[start]];
      let end = start + 1;
      while (end < sorted.length && sorted[end].timestamp - sorted[start].timestamp <= windowMs) {
        cluster.push(sorted[end]);
        end += 1;
      }
      const kinds = new Set(cluster.map((entry) => entry.sourceKind));
      if (cluster.length > 1 && kinds.has('dine-in') && kinds.has('takeaway')) {
        const dishItem = orders
          .flatMap((order) => (order.items || []).map(item => ({ item, notes: order.notes })))
          .find(({ item, notes }) => {
            const portion = orderItemPortion(item);
            const instructions = [notes?.trim(), item.notes?.trim()].filter(Boolean).join(' / ');
            return `${item.name}${portion ? ` (${portion})` : ''}${instructions ? ` — ${instructions}` : ''}`.trim().toLocaleLowerCase('en-IN') === key;
          });
        const portion = dishItem ? orderItemPortion(dishItem.item) : undefined;
        const instructions = [dishItem?.notes?.trim(), dishItem?.item.notes?.trim()].filter(Boolean).join(' / ');
        const dish = dishItem ? `${dishItem.item.name}${portion ? ` (${portion})` : ''}${instructions ? ` — ${instructions}` : ''}` : key;
        batches.push({
          key: `${key}:${cluster[0].timestamp}`,
          dish,
          totalQuantity: cluster.reduce((sum, entry) => sum + entry.quantity, 0),
          orders: cluster.map((entry) => ({
            orderId: entry.orderId,
            token: entry.token,
            quantity: entry.quantity,
            source: entry.source,
            sourceKind: entry.sourceKind,
          })),
        });
      }
      start = end;
    }
  });

  return batches.sort((a, b) => b.totalQuantity - a.totalQuantity);
}
