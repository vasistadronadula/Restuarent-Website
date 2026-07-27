import 'server-only';
import webpush from 'web-push';
import { getSupabaseAdmin } from './supabaseAdmin';
import { ORDER_NOTIFICATION_ROLES, RESERVATION_NOTIFICATION_ROLES } from './roleAccess';
import type { UserRole } from '@/types';

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

interface PushPayload {
  title: string;
  body: string;
  url: string;
  /** Groups notifications on the device — one tag per stream. */
  tag: string;
}

/**
 * Send one payload to every subscribed device whose owner currently holds one
 * of `roles`, pruning subscriptions the push service reports as dead.
 *
 * Targeting lives here rather than "notify everyone subscribed" because
 * notifications follow the module a role works in (see roleAccess.ts): a
 * server subscribed for reservation alerts must not be woken by every
 * takeaway order, and the kitchen must not be woken by table bookings.
 * Roles are re-read on every send, so a demoted staff member stops being
 * notified immediately without their subscription row being cleaned up first.
 */
async function sendToRoles(roles: readonly UserRole[], payload: PushPayload): Promise<void> {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return;

  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .in('role', roles as readonly string[]);
  if (profileError || !profiles || profiles.length === 0) return;

  const { data: subscriptions, error: subError } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', profiles.map((p) => p.id));
  if (subError || !subscriptions || subscriptions.length === 0) return;

  const serialized = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          serialized
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
}

/**
 * Notify the cashier and the kitchen that a new order arrived.
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

    const sourceLabel = order.order_source && order.order_source !== 'direct'
      ? ` (${order.order_source})`
      : '';

    await sendToRoles(ORDER_NOTIFICATION_ROLES, {
      title: `🔔 New order${sourceLabel}`,
      body: `${order.customer_name || 'A customer'} — ₹${Number(order.grand_total || 0).toLocaleString()}`,
      url: '/admin/orders',
      tag: `ppr-order-${order.id}`,
    });
  } catch (err) {
    console.error('sendNewOrderPushNotification failed:', err);
  }
}

/**
 * Notify servers that a new table reservation came in. Same contract as the
 * order notification above: the content is re-read server-side, and every
 * failure is swallowed so a booking that saved successfully is never
 * reported as failed just because a notification didn't land.
 */
export async function sendNewReservationPushNotification(reservationId: string): Promise<void> {
  try {
    if (!ensureConfigured()) return;

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) return;

    const { data: reservation, error: resError } = await supabaseAdmin
      .from('reservations')
      .select('id, name, guests, date, time')
      .eq('id', reservationId)
      .maybeSingle();

    if (resError || !reservation) {
      console.warn(`Push notify: reservation ${reservationId} not found`, resError?.message);
      return;
    }

    const when = [reservation.date, reservation.time].filter(Boolean).join(' at ');

    await sendToRoles(RESERVATION_NOTIFICATION_ROLES, {
      title: '📅 New reservation',
      body: `${reservation.name || 'A guest'} — ${reservation.guests || 2} guests${when ? ` · ${when}` : ''}`,
      url: '/admin/reservations',
      tag: `ppr-reservation-${reservation.id}`,
    });
  } catch (err) {
    console.error('sendNewReservationPushNotification failed:', err);
  }
}
