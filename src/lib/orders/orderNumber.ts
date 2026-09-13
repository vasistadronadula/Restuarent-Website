/**
 * Formats a clean, human-readable order number for KDS, receipts, and order tracking.
 * Always uses the last four characters of the unique ID so KDS, receipts,
 * notifications and tracking agree. Legacy hexadecimal IDs remain readable.
 */
export function getOrderDisplayNumber(order?: { id?: string; orderNumber?: number | null } | null): string {
  return `#${getOrderToken(order)}`;
}

export function getOrderToken(order?: { id?: string; orderNumber?: number | null } | null): string {
  const id = order?.id?.trim();
  if (id) return id.slice(-4).toUpperCase();
  const number = order?.orderNumber;
  if (number != null && Number.isSafeInteger(number) && number > 0) {
    return String(number).padStart(4, '0').slice(-4);
  }
  return '---';
}
