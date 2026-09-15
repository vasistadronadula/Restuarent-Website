import { NextResponse } from 'next/server';
import { sendOrderStatusPushNotification } from '@/lib/pushNotify';
import { authErrorResponse } from '@/lib/auth/apiAuth';
import { prepareOrderNotification } from '@/lib/notifications/orderNotification';

export async function POST(request: Request) {
  try {
    const { order, newStatus, allowed } = await prepareOrderNotification(request, 'status', 'push');
    if (allowed) await sendOrderStatusPushNotification(order.id, newStatus!);
    return NextResponse.json({ ok: true, notified: allowed });
  } catch (error) {
    const { body, status } = authErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
