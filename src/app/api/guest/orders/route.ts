import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { assertSameOrigin, authErrorResponse } from '@/lib/auth/apiAuth';
import { rateLimit, clientIp } from '@/lib/auth/rateLimit';
import { log } from '@/lib/logger';

/**
 * Columns a guest order-tracking card needs — and nothing else.
 *
 * This used to `select('*')`, which returned `customer_name`,
 * `customer_phone`, `customer_email` and `delivery_address` for any id the
 * caller named. Order ids are `PPR-ORD-YYYYMMDD-NNNN` — four digits, so
 * roughly nine thousand candidates per day — which put every diner's name
 * and phone number a short enumeration away. Nothing about tracking an order
 * needs those fields: the person holding the id already knows who they are,
 * and this route is what a stranger would use.
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
  'notes',
  'delay_minutes',
  'estimated_minutes',
].join(', ');

const MAX_IDS_PER_REQUEST = 50;
const ORDER_ID_PATTERN = /^PPR-ORD-\d{8}-\d{4}$/;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch (err) {
    const { body, status } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  // Caps how fast the id space can be walked even from a page on this site.
  const limit = rateLimit(`guest-orders:ip:${clientIp(request)}`, 60, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  try {
    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json([]);
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    // Full-shape match, not a `startsWith` on the prefix: the old check was
    // satisfied by any string beginning `PPR-ORD-`, including one carrying
    // PostgREST filter syntax.
    const safeIds = ids
      .slice(0, MAX_IDS_PER_REQUEST)
      .filter((id): id is string => typeof id === 'string' && ORDER_ID_PATTERN.test(id));

    if (safeIds.length === 0) {
      return NextResponse.json([]);
    }

    const { data, error } = await admin
      .from('orders')
      .select(GUEST_ORDER_COLUMNS)
      .in('id', safeIds)
      .order('created_at', { ascending: false });

    if (error) {
      log.error('guest_orders_query_failed', { error });
      return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    log.error('guest_orders_failed', { error });
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 });
  }
}
