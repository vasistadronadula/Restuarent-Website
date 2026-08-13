import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MenuItem, CartItem, OrderState, HeldOrder } from '@/types/pos';
import { OrderType } from '@/types';

export interface CartStoreState extends OrderState {
  heldOrders: HeldOrder[];

  // Actions
  addItem: (
    item: MenuItem,
    portion?: 'single' | 'full' | 'large',
    price?: number
  ) => void;
  removeItem: (id: string, portion?: 'single' | 'full' | 'large') => void;
  incrementQuantity: (id: string, portion?: 'single' | 'full' | 'large') => void;
  decrementQuantity: (id: string, portion?: 'single' | 'full' | 'large') => void;
  clearCart: () => void;
  setTableNumber: (tableNumber: string) => void;
  setGuestCount: (guestCount: number) => void;
  setDiscount: (discount: number) => void;
  setOrderType: (orderType: OrderType) => void;
  setCustomerName: (name: string) => void;
  setCustomerPhone: (phone: string) => void;
  setSpecialInstructions: (notes: string) => void;

  // Held Orders
  holdCurrentOrder: () => HeldOrder | null;
  resumeHeldOrder: (heldId: string) => void;
  removeHeldOrder: (heldId: string) => void;
}

export const useCartStore = create<CartStoreState>()(
  persist(
    (set, get) => ({
      orderType: 'dine-in',
      tableNumber: 'Table 1',
      guestCount: 2,
      customerName: '',
      customerPhone: '',
      specialInstructions: '',
      cartItems: [],
      discount: 0,
      heldOrders: [],

      addItem: (item: MenuItem, portion = 'full', customPrice) => {
        if (!item.isAvailable) return;

        const effectivePrice =
          customPrice ??
          (item.portionPrices && item.portionPrices[portion]
            ? item.portionPrices[portion]!
            : item.price);

        set((state) => {
          const existingItemIndex = state.cartItems.findIndex(
            (ci) =>
              ci.id === item.id &&
              (ci.selectedPortion || 'full') === portion
          );

          if (existingItemIndex > -1) {
            const updatedItems = [...state.cartItems];
            updatedItems[existingItemIndex] = {
              ...updatedItems[existingItemIndex],
              quantity: updatedItems[existingItemIndex].quantity + 1,
            };
            return { cartItems: updatedItems };
          }

          return {
            cartItems: [
              ...state.cartItems,
              {
                ...item,
                quantity: 1,
                selectedPortion: portion,
                selectedPrice: effectivePrice,
              },
            ],
          };
        });
      },

      removeItem: (id: string, portion = 'full') => {
        set((state) => ({
          cartItems: state.cartItems.filter(
            (ci) =>
              !(ci.id === id && (ci.selectedPortion || 'full') === portion)
          ),
        }));
      },

      incrementQuantity: (id: string, portion = 'full') => {
        set((state) => ({
          cartItems: state.cartItems.map((ci) =>
            ci.id === id && (ci.selectedPortion || 'full') === portion
              ? { ...ci, quantity: ci.quantity + 1 }
              : ci
          ),
        }));
      },

      decrementQuantity: (id: string, portion = 'full') => {
        set((state) => ({
          cartItems: state.cartItems.map((ci) => {
            if (
              ci.id === id &&
              (ci.selectedPortion || 'full') === portion
            ) {
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
          customerName: '',
          customerPhone: '',
          specialInstructions: '',
        });
      },

      setTableNumber: (tableNumber: string) => {
        set({ tableNumber });
      },

      setGuestCount: (guestCount: number) => {
        set({ guestCount: Math.max(1, guestCount) });
      },

      setDiscount: (discount: number) => {
        const validDiscount = Math.min(
          100,
          Math.max(0, isNaN(discount) ? 0 : discount)
        );
        set({ discount: validDiscount });
      },

      setOrderType: (orderType: OrderType) => {
        set({ orderType });
      },

      setCustomerName: (customerName: string) => {
        set({ customerName });
      },

      setCustomerPhone: (customerPhone: string) => {
        set({ customerPhone });
      },

      setSpecialInstructions: (specialInstructions: string) => {
        set({ specialInstructions });
      },

      holdCurrentOrder: () => {
        const { cartItems, tableNumber, guestCount, discount, customerName, customerPhone } =
          get();
        if (cartItems.length === 0) return null;

        const subtotal = cartItems.reduce(
          (sum, item) => sum + (item.selectedPrice ?? item.price) * item.quantity,
          0
        );
        const discountAmt = (subtotal * discount) / 100;
        const total = (subtotal - discountAmt) * 1.05; // 5% GST (2.5% CGST + 2.5% SGST)

        const newHeldOrder: HeldOrder = {
          id: `HLD-${Date.now().toString().slice(-4)}`,
          heldAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          tableNumber,
          guestCount,
          cartItems: [...cartItems],
          discount,
          subtotal,
          total,
          customerName,
          customerPhone,
        };

        set((state) => ({
          heldOrders: [newHeldOrder, ...state.heldOrders],
          cartItems: [],
          discount: 0,
          customerName: '',
          customerPhone: '',
          specialInstructions: '',
        }));

        return newHeldOrder;
      },

      resumeHeldOrder: (heldId: string) => {
        const { heldOrders } = get();
        const held = heldOrders.find((h) => h.id === heldId);
        if (!held) return;

        set((state) => ({
          cartItems: held.cartItems,
          tableNumber: held.tableNumber,
          guestCount: held.guestCount,
          discount: held.discount,
          customerName: held.customerName || '',
          customerPhone: held.customerPhone || '',
          heldOrders: state.heldOrders.filter((h) => h.id !== heldId),
        }));
      },

      removeHeldOrder: (heldId: string) => {
        set((state) => ({
          heldOrders: state.heldOrders.filter((h) => h.id !== heldId),
        }));
      },
    }),
    {
      name: 'palapitta-pos-store',
      partialize: (state) => ({
        tableNumber: state.tableNumber,
        guestCount: state.guestCount,
        orderType: state.orderType,
        heldOrders: state.heldOrders,
      }),
    }
  )
);
