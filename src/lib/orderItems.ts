import type { PersistedOrderItem } from '@/types';

/**
 * The menu item id for a saved order line, whichever key the writer used.
 *
 * The storefront and the aggregator webhooks write `menuItemId`; the POS
 * writes `id`. Every reader that looks up prep time or re-adds a line to the
 * cart needs one of them, and picking a single key meant silently missing
 * half the orders — a POS ticket's prep-time estimate quietly fell back to
 * the default for every line.
 *
 * Returns `''` when neither is present (a manual POS line for something not
 * on the menu), which callers treat as "no menu item to look up".
 */
export function orderItemId(item: Pick<PersistedOrderItem, 'menuItemId' | 'id'>): string {
  return item.menuItemId || item.id || '';
}

/** The portion label a line was ordered at, whichever key the writer used. */
export function orderItemPortion(
  item: Pick<PersistedOrderItem, 'selectedPortion' | 'portion'>
): string | undefined {
  return item.selectedPortion || item.portion || undefined;
}
