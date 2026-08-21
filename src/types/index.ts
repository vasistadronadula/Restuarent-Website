// ============================================
// Pala Pitta Ruchulu - TypeScript Types
// ============================================

export type VegStatus = 'veg' | 'non-veg' | 'egg';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
// 'cash' | 'upi' | 'card' are collected at the POS till, 'razorpay' online by
// the customer, 'online' by an aggregator (Swiggy/Zomato). 'cod' is retained
// only so historical orders placed before Cash on Delivery was withdrawn
// still type-check when read back — nothing writes it any more.
export type PaymentMode = 'cash' | 'upi' | 'card' | 'cod' | 'razorpay' | 'online';
export type PaymentStatus = 'paid' | 'unpaid' | 'partial';
export type ReservationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'seated';

// Staff roles are shared between the auth layer (who can log in and access
// what) and the HR/Employees layer (who's on payroll) — kept as one type so
// the two can never drift out of sync.
export type StaffRole = 'admin' | 'manager' | 'chef' | 'cashier' | 'waiter';
export type EmployeeRole = StaffRole;
export type UserRole = 'customer' | StaffRole;
// Category is a free-form string so admins can create new categories from the
// UI without a code change. The original hardcoded values were:
// 'starters' | 'south-indian' | 'north-indian' | 'chinese' | 'biryani' |
// 'tandoori' | 'desserts' | 'beverages' | 'combos' | 'rice' | 'breads'
export type Category = string;

export interface MenuCategory {
  id: string;
  name: string;        // display label, e.g. "Biryani & Pulao"
  slug: string;        // URL/code key, e.g. "biryani"
  icon?: string;       // emoji icon (optional)
  image: string;       // admin-uploaded photo URL (Supabase Storage)
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
}

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

/**
 * What actually ends up in the `orders.items` JSON column.
 *
 * Three producers write it and they don't fully agree on a shape: the
 * storefront checkout and the POS both now write `menuItemId`, `category`
 * and (for the storefront) `vegStatus`, but the aggregator webhooks still
 * emit neither `portion` nor `category`, and historical orders placed before
 * the POS wrote `menuItemId` only have the legacy `id` field. This is the
 * honest union of all of that — name, price and quantity are the only
 * fields every writer supplies and every reader can rely on.
 *
 * It replaces the `any[]` that used to sit on `Order.items`, which made all
 * of those mismatches invisible.
 */
export interface PersistedOrderItem {
  name: string;
  price: number;
  quantity: number;
  /** Storefront, webhooks, and the POS (since it was taught to). */
  menuItemId?: string;
  /** Legacy — orders placed by the POS before it wrote `menuItemId`. */
  id?: string;
  vegStatus?: VegStatus;
  /** Storefront portion selection. */
  selectedPortion?: 'single' | 'full' | 'large';
  /** POS portion selection. */
  portion?: string;
  /** Read by Reports to group revenue; only present when the writer had it
   *  — aggregator webhooks still don't. */
  category?: string;
  /** Per-line kitchen note, POS only. */
  notes?: string;
}

export type OrderSource = 'direct' | 'swiggy' | 'zomato';
export type OrderType = 'takeaway' | 'dine-in' | 'counter';

export interface Order {
  id: string;
  orderId: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  // See PersistedOrderItem: the union of what the storefront, the POS and the
  // aggregator webhooks each write here. `OrderItem[]` assigns to it cleanly.
  items: PersistedOrderItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  discount?: number;
  deliveryCharge?: number;
  grandTotal: number;
  status: OrderStatus;
  paymentMode: PaymentMode;
  paymentStatus: PaymentStatus;
  orderDate?: string;
  orderTime?: string;
  createdAt?: string;
  deliveredAt?: string;
  tableNumber?: number;
  notes?: string;
  couponCode?: string;
  orderSource?: OrderSource;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  userId?: string | null;
  orderType?: OrderType;
  delayMinutes?: number;
  estimatedMinutes?: number;
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
  currentStock: number;
  unit: string;
  minStockThreshold: number;
  lastUpdated: string;
  lastRestocked?: string;
  category: string;
  unitCost: number;
  supplier?: string;
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
