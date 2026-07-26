'use client';
/**
 * CartContext.tsx — Backward-Compatible Redux Adapter
 * useCart() still works in all existing pages, but internally uses Redux cartSlice.
 */
import React, { createContext, useContext, ReactNode } from 'react';
import { MenuItem, CartItem } from '@/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  addItem as addItemAction, removeItem as removeItemAction,
  increaseQty as increaseQtyAction, decreaseQty as decreaseQtyAction,
  clearCart as clearCartAction, toggleCart as toggleCartAction,
  openCart as openCartAction, closeCart as closeCartAction,
  applyCoupon as applyCouponAction, removeCoupon as removeCouponAction,
  selectCartItems, selectCartIsOpen, selectCouponCode, selectCouponDiscount,
  selectTotalItems, selectSubtotal, selectDiscountAmount, selectCgst, selectSgst, selectGrandTotal,
} from '@/store/cartSlice';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  couponCode: string;
  couponDiscount: number;
}

interface CartContextType {
  state: CartState;
  addItem: (item: MenuItem) => void;
  removeItem: (id: string) => void;
  increaseQty: (id: string) => void;
  decreaseQty: (id: string) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  applyCoupon: (code: string, discount: number) => void;
  removeCoupon: () => void;
  totalItems: number;
  subtotal: number;
  cgst: number;
  sgst: number;
  discountAmount: number;
  deliveryCharge: number;
  grandTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectCartItems);
  const isOpen = useAppSelector(selectCartIsOpen);
  const couponCode = useAppSelector(selectCouponCode);
  const couponDiscount = useAppSelector(selectCouponDiscount);
  const totalItems = useAppSelector(selectTotalItems);
  const subtotal = useAppSelector(selectSubtotal);
  const discountAmount = useAppSelector(selectDiscountAmount);
  const cgst = useAppSelector(selectCgst);
  const sgst = useAppSelector(selectSgst);
  const grandTotal = useAppSelector(selectGrandTotal);

  const state: CartState = { items, isOpen, couponCode, couponDiscount };

  const value: CartContextType = {
    state,
    addItem: (item) => dispatch(addItemAction(item)),
    removeItem: (id) => dispatch(removeItemAction(id)),
    increaseQty: (id) => dispatch(increaseQtyAction(id)),
    decreaseQty: (id) => dispatch(decreaseQtyAction(id)),
    clearCart: () => dispatch(clearCartAction()),
    toggleCart: () => dispatch(toggleCartAction()),
    openCart: () => dispatch(openCartAction()),
    closeCart: () => dispatch(closeCartAction()),
    applyCoupon: (code, discount) => dispatch(applyCouponAction({ code, discount })),
    removeCoupon: () => dispatch(removeCouponAction()),
    totalItems,
    subtotal,
    cgst,
    sgst,
    discountAmount,
    deliveryCharge: 0,
    grandTotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
