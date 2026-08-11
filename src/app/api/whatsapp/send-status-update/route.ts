import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { sendOrderStatusUpdate } from '@/lib/whatsapp';

/**
 * POST /api/whatsapp/send-status-update
 *
 * Called when the kitchen / cashier changes an order's status.
 * Sends a WhatsApp notification to the customer about the new stage.
 *
 * Body: { orderId: string, newStatus: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { orderId, newStatus } = await req.json();
    if (!orderId || !newStatus) {
      return NextResponse.json(
        { error: 'orderId and newStatus required' },
        { status: 400 }
      );
    }

    // Only notify for meaningful status transitions
    if (!['preparing', 'ready', 'delivered'].includes(newStatus)) {
      return NextResponse.json({ ok: false, reason: 'status not notifiable' });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.warn('[WhatsApp] Supabase admin not configured — skipping');
      return NextResponse.json({ ok: false, reason: 'supabase not configured' });
    }

    // Fetch customer details from the order
    const { data, error } = await supabase
      .from('orders')
      .select('id, customer_name, customer_phone')
      .eq('id', orderId)
      .single();

    if (error || !data) {
      console.warn(`[WhatsApp] Order ${orderId} not found:`, error?.message);
      return NextResponse.json({ ok: false, reason: 'order not found' });
    }

    const sent = await sendOrderStatusUpdate(
      orderId,
      data.customer_phone,
      data.customer_name || 'Customer',
      newStatus
    );

    return NextResponse.json({ ok: sent });
  } catch (err) {
    console.error('[WhatsApp] send-status-update error:', err);
    return NextResponse.json({ ok: false, reason: 'internal error' }, { status: 500 });
  }
}
