'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { orderStamps } from '@/lib/orderTime';
import { generateOrderId } from '@/lib/idGenerator';
import type { Order, OrderStatus } from '@/types';
import { queryKeys } from './keys';
import { mapOrder } from './mappers';
import { patchList, rollbackList } from './optimistic';
import { getTenantContext } from '@/lib/tenantContext';

export function useOrders(enabled = true, keepPolling = false) {
  return useQuery({
    queryKey: queryKeys.orders,
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        // Operational screens only need the newest window. Bills and reports
        // use useOrderHistory(), which walks every Supabase page explicitly.
        .limit(1000);
      if (error) throw new Error(error.message);
      return (data || []).map(mapOrder);
    },
    staleTime: 5_000,
    refetchInterval: (query) => {
      const orders = query.state.data;
      const hasActive = orders?.some((o) => ['pending', 'preparing', 'ready'].includes(o.status));
      return keepPolling || hasActive ? 3000 : false;
    },
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: keepPolling,
    // Staff-only — see useMyOrders() for the customer-scoped equivalent
    // that /orders now uses instead of filtering this unfiltered table
    // client-side.
    enabled,
  });
}

/** Complete order history for ledger/reporting screens. Supabase projects
 * commonly cap a single response at 1,000 rows, so fetch deterministic pages
 * until the final partial page rather than silently truncating financials. */
export function useOrderHistory(enabled = true, range?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: [...queryKeys.orderHistory, range?.from || '', range?.to || ''],
    queryFn: async (): Promise<Order[]> => {
      const pageSize = 1000;
      const rows: Record<string, unknown>[] = [];
      for (let from = 0; ; from += pageSize) {
        let request = supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false });
        if (range?.from) request = request.gte('created_at', new Date(`${range.from}T00:00:00+05:30`).toISOString());
        if (range?.to) {
          const exclusiveEnd = new Date(`${range.to}T00:00:00+05:30`);
          exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
          request = request.lt('created_at', exclusiveEnd.toISOString());
        }
        const { data, error } = await request.range(from, from + pageSize - 1);
        if (error) throw new Error(error.message);
        const page = (data || []) as Record<string, unknown>[];
        rows.push(...page);
        if (page.length < pageSize) break;
      }
      return rows.map(mapOrder);
    },
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

/** Minimal table-session feed for waiters. The RPC intentionally omits all
 * customer identity/contact fields and is read-only at the database boundary. */
export function useFloorOrders(enabled = true) {
  return useQuery({
    queryKey: queryKeys.floorOrders,
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase.rpc('get_floor_orders');
      if (error) throw new Error(error.message);
      return ((data || []) as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        orderId: String(row.id),
        customerName: `Table ${row.table_number}`,
        items: [],
        subtotal: Number(row.subtotal || 0),
        cgst: 0,
        sgst: 0,
        grandTotal: Number(row.grand_total || 0),
        status: String(row.status) as OrderStatus,
        paymentMode: 'cash',
        paymentStatus: String(row.payment_status || 'unpaid') as Order['paymentStatus'],
        tableNumber: Number(row.table_number),
        orderType: 'dine-in',
        orderSource: 'direct',
        createdAt: String(row.created_at),
      }));
    },
    enabled,
    staleTime: 3_000,
    refetchInterval: enabled ? 3_000 : false,
  });
}

/** A signed-in customer's own orders — scoped server-side by `user_id`, not
 * filtered out of the entire table client-side (that used to mean every
 * customer's browser downloaded every order ever placed, staff and
 * strangers' included, just to find their own). */
export function useMyOrders(userId: string | null) {
  return useQuery({
    queryKey: ['orders', 'mine', userId],
    queryFn: async (): Promise<Order[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return (data || []).map(mapOrder);
    },
    enabled: !!userId,
    staleTime: 5_000,
    refetchInterval: (query) => {
      const orders = query.state.data;
      const hasActive = orders?.some((o) => ['pending', 'preparing', 'ready'].includes(o.status));
      return hasActive ? 3000 : false;
    },
    refetchOnWindowFocus: true,
  });
}

export function useGuestOrders(ids: string[]) {
  return useQuery({
    queryKey: ['guest-orders', ids],
    queryFn: async (): Promise<Order[]> => {
      if (!ids || ids.length === 0) return [];
      const orders: Order[] = [];
      // The guest endpoint accepts at most 50 IDs per request.
      for (let offset = 0; offset < ids.length; offset += 50) {
        const res = await fetch('/api/guest/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: ids.slice(offset, offset + 50) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Could not load your orders. Please retry.');
        if (!Array.isArray(data)) throw new Error('Invalid order tracking response. Please retry.');
        orders.push(...data.map(mapOrder));
      }
      return orders;
    },
    enabled: ids.length > 0,
    staleTime: 3_000,
    refetchInterval: (query) => {
      const orders = query.state.data;
      const hasActive = orders?.some((o) => ['pending', 'preparing', 'ready'].includes(o.status));
      return hasActive ? 3000 : 15_000;
    },
    refetchOnWindowFocus: true,
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    networkMode: 'always', // Status changes must fail/retry explicitly, not queue offline.
    mutationFn: async ({ id, status, expectedStatus }: { id: string; status: OrderStatus; expectedStatus?: OrderStatus; optimistic?: boolean }) => {
      let query = supabase.from('orders').update({ status }).eq('id', id);
      if (expectedStatus) query = query.eq('status', expectedStatus);
      const { data, error } = await query.select('*').maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Order changed on another screen. Refresh and try again.');
      return mapOrder(data);
    },
    // Reflect the status change before the round trip — a cashier tapping
    // "Preparing" must not watch the chip sit on the old value.
    onMutate: ({ id, status, optimistic = true }) =>
      optimistic ? patchList<Order>(queryClient, queryKeys.orders, (draft) =>
        draft.map((o) => (o.id === id ? { ...o, status } : o))
      ) : undefined,
    onSuccess: (order) => queryClient.setQueryData<Order[]>(queryKeys.orders, old => old?.map(o => o.id === order.id ? order : o)),
    onError: (_err, _vars, context) => rollbackList(queryClient, context),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders });
      queryClient.invalidateQueries({ queryKey: ['guest-orders'] });
    },
  });
}

export function useUpdateOrderPrepTime() {
  const queryClient = useQueryClient();

  return useMutation({
    networkMode: 'always',
    mutationFn: async ({ id, delayMinutes, notes, expected }: {
      id: string; delayMinutes: number; notes?: string; optimistic?: boolean;
      expected?: { status: OrderStatus; notes?: string; delayMinutes: number };
    }) => {
      // First try updating delay_minutes and notes directly
      let request = supabase
        .from('orders')
        .update({
          delay_minutes: delayMinutes,
          notes: notes !== undefined ? notes : undefined,
        })
        .eq('id', id);
      if (expected) {
        request = request.eq('status', expected.status);
        request = expected.notes ? request.eq('notes', expected.notes) : request.or('notes.is.null,notes.eq.');
        request = expected.delayMinutes === 0 ? request.or('delay_minutes.is.null,delay_minutes.eq.0') : request.eq('delay_minutes', expected.delayMinutes);
      }
      let { data, error } = await request.select('*').maybeSingle();

      // If column delay_minutes does not exist in schema (error 42703), store delay in notes string
      if (error?.code === '42703') {
        if (expected) throw new Error('Kitchen details need the current database schema. No changes were saved.');
        const noteStr = `[DELAY:${delayMinutes}] ${notes || ''}`.trim();
        ({ data, error } = await supabase.from('orders').update({ notes: noteStr }).eq('id', id).select('*').maybeSingle());
      }

      if (error) throw new Error(error.message);
      if (!data) throw new Error('Order prep details changed on another screen. Refresh and try again.');
      return mapOrder(data);
    },
    onMutate: ({ id, delayMinutes, notes, optimistic = true }) =>
      optimistic ? patchList<Order>(queryClient, queryKeys.orders, (draft) =>
        draft.map((o) => (o.id === id ? { ...o, delayMinutes, notes: notes !== undefined ? notes : o.notes } : o))
      ) : undefined,
    onSuccess: (order) => queryClient.setQueryData<Order[]>(queryKeys.orders, old => old?.map(o => o.id === order.id ? order : o)),
    onError: (_err, _vars, context) => rollbackList(queryClient, context),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders });
      queryClient.invalidateQueries({ queryKey: ['guest-orders'] });
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderData: Partial<Order>): Promise<Order> => {
      // Every caller (checkout, POS) already checks this before calling in —
      // this is the last line of defense against a ₹0 order with no items
      // silently reaching the database, not a substitute for those checks.
      if (!orderData.items || orderData.items.length === 0) {
        throw new Error('Cannot create an order with no items');
      }

      // Always use the date-stamped ID format.
      const orderId = orderData.id || generateOrderId();
      // IST-pinned and locale-independent — see lib/orderTime for why an
      // order's own stamps cannot come from toLocaleTimeString/toISOString.
      const { orderDate, orderTime: timeStr } = orderStamps();

      const newOrder: Order = {
        id: orderId,
        orderId,
        customerId: orderData.customerId || 'GUEST',
        customerName: orderData.customerName || 'Guest Diner',
        customerPhone: orderData.customerPhone || '',
        customerAddress: orderData.customerAddress || 'Takeaway — Collect from Restaurant',
        items: orderData.items || [],
        subtotal: orderData.subtotal || 0,
        cgst: orderData.cgst || 0,
        sgst: orderData.sgst || 0,
        discount: orderData.discount || 0,
        // Checkout (storefront) always sends 0 here itself — takeaway has no
        // delivery leg. This used to hardcode 0 unconditionally though, which
        // also discarded the POS's packaging charge (`totals.packagingCharge`)
        // on every counter order, silently under-billing whenever one was added.
        deliveryCharge: orderData.deliveryCharge || 0,
        grandTotal: orderData.grandTotal || 0,
        status: 'pending',
        paymentMode: orderData.paymentMode || 'cash',
        // Trust the caller's payment status. This used to be derived from
        // "is it COD?", which — now that every order is prepaid or taken at
        // the till — marked everything 'paid', including the checkout case
        // where a Razorpay charge could not be verified server-side and is
        // deliberately saved as 'unpaid' for manual reconciliation.
        paymentStatus: orderData.paymentStatus || 'unpaid',
        paymentReference: orderData.paymentReference,
        cashTendered: orderData.cashTendered,
        orderDate,
        orderTime: timeStr,
        couponCode: orderData.couponCode,
        orderSource: orderData.orderSource || 'direct',
        orderType: orderData.orderType || 'takeaway',
        tableNumber: orderData.tableNumber,
        notes: orderData.notes,
      };

      const tenant = await getTenantContext(supabase);

      const row = {
        id: orderId, // PPR-ORD-20260725-4821
        customer_name: newOrder.customerName,
        customer_phone: newOrder.customerPhone,
        customer_email: newOrder.customerId,
        delivery_address: newOrder.customerAddress,
        order_type: newOrder.orderType,
        payment_mode: newOrder.paymentMode,
        payment_status: newOrder.paymentStatus,
        payment_reference: newOrder.paymentReference || null,
        cash_tendered: newOrder.cashTendered ?? null,
        items: newOrder.items,
        subtotal: newOrder.subtotal,
        cgst: newOrder.cgst,
        sgst: newOrder.sgst,
        delivery_charge: newOrder.deliveryCharge,
        discount: newOrder.discount,
        grand_total: newOrder.grandTotal,
        status: 'pending',
        notes: newOrder.notes || null,
        order_time: timeStr,
        coupon_code: newOrder.couponCode || null,
        order_source: newOrder.orderSource || 'direct',
        user_id: orderData.userId || null,
        razorpay_order_id: orderData.razorpayOrderId || null,
        razorpay_payment_id: orderData.razorpayPaymentId || null,
        tenant_id: tenant.tenant_id,
        restaurant_id: tenant.restaurant_id,
        branch_id: tenant.branch_id,
      };

      let { error } = await supabase
        .from('orders')
        .insert([{ ...row, table_number: newOrder.tableNumber ?? null }]);

      // 42703 = undefined_column. orders.table_number arrives with the schema
      // update in the baseline migration, section 13; until that has been run,
      // saving the order matters far more than recording which table it came
      // from, so retry without it rather than losing the sale. Once the column
      // exists this branch never runs.
      if (error?.code === '42703') {
        console.warn(
          'orders.table_number missing — apply supabase/migrations to store dine-in table numbers'
        );
        ({ error } = await supabase.from('orders').insert([row]));
      }

      if (error) throw new Error(error.message);

      return {
        ...newOrder,
        razorpayOrderId: orderData.razorpayOrderId,
        razorpayPaymentId: orderData.razorpayPaymentId,
      };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.orders }),
  });
}
