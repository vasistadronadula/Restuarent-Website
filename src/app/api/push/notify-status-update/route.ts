import { NextRequest, NextResponse } from 'next/server';
import { sendOrderStatusPushNotification } from '@/lib/pushNotify';
import { requireStaff, authErrorResponse } from '@/lib/auth/apiAuth';
import { log } from '@/lib/logger';

/**
 * POST /api/push/notify-status-update
 *
 * Triggered from AdminContext.updateOrderStatus when the kitchen or cashier
 * advances an order. Sends a push to all subscribed staff with the right
 * roles so the front-of-house knows without refreshing.
 *
 * Body: { orderId: string, newStatus: string }
 *
 * Staff-gated. It used to be open on the reasoning that the payload is
 * re-read from Supabase server-side, so a caller can't inject content — true,
 * but beside the point: the *act* of notifying is the abusable part. Anyone
 * who found the URL could ring every staff device in the restaurant on a
 * loop, which is a real denial-of-attention attack during service.
 */
export async function POST(req: NextRequest) {
  try {
    await requireStaff(req);
  } catch (err) {
    const { body, status } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }

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
    log.error('push_status_update_failed', { error: err });
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
