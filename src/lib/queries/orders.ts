'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { generateOrderId } from '@/lib/idGenerator';
import type { Order, OrderStatus } from '@/types';
import { queryKeys } from './keys';
import { mapOrder } from './mappers';
import { patchList, rollbackList } from './optimistic';

export function useOrders() {
  return useQuery({
    queryKey: queryKeys.orders,
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []).map(mapOrder);
    },
    staleTime: 60_000, // realtime pushes invalidations; this is the backstop
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
        draft.map((o) => (o.id === id ? { ...o, status, orderStatus: status } : o))
      ),
    onError: (_err, _vars, context) => rollbackList(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.orders }),
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderData: Partial<Order>): Promise<Order> => {
      // Always use the date-stamped ID format.
      const orderId = orderData.id || generateOrderId();
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

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
        deliveryCharge: 0, // Always 0 — takeaway only
        grandTotal: orderData.grandTotal || 0,
        status: 'pending',
        orderStatus: 'pending',
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

      // 42703 = undefined_column. orders.table_number arrives with the schema
      // update in supabase_schema.sql section 13; until that has been run,
      // saving the order matters far more than recording which table it came
      // from, so retry without it rather than losing the sale. Once the column
      // exists this branch never runs.
      if (error?.code === '42703') {
        console.warn(
          'orders.table_number missing — run supabase_schema.sql to store dine-in table numbers'
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
