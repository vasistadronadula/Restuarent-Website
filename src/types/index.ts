// ============================================
// Pala Pitta Ruchulu - TypeScript Types
// ============================================

export type VegStatus = 'veg' | 'non-veg' | 'egg';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
export type PaymentMode = 'cash' | 'upi' | 'card' | 'cod' | 'razorpay' | 'online';
export type PaymentStatus = 'paid' | 'unpaid' | 'partial';
export type ReservationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type EmployeeRole = 'admin' | 'manager' | 'cashier' | 'chef' | 'waiter';
export type Category =
  | 'starters'
  | 'south-indian'
  | 'north-indian'
  | 'chinese'
  | 'biryani'
  | 'tandoori'
  | 'desserts'
  | 'beverages'
  | 'combos'
  | 'rice'
  | 'breads';

export interface PortionPrices {
  single?: number;
  full?: number;
  large?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  vegStatus: VegStatus;
  rating: number;
  reviewCount: number;
  image: string;
  isPopular: boolean;
  isAvailable: boolean;
  isSpecial: boolean;
  tags: string[];
  spiceLevel?: 1 | 2 | 3;
  prepTime?: number; // in minutes
  portionPrices?: PortionPrices; // S, F, L prices
}

export interface CartItem extends MenuItem {
  quantity: number;
  selectedPortion?: 'single' | 'full' | 'large';
  selectedPrice?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  totalOrders: number;
  totalSpent: number;
  loyaltyPoints: number;
  joinDate: string;
  lastVisit: string;
  avatar: string;
  isVip: boolean;
  favoriteItems: string[];
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  vegStatus: VegStatus;
  selectedPortion?: 'single' | 'full' | 'large';
}

export type OrderSource = 'direct' | 'swiggy' | 'zomato';
export type OrderType = 'takeaway' | 'dine-in' | 'counter';

export interface Order {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: OrderItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  discount: number;
  deliveryCharge: number;
  grandTotal: number;
  status: OrderStatus;
  paymentMode: PaymentMode;
  paymentStatus: PaymentStatus;
  orderDate: string;
  orderTime: string;
  deliveredAt?: string;
  tableNumber?: number;
  notes?: string;
  couponCode?: string;
  orderSource?: OrderSource;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  userId?: string | null;
  orderType?: OrderType;
}

export interface Reservation {
  id: string;
  customerName: string;
  customerPhone: string;
  email: string;
  guests: number;
  date: string;
  time: string;
  tableNumber?: number;
  status: ReservationStatus;
  specialRequest?: string;
  createdAt: string;
  userId?: string | null;
}

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  phone: string;
  email: string;
  joinDate: string;
  salary: number;
  avatar: string;
  isActive: boolean;
  shift: 'morning' | 'evening' | 'night';
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minQuantity: number;
  lastUpdated: string;
  category: string;
  costPerUnit: number;
}

export interface DailySales {
  date: string;
  revenue: number;
  orders: number;
  customers: number;
}

export interface Bill {
  id: string;
  invoiceNo: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  items: OrderItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  discount: number;
  discountAmount: number;
  deliveryCharge: number;
  grandTotal: number;
  paymentMode: PaymentMode;
  paymentStatus: PaymentStatus;
  date: string;
  time: string;
  restaurantDetails: {
    name: string;
    address: string;
    phone: string;
    email: string;
    gstin: string;
    fssai: string;
  };
}

export interface Review {
  id: string;
  customerName: string;
  avatar: string;
  rating: number;
  comment: string;
  date: string;
  dish: string;
}

export interface Coupon {
  code: string;
  discount: number; // percentage
  maxDiscount: number;
  minOrder: number;
  description: string;
  isActive: boolean;
}

export interface KitchenOrder {
  orderId: string;
  items: OrderItem[];
  status: 'queued' | 'cooking' | 'ready';
  priority: 'normal' | 'high';
  startTime: string;
  estimatedTime: number; // minutes
}

export interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  todayReservations: number;
  totalCustomers: number;
  pendingOrders: number;
  revenueGrowth: number;
  ordersGrowth: number;
  customersGrowth: number;
}
