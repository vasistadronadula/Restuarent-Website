/**
 * supabaseApi.ts
 * RTK Query API layer for all Supabase data fetching.
 * - Auto-caches data per endpoint
 * - Mutations auto-invalidate related cache tags → triggers background refetch
 * - Optimistic updates on status changes for instant UI feedback
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { supabase } from '@/lib/supabase';
import { menuItems as fallbackMenuItems } from '@/data/menuData';
import {
  Order, Reservation, MenuItem, InventoryItem, Employee, OrderStatus, ReservationStatus, StaffRole,
} from '@/types';
import { generateOrderId, generateReservationId } from '@/lib/idGenerator';

// ─── Restaurant Table Types ───────────────────────────────────────────────────
export interface RestaurantTable {
  id: string;          // 'T-001'
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
  date: string;        // '2026-07-26'
  timeSlot: string;   // '7:00 PM'
  createdAt: string;
}

// ─── Coupon Type ────────────────────────────────────────────────────────────
export interface Coupon {
  code: string;
  discount: number;
  maxDiscount: number;
  minOrder: number;
  description: string;
  isActive: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// The coupon code is the primary key, so read and write have to agree on its
// shape — a stray space or lowercase letter meant an update or delete quietly
// matched no row and reported success.
const normalizeCouponCode = (code: string) => code.toUpperCase().trim();

function mapOrder(o: any): Order {
  return {
    id: o.id,
    orderId: o.id,
    customerId: o.customer_email || 'GUEST',
    customerName: o.customer_name || 'Guest',
    customerPhone: o.customer_phone || '',
    customerAddress: o.delivery_address || 'Hyderabad',
    items: typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []),
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

function mapReservation(r: any): Reservation {
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

function mapMenuItem(m: any): MenuItem {
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

function mapInventory(i: any): InventoryItem {
  return {
    id: i.id,
    name: i.name,
    category: i.category,
    quantity: Number(i.quantity) || 0,
    unit: i.unit,
    minQuantity: Number(i.min_quantity) || 5,
    lastUpdated: i.last_restocked || 'Today',
    costPerUnit: Number(i.unit_cost) || 0,
  };
}

function mapEmployee(e: any): Employee {
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

// ─── RTK Query API ────────────────────────────────────────────────────────────

export const supabaseApi = createApi({
  reducerPath: 'supabaseApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Orders', 'Reservations', 'MenuItems', 'Inventory', 'Employees', 'Tables', 'TableSlots', 'Coupons'],
  endpoints: (builder) => ({

    // ── Orders ──────────────────────────────────────────────────────────────

    getOrders: builder.query<Order[], void>({
      queryFn: async () => {
        try {
          const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });
          if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
          return { data: (data || []).map(mapOrder) };
        } catch (err: any) {
          return { error: { status: 'FETCH_ERROR', error: err.message } };
        }
      },
      providesTags: ['Orders'],
      // Keep order data fresh — realtime middleware will also invalidate
      keepUnusedDataFor: 60,
    }),

    updateOrderStatus: builder.mutation<boolean, { id: string; status: OrderStatus }>({
      queryFn: async ({ id, status }) => {
        try {
          const { error } = await supabase.from('orders').update({ status }).eq('id', id);
          if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
          return { data: true };
        } catch (err: any) {
          return { error: { status: 'FETCH_ERROR', error: err.message } };
        }
      },
      // Optimistic update: instantly reflect status change in cache before DB confirms
      onQueryStarted: async ({ id, status }, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          supabaseApi.util.updateQueryData('getOrders', undefined, (draft) => {
            const order = draft.find((o) => o.id === id);
            if (order) order.status = status;
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo(); // Revert if DB update fails
        }
      },
      invalidatesTags: ['Orders'],
    }),

    createOrder: builder.mutation<Order, Partial<Order>>({
      queryFn: async (orderData) => {
        // Always use new date-stamped ID format
        const orderId = orderData.id || generateOrderId();
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        const newOrder: Order = {
          id: orderId, orderId,
          customerId: orderData.customerId || 'GUEST',
          customerName: orderData.customerName || 'Guest Diner',
          customerPhone: orderData.customerPhone || '',
          customerAddress: orderData.customerAddress || 'Takeaway — Collect from Restaurant',
          items: orderData.items || [],
          subtotal: orderData.subtotal || 0,
          cgst: orderData.cgst || 0, sgst: orderData.sgst || 0,
          discount: orderData.discount || 0,
          deliveryCharge: 0,   // Always 0 — takeaway only
          grandTotal: orderData.grandTotal || 0,
          status: 'pending',
          paymentMode: orderData.paymentMode || 'cash',
          // Trust the caller's payment status. This used to be derived from
          // "is it COD?", which — now that every order is prepaid or taken at
          // the till — marked everything 'paid', including the checkout case
          // where a Razorpay charge could not be verified server-side and is
          // deliberately saved as 'unpaid' for manual reconciliation.
          paymentStatus: orderData.paymentStatus || 'unpaid',
          orderDate: now.toISOString().split('T')[0],
          orderTime: timeStr,
          couponCode: orderData.couponCode,
          orderSource: orderData.orderSource || 'direct',
          orderType: orderData.orderType || 'takeaway',
          tableNumber: orderData.tableNumber,
        };
        try {
          const row = {
            id: orderId,                          // PPR-ORD-20260725-4821
            customer_name: newOrder.customerName,
            customer_phone: newOrder.customerPhone,
            customer_email: newOrder.customerId,
            delivery_address: newOrder.customerAddress,
            order_type: orderData.orderType || 'takeaway',
            payment_mode: newOrder.paymentMode,
            payment_status: newOrder.paymentStatus,
            items: newOrder.items,
            subtotal: newOrder.subtotal,
            cgst: newOrder.cgst, sgst: newOrder.sgst,
            delivery_charge: 0,
            discount: newOrder.discount,
            grand_total: newOrder.grandTotal,
            status: 'pending',
            order_time: timeStr,
            coupon_code: newOrder.couponCode || null,
            order_source: newOrder.orderSource || 'direct',
            user_id: orderData.userId || null,
            razorpay_order_id: orderData.razorpayOrderId || null,
            razorpay_payment_id: orderData.razorpayPaymentId || null,
          };

          let { error } = await supabase
            .from('orders')
            .insert([{ ...row, table_number: newOrder.tableNumber ?? null }]);

          // 42703 = undefined_column. orders.table_number arrives with the
          // schema update in supabase_schema.sql section 13; until that has
          // been run, saving the order matters far more than recording which
          // table it came from, so retry without it rather than losing the
          // sale. Once the column exists this branch never runs.
          if (error?.code === '42703') {
            console.warn('orders.table_number missing — run supabase_schema.sql to store dine-in table numbers');
            ({ error } = await supabase.from('orders').insert([row]));
          }

          if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        } catch (e: any) {
          return { error: { status: 'FETCH_ERROR', error: e?.message || 'Failed to save order' } };
        }
        return { data: { ...newOrder, razorpayOrderId: orderData.razorpayOrderId, razorpayPaymentId: orderData.razorpayPaymentId } };
      },
      invalidatesTags: ['Orders'],
    }),

    // ── Reservations ─────────────────────────────────────────────────────────

    getReservations: builder.query<Reservation[], void>({
      queryFn: async () => {
        try {
          const { data, error } = await supabase
            .from('reservations').select('*').order('created_at', { ascending: false });
          if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
          return { data: (data || []).map(mapReservation) };
        } catch (err: any) {
          return { error: { status: 'FETCH_ERROR', error: err.message } };
        }
      },
      providesTags: ['Reservations'],
      keepUnusedDataFor: 60,
    }),

    updateReservationStatus: builder.mutation<boolean, { id: string; status: ReservationStatus }>({
      queryFn: async ({ id, status }) => {
        try {
          const { error } = await supabase.from('reservations').update({ status }).eq('id', id);
          if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
          return { data: true };
        } catch (err: any) {
          return { error: { status: 'FETCH_ERROR', error: err.message } };
        }
      },
      onQueryStarted: async ({ id, status }, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          supabaseApi.util.updateQueryData('getReservations', undefined, (draft) => {
            const res = draft.find((r) => r.id === id);
            if (res) res.status = status;
          })
        );
        try { await queryFulfilled; } catch { patch.undo(); }
      },
      invalidatesTags: ['Reservations'],
    }),

    createReservation: builder.mutation<Reservation, Partial<Reservation> & { tableId?: string; tableNumber?: number }>({
      queryFn: async (resData) => {
        // Always use new date-stamped ID format
        const resId = resData.id || generateReservationId();
        const newRes: Reservation = {
          id: resId,
          customerName: resData.customerName || 'Guest',
          customerPhone: resData.customerPhone || '',
          email: resData.email || '',
          guests: resData.guests || 2,
          date: resData.date || new Date().toISOString().split('T')[0],
          time: resData.time || '19:30',
          specialRequest: resData.specialRequest || '',
          status: 'confirmed',
          createdAt: new Date().toISOString(),
        };
        try {
          const { error } = await supabase.from('reservations').insert([{
            id: resId,                                  // PPR-RES-20260725-3914
            name: newRes.customerName,
            phone: newRes.customerPhone,
            email: newRes.email,
            guests: newRes.guests,
            date: newRes.date,
            time: newRes.time,
            request: newRes.specialRequest,
            status: 'confirmed',
            table_id: resData.tableId || null,         // Saved to DB
            table_number: resData.tableNumber || null, // Saved to DB
            user_id: resData.userId || null,
          }]);
          if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        } catch (e: any) {
          return { error: { status: 'FETCH_ERROR', error: e?.message || 'Failed to save reservation' } };
        }
        return { data: newRes };
      },
      invalidatesTags: ['Reservations'],
    }),

    // ── Menu Items ───────────────────────────────────────────────────────────

    getMenuItems: builder.query<MenuItem[], void>({
      queryFn: async () => {
        try {
          // Explicit ordering: without it Postgres may return rows in any
          // order, and an UPDATE physically moves a row — so editing one dish
          // reshuffled the whole menu list under the admin's cursor.
          const { data, error } = await supabase
            .from('menu_items')
            .select('*')
            .order('created_at', { ascending: false });

          // The bundled demo menu is a last resort for the storefront when
          // the database is unreachable — never a stand-in for an empty
          // table. It used to fire on `data.length === 0` too, so deleting
          // the last dish repopulated the menu with demo items that the
          // admin could then neither edit nor delete.
          if (error) return { data: fallbackMenuItems };
          return { data: (data || []).map(mapMenuItem) };
        } catch {
          return { data: fallbackMenuItems };
        }
      },
      providesTags: ['MenuItems'],
      keepUnusedDataFor: 60, // 1-min cache — realtime handles instant admin updates
    }),

    addMenuItem: builder.mutation<boolean, MenuItem>({
      queryFn: async (item) => {
        try {
          const { error } = await supabase.from('menu_items').insert([{
            id: item.id, name: item.name, category: item.category, price: item.price,
            image: item.image, veg_status: item.vegStatus, rating: item.rating,
            review_count: item.reviewCount, is_popular: item.isPopular,
            is_special: item.isSpecial, is_available: item.isAvailable,
            description: item.description, prep_time: item.prepTime,
            tags: item.tags, portion_prices: item.portionPrices,
          }]);
          if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
          return { data: true };
        } catch (err: any) {
          return { error: { status: 'FETCH_ERROR', error: err.message } };
        }
      },
      onQueryStarted: async (item, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          supabaseApi.util.updateQueryData('getMenuItems', undefined, (draft) => {
            const exists = draft.some((m) => m.id === item.id);
            if (!exists) draft.unshift(item);
          })
        );
        try { await queryFulfilled; } catch { patch.undo(); }
      },
      invalidatesTags: ['MenuItems'],
    }),

    updateMenuItem: builder.mutation<boolean, MenuItem>({
      queryFn: async (item) => {
        try {
          const { error } = await supabase.from('menu_items').update({
            name: item.name,
            category: item.category,
            price: item.price,
            image: item.image,
            veg_status: item.vegStatus,
            rating: item.rating,
            review_count: item.reviewCount,
            is_popular: item.isPopular,
            is_special: item.isSpecial,
            is_available: item.isAvailable,
            description: item.description,
            prep_time: item.prepTime,
            tags: item.tags,
            portion_prices: item.portionPrices,
          }).eq('id', item.id);
          if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
          return { data: true };
        } catch (err: any) {
          return { error: { status: 'FETCH_ERROR', error: err.message } };
        }
      },
      onQueryStarted: async (item, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          supabaseApi.util.updateQueryData('getMenuItems', undefined, (draft) => {
            const idx = draft.findIndex((m) => m.id === item.id);
            if (idx !== -1) draft[idx] = item;
          })
        );
        try { await queryFulfilled; } catch { patch.undo(); }
      },
      invalidatesTags: ['MenuItems'],
    }),

    deleteMenuItem: builder.mutation<boolean, string>({
      queryFn: async (id) => {
        try {
          const { error } = await supabase.from('menu_items').delete().eq('id', id);
          if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
          return { data: true };
        } catch (err: any) {
          return { error: { status: 'FETCH_ERROR', error: err.message } };
        }
      },
      onQueryStarted: async (id, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          supabaseApi.util.updateQueryData('getMenuItems', undefined, (draft) => {
            const idx = draft.findIndex((m) => m.id === id);
            if (idx !== -1) draft.splice(idx, 1);
          })
        );
        try { await queryFulfilled; } catch { patch.undo(); }
      },
      invalidatesTags: ['MenuItems'],
    }),

    // ── Inventory ────────────────────────────────────────────────────────────

    getInventory: builder.query<InventoryItem[], void>({
      queryFn: async () => {
        try {
          const { data, error } = await supabase
            .from('inventory_items')
            .select('*')
            .order('name', { ascending: true });
          // Surface the failure instead of returning []. Swallowing it made a
          // permission or network error look exactly like "you have no stock
          // items", which is the one reading a manager must not be given.
          if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
          return { data: (data || []).map(mapInventory) };
        } catch (err: any) {
          return { error: { status: 'FETCH_ERROR', error: err?.message || 'Failed to load inventory' } };
        }
      },
      providesTags: ['Inventory'],
      keepUnusedDataFor: 120,
    }),

    addInventoryItem: builder.mutation<boolean, InventoryItem>({
      queryFn: async (item) => {
        try {
          const { error } = await supabase.from('inventory_items').insert([{
            id: item.id, name: item.name, category: item.category,
            quantity: item.quantity, unit: item.unit,
            min_quantity: item.minQuantity, unit_cost: item.costPerUnit,
            last_restocked: new Date().toISOString().split('T')[0],
          }]);
          if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
          return { data: true };
        } catch (err: any) {
          return { error: { status: 'FETCH_ERROR', error: err.message } };
        }
      },
      // Show the new item immediately and roll it back if the insert fails —
      // the list previously sat unchanged until a full refetch came back.
      onQueryStarted: async (item, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          supabaseApi.util.updateQueryData('getInventory', undefined, (draft) => {
            if (!draft.some((i) => i.id === item.id)) draft.unshift(item);
          })
        );
        try { await queryFulfilled; } catch { patch.undo(); }
      },
      invalidatesTags: ['Inventory'],
    }),

    updateInventoryItem: builder.mutation<boolean, InventoryItem>({
      queryFn: async (item) => {
        try {
          const { error } = await supabase.from('inventory_items').update({
            name: item.name, category: item.category, quantity: item.quantity,
            unit: item.unit, min_quantity: item.minQuantity,
            unit_cost: item.costPerUnit,
            last_restocked: new Date().toISOString().split('T')[0],
          }).eq('id', item.id);
          if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
          return { data: true };
        } catch (err: any) {
          return { error: { status: 'FETCH_ERROR', error: err.message } };
        }
      },
      onQueryStarted: async (item, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          supabaseApi.util.updateQueryData('getInventory', undefined, (draft) => {
            const idx = draft.findIndex((i) => i.id === item.id);
            if (idx !== -1) draft[idx] = item;
          })
        );
        try { await queryFulfilled; } catch { patch.undo(); }
      },
      invalidatesTags: ['Inventory'],
    }),

    deleteInventoryItem: builder.mutation<boolean, string>({
      queryFn: async (id) => {
        try {
          const { error } = await supabase.from('inventory_items').delete().eq('id', id);
          if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
          return { data: true };
        } catch (err: any) {
          return { error: { status: 'FETCH_ERROR', error: err.message } };
        }
      },
      onQueryStarted: async (id, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          supabaseApi.util.updateQueryData('getInventory', undefined, (draft) => {
            const idx = draft.findIndex((i) => i.id === id);
            if (idx !== -1) draft.splice(idx, 1);
          })
        );
        try { await queryFulfilled; } catch { patch.undo(); }
      },
      invalidatesTags: ['Inventory'],
    }),

    // ── Employees ────────────────────────────────────────────────────────────

    getEmployees: builder.query<Employee[], void>({
      queryFn: async () => {
        try {
          const { data, error } = await supabase
            .from('employees')
            .select('*')
            .order('name', { ascending: true });
          // Same reasoning as inventory: an RLS or network failure must not
          // render as an empty team.
          if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
          return { data: (data || []).map(mapEmployee) };
        } catch (err: any) {
          return { error: { status: 'FETCH_ERROR', error: err?.message || 'Failed to load team' } };
        }
      },
      providesTags: ['Employees'],
      keepUnusedDataFor: 300,
    }),

    // Employee create/update/delete are the first mutations in this file that
    // can't go straight to `supabase.from(...)` under RLS — creating a login
    // requires the service-role key, which only exists server-side. These
    // call the /api/admin/employees route(s) instead, forwarding the current
    // session's access token so the server can verify the caller is actually
    // an admin (see src/lib/auth/requireAdmin.ts).
    addEmployee: builder.mutation<boolean, {
      id: string; name: string; email: string; phone?: string; role: StaffRole;
      shift?: string; salary?: number; password: string;
    }>({
      queryFn: async (payload) => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return { error: { status: 'CUSTOM_ERROR', error: 'Not signed in' } };
          const res = await fetch('/api/admin/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify(payload),
          });
          const json = await res.json();
          if (!res.ok) return { error: { status: 'CUSTOM_ERROR', error: json.error || 'Failed to add employee' } };
          return { data: true };
        } catch (err: any) {
          return { error: { status: 'FETCH_ERROR', error: err.message } };
        }
      },
      invalidatesTags: ['Employees'],
    }),

    // Also used for the Active/Inactive toggle — pass just `{ id, status }`.
    updateEmployee: builder.mutation<boolean, { id: string } & Partial<{
      name: string; phone: string; role: StaffRole; shift: string; salary: number;
      status: 'Active' | 'Inactive';
    }>>({
      queryFn: async ({ id, ...rest }) => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return { error: { status: 'CUSTOM_ERROR', error: 'Not signed in' } };
          const res = await fetch(`/api/admin/employees/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify(rest),
          });
          const json = await res.json();
          if (!res.ok) return { error: { status: 'CUSTOM_ERROR', error: json.error || 'Failed to update employee' } };
          return { data: true };
        } catch (err: any) {
          return { error: { status: 'FETCH_ERROR', error: err.message } };
        }
      },
      // The Active/Inactive switch runs through here, so it has to move the
      // moment it's tapped rather than after a round trip to the API route
      // and a refetch of the whole team.
      onQueryStarted: async ({ id, ...rest }, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          supabaseApi.util.updateQueryData('getEmployees', undefined, (draft) => {
            const emp = draft.find((e) => e.id === id);
            if (!emp) return;
            if (rest.name !== undefined) emp.name = rest.name;
            if (rest.phone !== undefined) emp.phone = rest.phone;
            if (rest.role !== undefined) emp.role = rest.role;
            // Shift is a free-text field on the wire but a fixed set on the
            // Employee model; only patch a value the model recognises and
            // let the refetch reconcile anything unexpected.
            if (rest.shift === 'morning' || rest.shift === 'evening' || rest.shift === 'night') {
              emp.shift = rest.shift;
            }
            if (rest.salary !== undefined) emp.salary = rest.salary;
            if (rest.status !== undefined) emp.isActive = rest.status === 'Active';
          })
        );
        try { await queryFulfilled; } catch { patch.undo(); }
      },
      invalidatesTags: ['Employees'],
    }),

    deleteEmployee: builder.mutation<boolean, string>({
      queryFn: async (id) => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return { error: { status: 'CUSTOM_ERROR', error: 'Not signed in' } };
          const res = await fetch(`/api/admin/employees/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          const json = await res.json();
          if (!res.ok) return { error: { status: 'CUSTOM_ERROR', error: json.error || 'Failed to delete employee' } };
          return { data: true };
        } catch (err: any) {
          return { error: { status: 'FETCH_ERROR', error: err.message } };
        }
      },
      onQueryStarted: async (id, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          supabaseApi.util.updateQueryData('getEmployees', undefined, (draft) => {
            const idx = draft.findIndex((e) => e.id === id);
            if (idx !== -1) draft.splice(idx, 1);
          })
        );
        try { await queryFulfilled; } catch { patch.undo(); }
      },
      invalidatesTags: ['Employees'],
    }),

    // ── Restaurant Tables ─────────────────────────────────────────────────────

    getTables: builder.query<RestaurantTable[], void>({
      queryFn: async () => {
        try {
          const { data, error } = await supabase
            .from('restaurant_tables')
            .select('*')
            .order('table_number', { ascending: true });
          if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
          return {
            data: (data || []).map((t: any) => ({
              id: t.id,
              tableNumber: t.table_number,
              capacity: t.capacity,
              description: t.description || '',
              isActive: t.is_active ?? true,
              createdAt: t.created_at || '',
            })),
          };
        } catch (err: any) {
          return { error: { status: 'FETCH_ERROR', error: err.message } };
        }
      },
      providesTags: ['Tables'],
      keepUnusedDataFor: 120,
    }),

    /** Returns table IDs that are already booked for a given date+time */
    getBookedTableSlots: builder.query<string[], { date: string; timeSlot: string }>({
      queryFn: async ({ date, timeSlot }) => {
        try {
          const { data, error } = await supabase
            .from('table_reservations')
            .select('table_id')
            .eq('date', date)
            .eq('time_slot', timeSlot);
          if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
          return { data: (data || []).map((r: any) => r.table_id) };
        } catch (err: any) {
          return { error: { status: 'FETCH_ERROR', error: err.message } };
        }
      },
      providesTags: ['TableSlots'],
      keepUnusedDataFor: 30, // refresh often — slot availability changes
    }),

    addTable: builder.mutation<boolean, { id: string; tableNumber: number; capacity: number; description: string }>({
      queryFn: async (t) => {
        try {
          const { error } = await supabase.from('restaurant_tables').insert([{
            id: t.id,
            table_number: t.tableNumber,
            capacity: t.capacity,
            description: t.description,
            is_active: true,
          }]);
          if (error) {
            const message = error.code === '23505'
              ? `Table ${t.tableNumber} already exists`
              : error.message;
            return { error: { status: 'CUSTOM_ERROR', error: message } };
          }
          return { data: true };
        } catch (err: any) {
          return { error: { status: 'FETCH_ERROR', error: err.message } };
        }
      },
      onQueryStarted: async (t, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          supabaseApi.util.updateQueryData('getTables', undefined, (draft) => {
            if (draft.some((x) => x.id === t.id)) return;
            draft.push({ ...t, isActive: true, createdAt: new Date().toISOString() });
            draft.sort((a, b) => a.tableNumber - b.tableNumber);
          })
        );
        try { await queryFulfilled; } catch { patch.undo(); }
      },
      invalidatesTags: ['Tables'],
    }),

    updateTable: builder.mutation<boolean, RestaurantTable>({
      queryFn: async (t) => {
        try {
          const { error } = await supabase.from('restaurant_tables').update({
            capacity: t.capacity,
            description: t.description,
            is_active: t.isActive,
          }).eq('id', t.id);
          if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
          return { data: true };
        } catch (err: any) {
          return { error: { status: 'FETCH_ERROR', error: err.message } };
        }
      },
      onQueryStarted: async (t, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          supabaseApi.util.updateQueryData('getTables', undefined, (draft) => {
            const idx = draft.findIndex((x) => x.id === t.id);
            if (idx !== -1) draft[idx] = t;
          })
        );
        try { await queryFulfilled; } catch { patch.undo(); }
      },
      invalidatesTags: ['Tables'],
    }),

    deleteTable: builder.mutation<boolean, string>({
      queryFn: async (id) => {
        try {
          const { error } = await supabase.from('restaurant_tables').delete().eq('id', id);
          if (error) {
            // A table with bookings is referenced by table_reservations.
            const message = error.code === '23503'
              ? 'This table still has bookings — release or complete them first'
              : error.message;
            return { error: { status: 'CUSTOM_ERROR', error: message } };
          }
          return { data: true };
        } catch (err: any) {
          return { error: { status: 'FETCH_ERROR', error: err.message } };
        }
      },
      onQueryStarted: async (id, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          supabaseApi.util.updateQueryData('getTables', undefined, (draft) => {
            const idx = draft.findIndex((x) => x.id === id);
            if (idx !== -1) draft.splice(idx, 1);
          })
        );
        try { await queryFulfilled; } catch { patch.undo(); }
      },
      invalidatesTags: ['Tables'],
    }),

    /** Lock a table slot when a reservation is confirmed */
    bookTableSlot: builder.mutation<boolean, { id: string; tableId: string; reservationId: string; date: string; timeSlot: string }>({
      queryFn: async (slot) => {
        try {
          const { error } = await supabase.from('table_reservations').insert([{
            id: slot.id,
            table_id: slot.tableId,
            reservation_id: slot.reservationId,
            date: slot.date,
            time_slot: slot.timeSlot,
          }]);
          if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
          return { data: true };
        } catch (err: any) {
          return { error: { status: 'FETCH_ERROR', error: err.message } };
        }
      },
      invalidatesTags: ['TableSlots', 'Tables'],
    }),

    /** Free a table slot when reservation is completed or cancelled */
    releaseTableSlot: builder.mutation<boolean, string>({
      queryFn: async (reservationId) => {
        try {
          const { error } = await supabase
            .from('table_reservations')
            .delete()
            .eq('reservation_id', reservationId);
          if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
          return { data: true };
        } catch (err: any) {
          return { error: { status: 'FETCH_ERROR', error: err.message } };
        }
      },
      invalidatesTags: ['TableSlots', 'Tables'],
    }),
    // ── Coupons ──────────────────────────────────────────────────────────────

    getCoupons: builder.query<Coupon[], void>({
      queryFn: async () => {
        try {
          const { data, error } = await supabase.from('coupons').select('*').order('code');
          if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
          return {
            data: (data || []).map((c: any) => ({
              code: c.code,
              discount: Number(c.discount) || 0,
              maxDiscount: Number(c.max_discount) || 0,
              minOrder: Number(c.min_order) || 0,
              description: c.description || '',
              isActive: c.is_active ?? true,
            })),
          };
        } catch (err: any) {
          return { error: { status: 'FETCH_ERROR', error: err.message } };
        }
      },
      providesTags: ['Coupons'],
      keepUnusedDataFor: 120,
    }),

    addCoupon: builder.mutation<boolean, Coupon>({
      queryFn: async (c) => {
        try {
          const { error } = await supabase.from('coupons').insert([{
            code: normalizeCouponCode(c.code),
            discount: c.discount,
            max_discount: c.maxDiscount,
            min_order: c.minOrder,
            description: c.description,
            is_active: c.isActive,
          }]);
          if (error) {
            // The primary key is the code itself, so a duplicate is the one
            // failure a manager will actually hit — say so in their words.
            const message = error.code === '23505'
              ? `Coupon ${normalizeCouponCode(c.code)} already exists`
              : error.message;
            return { error: { status: 'CUSTOM_ERROR', error: message } };
          }
          return { data: true };
        } catch (err: any) {
          return { error: { status: 'FETCH_ERROR', error: err.message } };
        }
      },
      onQueryStarted: async (c, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          supabaseApi.util.updateQueryData('getCoupons', undefined, (draft) => {
            const code = normalizeCouponCode(c.code);
            if (!draft.some((x) => x.code === code)) draft.push({ ...c, code });
          })
        );
        try { await queryFulfilled; } catch { patch.undo(); }
      },
      invalidatesTags: ['Coupons'],
    }),

    updateCoupon: builder.mutation<boolean, Coupon>({
      queryFn: async (c) => {
        try {
          const { error } = await supabase.from('coupons').update({
            discount: c.discount,
            max_discount: c.maxDiscount,
            min_order: c.minOrder,
            description: c.description,
            is_active: c.isActive,
          }).eq('code', normalizeCouponCode(c.code));
          if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
          return { data: true };
        } catch (err: any) {
          return { error: { status: 'FETCH_ERROR', error: err.message } };
        }
      },
      // Drives the active/inactive switch too, which is why it has to feel
      // instant: the toggle used to snap back until the refetch landed.
      onQueryStarted: async (c, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          supabaseApi.util.updateQueryData('getCoupons', undefined, (draft) => {
            const idx = draft.findIndex((x) => x.code === normalizeCouponCode(c.code));
            if (idx !== -1) draft[idx] = { ...c, code: normalizeCouponCode(c.code) };
          })
        );
        try { await queryFulfilled; } catch { patch.undo(); }
      },
      invalidatesTags: ['Coupons'],
    }),

    deleteCoupon: builder.mutation<boolean, string>({
      queryFn: async (code) => {
        try {
          const { error } = await supabase.from('coupons').delete().eq('code', normalizeCouponCode(code));
          if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
          return { data: true };
        } catch (err: any) {
          return { error: { status: 'FETCH_ERROR', error: err.message } };
        }
      },
      onQueryStarted: async (code, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          supabaseApi.util.updateQueryData('getCoupons', undefined, (draft) => {
            const idx = draft.findIndex((x) => x.code === normalizeCouponCode(code));
            if (idx !== -1) draft.splice(idx, 1);
          })
        );
        try { await queryFulfilled; } catch { patch.undo(); }
      },
      invalidatesTags: ['Coupons'],
    }),
  }),
});

// Export RTK Query hooks (auto-generated)
export const {
  useGetOrdersQuery,
  useGetReservationsQuery,
  useGetMenuItemsQuery,
  useGetInventoryQuery,
  useGetEmployeesQuery,
  useAddEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
  useUpdateOrderStatusMutation,
  useUpdateReservationStatusMutation,
  useCreateOrderMutation,
  useCreateReservationMutation,
  useAddMenuItemMutation,
  useUpdateMenuItemMutation,
  useDeleteMenuItemMutation,
  useAddInventoryItemMutation,
  useUpdateInventoryItemMutation,
  useDeleteInventoryItemMutation,
  // Tables
  useGetTablesQuery,
  useGetBookedTableSlotsQuery,
  useAddTableMutation,
  useUpdateTableMutation,
  useDeleteTableMutation,
  useBookTableSlotMutation,
  useReleaseTableSlotMutation,
  // Coupons
  useGetCouponsQuery,
  useAddCouponMutation,
  useUpdateCouponMutation,
  useDeleteCouponMutation,
} = supabaseApi;
