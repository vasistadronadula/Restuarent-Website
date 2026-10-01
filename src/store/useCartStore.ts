import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MenuItem, CartItem } from '@/types';
import { computeBillTotals, computeCouponDiscount } from '@/lib/billing/billing';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  couponCode: string;
  couponDiscount: number; // percentage 0-100
  couponMaxDiscount: number; // ₹ cap for applied coupon, 0 = unlimited
  
  // Actions
  addItem: (
    item: MenuItem & { selectedPortion?: 'single' | 'full' | 'large'; selectedPrice?: number },
    quantity?: number
  ) => void;
  removeItem: (id: string, selectedPortion?: 'single' | 'full' | 'large') => void;
  increaseQty: (id: string, selectedPortion?: 'single' | 'full' | 'large') => void;
  decreaseQty: (id: string, selectedPortion?: 'single' | 'full' | 'large') => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  applyCoupon: (coupon: { code: string; discount: number; maxDiscount?: number }) => void;
  removeCoupon: () => void;
  reconcileWithMenu: (menu: MenuItem[]) => CartReconciliation;
}

const dishLimit = (limit?: number) => limit ? Math.min(limit, 200) : 200;

/** What `reconcileWithMenu` changed, so the UI can say so once. */
export interface CartReconciliation {
  /** Names of lines dropped — the dish is gone from the menu or sold out. */
  removed: string[];
  /** Names of lines whose price moved to match the current menu. */
  repriced: string[];
  /** Names of lines reduced to the current per-dish quantity cap. */
  quantityAdjusted: string[];
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      couponCode: '',
      couponDiscount: 0,
      couponMaxDiscount: 0,

      addItem: (incoming, quantity = 1) =>
        set((state) => {
          if (!Number.isFinite(quantity) || quantity <= 0) return state;
          const cap = dishLimit(incoming.maxQuantity);
          // Sum across ALL portions of this dish (e.g., 2×Single + 3×Full = 5).
          // This is the correct total to check against maxQuantity, which is a
          // per-dish limit, not a per-portion limit.
          const crossPortionTotal = state.items.filter((i) => i.id === incoming.id)
            .reduce((sum, i) => sum + i.quantity, 0);
          const addQty = Math.min(
            Math.max(1, Math.floor(quantity)),
            Math.max(0, cap - crossPortionTotal)
          );
          if (addQty === 0) return state;
          const existingIndex = state.items.findIndex(
            (i) => i.id === incoming.id && (i.selectedPortion || 'full') === (incoming.selectedPortion || 'full')
          );
          if (existingIndex > -1) {
            const updated = [...state.items];
            // addQty was already clamped to (cap - crossPortionTotal), so
            // updated[existingIndex].quantity + addQty is guaranteed ≤ cap.
            updated[existingIndex] = {
              ...updated[existingIndex],
              quantity: updated[existingIndex].quantity + addQty,
            };
            return { items: updated };
          }
          return { items: [...state.items, { ...incoming, quantity: addQty }] };
        }),

      removeItem: (id, portion) =>
        set((state) => ({
          items: state.items.filter((i) => {
            if (portion) {
              return !(i.id === id && (i.selectedPortion || 'full') === (portion || 'full'));
            }
            return i.id !== id;
          }),
        })),

      increaseQty: (id, portion) =>
        set((state) => {
          const targetIndex = state.items.findIndex((i) =>
            portion
              ? i.id === id && (i.selectedPortion || 'full') === (portion || 'full')
              : i.id === id
          );
          if (targetIndex === -1) return state;
          const current = state.items[targetIndex];
          const currentTotal = state.items.filter((i) => i.id === id)
            .reduce((sum, i) => sum + i.quantity, 0);
          if (currentTotal >= dishLimit(current.maxQuantity)) return state;
          const updated = [...state.items];
          updated[targetIndex] = {
            ...updated[targetIndex],
            quantity: updated[targetIndex].quantity + 1,
          };
          return { items: updated };
        }),

      decreaseQty: (id, portion) =>
        set((state) => {
          const targetIndex = state.items.findIndex((i) =>
            portion
              ? i.id === id && (i.selectedPortion || 'full') === (portion || 'full')
              : i.id === id
          );
          if (targetIndex === -1) return state;
          const item = state.items[targetIndex];
          if (item.quantity <= 1) {
            return {
              items: state.items.filter((_, idx) => idx !== targetIndex),
            };
          }
          const updated = [...state.items];
          updated[targetIndex] = {
            ...updated[targetIndex],
            quantity: updated[targetIndex].quantity - 1,
          };
          return { items: updated };
        }),

      clearCart: () =>
        set({
          items: [],
          couponCode: '',
          couponDiscount: 0,
          couponMaxDiscount: 0,
        }),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      applyCoupon: ({ code, discount, maxDiscount }) =>
        set({
          couponCode: code,
          couponDiscount: discount,
          couponMaxDiscount: maxDiscount ?? 0,
        }),

      removeCoupon: () =>
        set({
          couponCode: '',
          couponDiscount: 0,
          couponMaxDiscount: 0,
        }),

      /**
       * Reconciles the persisted cart against the menu as it is right now.
       *
       * The cart survives in localStorage indefinitely, but the menu behind
       * it doesn't hold still: a dish gets delisted, sells out, or is
       * repriced. Nothing reread it, so a cart restored days later showed
       * the old line at the old price — and, because checkout builds its
       * order payload straight from these rows, that stale price is what got
       * charged and printed on the bill.
       *
       * Removal wins over repricing: an unavailable dish can't be ordered at
       * any price. Returns what changed so the caller can tell the customer
       * once, rather than each row announcing itself.
       */
      reconcileWithMenu: (menu) => {
        const result: CartReconciliation = { removed: [], repriced: [], quantityAdjusted: [] };

        const byId = new Map(menu.map((m) => [m.id, m]));
        let changed = false;

        const next: CartItem[] = [];
        const usedQuantities = new Map<string, number>();
        for (const line of get().items) {
          const current = byId.get(line.id);

          if (!current || current.isAvailable === false) {
            result.removed.push(line.name);
            changed = true;
            continue;
          }

          const portion = line.selectedPortion || 'full';
          const hasPortions = Object.keys(current.portionPrices || {}).length > 0;
          if (portion && (hasPortions ? current.portionPrices?.[portion] === undefined : portion !== 'full')) {
            result.removed.push(line.name);
            changed = true;
            continue;
          }
          const currentPrice = hasPortions ? current.portionPrices![portion]! : current.price;
          const used = usedQuantities.get(line.id) || 0;
          const quantity = Math.min(line.quantity, Math.max(0, dishLimit(current.maxQuantity) - used));
          usedQuantities.set(line.id, used + quantity);
          if (quantity !== line.quantity) {
            result.quantityAdjusted.push(line.name);
            changed = true;
          }
          if (quantity === 0) continue;

          if (currentPrice !== (line.selectedPrice ?? line.price)) {
            result.repriced.push(line.name);
            changed = true;
          }

          // Artwork can change without the price moving; not worth reporting.
          if (current.image && current.image !== line.image) {
            changed = true;
          }
          if (current.maxQuantity !== line.maxQuantity) changed = true;
          next.push({
            ...line, price: current.price, selectedPrice: currentPrice,
            image: current.image || line.image, maxQuantity: current.maxQuantity, quantity,
          });
        }

        if (changed) set({ items: next });
        return result;
      },
    }),
    {
      name: 'pala-pitta-cart-storage',
      partialize: (state) => ({
        items: state.items,
        couponCode: state.couponCode,
        couponDiscount: state.couponDiscount,
        couponMaxDiscount: state.couponMaxDiscount,
      }),
    }
  )
);

// Derived getters / helper functions
export const getCartTotalItems = (items: CartItem[]) =>
  items.reduce((sum, i) => sum + i.quantity, 0);

export const getCartSubtotal = (items: CartItem[]) =>
  items.reduce((sum, i) => sum + (i.selectedPrice ?? i.price) * i.quantity, 0);

export const getCartDiscountAmount = (subtotal: number, couponDiscount: number, couponMaxDiscount: number) => {
  return computeCouponDiscount(subtotal, couponDiscount, couponMaxDiscount);
};

/**
 * The one place the cart turns a basket into a bill. `billing.ts` already owns
 * this math for the POS and admin bills — three call sites here (the cart
 * page, the menu page's mini-bar, and CartContext) used to each run their own
 * taxable/CGST/SGST/grand-total pipeline, and CartContext's own float grand
 * total disagreed with `computeBillTotals`' whole-rupee rounding by up to
 * ₹0.99. Routing through `computeBillTotals` — passing the already-capped
 * coupon amount as a flat discount — makes every screen (and the amount
 * actually sent to Razorpay) agree with the POS/admin bill to the rupee.
 */
export const getCartBillTotals = (
  items: CartItem[],
  couponDiscount: number,
  couponMaxDiscount: number
) => {
  const subtotal = getCartSubtotal(items);
  const discountAmount = getCartDiscountAmount(subtotal, couponDiscount, couponMaxDiscount);
  const bill = computeBillTotals(subtotal, { type: 'flat', value: discountAmount });
  return {
    totalItems: getCartTotalItems(items),
    subtotal: bill.subtotal,
    discountAmount: bill.discountAmount,
    taxable: bill.taxable,
    cgst: bill.cgst,
    sgst: bill.sgst,
    grandTotal: bill.grandTotal,
    roundOff: bill.roundOff,
  };
};
