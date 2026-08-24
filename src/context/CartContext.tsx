'use client';
/**
 * CartContext.tsx — Backward-compatible adapter over the Zustand cart store.
 *
 * `useCart()` keeps working in every page that already calls it. New code
 * should prefer `useCartStore` with a selector, which re-renders only on the
 * slice it reads — this context re-renders all consumers on any cart change,
 * which is why the floating bar used to repaint whenever a coupon was typed.
 */
import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { MenuItem, CartItem } from '@/types';
import { useCartStore, getCartBillTotals } from '@/store/useCartStore';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  couponCode: string;
  couponDiscount: number;
}

interface CartContextType {
  state: CartState;
  addItem: (item: MenuItem) => void;
  removeItem: (id: string, selectedPortion?: 'single' | 'full' | 'large') => void;
  increaseQty: (id: string, selectedPortion?: 'single' | 'full' | 'large') => void;
  decreaseQty: (id: string, selectedPortion?: 'single' | 'full' | 'large') => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  applyCoupon: (code: string, discount: number, maxDiscount?: number) => void;
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
  const items = useCartStore((s) => s.items);
  const isOpen = useCartStore((s) => s.isOpen);
  const couponCode = useCartStore((s) => s.couponCode);
  const couponDiscount = useCartStore((s) => s.couponDiscount);
  const couponMaxDiscount = useCartStore((s) => s.couponMaxDiscount);

  const totals = useMemo(
    () => getCartBillTotals(items, couponDiscount, couponMaxDiscount),
    [items, couponDiscount, couponMaxDiscount]
  );

  // Actions are read off the store at call time rather than subscribed to.
  // Zustand action identities are stable, so this keeps the context value from
  // changing for a reason no consumer cares about.
  const value: CartContextType = useMemo(
    () => ({
      state: { items, isOpen, couponCode, couponDiscount },
      addItem: (item) => useCartStore.getState().addItem(item),
      removeItem: (id, portion) => useCartStore.getState().removeItem(id, portion),
      increaseQty: (id, portion) => useCartStore.getState().increaseQty(id, portion),
      decreaseQty: (id, portion) => useCartStore.getState().decreaseQty(id, portion),
      clearCart: () => useCartStore.getState().clearCart(),
      toggleCart: () => useCartStore.getState().toggleCart(),
      openCart: () => useCartStore.getState().openCart(),
      closeCart: () => useCartStore.getState().closeCart(),
      applyCoupon: (code, discount, maxDiscount) =>
        useCartStore.getState().applyCoupon({ code, discount, maxDiscount }),
      removeCoupon: () => useCartStore.getState().removeCoupon(),
      // Takeaway/dine-in only today, so delivery is always free. If delivery
      // orders are introduced, source this from config instead of hardcoding.
      deliveryCharge: 0,
      ...totals,
    }),
    [items, isOpen, couponCode, couponDiscount, totals]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
