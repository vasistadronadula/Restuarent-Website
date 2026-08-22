import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MenuItem, CartItem } from '@/types';
import { computeBillTotals } from '@/lib/billing';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  couponCode: string;
  couponDiscount: number; // percentage 0-100
  couponMaxDiscount: number; // ₹ cap for applied coupon, 0 = default
  
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

/** What `reconcileWithMenu` changed, so the UI can say so once. */
export interface CartReconciliation {
  /** Names of lines dropped — the dish is gone from the menu or sold out. */
  removed: string[];
  /** Names of lines whose price moved to match the current menu. */
  repriced: string[];
}

const FALLBACK_MAX_DISCOUNT = 300;

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
          const addQty = Math.max(1, Math.floor(quantity));
          const cap = incoming.maxQuantity;
          const existingIndex = state.items.findIndex(
            (i) => i.id === incoming.id && (i.selectedPortion || 'full') === (incoming.selectedPortion || 'full')
          );
          if (existingIndex > -1) {
            const updated = [...state.items];
            const nextQty = updated[existingIndex].quantity + addQty;
            updated[existingIndex] = {
              ...updated[existingIndex],
              quantity: cap ? Math.min(nextQty, cap) : nextQty,
            };
            return { items: updated };
          }
          return { items: [...state.items, { ...incoming, quantity: cap ? Math.min(addQty, cap) : addQty }] };
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
          if (current.maxQuantity && current.quantity >= current.maxQuantity) return state;
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
        const result: CartReconciliation = { removed: [], repriced: [] };
        if (!menu || menu.length === 0) return result;

        const byId = new Map(menu.map((m) => [m.id, m]));
        let changed = false;

        const next: CartItem[] = [];
        for (const line of get().items) {
          const current = byId.get(line.id);

          if (!current || current.isAvailable === false) {
            result.removed.push(line.name);
            changed = true;
            continue;
          }

          const portion = line.selectedPortion;
          const currentPrice =
            (portion ? current.portionPrices?.[portion] : undefined) ?? current.price;

          if (currentPrice !== (line.selectedPrice ?? line.price)) {
            result.repriced.push(line.name);
            changed = true;
            next.push({
              ...line,
              price: currentPrice,
              selectedPrice: currentPrice,
              image: current.image || line.image,
            });
            continue;
          }

          // Artwork can change without the price moving; not worth reporting.
          if (current.image && current.image !== line.image) {
            changed = true;
            next.push({ ...line, image: current.image });
            continue;
          }

          next.push(line);
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
  if (couponDiscount <= 0) return 0;
  const cap = couponMaxDiscount > 0 ? couponMaxDiscount : FALLBACK_MAX_DISCOUNT;
  return Math.min((subtotal * couponDiscount) / 100, cap);
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
