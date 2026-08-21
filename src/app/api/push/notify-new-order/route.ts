import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { sendNewOrderPushNotification } from '@/lib/pushNotify';
import { log } from '@/lib/logger';

/**
 * Triggered by the browser right after an order is created (checkout, POS)
 * to alert subscribed admin devices. The caller only needs to prove they're
 * a signed-in Supabase user — the notification's actual content is re-read
 * from the database server-side, never trusted from the request body.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Server not configured' }, { status: 500 });
    }

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await request.json();
    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing orderId' }, { status: 400 });
    }

    await sendNewOrderPushNotification(orderId);
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('push_new_order_failed', { error });
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
