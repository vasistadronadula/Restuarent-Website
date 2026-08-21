import 'server-only';
import { getSupabaseAdmin } from './supabaseAdmin';
import { Order } from '@/types';
import { generateOrderId } from './idGenerator';
import { orderStamps } from './orderTime';

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
 *
 * That write goes through the service-role client, not the browser one this
 * used to import. A Swiggy/Zomato push carries no Supabase session — there
 * is no browser and no signed-in user — so the anon client sent the insert
 * as an anonymous role and left it at the mercy of whatever RLS policy
 * happens to cover `orders`. `import 'server-only'` now makes an accidental
 * client-side import of this module a build error rather than a runtime
 * surprise.
 */
export async function createOrderInDB(orderData: Partial<Order>): Promise<Order> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured — cannot ingest aggregator orders.');
  }

  const orderId = orderData.id || generateOrderId();
  const { orderDate, orderTime: timeStr } = orderStamps();

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
    // Aggregator orders arrive already collected by the platform, but the
    // caller states both explicitly — the fallbacks are only a safety net,
    // and never assume money was taken.
    paymentMode: orderData.paymentMode || 'online',
    paymentStatus: orderData.paymentStatus || 'unpaid',
    orderDate,
    orderTime: timeStr,
    couponCode: orderData.couponCode,
    orderSource: orderData.orderSource || 'direct',
  };

  const { error } = await admin.from('orders').insert([
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
