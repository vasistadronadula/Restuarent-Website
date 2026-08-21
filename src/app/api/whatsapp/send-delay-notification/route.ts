import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { sendPrepDelayNotification } from '@/lib/whatsapp';
import { requireStaff, authErrorResponse } from '@/lib/auth/apiAuth';
import { log } from '@/lib/logger';

/**
 * POST /api/whatsapp/send-delay-notification
 *
 * Called when the kitchen extends prep time for an order via the KDS.
 * Sends a courteous "a few more minutes" WhatsApp message to the customer.
 *
 * Body: { orderId: string, extraMinutes: number, reason?: string }
 *
 * Staff-gated — its only caller is the KDS delay dialog, and messages from
 * the business number are not something an anonymous caller gets to send.
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

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      log.warn('whatsapp_skipped_no_supabase_admin', { route: 'send-delay-notification' });
      return NextResponse.json({ ok: false, reason: 'supabase not configured' });
    }

    const { data, error } = await supabase
      .from('orders')
      .select('id, customer_name, customer_phone')
      .eq('id', orderId)
      .single();

    if (error || !data) {
      log.warn('whatsapp_order_not_found', { orderId, error: error?.message });
      return NextResponse.json({ ok: false, reason: 'order not found' });
    }

    const sent = await sendPrepDelayNotification(
      orderId,
      data.customer_phone,
      data.customer_name || 'Customer',
      extraMinutes,
      reason
    );

    return NextResponse.json({ ok: sent });
  } catch (err) {
    log.error('whatsapp_delay_notification_failed', { error: err });
    return NextResponse.json({ ok: false, reason: 'internal error' }, { status: 500 });
  }
}
