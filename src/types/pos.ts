export type MenuCategory = 'Starters' | 'Mains' | 'Desserts' | 'Beverages';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: MenuCategory;
  available: boolean;
  description?: string;
  image?: string;
  vegStatus?: 'veg' | 'non-veg';
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface OrderState {
  tableNumber: string;
  guestCount: number;
  cartItems: CartItem[];
  discount: number;
}

export type PaymentMethod = 'Cash' | 'Card' | 'UPI';

export interface HeldOrder {
  id: string;
  heldAt: string;
  tableNumber: string;
  guestCount: number;
  cartItems: CartItem[];
  discount: number;
  subtotal: number;
  total: number;
}
