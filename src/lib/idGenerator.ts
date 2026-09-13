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

import { orderDateStamp } from '@/lib/orders/orderTime';

/** Both the original secure IDs and new numeric-token IDs support guest tracking. */
export const ORDER_ID_PATTERN = /^PPR-ORD-\d{8}-(?:[a-f0-9]{20}|[a-f0-9]{19}\d{4})$/i;

const getDateStamp = (): string => orderDateStamp().replaceAll('-', '');

/**
 * High-entropy suffix using Web Crypto. Order IDs double as guest tracking
 * credentials, so a timestamp plus two random digits is not sufficient: it
 * makes another customer's order practical to enumerate. Ten random bytes
 * (80 bits of entropy) keeps the full ID below Razorpay's 40-character
 * receipt limit while remaining infeasible to brute-force.
 * Web Crypto is available in all supported browsers and in Node ≥ 15.
 */
const randomSuffix = (): string => {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

/** 76 random bits plus a four-digit token: fits Razorpay's 40-character limit.
 * The full ID identifies the order; the short token is only a display label. */
export const generateOrderId = (): string => {
  const value = new Uint16Array(1);
  do { crypto.getRandomValues(value); } while (value[0] >= 60000);
  const token = String(value[0] % 10000).padStart(4, '0');
  return `PPR-ORD-${getDateStamp()}-${randomSuffix().slice(0, 19)}${token}`;
};

/** Generates a unique Reservation ID — PPR-RES-20260725-<hex> */
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

/** Generates a unique Employee ID — PPR-EMP-20260725-<hex> */
export const generateEmployeeId = (): string =>
  `PPR-EMP-${getDateStamp()}-${randomSuffix()}`;

/**
 * Generates a Stock/Inventory ID — PPR-STK-20260725-<hex>
 *
 * The inventory page used to build its own ID from the last six digits of
 * `Date.now()`, which repeat every ~16 minutes — two items added in the same
 * session could collide on the primary key and the second insert would fail.
 */
export const generateInventoryId = (): string =>
  `PPR-STK-${getDateStamp()}-${randomSuffix()}`;

/**
 * Generates a Menu Item ID — PPR-DSH-20260725-<hex>
 *
 * Menu management used to build `item-${Date.now()}` inline, which is both
 * unreadable in the database and collision-prone: two dishes saved in the same
 * millisecond take the same primary key and the second insert fails.
 */
export const generateMenuItemId = (): string =>
  `PPR-DSH-${getDateStamp()}-${randomSuffix()}`;

/** Generates a Category ID — CAT-biryani (from slug) or CAT-20260725-<hex> */
export const generateCategoryId = (slug?: string): string =>
  slug ? `CAT-${slug}` : `CAT-${getDateStamp()}-${randomSuffix()}`;
