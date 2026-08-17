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

/* ------------------------------------------------------------------ */
/*  Payload types                                                       */
/* ------------------------------------------------------------------ */

interface PushAction {
  action: string;
  title: string;
}

interface PushPayload {
  title: string;
  body: string;
  url: string;
  /** Groups notifications on the device — one tag per stream. */
  tag: string;
  /** Drives vibration pattern + requireInteraction + action buttons in sw.js */
  type: 'new_order' | 'reservation' | 'status_update' | 'delay' | 'alert';
  /** Optional OS-level action buttons (max 2 on most platforms) */
  actions?: PushAction[];
  /** Optional hero image (Android/Chrome) */
  image?: string;
}

/* ------------------------------------------------------------------ */
/*  Core sender — targets by role                                       */
/* ------------------------------------------------------------------ */

/**
 * Send one payload to every subscribed device whose owner holds one of
 * `roles`, pruning subscriptions the push service reports as dead.
 *
 * Role-based targeting lives here: a server subscribed for reservation
 * alerts must not be woken by every takeaway order, and the kitchen must
 * not be woken by table bookings. Roles are re-read on every send, so a
 * demoted staff member stops being notified immediately.
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

/* ------------------------------------------------------------------ */
/*  New order                                                           */
/* ------------------------------------------------------------------ */

/**
 * Notify the cashier and kitchen that a new order arrived.
 * Content is re-read server-side — the caller only proves an order with
 * this id exists, not what's in it.
 */
export async function sendNewOrderPushNotification(orderId: string): Promise<void> {
  try {
    if (!ensureConfigured()) return;

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) return;

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, customer_name, grand_total, order_source, order_type, items')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      console.warn(`Push notify: order ${orderId} not found`, orderError?.message);
      return;
    }

    const tokenNum = order.id.slice(-4).toUpperCase();
    const sourceLabel = order.order_source && order.order_source !== 'direct'
      ? ` · ${order.order_source}`
      : '';
    const orderTypeEmoji = ((order.order_type || '') as string).toLowerCase().includes('dine')
      ? '🪑 Dine-in'
      : '🥡 Takeaway';

    // Count items for body line
    let itemCount = '';
    try {
      const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      if (Array.isArray(items) && items.length > 0) {
        itemCount = ` · ${items.length} item${items.length > 1 ? 's' : ''}`;
      }
    } catch { /* ignore */ }

    await sendToRoles(ORDER_NOTIFICATION_ROLES, {
      title: `🔔 New Order #${tokenNum}${sourceLabel}`,
      body: `${order.customer_name || 'Walk-in'} — ₹${Number(order.grand_total || 0).toLocaleString('en-IN')} · ${orderTypeEmoji}${itemCount}`,
      url: '/admin/orders',
      tag: `ppr-order-${order.id}`,
      type: 'new_order',
      actions: [
        { action: 'view_orders', title: '📋 View Orders' },
        { action: 'view_kitchen', title: '🔥 Kitchen' },
      ],
    });
  } catch (err) {
    console.error('sendNewOrderPushNotification failed:', err);
  }
}

/* ------------------------------------------------------------------ */
/*  New reservation                                                     */
/* ------------------------------------------------------------------ */

/**
 * Notify servers that a new table reservation came in. Same contract as
 * the order notification: content re-read server-side, every failure swallowed.
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

    const guests = reservation.guests || 2;
    const when = reservation.date && reservation.time
      ? `${reservation.date} at ${reservation.time}`
      : reservation.date || reservation.time || 'Date TBD';

    await sendToRoles(RESERVATION_NOTIFICATION_ROLES, {
      title: `📅 New Reservation — ${guests} Guest${guests > 1 ? 's' : ''}`,
      body: `${reservation.name || 'A guest'} · ${when}`,
      url: '/admin/reservations',
      tag: `ppr-reservation-${reservation.id}`,
      type: 'reservation',
      actions: [
        { action: 'view_reservations', title: '📅 View Reservations' },
      ],
    });
  } catch (err) {
    console.error('sendNewReservationPushNotification failed:', err);
  }
}

/* ------------------------------------------------------------------ */
/*  Order status update push                                            */
/* ------------------------------------------------------------------ */

const STATUS_PUSH: Record<string, { emoji: string; headline: string; detail: string }> = {
  preparing: {
    emoji: '🔥',
    headline: 'Cooking Started',
    detail: 'Chef has begun preparing this order.',
  },
  ready: {
    emoji: '✅',
    headline: 'Order Ready!',
    detail: 'Food is packed and waiting at the counter.',
  },
  delivered: {
    emoji: '🎉',
    headline: 'Order Delivered',
    detail: 'Order handed over successfully.',
  },
};

/**
 * Notify the cashier that the kitchen has changed an order's status.
 * Called after updateOrderStatus succeeds in AdminContext.
 * Only fires for meaningful transitions (preparing / ready / delivered).
 */
export async function sendOrderStatusPushNotification(
  orderId: string,
  newStatus: string
): Promise<void> {
  try {
    if (!ensureConfigured()) return;

    const statusCfg = STATUS_PUSH[newStatus];
    if (!statusCfg) return; // Only notify for known statuses

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) return;

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('id, customer_name, order_type, table_number')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !order) return;

    const tokenNum = order.id.slice(-4).toUpperCase();
    const tableInfo = order.table_number ? ` · Table ${order.table_number}` : '';

    await sendToRoles(ORDER_NOTIFICATION_ROLES, {
      title: `${statusCfg.emoji} #${tokenNum} — ${statusCfg.headline}`,
      body: `${order.customer_name || 'Walk-in'}${tableInfo} · ${statusCfg.detail}`,
      url: '/admin/orders',
      tag: `ppr-status-${order.id}`,
      type: 'status_update',
      actions: [
        { action: 'view_orders', title: '📋 Orders' },
      ],
    });
  } catch (err) {
    console.error('sendOrderStatusPushNotification failed:', err);
  }
}

/* ------------------------------------------------------------------ */
/*  Prep delay push                                                     */
/* ------------------------------------------------------------------ */

/**
 * Alert the cashier when the kitchen extends an order's prep time.
 * Gives the front-of-house staff a heads-up to manage customer expectations.
 */
export async function sendPrepDelayPushNotification(
  orderId: string,
  extraMinutes: number,
  reason?: string
): Promise<void> {
  try {
    if (!ensureConfigured()) return;

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) return;

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('id, customer_name, table_number')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !order) return;

    const tokenNum = order.id.slice(-4).toUpperCase();
    const tableInfo = order.table_number ? ` · Table ${order.table_number}` : '';
    const reasonText = reason ? ` — ${reason}` : '';

    await sendToRoles(ORDER_NOTIFICATION_ROLES, {
      title: `⏳ #${tokenNum} Delayed +${extraMinutes}m`,
      body: `${order.customer_name || 'Walk-in'}${tableInfo}${reasonText}`,
      url: '/admin/kitchen',
      tag: `ppr-delay-${order.id}`,
      type: 'delay',
      actions: [
        { action: 'view_kitchen', title: '🔥 Kitchen View' },
        { action: 'view_orders', title: '📋 Orders' },
      ],
    });
  } catch (err) {
    console.error('sendPrepDelayPushNotification failed:', err);
  }
}
