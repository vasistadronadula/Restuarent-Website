import type {
  MenuItem as DbMenuItem,
  VegStatus,
  OrderType,
  PaymentMode,
  MenuCategory as DbMenuCategory,
} from '@/types';

export type MenuItem = DbMenuItem;

export interface CartItem extends MenuItem {
  quantity: number;
  selectedPortion?: 'single' | 'full' | 'large';
  selectedPrice?: number;
}

export interface OrderState {
  orderType: OrderType;
  tableNumber: string;
  guestCount: number;
  customerName: string;
  customerPhone: string;
  specialInstructions: string;
  cartItems: CartItem[];
  discount: number;
}

export type PaymentMethod = 'Cash' | 'Card' | 'UPI' | 'QR';

export interface HeldOrder {
  id: string;
  heldAt: string;
  tableNumber: string;
  guestCount: number;
  cartItems: CartItem[];
  discount: number;
  subtotal: number;
  total: number;
  customerName?: string;
  customerPhone?: string;
}
