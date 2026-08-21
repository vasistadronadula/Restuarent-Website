import 'server-only';
import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time secret comparison for webhook auth headers.
 *
 * `a !== b` on two strings short-circuits at the first differing byte, so an
 * attacker who can measure response latency can recover a shared secret one
 * character at a time. Both aggregator webhooks (Swiggy/Zomato) gate on
 * exactly this kind of header comparison, so it goes through
 * `timingSafeEqual` instead — padded to equal length first, since that
 * function throws (rather than just returning false) on a length mismatch.
 */
export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still do a same-shaped comparison rather than returning early, so the
    // timing doesn't itself leak the fact that the length was wrong.
    timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
