import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';

declare module 'fastify' {
  interface FastifyInstance {
    supabase: SupabaseClient | null;
    publicDb: SupabaseClient | null;
    userDb: (token: string) => SupabaseClient;
  }
}

export default fp(async function supabasePlugin(fastify: FastifyInstance) {
  const { url, serviceRoleKey, anonKey } = config.supabase;
  const options = {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, {
        ...init,
        signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000),
      }),
    },
  };
  fastify.decorate('supabase', url && serviceRoleKey ? createClient(url, serviceRoleKey, options) : null);
  fastify.decorate('publicDb', url && anonKey ? createClient(url, anonKey, options) : null);
  fastify.decorate('userDb', (token: string) => {
    if (!url || !anonKey) throw fastify.httpErrors.serviceUnavailable('Database is not configured');
    // Core routes always execute with the caller's JWT. RLS, audit triggers,
    // and kitchen concurrency checks remain authoritative in PostgreSQL.
    return createClient(url, anonKey, {
      ...options,
      global: { ...options.global, headers: { Authorization: `Bearer ${token}` } },
    });
  });
});
