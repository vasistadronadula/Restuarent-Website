import { supabase } from './supabase';
import { Order } from '@/types';
import { generateOrderId } from './idGenerator';

/**
 * db.ts — server-only order ingestion for the Swiggy/Zomato webhook routes.
 *
 * Every other read/write in the app goes through the RTK Query layer in
 * store/supabaseApi.ts (used by both the storefront and the admin panel via
 * AdminContext). This file used to duplicate that entire layer and was
 * called directly from client components (checkout, reservation, POS) *in
 * addition to* the RTK Query mutation for the same write — silently
 * inserting every order/reservation twice and relying on a primary-key
 * conflict to swallow the duplicate. It has been trimmed down to the one
 * thing only a server route needs: inserting an aggregator order that
 * arrived outside any user's browser session.
 */
export async function createOrderInDB(orderData: Partial<Order>): Promise<Order> {
  const orderId = orderData.id || generateOrderId();
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  const newOrderObj: Order = {
    id: orderId,
    orderId,
    customerId: orderData.customerId || 'GUEST',
    customerName: orderData.customerName || 'Guest Diner',
    customerPhone: orderData.customerPhone || '+91 98765 43210',
    customerAddress: orderData.customerAddress || 'Takeaway — Collect from Restaurant',
    items: orderData.items || [],
    subtotal: orderData.subtotal || 0,
    cgst: orderData.cgst || 0,
    sgst: orderData.sgst || 0,
    discount: orderData.discount || 0,
    deliveryCharge: 0,
    grandTotal: orderData.grandTotal || 0,
    status: 'pending',
    paymentMode: orderData.paymentMode || 'cod',
    paymentStatus: orderData.paymentMode === 'cod' ? 'unpaid' : 'paid',
    orderDate: now.toISOString().split('T')[0],
    orderTime: timeStr,
    couponCode: orderData.couponCode,
    orderSource: orderData.orderSource || 'direct',
  };

  const { error } = await supabase.from('orders').insert([
    {
      id: orderId,
      customer_name: newOrderObj.customerName,
      customer_phone: newOrderObj.customerPhone,
      customer_email: newOrderObj.customerId,
      delivery_address: newOrderObj.customerAddress,
      order_type: 'takeaway',
      payment_mode: newOrderObj.paymentMode,
      payment_status: newOrderObj.paymentStatus,
      items: newOrderObj.items,
      subtotal: newOrderObj.subtotal,
      cgst: newOrderObj.cgst,
      sgst: newOrderObj.sgst,
      delivery_charge: 0,
      discount: newOrderObj.discount,
      grand_total: newOrderObj.grandTotal,
      status: 'pending',
      order_time: timeStr,
      coupon_code: newOrderObj.couponCode || null,
      order_source: newOrderObj.orderSource || 'direct',
    },
  ]);

  // Throw (rather than swallow) so the calling webhook route returns a
  // non-200 response — the aggregator platform will see the failure and
  // retry, instead of believing an order was accepted when it wasn't saved.
  if (error) {
    throw new Error(`Failed to save order ${orderId}: ${error.message}`);
  }

  return newOrderObj;
}
