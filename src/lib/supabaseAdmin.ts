import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null | undefined;

/**
 * Service-role Supabase client — bypasses RLS entirely.
 * Import ONLY from server-only modules (API routes, lib modules those
 * routes call) — never from a client component; the `server-only` import
 * above makes an accidental client-side import a build-time error.
 *
 * Returns null (and logs once) instead of throwing when unconfigured, so
 * optional features built on it (push notifications) degrade gracefully
 * rather than crashing the request that triggered them.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
      'SUPABASE_SERVICE_ROLE_KEY not set — service-role features (push notifications) are disabled.'
    );
    cached = null;
    return null;
  }

  cached = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
