import { create } from 'zustand';
import { MenuItem, CartItem, OrderState } from '@/types/pos';

export interface CartStoreState extends OrderState {
  // Actions required by Master Prompt
  addItem: (item: MenuItem) => void;
  removeItem: (id: string) => void;
  incrementQuantity: (id: string) => void;
  decrementQuantity: (id: string) => void;
  clearCart: () => void;
  setTableNumber: (tableNumber: string) => void;
  setGuestCount: (guestCount: number) => void;
  setDiscount: (discount: number) => void;
}

export const useCartStore = create<CartStoreState>((set) => ({
  tableNumber: 'Table 1',
  guestCount: 2,
  cartItems: [],
  discount: 0,

  addItem: (item: MenuItem) => {
    if (!item.available) return;

    set((state) => {
      const existingItemIndex = state.cartItems.findIndex((ci) => ci.id === item.id);

      if (existingItemIndex > -1) {
        const updatedItems = [...state.cartItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + 1,
        };
        return { cartItems: updatedItems };
      }

      return {
        cartItems: [...state.cartItems, { ...item, quantity: 1 }],
      };
    });
  },

  removeItem: (id: string) => {
    set((state) => ({
      cartItems: state.cartItems.filter((ci) => ci.id !== id),
    }));
  },

  incrementQuantity: (id: string) => {
    set((state) => ({
      cartItems: state.cartItems.map((ci) =>
        ci.id === id ? { ...ci, quantity: ci.quantity + 1 } : ci
      ),
    }));
  },

  decrementQuantity: (id: string) => {
    set((state) => ({
      cartItems: state.cartItems.map((ci) => {
        if (ci.id === id) {
          // Guard: Prevent zero or negative quantity in decrement
          const newQty = ci.quantity > 1 ? ci.quantity - 1 : 1;
          return { ...ci, quantity: newQty };
        }
        return ci;
      }),
    }));
  },

  clearCart: () => {
    set({
      cartItems: [],
      discount: 0,
    });
  },

  setTableNumber: (tableNumber: string) => {
    set({ tableNumber });
  },

  setGuestCount: (guestCount: number) => {
    set({ guestCount: Math.max(1, guestCount) });
  },

  setDiscount: (discount: number) => {
    // Clamp discount between 0% and 100%
    const validDiscount = Math.min(100, Math.max(0, isNaN(discount) ? 0 : discount));
    set({ discount: validDiscount });
  },
}));
