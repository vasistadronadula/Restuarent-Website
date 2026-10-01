import { NextResponse } from 'next/server';
import { sendPrepDelayPushNotification } from '@/lib/notifications/pushNotify';
import { authErrorResponse } from '@/lib/auth/apiAuth';
import { prepareOrderNotification } from '@/lib/notifications/orderNotification';

export async function POST(request: Request) {
  try {
    const { order, extraMinutes, reason, allowed } = await prepareOrderNotification(request, 'delay', 'push');
    if (allowed) await sendPrepDelayPushNotification(order.id, extraMinutes!, reason);
    return NextResponse.json({ ok: true, notified: allowed });
  } catch (error) {
    const { body, status } = authErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
