import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { assertSameOrigin, authErrorResponse } from '@/lib/auth/apiAuth';
import { rateLimit, clientIp } from '@/lib/auth/rateLimit';
import { log } from '@/lib/logger';

/**
 * Columns a guest order-tracking card needs.
 *
 * No `customer_phone`: this route is reachable with nothing but an order ID
 * (the `ids` lookup mode below) or the phone number itself (the `phone`
 * lookup mode, which needs it only as a filter, not in the response) — so
 * returning the phone number here would hand it to anyone who learns/guesses
 * one order ID, not just the customer who placed it.
 */
const GUEST_ORDER_COLUMNS = [
  'id',
  'status',
  'items',
  'subtotal',
  'cgst',
  'sgst',
  'discount',
  'delivery_charge',
  'grand_total',
  'payment_mode',
  'payment_status',
  'order_type',
  'table_number',
  'order_time',
  'created_at',
  'coupon_code',
  'order_source',
  'delay_minutes',
  'customer_name',
].join(', ');

const MAX_IDS_PER_REQUEST = 50;
// Guest IDs are bearer credentials. Only the cryptographically random format
// is accepted; legacy timestamp/random-tail IDs were enumerable and therefore
// cannot safely authorize disclosure of an order.
const ORDER_ID_PATTERN = /^PPR-ORD-\d{8}-[a-f0-9]{20}$/i;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch (err) {
    const { body, status } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  // Rate limiting to protect guest endpoint
  const limit = rateLimit(`guest-orders:ip:${clientIp(request)}`, 60, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const admin = getSupabaseAdmin();
    if (!admin) {
      log.error('guest_orders_missing_admin_client');
      return NextResponse.json([]);
    }

    // Phone-number lookup is intentionally not supported: a phone number is not proof of ownership.

    // Order IDs saved in this browser's localStorage are enough to show tracking cards.
    const ids = body?.ids;
    if (Array.isArray(ids) && ids.length > 0) {
      const safeIds = ids
        .slice(0, MAX_IDS_PER_REQUEST)
        .filter((id): id is string => typeof id === 'string' && ORDER_ID_PATTERN.test(id.trim()))
        .map((id) => id.trim());

      if (safeIds.length === 0) {
        return NextResponse.json([]);
      }

      const { data, error } = await admin
        .from('orders')
        .select(GUEST_ORDER_COLUMNS)
        .in('id', safeIds)
        .order('created_at', { ascending: false });

      if (error) {
        log.error('guest_orders_id_query_failed', { error });
        return NextResponse.json([]);
      }

      return NextResponse.json(data || []);
    }

    return NextResponse.json([]);
  } catch (error) {
    log.error('guest_orders_failed', { error });
    return NextResponse.json([]);
  }
}
