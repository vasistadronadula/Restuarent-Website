'use client';
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { CartItem, MenuItem } from '@/types';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  couponCode: string;
  couponDiscount: number;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: MenuItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'INCREASE_QTY'; payload: string }
  | { type: 'DECREASE_QTY'; payload: string }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_CART' }
  | { type: 'OPEN_CART' }
  | { type: 'CLOSE_CART' }
  | { type: 'APPLY_COUPON'; payload: { code: string; discount: number } }
  | { type: 'REMOVE_COUPON' };

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find((i) => i.id === action.payload.id);
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.id === action.payload.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return { ...state, items: [...state.items, { ...action.payload, quantity: 1 }] };
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter((i) => i.id !== action.payload) };
    case 'INCREASE_QTY':
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === action.payload ? { ...i, quantity: i.quantity + 1 } : i
        ),
      };
    case 'DECREASE_QTY':
      return {
        ...state,
        items: state.items
          .map((i) => (i.id === action.payload ? { ...i, quantity: i.quantity - 1 } : i))
          .filter((i) => i.quantity > 0),
      };
    case 'CLEAR_CART':
      return { ...state, items: [], couponCode: '', couponDiscount: 0 };
    case 'TOGGLE_CART':
      return { ...state, isOpen: !state.isOpen };
    case 'OPEN_CART':
      return { ...state, isOpen: true };
    case 'CLOSE_CART':
      return { ...state, isOpen: false };
    case 'APPLY_COUPON':
      return { ...state, couponCode: action.payload.code, couponDiscount: action.payload.discount };
    case 'REMOVE_COUPON':
      return { ...state, couponCode: '', couponDiscount: 0 };
    default:
      return state;
  }
};

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
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    isOpen: false,
    couponCode: '',
    couponDiscount: 0,
  });

  const subtotal = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountAmount = Math.min(
    (subtotal * state.couponDiscount) / 100,
    state.couponDiscount > 0 ? 300 : 0
  );
  const taxableAmount = subtotal - discountAmount;
  const cgst = parseFloat((taxableAmount * 0.025).toFixed(2));
  const sgst = parseFloat((taxableAmount * 0.025).toFixed(2));
  const deliveryCharge = subtotal > 0 && subtotal < 500 ? 40 : 0;
  const grandTotal = parseFloat((taxableAmount + cgst + sgst + deliveryCharge).toFixed(2));
  const totalItems = state.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        state,
        addItem: (item) => dispatch({ type: 'ADD_ITEM', payload: item }),
        removeItem: (id) => dispatch({ type: 'REMOVE_ITEM', payload: id }),
        increaseQty: (id) => dispatch({ type: 'INCREASE_QTY', payload: id }),
        decreaseQty: (id) => dispatch({ type: 'DECREASE_QTY', payload: id }),
        clearCart: () => dispatch({ type: 'CLEAR_CART' }),
        toggleCart: () => dispatch({ type: 'TOGGLE_CART' }),
        openCart: () => dispatch({ type: 'OPEN_CART' }),
        closeCart: () => dispatch({ type: 'CLOSE_CART' }),
        applyCoupon: (code, discount) => dispatch({ type: 'APPLY_COUPON', payload: { code, discount } }),
        removeCoupon: () => dispatch({ type: 'REMOVE_COUPON' }),
        totalItems,
        subtotal,
        cgst,
        sgst,
        discountAmount,
        deliveryCharge,
        grandTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
