import type { Order } from '@/types';
import { orderItemPortion } from '@/lib/orders/orderItems';
import { kitchenItemKey } from '@/lib/kitchen/kitchen';

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
 * Constructs the canonical dish display string and its normalised lookup key.
 *
 * Both the entry-building phase and the batch-display phase used to duplicate
 * this exact concatenation inline. If one of the copies drifted (e.g., an
 * extra space or different case), the key lookup would miss and the batch
 * would display the raw key instead of the human-readable dish name.
 */
function dishDisplay(
  name: string,
  portion: string | undefined,
  instructions: string
): { display: string; key: string } {
  const display = `${name}${portion ? ` (${portion})` : ''}${instructions ? ` — ${instructions}` : ''}`;
  return { display, key: display.trim().toLocaleLowerCase('en-IN') };
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

  // BUG-10 fix: build a Map<key, display> in the same pass as byDish so the
  // batch display phase never needs to do an O(orders × items) linear scan to
  // find the canonical dish name. The display string is recorded from the
  // first item that created the key, then reused for every batch under it.
  const byDish = new Map<string, Map<string, Entry>>();
  const dishDisplayByKey = new Map<string, string>();

  for (const order of orders) {
    if (order.status === 'ready' || order.status === 'delivered' || order.status === 'cancelled') continue;
    const timestamp = timestampFor(order);
    for (const [index, item] of (order.items || []).entries()) {
      if (order.kitchenProgress?.[kitchenItemKey(order.items, index)]) continue;
      const portion = orderItemPortion(item);
      const instructions = [order.notes?.trim(), item.notes?.trim()].filter(Boolean).join(' / ');
      // BUG-29 fix: use the shared helper so the key used for grouping is
      // always byte-identical to the string that produced the display name.
      const { display, key } = dishDisplay(item.name, portion, instructions);
      if (!dishDisplayByKey.has(key)) dishDisplayByKey.set(key, display);

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
        // O(1) lookup — display name was recorded when the key was first created.
        const dish = dishDisplayByKey.get(key) ?? key;
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
