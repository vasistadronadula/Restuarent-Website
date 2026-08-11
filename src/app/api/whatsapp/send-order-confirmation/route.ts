import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { sendOrderConfirmation } from '@/lib/whatsapp';
import { mapOrder } from '@/lib/queries/mappers';

/**
 * POST /api/whatsapp/send-order-confirmation
 *
 * Called after a successful order placement to send the customer their
 * order receipt + bill via WhatsApp. Fire-and-forget from the client —
 * a failure here never affects the checkout flow.
 *
 * Body: { orderId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: 'orderId required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.warn('[WhatsApp] Supabase admin not configured — skipping');
      return NextResponse.json({ ok: false, reason: 'supabase not configured' });
    }

    // Fetch the order from DB
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !data) {
      console.warn(`[WhatsApp] Order ${orderId} not found:`, error?.message);
      return NextResponse.json({ ok: false, reason: 'order not found' });
    }

    const order = mapOrder(data);

    // Send the WhatsApp message
    const sent = await sendOrderConfirmation({
      id: order.id,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      orderType: order.orderType,
      tableNumber: order.tableNumber,
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity || 1,
        price: item.price,
        selectedPortion: item.selectedPortion,
      })),
      subtotal: order.subtotal,
      cgst: order.cgst,
      sgst: order.sgst,
      discount: order.discount,
      grandTotal: order.grandTotal,
      paymentMode: order.paymentMode,
      paymentStatus: order.paymentStatus,
      orderDate: order.orderDate,
      orderTime: order.orderTime,
    });

    return NextResponse.json({ ok: sent });
  } catch (err) {
    console.error('[WhatsApp] send-order-confirmation error:', err);
    return NextResponse.json({ ok: false, reason: 'internal error' }, { status: 500 });
  }
}
