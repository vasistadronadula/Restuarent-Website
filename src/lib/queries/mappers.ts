/**
 * Row → domain-model mapping for every Supabase table the app reads.
 *
 * These live apart from the hooks because the POS, the bill printer and the
 * webhook routes all need to turn a raw row into an `Order` without pulling in
 * React Query.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Order, Reservation, MenuItem, InventoryItem, Employee } from '@/types';

// ─── Restaurant table types ───────────────────────────────────────────────────

export interface RestaurantTable {
  id: string; // 'T-001'
  tableNumber: number;
  capacity: number;
  description: string;
  isActive: boolean;
  createdAt: string;
}

export interface TableReservation {
  id: string;
  tableId: string;
  reservationId: string;
  date: string; // '2026-07-26'
  timeSlot: string; // '7:00 PM'
  createdAt: string;
}

// ─── Coupon ───────────────────────────────────────────────────────────────────

export interface Coupon {
  code: string;
  discount: number;
  maxDiscount: number;
  minOrder: number;
  description: string;
  isActive: boolean;
}

/**
 * The coupon code is the primary key, so read and write have to agree on its
 * shape — a stray space or lowercase letter meant an update or delete quietly
 * matched no row and reported success.
 */
export const normalizeCouponCode = (code: string) => code.toUpperCase().trim();

// ─── Mappers ──────────────────────────────────────────────────────────────────

export function mapOrder(o: any): Order {
  return {
    id: o.id,
    orderId: o.id,
    customerId: o.customer_email || 'GUEST',
    customerName: o.customer_name || 'Guest',
    customerPhone: o.customer_phone || '',
    customerAddress: o.delivery_address || 'Hyderabad',
    items: typeof o.items === 'string' ? (() => { try { return JSON.parse(o.items); } catch { return []; } })() : o.items || [],
    subtotal: Number(o.subtotal) || 0,
    cgst: Number(o.cgst) || 0,
    sgst: Number(o.sgst) || 0,
    discount: Number(o.discount) || 0,
    deliveryCharge: Number(o.delivery_charge) || 0,
    grandTotal: Number(o.grand_total) || 0,
    status: o.status || 'pending',
    paymentMode: o.payment_mode || 'cash',
    // 'unpaid', not 'pending' — 'pending' was never one of the app's
    // PaymentStatus values, so it rendered as an unknown state downstream.
    paymentStatus: o.payment_status || 'unpaid',
    orderDate: o.created_at
      ? new Date(o.created_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    orderTime: o.order_time || '00:00',
    couponCode: o.coupon_code,
    orderSource: o.order_source || 'direct',
    razorpayOrderId: o.razorpay_order_id || undefined,
    razorpayPaymentId: o.razorpay_payment_id || undefined,
    userId: o.user_id || null,
    orderType: o.order_type || 'takeaway',
    // Dine-in bills print the table number, so it has to survive a refetch
    // — it used to exist only on the in-memory object the POS just built.
    tableNumber: o.table_number ?? undefined,
  };
}

export function mapReservation(r: any): Reservation {
  return {
    id: r.id,
    customerName: r.name,
    customerPhone: r.phone,
    email: r.email || '',
    guests: Number(r.guests) || 2,
    date: r.date,
    time: r.time,
    specialRequest: r.request,
    status: r.status || 'confirmed',
    createdAt: r.created_at || new Date().toISOString(),
    userId: r.user_id || null,
  };
}

export function mapMenuItem(m: any): MenuItem {
  return {
    id: m.id,
    name: m.name,
    category: m.category,
    price: Number(m.price) || 0,
    image: m.image,
    vegStatus: m.veg_status || 'non-veg',
    rating: Number(m.rating) || 4.5,
    reviewCount: Number(m.review_count) || 100,
    isPopular: m.is_popular ?? false,
    isSpecial: m.is_special ?? false,
    isAvailable: m.is_available ?? true,
    description: m.description || '',
    prepTime: Number(m.prep_time) || 25,
    tags: m.tags || [],
    portionPrices: m.portion_prices || m.portionPrices,
  };
}

export function mapInventory(i: any): InventoryItem {
  const qty = Number(i.quantity) || 0;
  const minQty = Number(i.min_quantity) || 5;
  const cost = Number(i.unit_cost) || 0;
  return {
    id: i.id,
    name: i.name,
    category: i.category,
    quantity: qty,
    currentStock: qty,
    unit: i.unit,
    minQuantity: minQty,
    minStockThreshold: minQty,
    lastUpdated: i.last_restocked || 'Today',
    lastRestocked: i.last_restocked || 'Today',
    costPerUnit: cost,
    unitCost: cost,
    supplier: i.supplier || '',
  };
}

export function mapEmployee(e: any): Employee {
  return {
    id: e.id,
    name: e.name,
    role: e.role,
    phone: e.phone,
    email: e.email || '',
    joinDate: e.joining_date || new Date().toISOString().split('T')[0],
    salary: Number(e.salary) || 0,
    // Initials, not a stock photo — every employee previously got the same
    // stranger's face from an Unsplash URL hardcoded here.
    avatar: (e.name || '?')
      .split(' ')
      .filter(Boolean)
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2),
    isActive: e.status === 'Active',
    shift: e.shift?.toLowerCase() || 'morning',
  };
}

export function mapRestaurantTable(t: any): RestaurantTable {
  return {
    id: t.id,
    tableNumber: t.table_number,
    capacity: t.capacity,
    description: t.description || '',
    isActive: t.is_active ?? true,
    createdAt: t.created_at || '',
  };
}

export function mapCoupon(c: any): Coupon {
  return {
    code: c.code,
    discount: Number(c.discount) || 0,
    maxDiscount: Number(c.max_discount) || 0,
    minOrder: Number(c.min_order) || 0,
    description: c.description || '',
    isActive: c.is_active ?? true,
  };
}
