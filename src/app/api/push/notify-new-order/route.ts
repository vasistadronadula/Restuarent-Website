import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { sendNewOrderPushNotification } from '@/lib/pushNotify';
import { log } from '@/lib/logger';
import { requireStaff, authErrorResponse } from '@/lib/auth/apiAuth';
import { rateLimit } from '@/lib/auth/rateLimit';

/**
 * Triggered by staff POS browsers after an order is created. Customer checkout
 * schedules its own alert server-side. The caller must be staff, and content is re-read
 * from the database server-side, never trusted from the request body.
 */
export async function POST(request: Request) {
  try {
    let caller;
    try { caller = await requireStaff(request); }
    catch (error) {
      const { body, status } = authErrorResponse(error);
      return NextResponse.json(body, { status });
    }
    const limit = rateLimit(`push:new-order:${caller.user.id}`, 30, 60_000);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many notification requests.' }, { status: 429 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Server not configured' }, { status: 500 });
    }

    const { orderId } = await request.json();
    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing orderId' }, { status: 400 });
    }

    const { data: order, error } = await admin.from('orders').select('created_at').eq('id', orderId).maybeSingle();
    if (error) throw error;
    if (!order || !Number.isFinite(Date.parse(order.created_at)) || Date.now() - Date.parse(order.created_at) > 10 * 60_000) {
      return NextResponse.json({ error: 'Order is not newly placed.' }, { status: 400 });
    }

    await sendNewOrderPushNotification(orderId);
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('push_new_order_failed', { error });
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
