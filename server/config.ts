import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local and .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });

const isDev = process.env.NODE_ENV !== 'production';
const port = Number(process.env.FASTIFY_PORT || '3001');
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid FASTIFY_PORT');

function origin(value: string): string {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Expected an HTTP origin');
  return url.origin;
}

export const config = {
  port,
  host: process.env.FASTIFY_HOST || '127.0.0.1',
  // Trust only the proxy addresses explicitly configured by the operator.
  trustProxy: process.env.FASTIFY_TRUST_PROXY?.split(',').map(value => value.trim()).filter(Boolean) || false,
  corsOrigins: [
    ...(isDev ? ['http://localhost:3000', 'http://127.0.0.1:3000'] : []),
    process.env.NEXT_PUBLIC_SITE_URL || '',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
    ...(process.env.FASTIFY_CORS_ORIGINS || '').split(','),
  ].map(value => value.trim()).filter(Boolean).map(origin),
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  isDev,
};
