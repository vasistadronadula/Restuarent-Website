import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { MenuItem, CartItem } from '@/types';
import type { RootState } from './index';

// ─── State ───────────────────────────────────────────────────────────────────

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  couponCode: string;
  couponDiscount: number; // percentage 0-100
}

const initialState: CartState = {
  items: [],
  isOpen: false,
  couponCode: '',
  couponDiscount: 0,
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
    applyCoupon(state, action: PayloadAction<{ code: string; discount: number }>) {
      state.couponCode = action.payload.code;
      state.couponDiscount = action.payload.discount;
    },
    removeCoupon(state) {
      state.couponCode = '';
      state.couponDiscount = 0;
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

export const selectTotalItems = createSelector(
  selectCartItems,
  (items) => items.reduce((sum, i) => sum + i.quantity, 0)
);

export const selectSubtotal = createSelector(
  selectCartItems,
  (items) => items.reduce((sum, i) => sum + (i.selectedPrice ?? i.price) * i.quantity, 0)
);

export const selectDiscountAmount = createSelector(
  selectSubtotal,
  selectCouponDiscount,
  (subtotal, couponDiscount) =>
    couponDiscount > 0 ? Math.min((subtotal * couponDiscount) / 100, 300) : 0
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
