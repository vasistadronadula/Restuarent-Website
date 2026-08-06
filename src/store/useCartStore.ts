import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MenuItem, CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  couponCode: string;
  couponDiscount: number; // percentage 0-100
  couponMaxDiscount: number; // ₹ cap for applied coupon, 0 = default
  
  // Actions
  addItem: (item: MenuItem & { selectedPortion?: 'single' | 'full' | 'large'; selectedPrice?: number }) => void;
  removeItem: (id: string) => void;
  increaseQty: (id: string) => void;
  decreaseQty: (id: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  applyCoupon: (coupon: { code: string; discount: number; maxDiscount?: number }) => void;
  removeCoupon: () => void;
}

const FALLBACK_MAX_DISCOUNT = 300;

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      couponCode: '',
      couponDiscount: 0,
      couponMaxDiscount: 0,

      addItem: (incoming) =>
        set((state) => {
          const existingIndex = state.items.findIndex(
            (i) => i.id === incoming.id && (i.selectedPortion || 'full') === (incoming.selectedPortion || 'full')
          );
          if (existingIndex > -1) {
            const updated = [...state.items];
            updated[existingIndex] = {
              ...updated[existingIndex],
              quantity: updated[existingIndex].quantity + 1,
            };
            return { items: updated };
          }
          return { items: [...state.items, { ...incoming, quantity: 1 }] };
        }),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),

      increaseQty: (id) =>
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, quantity: i.quantity + 1 } : i)),
        })),

      decreaseQty: (id) =>
        set((state) => ({
          items: state.items
            .map((i) => (i.id === id ? { ...i, quantity: i.quantity - 1 } : i))
            .filter((i) => i.quantity > 0),
        })),

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

export const getCartTaxableAmount = (subtotal: number, discount: number) => subtotal - discount;

export const getCartCgst = (taxable: number) => parseFloat((taxable * 0.025).toFixed(2));
export const getCartSgst = (taxable: number) => parseFloat((taxable * 0.025).toFixed(2));
export const getCartGrandTotal = (taxable: number, cgst: number, sgst: number) =>
  parseFloat((taxable + cgst + sgst).toFixed(2));
