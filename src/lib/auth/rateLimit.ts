import 'server-only';

/**
 * rateLimit.ts — fixed-window request throttling for auth endpoints.
 *
 * SCOPE, HONESTLY STATED
 * ----------------------
 * The counters live in the process, so on a serverless host each instance
 * limits only the traffic it happens to receive. A determined attacker with
 * enough parallelism gets a multiple of the stated limit.
 *
 * That is acceptable because this is the *second* line, not the first. Firebase
 * already gates the expensive, abusable half of phone sign-in — sending SMS —
 * behind reCAPTCHA and its own per-number and per-project quotas, and every
 * token reaching /api/auth/phone has to carry a valid Google signature. What is
 * left for this to cover is a client hammering the exchange endpoint with junk,
 * where a per-instance cap is enough to keep the RSA verification and the
 * Supabase admin calls from becoming a free amplifier.
 *
 * If this ever needs to be a real boundary — a hard per-number daily cap, say —
 * it has to move to shared storage (Postgres or Redis). Do not mistake this for
 * that.
 */

interface Window {
  count: number;
  /** Unix ms at which the current window closes and the count resets. */
  resetAt: number;
}

const windows = new Map<string, Window>();

/**
 * Bound on the map's size. Reached only under an attack whose whole purpose is
 * to grow it; evicting the oldest entries costs an attacker their own counters
 * before it costs a real user theirs.
 */
const MAX_TRACKED_KEYS = 10_000;

function sweep(now: number) {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
  if (windows.size <= MAX_TRACKED_KEYS) return;
  // Map iterates in insertion order, so this drops the least recently created.
  const excess = windows.size - MAX_TRACKED_KEYS;
  let dropped = 0;
  for (const key of windows.keys()) {
    windows.delete(key);
    if (++dropped >= excess) break;
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Requests still available in the current window. */
  remaining: number;
  /** Whole seconds until the window resets — ready for a Retry-After header. */
  retryAfter: number;
}

/**
 * Counts one request against `key` and reports whether it may proceed.
 *
 * @param key    Identity being limited. Namespace it (`otp:ip:1.2.3.4`) so two
 *               callers limiting different things can never collide.
 * @param limit  Requests permitted per window.
 * @param windowMs Window length in milliseconds.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  // Amortised cleanup: a sweep every ~100 calls rather than a timer, which on a
  // serverless instance would keep the process alive for nothing.
  if (windows.size > 64 && Math.random() < 0.01) sweep(now);

  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  existing.count += 1;
  const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  if (existing.count > limit) {
    return { allowed: false, remaining: 0, retryAfter };
  }
  return { allowed: true, remaining: limit - existing.count, retryAfter };
}

/**
 * Best-effort client IP for rate-limit keying.
 *
 * `x-forwarded-for` is trivially spoofable in general, which is why this is only
 * ever used to bucket counters — never to authorize anything. Behind Vercel the
 * left-most entry is the real client and upstream values are rewritten, so the
 * bucketing is accurate for the deployment that matters.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}
