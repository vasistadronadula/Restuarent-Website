import 'server-only';
import type { User } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { STAFF_ROLES } from '@/lib/roleAccess';
import type { UserRole } from '@/types';

/**
 * apiAuth.ts — the shared gate for route handlers that are neither fully
 * public nor admin-exclusive.
 *
 * `requireAdmin` (its own module) stays the narrow gate for the privileged
 * employee/payroll operations. What was missing was everything in between:
 * routes that any *staff* member legitimately triggers (push, WhatsApp,
 * uploads), and routes a *guest* legitimately triggers but that still must
 * not be callable by anything other than this site's own pages (Razorpay
 * order creation, payment status lookups).
 */

export class ApiAuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiAuthError';
    this.status = status;
  }
}

export interface StaffCaller {
  user: User;
  role: UserRole;
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;
  if (!header.toLowerCase().startsWith('bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

/**
 * Verifies the request's `Authorization: Bearer <access_token>` belongs to a
 * signed-in staff member (any non-customer role) and returns that user.
 *
 * Same mechanics as `requireAdmin`: this app uses localStorage Supabase
 * sessions rather than cookies, so a route handler has nothing to read
 * implicitly — the client forwards its access token, which is validated
 * here via the service-role client and then cross-checked against
 * `profiles.role`. A token proves identity; the profile lookup is what
 * proves authorization, and it is never read from the request body.
 */
export async function requireStaff(request: Request): Promise<StaffCaller> {
  const token = bearerToken(request);
  if (!token) throw new ApiAuthError('Missing Authorization header', 401);

  const admin = getSupabaseAdmin();
  if (!admin) throw new ApiAuthError('Server not configured', 500);

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) throw new ApiAuthError('Invalid or expired session', 401);

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (profileError) throw new ApiAuthError('Failed to verify role', 500);

  const role = (profile?.role || '').toString().toLowerCase().trim() as UserRole;
  if (!(STAFF_ROLES as readonly string[]).includes(role)) {
    throw new ApiAuthError('Staff privileges required', 403);
  }

  return { user: userData.user, role };
}

/**
 * Rejects requests that did not originate from a page on this deployment.
 *
 * This is the guard for endpoints a *guest* must be able to reach — checkout
 * runs without an account, so Razorpay order creation cannot demand a
 * session. Browsers send `Origin` on every cross-origin POST (and on
 * same-origin POSTs too), and script on another site cannot forge it, so
 * comparing it to the request's own host stops the "anyone can POST this
 * endpoint from anywhere" shape of the problem without breaking guests.
 *
 * It is not a defence against a non-browser client — curl sets whatever
 * header it likes. That case is covered by the rate limits the same routes
 * apply; between them, the endpoint stops being a free amplifier.
 */
export function assertSameOrigin(request: Request): void {
  const host = request.headers.get('host');
  const forwardedHost = request.headers.get('x-forwarded-host');

  const allowedHosts = new Set<string>();
  if (host) allowedHosts.add(host.toLowerCase().split(':')[0]);
  if (forwardedHost) allowedHosts.add(forwardedHost.toLowerCase().split(':')[0]);

  // Always permit official deployment hosts and local test environments
  allowedHosts.add('pala-pitta-ruchulu.vercel.app');
  allowedHosts.add('palapittaruchulu.vercel.app');
  allowedHosts.add('localhost');
  allowedHosts.add('127.0.0.1');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    try {
      allowedHosts.add(new URL(siteUrl).hostname.toLowerCase());
    } catch {
      // Misconfigured env var — fall back to known hosts
    }
  }

  if (process.env.VERCEL_URL) {
    allowedHosts.add(process.env.VERCEL_URL.toLowerCase().split(':')[0]);
  }

  // If the browser signals same-origin fetch context directly
  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite === 'same-origin' || secFetchSite === 'none') {
    return;
  }

  const candidate = request.headers.get('origin') || request.headers.get('referer');
  if (!candidate) {
    throw new ApiAuthError('Forbidden', 403);
  }

  let candidateHost: string;
  try {
    candidateHost = new URL(candidate).hostname.toLowerCase();
  } catch {
    throw new ApiAuthError('Forbidden', 403);
  }

  const isAllowed =
    allowedHosts.has(candidateHost) ||
    allowedHosts.has(candidateHost.replace(/:\d+$/, ''));

  if (!isAllowed) {
    throw new ApiAuthError('Forbidden', 403);
  }
}

/** Turns any thrown guard error into the response the route should return. */
export function authErrorResponse(err: unknown): { body: { error: string }; status: number } {
  if (err instanceof ApiAuthError) {
    return { body: { error: err.message }, status: err.status };
  }
  return { body: { error: 'Unauthorized' }, status: 401 };
}
