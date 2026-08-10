import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json([]);
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    // Limit fetching to a maximum of 50 orders for safety
    const safeIds = ids
      .slice(0, 50)
      .filter((id): id is string => typeof id === 'string' && id.startsWith('PPR-ORD-'));

    if (safeIds.length === 0) {
      return NextResponse.json([]);
    }

    const { data, error } = await admin
      .from('orders')
      .select('*')
      .in('id', safeIds)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
