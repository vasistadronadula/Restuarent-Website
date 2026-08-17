import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { sendPrepDelayNotification } from '@/lib/whatsapp';

/**
 * POST /api/whatsapp/send-delay-notification
 *
 * Called when the kitchen extends prep time for an order via the KDS.
 * Sends a courteous "a few more minutes" WhatsApp message to the customer.
 *
 * Body: { orderId: string, extraMinutes: number, reason?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { orderId, extraMinutes, reason } = await req.json();
    if (!orderId || !extraMinutes) {
      return NextResponse.json({ error: 'orderId and extraMinutes required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.warn('[WhatsApp] Supabase admin not configured — skipping delay notification');
      return NextResponse.json({ ok: false, reason: 'supabase not configured' });
    }

    const { data, error } = await supabase
      .from('orders')
      .select('id, customer_name, customer_phone')
      .eq('id', orderId)
      .single();

    if (error || !data) {
      console.warn(`[WhatsApp] Order ${orderId} not found for delay notification:`, error?.message);
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
    console.error('[WhatsApp] send-delay-notification error:', err);
    return NextResponse.json({ ok: false, reason: 'internal error' }, { status: 500 });
  }
}
