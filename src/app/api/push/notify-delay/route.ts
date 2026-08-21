import { NextRequest, NextResponse } from 'next/server';
import { sendPrepDelayPushNotification } from '@/lib/pushNotify';
import { requireStaff, authErrorResponse } from '@/lib/auth/apiAuth';
import { log } from '@/lib/logger';

/**
 * POST /api/push/notify-delay
 *
 * Triggered when the KDS kitchen extends an order's prep time. Sends a
 * push notification to subscribed cashier/admin staff so the front-of-house
 * can proactively manage customer expectations.
 *
 * Body: { orderId: string, extraMinutes: number, reason?: string }
 *
 * Staff-gated — its only caller is the KDS, and an open version is a way for
 * anyone to buzz every staff device during service.
 */
export async function POST(req: NextRequest) {
  try {
    await requireStaff(req);
  } catch (err) {
    const { body, status } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  try {
    const { orderId, extraMinutes, reason } = await req.json();
    if (!orderId || !extraMinutes) {
      return NextResponse.json({ error: 'orderId and extraMinutes required' }, { status: 400 });
    }

    await sendPrepDelayPushNotification(orderId, Number(extraMinutes), reason);
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error('push_notify_delay_failed', { error: err });
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
