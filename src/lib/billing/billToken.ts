import 'server-only';
import crypto from 'crypto';

const DEFAULT_TTL_SECONDS = 60 * 60;

function secret(): string | null {
  // BILL_TOKEN_SECRET must be its own env var — never alias the service-role
  // key here. The service-role key is the highest-privilege credential in the
  // system; using it as an HMAC signing key for bill PDF tokens creates a
  // second attack surface for the same credential and makes it impossible to
  // rotate one without rotating the other.
  const key = process.env.BILL_TOKEN_SECRET;
  if (!key) {
    // Log clearly at call time so an unconfigured deployment doesn't silently
    // produce unsigned tokens (the empty-string HMAC would always match).
    console.warn(
      '[billToken] BILL_TOKEN_SECRET is not set — bill PDF tokens cannot be signed. ' +
      'Set this env var to a random 32+ character string.'
    );
    return null;
  }
  return key;
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
  // sign() returns '' when unconfigured — both buffers are empty and equal,
  // which would admit all tokens. Guard against that explicitly.
  if (expected.length === 0) return false;
  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
}
