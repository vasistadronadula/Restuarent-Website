import { NextResponse } from 'next/server';
import { sendPrepDelayNotification } from '@/lib/whatsapp';
import { authErrorResponse } from '@/lib/auth/apiAuth';
import { prepareOrderNotification } from '@/lib/notifications/orderNotification';

export async function POST(request: Request) {
  try {
    const { order, extraMinutes, reason, allowed } = await prepareOrderNotification(request, 'delay', 'whatsapp');
    if (!allowed) return NextResponse.json({ ok: true, notified: false });
    const sent = await sendPrepDelayNotification(order.id, order.customer_phone, order.customer_name || 'Customer', extraMinutes!, reason);
    return NextResponse.json({ ok: sent });
  } catch (error) {
    const { body, status } = authErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
