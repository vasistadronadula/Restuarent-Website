/**
 * posOrderTracker.ts — flags an order the POS page has already printed.
 *
 * The counter places an order and prints it right there via OrderPlacedDialog.
 * A moment later that same order shows up in AutoOrderPrinter's live orders
 * feed looking brand new, and without this flag it printed a second copy of
 * every single counter sale. The flag has to be set the instant the order is
 * created — before the live feed can possibly deliver it — which is why
 * admin/pos calls `markPosOrderPrinted` right alongside `createOrderContext`
 * rather than after the print itself happens.
 */

declare global {
  interface Window {
    __ppr_seen_pos_orders?: Set<string>;
  }
}

export function markPosOrderPrinted(orderId: string): void {
  if (typeof window === 'undefined') return;
  window.__ppr_seen_pos_orders ??= new Set<string>();
  window.__ppr_seen_pos_orders.add(orderId);
}

export function wasPosOrderPrinted(orderId: string): boolean {
  if (typeof window === 'undefined') return false;
  return window.__ppr_seen_pos_orders?.has(orderId) ?? false;
}
