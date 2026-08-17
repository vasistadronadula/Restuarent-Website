import { NextRequest, NextResponse } from 'next/server';
import { sendOrderStatusPushNotification } from '@/lib/pushNotify';
import { getErrorMessage } from '@/lib/errors';

/**
 * POST /api/push/notify-status-update
 *
 * Triggered internally (from AdminContext.updateOrderStatus) when the kitchen
 * or cashier advances an order. Sends a push to all subscribed staff with the
 * right roles so the front-of-house knows without refreshing.
 *
 * Body: { orderId: string, newStatus: string }
 *
 * No auth check — this endpoint is only called server-to-server from the
 * browser's AdminContext after a successful Supabase write. Rate-limiting
 * and data integrity come from the fact that the payload (content) is always
 * re-read from Supabase server-side; the caller only provides the order ID.
 */
export async function POST(req: NextRequest) {
  try {
    const { orderId, newStatus } = await req.json();
    if (!orderId || !newStatus) {
      return NextResponse.json({ error: 'orderId and newStatus required' }, { status: 400 });
    }

    if (!['preparing', 'ready', 'delivered'].includes(newStatus)) {
      return NextResponse.json({ ok: false, reason: 'status not notifiable' });
    }

    await sendOrderStatusPushNotification(orderId, newStatus);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Push] notify-status-update error:', err);
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 500 });
  }
}
