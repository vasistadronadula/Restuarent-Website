'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { orderStamps } from '@/lib/orderTime';
import { generateOrderId } from '@/lib/idGenerator';
import type { Order, OrderStatus } from '@/types';
import { queryKeys } from './keys';
import { mapOrder } from './mappers';
import { patchList, rollbackList } from './optimistic';

export function useOrders(enabled = true) {
  return useQuery({
    queryKey: queryKeys.orders,
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        // Staff-facing dashboards are the only consumer of the unfiltered
        // table; a 1,000-row cap keeps a growing restaurant's history out
        // of every admin session's initial payload without breaking any UI
        // (every table this feeds already virtualizes rows) — real
        // pagination for browsing older history is future work.
        .limit(1000);
      if (error) throw new Error(error.message);
      return (data || []).map(mapOrder);
    },
    staleTime: 5_000,
    refetchInterval: (query) => {
      const orders = query.state.data;
      const hasActive = orders?.some((o) => ['pending', 'preparing', 'ready'].includes(o.status));
      return hasActive ? 3000 : false;
    },
    refetchOnWindowFocus: true,
    // Staff-only — see useMyOrders() for the customer-scoped equivalent
    // that /orders now uses instead of filtering this unfiltered table
    // client-side.
    enabled,
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
      try {
        const res = await fetch('/api/guest/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data.map(mapOrder) : [];
      } catch (err) {
        console.warn('Guest orders fetch warning:', err);
        return [];
      }
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
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id);
      if (error) throw new Error(error.message);
      return true;
    },
    // Reflect the status change before the round trip — a cashier tapping
    // "Preparing" must not watch the chip sit on the old value.
    onMutate: ({ id, status }) =>
      patchList<Order>(queryClient, queryKeys.orders, (draft) =>
        draft.map((o) => (o.id === id ? { ...o, status } : o))
      ),
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
    mutationFn: async ({ id, delayMinutes, notes }: { id: string; delayMinutes: number; notes?: string }) => {
      // First try updating delay_minutes and notes directly
      let { error } = await supabase
        .from('orders')
        .update({
          delay_minutes: delayMinutes,
          notes: notes !== undefined ? notes : undefined,
        })
        .eq('id', id);

      // If column delay_minutes does not exist in schema (error 42703), store delay in notes string
      if (error?.code === '42703') {
        const noteStr = `[DELAY:${delayMinutes}] ${notes || ''}`.trim();
        ({ error } = await supabase.from('orders').update({ notes: noteStr }).eq('id', id));
      }

      if (error) throw new Error(error.message);
      return true;
    },
    onMutate: ({ id, delayMinutes, notes }) =>
      patchList<Order>(queryClient, queryKeys.orders, (draft) =>
        draft.map((o) => (o.id === id ? { ...o, delayMinutes, notes: notes !== undefined ? notes : o.notes } : o))
      ),
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
        orderDate,
        orderTime: timeStr,
        couponCode: orderData.couponCode,
        orderSource: orderData.orderSource || 'direct',
        orderType: orderData.orderType || 'takeaway',
        tableNumber: orderData.tableNumber,
      };

      const row = {
        id: orderId, // PPR-ORD-20260725-4821
        customer_name: newOrder.customerName,
        customer_phone: newOrder.customerPhone,
        customer_email: newOrder.customerId,
        delivery_address: newOrder.customerAddress,
        order_type: newOrder.orderType,
        payment_mode: newOrder.paymentMode,
        payment_status: newOrder.paymentStatus,
        items: newOrder.items,
        subtotal: newOrder.subtotal,
        cgst: newOrder.cgst,
        sgst: newOrder.sgst,
        delivery_charge: newOrder.deliveryCharge,
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
