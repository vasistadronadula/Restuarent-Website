import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { sendOrderConfirmation } from '@/lib/whatsapp';
import { mapOrder } from '@/lib/queries/mappers';
import { orderItemPortion } from '@/lib/orderItems';
import { assertSameOrigin, authErrorResponse } from '@/lib/auth/apiAuth';
import { rateLimit, clientIp } from '@/lib/auth/rateLimit';
import { log } from '@/lib/logger';

/**
 * An order is only "just placed" for a short window. Past that, this route
 * refuses to re-send its receipt.
 */
const FRESH_WINDOW_MS = 10 * 60 * 1000;

/**
 * POST /api/whatsapp/send-order-confirmation
 *
 * Called right after a successful order placement to send the customer their
 * receipt via WhatsApp. Fire-and-forget from the client — a failure here
 * never affects the checkout flow.
 *
 * Body: { orderId: string }
 *
 * Checkout works without an account, so unlike the two staff WhatsApp routes
 * this one cannot demand a session. It's narrowed three other ways instead,
 * which together take away everything an abuser would want from it:
 *
 *  - the request must come from a page on this site (`assertSameOrigin`);
 *  - the order must have been created within the last few minutes, so
 *    walking the `PPR-ORD-YYYYMMDD-NNNN` id space to spam old customers
 *    finds nothing;
 *  - each order gets exactly one confirmation, so a replay of a *fresh* id
 *    can't send the same message repeatedly.
 *
 * The message content is read from the database, never from the request.
 */
const sentOrderIds = new Map<string, number>();

/**
 * Bound on the replay-guard map. Entries older than the freshness window are
 * useless anyway — a repeat past it is refused by the recency check.
 */
function rememberSent(orderId: string) {
  const now = Date.now();
  if (sentOrderIds.size > 500) {
    for (const [id, at] of sentOrderIds) {
      if (now - at > FRESH_WINDOW_MS) sentOrderIds.delete(id);
    }
  }
  sentOrderIds.set(orderId, now);
}

function alreadySent(orderId: string): boolean {
  const at = sentOrderIds.get(orderId);
  return at !== undefined && Date.now() - at <= FRESH_WINDOW_MS;
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
  } catch (err) {
    const { body, status } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const limit = rateLimit(`wa:confirm:ip:${clientIp(req)}`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, reason: 'rate limited' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  try {
    const { orderId } = await req.json();
    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'orderId required' }, { status: 400 });
    }

    if (alreadySent(orderId)) {
      return NextResponse.json({ ok: true, reason: 'already sent' });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      log.warn('whatsapp_skipped_no_supabase_admin', { route: 'send-order-confirmation' });
      return NextResponse.json({ ok: false, reason: 'supabase not configured' });
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !data) {
      log.warn('whatsapp_order_not_found', { orderId, error: error?.message });
      return NextResponse.json({ ok: false, reason: 'order not found' });
    }

    const createdAt = data.created_at ? new Date(data.created_at).getTime() : 0;
    if (!createdAt || Date.now() - createdAt > FRESH_WINDOW_MS) {
      // Not an error for the caller — the order is saved either way.
      return NextResponse.json({ ok: false, reason: 'order is not newly placed' });
    }

    rememberSent(orderId);
    const order = mapOrder(data);

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
        // `orderItemPortion`, not `item.selectedPortion` — a POS ticket
        // records the portion under `portion`, so half of the receipts
        // dropped the size off every line.
        selectedPortion: orderItemPortion(item),
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
    log.error('whatsapp_order_confirmation_failed', { error: err });
    return NextResponse.json({ ok: false, reason: 'internal error' }, { status: 500 });
  }
}
