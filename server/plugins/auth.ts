import fp from 'fastify-plugin';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FastifyRequest } from 'fastify';
import type { UserRole } from '../../src/types';

export interface Session {
  userId: string;
  role: UserRole;
  expiresAt: number;
  db: SupabaseClient;
}

declare module 'fastify' {
  interface FastifyRequest { session: Session | null }
  interface FastifyInstance {
    verifySession: (token: string) => Promise<Session>;
    authenticate: (request: FastifyRequest) => Promise<void>;
  }
}

export default fp(async function authPlugin(app) {
  app.decorateRequest('session', null);
  app.decorate('verifySession', async (token: string): Promise<Session> => {
    if (!token || token.length > 8192) throw app.httpErrors.unauthorized('Sign in to continue');
    const db = app.userDb(token);
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user) throw app.httpErrors.unauthorized('Session expired. Please sign in again.');
    const { data: profile, error: profileError } = await db.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
    if (profileError) throw app.httpErrors.serviceUnavailable('Unable to verify permissions');
    const role = profile?.role;
    if (!['admin', 'manager', 'chef', 'cashier', 'waiter', 'customer'].includes(role)) {
      throw app.httpErrors.forbidden('Account permissions are not configured');
    }
    // Decode expiry only after Supabase has verified the token's signature.
    let expiresAt = 0;
    try { expiresAt = Number(JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).exp) * 1000; } catch { /* rejected below */ }
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw app.httpErrors.unauthorized('Session expired');
    return { userId: data.user.id, role, expiresAt, db };
  });
  app.decorate('authenticate', async (request: FastifyRequest) => {
    const match = /^Bearer\s+(\S+)$/i.exec(request.headers.authorization || '');
    if (!match) throw app.httpErrors.unauthorized('Sign in to continue');
    request.session = await app.verifySession(match[1]);
  });
});
