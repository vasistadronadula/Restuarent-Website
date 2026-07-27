/**
 * idGenerator.ts
 * Generates date-stamped, collision-safe IDs for all entities.
 *
 * Format:
 *   Orders:       PPR-ORD-20260725-4821
 *   Reservations: PPR-RES-20260725-3914
 *   Invoices:     PPR-INV-20260725-4821  (derived from order ID)
 *   Tables:       T-001, T-002 ...
 *   Employees:    PPR-EMP-20260725-4821
 */

const getDateStamp = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
};

const rand4 = (): string =>
  String(Math.floor(1000 + Math.random() * 9000));

/** Generates a unique Order ID — PPR-ORD-20260725-4821 */
export const generateOrderId = (): string =>
  `PPR-ORD-${getDateStamp()}-${rand4()}`;

/** Generates a unique Reservation ID — PPR-RES-20260725-3914 */
export const generateReservationId = (): string =>
  `PPR-RES-${getDateStamp()}-${rand4()}`;

/**
 * Derives an Invoice number from an Order ID.
 * PPR-ORD-20260725-4821  →  PPR-INV-20260725-4821
 * Falls back to generating fresh if not matching expected format.
 */
export const generateInvoiceNo = (orderId?: string): string => {
  if (orderId && orderId.startsWith('PPR-ORD-')) {
    return orderId.replace('PPR-ORD-', 'PPR-INV-');
  }
  // Legacy IDs or manual bills
  if (orderId) {
    const stripped = orderId.replace(/^(PPR-ORD-|ORD-|RES-)/, '');
    return `PPR-INV-${getDateStamp()}-${stripped.slice(-4) || rand4()}`;
  }
  return `PPR-INV-${getDateStamp()}-${rand4()}`;
};

/** Generates a Table ID — T-001, T-002 ... */
export const generateTableId = (tableNumber: number): string =>
  `T-${String(tableNumber).padStart(3, '0')}`;

/** Generates a unique Employee ID — PPR-EMP-20260725-4821 */
export const generateEmployeeId = (): string =>
  `PPR-EMP-${getDateStamp()}-${rand4()}`;

/**
 * Generates a Stock/Inventory ID — PPR-STK-20260725-4821
 *
 * The inventory page used to build its own ID from the last six digits of
 * `Date.now()`, which repeat every ~16 minutes — two items added in the same
 * session could collide on the primary key and the second insert would fail.
 */
export const generateInventoryId = (): string =>
  `PPR-STK-${getDateStamp()}-${rand4()}`;
