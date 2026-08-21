import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { sendNewReservationPushNotification } from '@/lib/pushNotify';
import { log } from '@/lib/logger';

// A reservation is only "new" for a short window after it's written. Past
// that, this endpoint refuses to re-announce it.
const FRESH_WINDOW_MS = 10 * 60 * 1000;

/**
 * Triggered by the browser right after a table booking is saved, to alert
 * servers (see RESERVATION_NOTIFICATION_ROLES in lib/roleAccess.ts).
 *
 * Unlike the order equivalent, this route accepts unauthenticated callers:
 * booking a table deliberately doesn't require an account, so there's often
 * no session to prove. What keeps it from becoming a staff-spam endpoint is
 * that it takes no content at all — the notification body is read from the
 * database server-side — and it only fires for a reservation created within
 * the last few minutes, so a replayed or guessed id for an older booking
 * does nothing.
 */
export async function POST(request: Request) {
  try {
    const { reservationId } = await request.json();
    if (!reservationId || typeof reservationId !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing reservationId' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Server not configured' }, { status: 500 });
    }

    const { data: reservation, error } = await admin
      .from('reservations')
      .select('id, created_at')
      .eq('id', reservationId)
      .maybeSingle();

    if (error || !reservation) {
      return NextResponse.json({ success: false, error: 'Reservation not found' }, { status: 404 });
    }

    const createdAt = reservation.created_at ? new Date(reservation.created_at).getTime() : 0;
    if (!createdAt || Date.now() - createdAt > FRESH_WINDOW_MS) {
      // Not an error for the caller — the booking is saved either way.
      return NextResponse.json({ success: true, notified: false });
    }

    await sendNewReservationPushNotification(reservationId);
    return NextResponse.json({ success: true, notified: true });
  } catch (error) {
    log.error('push_new_reservation_failed', { error });
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
