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

/**
 * 6-digit suffix combining millisecond-precision time with a random tail, so
 * two IDs generated in the same millisecond only collide if they also draw
 * the same 2-digit random number (1-in-100), versus 1-in-9000 for a plain
 * 4-digit random suffix.
 */
/**
 * High-entropy suffix. Order IDs double as guest tracking credentials, so a
 * timestamp plus two random digits is not sufficient: it makes another
 * customer's order practical to enumerate. Web Crypto exists in supported
 * browsers and in the Node runtime used by tests/builds.
 */
const randomSuffix = (): string => {
  // Ten bytes (80 bits) keeps the complete ID below Razorpay's 40-character
  // receipt limit while remaining infeasible to enumerate.
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

/** Generates a unique Order ID — PPR-ORD-20260725-4821 */
export const generateOrderId = (): string =>
  `PPR-ORD-${getDateStamp()}-${randomSuffix()}`;

/** Generates a unique Reservation ID — PPR-RES-20260725-3914 */
export const generateReservationId = (): string =>
  `PPR-RES-${getDateStamp()}-${randomSuffix()}`;

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
    return `PPR-INV-${getDateStamp()}-${stripped.slice(-4) || randomSuffix()}`;
  }
  return `PPR-INV-${getDateStamp()}-${randomSuffix()}`;
};

/** Generates a Table ID — T-001, T-002 ... */
export const generateTableId = (tableNumber: number): string =>
  `T-${String(tableNumber).padStart(3, '0')}`;

/** Generates a unique Employee ID — PPR-EMP-20260725-4821 */
export const generateEmployeeId = (): string =>
  `PPR-EMP-${getDateStamp()}-${randomSuffix()}`;

/**
 * Generates a Stock/Inventory ID — PPR-STK-20260725-4821
 *
 * The inventory page used to build its own ID from the last six digits of
 * `Date.now()`, which repeat every ~16 minutes — two items added in the same
 * session could collide on the primary key and the second insert would fail.
 */
export const generateInventoryId = (): string =>
  `PPR-STK-${getDateStamp()}-${randomSuffix()}`;

/**
 * Generates a Menu Item ID — PPR-DSH-20260725-4821
 *
 * Menu management used to build `item-${Date.now()}` inline, which is both
 * unreadable in the database and collision-prone: two dishes saved in the same
 * millisecond take the same primary key and the second insert fails.
 */
export const generateMenuItemId = (): string =>
  `PPR-DSH-${getDateStamp()}-${randomSuffix()}`;

/** Generates a Category ID — CAT-biryani (from slug) or CAT-20260725-4821 */
export const generateCategoryId = (slug?: string): string =>
  slug ? `CAT-${slug}` : `CAT-${getDateStamp()}-${randomSuffix()}`;
