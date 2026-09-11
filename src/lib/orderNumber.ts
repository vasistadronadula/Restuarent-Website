/**
 * Formats a clean, human-readable order number for KDS, receipts, and order tracking.
 * If order has a sequential orderNumber (e.g. 186), returns "#186".
 * If legacy ID without orderNumber, extracts readable tail or "#0001".
 */
export function getOrderDisplayNumber(order?: { id?: string; orderNumber?: number | null } | null): string {
  if (!order) return '#---';
  if (order.orderNumber != null && Number.isFinite(Number(order.orderNumber))) {
    return `#${order.orderNumber}`;
  }
  if (!order.id) return '#---';
  if (order.id.startsWith('KDS-') || order.id.startsWith('ORD-') || order.id.startsWith('T-')) {
    return `#${order.id.slice(-4)}`;
  }
  return `#${order.id.slice(-4).toUpperCase()}`;
}

export function getOrderToken(order?: { id?: string; orderNumber?: number | null } | null): string {
  if (!order) return '---';
  if (order.orderNumber != null && Number.isFinite(Number(order.orderNumber))) {
    return String(order.orderNumber);
  }
  return (order.id || '').slice(-4);
}
