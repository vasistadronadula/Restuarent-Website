import 'server-only';
import type { User } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export class RequireAdminError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Verifies the request's `Authorization: Bearer <access_token>` belongs to
 * an admin/manager and returns that user. This app uses `@supabase/supabase-js`
 * (localStorage sessions, not cookies), so there's no server-readable session
 * for a route handler to pick up implicitly — the client must forward its
 * access token explicitly, which is validated here via the service-role
 * client's `auth.getUser(token)`, then cross-checked against `profiles.role`
 * (also via the service-role client, bypassing RLS) since a token alone
 * proves identity, not authorization.
 *
 * This check is the ONLY gate protecting the privileged operations it's used
 * to guard (creating logins, calling `admin_upsert_staff`) — never trust a
 * role sent in the request body itself.
 */
export async function requireAdmin(request: Request): Promise<User> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) throw new RequireAdminError('Missing Authorization header', 401);

  const admin = getSupabaseAdmin();
  if (!admin) throw new RequireAdminError('Server not configured', 500);

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) throw new RequireAdminError('Invalid or expired session', 401);

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (profileError) throw new RequireAdminError('Failed to verify role', 500);

  const role = (profile?.role || '').toString().toLowerCase().trim();
  if (role !== 'admin' && role !== 'manager') {
    throw new RequireAdminError('Admin privileges required', 403);
  }

  return userData.user;
}
