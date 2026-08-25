import 'server-only';
import crypto from 'crypto';

const DEFAULT_TTL_SECONDS = 60 * 60;

function secret(): string | null {
  return process.env.BILL_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

function sign(orderId: string, expires: number): string {
  const key = secret();
  if (!key) return '';
  return crypto.createHmac('sha256', key).update(`${orderId}.${expires}`).digest('hex');
}

export function createBillToken(orderId: string, ttlSeconds = DEFAULT_TTL_SECONDS): string {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `${expires}.${sign(orderId, expires)}`;
}

export function verifyBillToken(orderId: string, token: string | null): boolean {
  if (!token) return false;
  const [expiresRaw, signature] = token.split('.');
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || !signature || expires < Math.floor(Date.now() / 1000)) return false;
  const expected = Buffer.from(sign(orderId, expires), 'utf8');
  const provided = Buffer.from(signature, 'utf8');
  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
}
