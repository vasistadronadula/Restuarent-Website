import { supabase } from './supabase';

/**
 * authedFetch.ts — browser → internal API with the caller's Supabase token.
 *
 * The staff-gated routes (`/api/push/*`, `/api/whatsapp/*`, `/api/upload`)
 * verify a `Bearer` access token against `profiles.role`, because this app
 * keeps its Supabase session in localStorage and a route handler has no
 * cookie to read implicitly. Every caller therefore has to attach the token
 * itself, and doing that inline in each `fetch` is how one gets forgotten.
 */

/**
 * Fire-and-forget POST that never throws and never rejects.
 *
 * These calls sit behind a write that already succeeded — the order is saved
 * whether or not the notification goes out — so a missing session, an offline
 * device or a 500 must all be swallowed rather than surfaced as a failure of
 * the thing the user actually did.
 */
export async function postAuthedJson(url: string, body: unknown): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  } catch {
    // Non-critical — silently ignore.
  }
}
