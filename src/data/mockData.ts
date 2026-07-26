import { Customer, Order, Reservation, DailySales, Employee, InventoryItem, Review } from '@/types';

// ============================================
// REAL USER DATA ONLY - NO MOCK DEMO DATA
// All initial arrays start empty and populate purely from real database CRUD
// ============================================

export const customers: Customer[] = [];

export const orders: Order[] = [];

export const reservations: Reservation[] = [];

export const dailySales: DailySales[] = [];

export const categoryRevenue: { name: string; value: number }[] = [];

export const employees: Employee[] = [];

export const inventory: InventoryItem[] = [];

// Customer Feedback Testimonials
export const reviews: Review[] = [
  {
    id: 'rv1',
    customerName: 'Srinivas Rao',
    avatar: 'SR',
    rating: 5,
    comment: 'The Bagara Chicken 4-Curries Unlimited Combo at ₹250 is unbelievable value! Unlimited Bagara rice with fish fry, chicken fry & curry.',
    date: 'July 20, 2026',
    dish: 'Bagara Chicken 4-Curries Unlimited Combo',
  },
  {
    id: 'rv2',
    customerName: 'Priya Reddy',
    avatar: 'PR',
    rating: 5,
    comment: 'Godavari Spl. Junnu was heavenly! Traditional colostrum milk sweet just like back home.',
    date: 'July 18, 2026',
    dish: 'Godavari Spl. Junnu',
  },
  {
    id: 'rv3',
    customerName: 'Venkat Ramana',
    avatar: 'VR',
    rating: 5,
    comment: 'Hyd Chicken Dum Biryani at ₹200 and PPR Special Chicken Pulao are outstanding. Quick delivery!',
    date: 'July 15, 2026',
    dish: 'PPR Special Chicken Pulao',
  },
];

// Discount coupons are managed by admins and served from the `coupons`
// table (see store/supabaseApi.ts useGetCouponsQuery) — no static list here.
