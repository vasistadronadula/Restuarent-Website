import { NextRequest, NextResponse } from 'next/server';
import { sendPrepDelayPushNotification } from '@/lib/pushNotify';
import { getErrorMessage } from '@/lib/errors';

/**
 * POST /api/push/notify-delay
 *
 * Triggered when the KDS kitchen extends an order's prep time. Sends a
 * push notification to subscribed cashier/admin staff so the front-of-house
 * can proactively manage customer expectations.
 *
 * Body: { orderId: string, extraMinutes: number, reason?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { orderId, extraMinutes, reason } = await req.json();
    if (!orderId || !extraMinutes) {
      return NextResponse.json({ error: 'orderId and extraMinutes required' }, { status: 400 });
    }

    await sendPrepDelayPushNotification(orderId, Number(extraMinutes), reason);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Push] notify-delay error:', err);
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 500 });
  }
}
