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
 *
 * Module-level Set instead of window.__ppr_seen_pos_orders: the global was
 * never cleaned up (the Set grew for the entire session), polluted the window
 * namespace, and provided no benefit over a module variable — both give the
 * same per-tab isolation. The module-level version is GC-able in future if
 * a cleanup mechanism is added.
 */

const seenPosOrders = new Set<string>();

export function markPosOrderPrinted(orderId: string): void {
  seenPosOrders.add(orderId);
  // Cap the set: a full day of counter sales must not grow it without bound.
  if (seenPosOrders.size > 500) {
    const oldest = seenPosOrders.values().next().value;
    if (oldest !== undefined) seenPosOrders.delete(oldest);
  }
}

/** Release the flag when the sale failed to save — the id never existed. */
export function unmarkPosOrderPrinted(orderId: string): void {
  seenPosOrders.delete(orderId);
}

export function wasPosOrderPrinted(orderId: string): boolean {
  return seenPosOrders.has(orderId);
}
