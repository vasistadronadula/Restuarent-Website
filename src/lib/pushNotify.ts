import 'server-only';
import webpush from 'web-push';
import { getSupabaseAdmin } from './supabaseAdmin';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

let configured = false;
function ensureConfigured() {
  if (configured) return true;
  if (!vapidPublicKey || !vapidPrivateKey) return false;
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  configured = true;
  return true;
}

/**
 * Notify every subscribed admin device that a new order arrived.
 * Re-fetches the order from the DB via the service-role client rather than
 * trusting whatever the caller claims about it — the caller only proves
 * "an order with this id exists", not what's in it.
 *
 * Never throws — push notifications are a layer on top of order creation,
 * not a precondition for it. Any failure here (missing VAPID/service-role
 * config, a dead subscription, a network blip) is logged and swallowed so
 * the checkout/POS/webhook flow that just successfully saved a real order
 * is never affected.
 */
export async function sendNewOrderPushNotification(orderId: string): Promise<void> {
  try {
    if (!ensureConfigured()) return;

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) return;

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, customer_name, grand_total, order_source')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      console.warn(`Push notify: order ${orderId} not found`, orderError?.message);
      return;
    }

    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth');

    if (subError || !subscriptions || subscriptions.length === 0) return;

    const sourceLabel = order.order_source && order.order_source !== 'direct'
      ? ` (${order.order_source})`
      : '';
    const payload = JSON.stringify({
      title: `🔔 New order${sourceLabel}`,
      body: `${order.customer_name || 'A customer'} — ₹${Number(order.grand_total || 0).toLocaleString()}`,
      url: '/admin/orders',
    });

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            // Subscription expired or was revoked — clean it up.
            await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
          } else {
            console.error('Push send failed:', err);
          }
        }
      })
    );
  } catch (err) {
    console.error('sendNewOrderPushNotification failed:', err);
  }
}
