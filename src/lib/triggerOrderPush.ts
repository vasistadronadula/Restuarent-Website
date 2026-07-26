import { supabase } from './supabase';

/**
 * Fire-and-forget: ask the server to push-notify subscribed admin devices
 * about a newly created order. Never throws — a notification failure must
 * never block or fail the checkout/POS flow that just successfully saved
 * a real order.
 */
export async function triggerNewOrderPush(orderId: string): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    await fetch('/api/push/notify-new-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ orderId }),
    });
  } catch {
    // Non-critical — silently ignore.
  }
}
