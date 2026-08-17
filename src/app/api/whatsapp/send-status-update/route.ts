import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { sendOrderStatusUpdate } from '@/lib/whatsapp';

/**
 * POST /api/whatsapp/send-status-update
 *
 * Called when the kitchen / cashier changes an order's status.
 * Sends a rich WhatsApp notification to the customer about the new stage.
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

    // Fetch customer + order details so we can personalise the message
    const { data, error } = await supabase
      .from('orders')
      .select('id, customer_name, customer_phone, order_type, table_number, items')
      .eq('id', orderId)
      .single();

    if (error || !data) {
      console.warn(`[WhatsApp] Order ${orderId} not found:`, error?.message);
      return NextResponse.json({ ok: false, reason: 'order not found' });
    }

    // Count items for context in the message
    let itemCount: number | undefined;
    try {
      const items = typeof data.items === 'string' ? JSON.parse(data.items) : data.items;
      itemCount = Array.isArray(items) ? items.length : undefined;
    } catch {
      itemCount = undefined;
    }

    const sent = await sendOrderStatusUpdate(
      orderId,
      data.customer_phone,
      data.customer_name || 'Customer',
      newStatus,
      {
        orderType: data.order_type,
        tableNumber: data.table_number ?? undefined,
        itemCount,
      }
    );

    return NextResponse.json({ ok: sent });
  } catch (err) {
    console.error('[WhatsApp] send-status-update error:', err);
    return NextResponse.json({ ok: false, reason: 'internal error' }, { status: 500 });
  }
}
