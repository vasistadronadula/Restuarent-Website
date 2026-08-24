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
const ORDER_ID_PATTERN = /^[a-zA-Z0-9_-]{4,60}$/;

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

    // 1. Phone number lookup (Finds all guest orders placed with this phone)
    const phoneInput = typeof body?.phone === 'string' ? body.phone.trim() : null;
    if (phoneInput) {
      const digitsOnly = phoneInput.replace(/\D/g, '');
      const last10 = digitsOnly.slice(-10);

      if (last10.length >= 10) {
        const { data, error } = await admin
          .from('orders')
          .select(GUEST_ORDER_COLUMNS)
          .ilike('customer_phone', `%${last10}%`)
          .order('created_at', { ascending: false })
          .limit(30);

        if (error) {
          log.error('guest_orders_phone_query_failed', { error });
          return NextResponse.json([]);
        }

        return NextResponse.json(data || []);
      }
    }

    // 2. Order IDs array lookup
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
