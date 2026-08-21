import { supabase } from './supabase';
import { postAuthedJson } from './authedFetch';

/**
 * Fire-and-forget push triggers, called from the browser right after a write
 * succeeds. Neither ever throws — a notification failure must never block or
 * fail the checkout/POS/booking flow that just saved real data.
 */

/**
 * Ask the server to notify the cashier and kitchen about a new order.
 * Orders always come from a signed-in customer (checkout requires an account)
 * or a signed-in cashier (POS), so the request carries their access token.
 */
export async function triggerNewOrderPush(orderId: string): Promise<void> {
  await postAuthedJson('/api/push/notify-new-order', { orderId });
}

/**
 * Ask the server to send an order confirmation + bill receipt to the
 * customer's phone via WhatsApp. Fire-and-forget — a delivery failure
 * is logged server-side but never surfaces to the customer.
 */
export async function triggerWhatsAppOrderConfirmation(orderId: string): Promise<void> {
  try {
    await fetch('/api/whatsapp/send-order-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
  } catch {
    // Non-critical — silently ignore.
  }
}

/**
 * Ask the server to notify servers about a new table reservation. Booking a
 * table doesn't require an account, so the token is attached when there is
 * one and omitted otherwise — the route accepts guests but only for a
 * just-created reservation (see the recency check there).
 */
export async function triggerNewReservationPush(reservationId: string): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    await fetch('/api/push/notify-new-reservation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ reservationId }),
    });
  } catch {
    // Non-critical — silently ignore.
  }
}

