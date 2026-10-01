import { NextResponse } from 'next/server';
import { sendOrderStatusUpdate } from '@/lib/notifications/whatsapp';
import { authErrorResponse } from '@/lib/auth/apiAuth';
import { prepareOrderNotification } from '@/lib/notifications/orderNotification';

export async function POST(request: Request) {
  try {
    const { order, newStatus, allowed } = await prepareOrderNotification(request, 'status', 'whatsapp');
    if (!allowed) return NextResponse.json({ ok: true, notified: false });
    const sent = await sendOrderStatusUpdate(order.id, order.customer_phone, order.customer_name || 'Customer', newStatus!, {
      orderType: order.order_type, tableNumber: order.table_number ?? undefined,
      itemCount: Array.isArray(order.items) ? order.items.reduce((sum: number, item: { quantity?: number }) => sum + (Number(item.quantity) || 1), 0) : undefined,
    });
    return NextResponse.json({ ok: sent });
  } catch (error) {
    const { body, status } = authErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
