import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { VegStatus } from '@/types';
import { computeBillTotals, computeCouponDiscount } from '@/lib/billing/billing';

export class CheckoutValidationError extends Error {}

/** Server-side hard cap per line item, regardless of menu-level max_quantity.
 * Prevents a single order from exhausting inventory by submitting an
 * arbitrarily large quantity for any dish whose DB record has no cap set.
 */
export const MAX_QUANTITY_HARD_CAP = 200;

const linesSchema = z.array(z.object({
  menuItemId: z.string().trim().min(1).max(80).optional(),
  id: z.string().trim().min(1).max(80).optional(),
  quantity: z.number().int().positive().max(MAX_QUANTITY_HARD_CAP),
  selectedPortion: z.enum(['single', 'full', 'large']).optional(),
}).refine((line) => Boolean(line.menuItemId || line.id))).min(1).max(50);


export interface CheckoutMenuRow {
  id: string;
  name: string;
  price: number;
  category: string | null;
  veg_status: VegStatus | null;
  is_available: boolean | null;
  portion_prices: Record<string, number> | null;
  max_quantity: number | null;
}

export function parseCheckoutLines(input: unknown) {
  const result = linesSchema.safeParse(input);
  if (!result.success) {
    throw new CheckoutValidationError('Submit 1–50 valid items with positive whole quantities.');
  }
  return result.data;
}

/** Never silently drop or resize a line: the customer must approve the basket. */
export function buildCheckoutItems(input: unknown, menuRows: CheckoutMenuRow[]) {
  const lines = parseCheckoutLines(input);
  const menuById = new Map(menuRows.map((row) => [row.id, row]));
  const quantities = new Map<string, number>();
  return lines.map((line) => {
    const menu = menuById.get((line.menuItemId || line.id)!);
    if (!menu || menu.is_available === false) {
      throw new CheckoutValidationError('An item is no longer available. Please review your cart.');
    }
    const quantity = (quantities.get(menu.id) || 0) + line.quantity;
    // Apply the per-dish menu cap when set, and always enforce the hard cap
    // (e.g., for dishes whose DB record has no max_quantity). The Zod schema
    // already rejects per-line quantities above MAX_QUANTITY_HARD_CAP; this
    // guards the *accumulated* total across multiple lines for the same dish.
    const dishCap = menu.max_quantity ? Math.min(menu.max_quantity, MAX_QUANTITY_HARD_CAP) : MAX_QUANTITY_HARD_CAP;
    if (!Number.isSafeInteger(quantity) || quantity > dishCap) {
      throw new CheckoutValidationError(`Quantity exceeds the order limit for ${menu.name}.`);
    }
    quantities.set(menu.id, quantity);
    const hasPortions = Object.keys(menu.portion_prices || {}).length > 0;
    // The storefront uses "full" even for dishes without portion choices.
    const portion = line.selectedPortion || (hasPortions ? 'full' : undefined);
    const price = Number(hasPortions && portion ? menu.portion_prices?.[portion] : menu.price);
    if ((!hasPortions && portion && portion !== 'full') || !Number.isFinite(price) || price <= 0) {
      throw new CheckoutValidationError(`The selected portion of ${menu.name} is unavailable.`);
    }
    return {
      menuItemId: menu.id, name: menu.name, price, quantity: line.quantity,
      vegStatus: menu.veg_status || 'non-veg', selectedPortion: portion,
      category: menu.category || undefined,
    };
  });
}

/** Shared by gateway creation and final checkout so both use live menu prices. */
export async function priceCheckout(admin: SupabaseClient, input: unknown, couponInput: unknown) {
  const lines = parseCheckoutLines(input);
  const ids = [...new Set(lines.map((line) => (line.menuItemId || line.id)!))];
  const { data: menu, error: menuError } = await admin.from('menu_items')
    .select('id,name,price,category,veg_status,is_available,portion_prices,max_quantity').in('id', ids);
  if (menuError) throw menuError;
  const items = buildCheckoutItems(lines, (menu || []) as CheckoutMenuRow[]);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const couponCode = typeof couponInput === 'string' ? couponInput.trim().toUpperCase() : '';
  let discountAmount = 0;
  if (couponCode) {
    const { data: coupon, error } = await admin.from('coupons')
      .select('discount,max_discount,min_order,is_active').eq('code', couponCode).maybeSingle();
    if (error) throw error;
    if (!coupon?.is_active || subtotal < Number(coupon.min_order || 0)) {
      throw new CheckoutValidationError('This coupon is no longer valid for your cart. Please remove or change it.');
    }
    discountAmount = computeCouponDiscount(subtotal, Number(coupon.discount), Number(coupon.max_discount));
  }
  const totals = computeBillTotals(subtotal, { type: 'flat', value: discountAmount });
  if (!Number.isFinite(subtotal) || !Number.isFinite(totals.grandTotal) || totals.grandTotal <= 0 || totals.grandTotal > 100_000) {
    throw new CheckoutValidationError('Order total is invalid.');
  }
  return { items, totals, couponCode };
}
