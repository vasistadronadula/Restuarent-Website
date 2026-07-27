import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { MenuItem, CartItem } from '@/types';
import type { RootState } from './index';

// ─── State ───────────────────────────────────────────────────────────────────

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  couponCode: string;
  couponDiscount: number; // percentage 0-100
  couponMaxDiscount: number; // ₹ cap for the applied coupon, 0 = fall back to default
}

// Cap used when the applied coupon carries no max of its own — including a
// cart persisted from before per-coupon caps were honoured.
const FALLBACK_MAX_DISCOUNT = 300;

const initialState: CartState = {
  items: [],
  isOpen: false,
  couponCode: '',
  couponDiscount: 0,
  couponMaxDiscount: 0,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<MenuItem & { selectedPortion?: 'single' | 'full' | 'large'; selectedPrice?: number }>) {
      const incoming = action.payload;
      // Match on id + selectedPortion to allow same item in different portions
      const existing = state.items.find(
        (i) => i.id === incoming.id && (i.selectedPortion || 'full') === (incoming.selectedPortion || 'full')
      );
      if (existing) {
        existing.quantity += 1;
      } else {
        state.items.push({ ...incoming, quantity: 1 });
      }
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.id !== action.payload);
    },
    increaseQty(state, action: PayloadAction<string>) {
      const item = state.items.find((i) => i.id === action.payload);
      if (item) item.quantity += 1;
    },
    decreaseQty(state, action: PayloadAction<string>) {
      const item = state.items.find((i) => i.id === action.payload);
      if (item) {
        if (item.quantity <= 1) {
          state.items = state.items.filter((i) => i.id !== action.payload);
        } else {
          item.quantity -= 1;
        }
      }
    },
    clearCart(state) {
      state.items = [];
      state.couponCode = '';
      state.couponDiscount = 0;
      state.couponMaxDiscount = 0;
    },
    openCart(state) {
      state.isOpen = true;
    },
    closeCart(state) {
      state.isOpen = false;
    },
    toggleCart(state) {
      state.isOpen = !state.isOpen;
    },
    applyCoupon(state, action: PayloadAction<{ code: string; discount: number; maxDiscount?: number }>) {
      state.couponCode = action.payload.code;
      state.couponDiscount = action.payload.discount;
      state.couponMaxDiscount = action.payload.maxDiscount ?? 0;
    },
    removeCoupon(state) {
      state.couponCode = '';
      state.couponDiscount = 0;
      state.couponMaxDiscount = 0;
    },
  },
});

export const {
  addItem, removeItem, increaseQty, decreaseQty,
  clearCart, openCart, closeCart, toggleCart,
  applyCoupon, removeCoupon,
} = cartSlice.actions;

export default cartSlice.reducer;

// ─── Selectors (memoized with createSelector) ─────────────────────────────────

export const selectCartState = (state: RootState) => state.cart;

export const selectCartItems = (state: RootState) => state.cart.items;
export const selectCartIsOpen = (state: RootState) => state.cart.isOpen;
export const selectCouponCode = (state: RootState) => state.cart.couponCode;
export const selectCouponDiscount = (state: RootState) => state.cart.couponDiscount;
export const selectCouponMaxDiscount = (state: RootState) => state.cart.couponMaxDiscount;

export const selectTotalItems = createSelector(
  selectCartItems,
  (items) => items.reduce((sum, i) => sum + i.quantity, 0)
);

export const selectSubtotal = createSelector(
  selectCartItems,
  (items) => items.reduce((sum, i) => sum + (i.selectedPrice ?? i.price) * i.quantity, 0)
);

// The cap comes from the coupon the admin created (its "Max Discount" field),
// so what the Coupons page promises is what the customer actually gets — this
// used to be a flat ₹300 for every coupon regardless of its configured max.
export const selectDiscountAmount = createSelector(
  selectSubtotal,
  selectCouponDiscount,
  selectCouponMaxDiscount,
  (subtotal, couponDiscount, couponMaxDiscount) => {
    if (couponDiscount <= 0) return 0;
    const cap = couponMaxDiscount > 0 ? couponMaxDiscount : FALLBACK_MAX_DISCOUNT;
    return Math.min((subtotal * couponDiscount) / 100, cap);
  }
);

export const selectTaxableAmount = createSelector(
  selectSubtotal,
  selectDiscountAmount,
  (subtotal, discount) => subtotal - discount
);

export const selectCgst = createSelector(
  selectTaxableAmount,
  (taxable) => parseFloat((taxable * 0.025).toFixed(2))
);

export const selectSgst = createSelector(
  selectTaxableAmount,
  (taxable) => parseFloat((taxable * 0.025).toFixed(2))
);

export const selectGrandTotal = createSelector(
  selectTaxableAmount,
  selectCgst,
  selectSgst,
  (taxable, cgst, sgst) => parseFloat((taxable + cgst + sgst).toFixed(2))
);

// Selector for a specific cart item by id (to avoid full re-render in MenuCard)
export const selectCartItemById = (id: string) =>
  createSelector(selectCartItems, (items) => items.find((i) => i.id === id));
