import type { Order } from '@/types';
import { ORDER_ID_PATTERN } from '@/lib/idGenerator';

const STORAGE_KEY = 'ppr:pos:checkout-attempt';

// localStorage, not sessionStorage: /admin/pos and /cashier (and two tabs of
// either) share one ticket store, so a retry from any of them must reuse the
// same sale ID instead of minting a duplicate order.
const store = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

function basketKey(order: Order) {
  // ID/time are assigned once, not regenerated when retrying the same sale.
  // Payment metadata (cash tendered, UTR) describes how the same basket was
  // settled, not a new basket — changing only it must not fork a new order.
  return JSON.stringify(Object.fromEntries(Object.entries(order)
    .filter(([key]) => !['id', 'orderId', 'createdAt', 'cashTendered', 'paymentReference'].includes(key))));
}

export function reusePosCheckoutAttempt(candidate: Order): Order {
  try {
    const storage = store();
    if (!storage) return candidate;
    const saved = JSON.parse(storage.getItem(STORAGE_KEY) || 'null');
    if (saved && ORDER_ID_PATTERN.test(saved.id) && basketKey(saved) === basketKey(candidate)) return saved;
    storage.setItem(STORAGE_KEY, JSON.stringify(candidate));
  } catch { /* Storage may be unavailable; the page also holds the attempt in memory. */ }
  return candidate;
}

export function clearPosCheckoutAttempt() {
  try { store()?.removeItem(STORAGE_KEY); } catch { /* Optional persistence. */ }
}

export function samePosBasket(left: Order, right: Order) { return basketKey(left) === basketKey(right); }
