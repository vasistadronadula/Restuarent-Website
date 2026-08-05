import 'server-only';
import { createVerify, X509Certificate } from 'node:crypto';

/**
 * firebaseIdToken.ts — verifies a Firebase Authentication ID token on the server.
 *
 * WHY THIS EXISTS
 * ---------------
 * Firebase's phone sign-in runs entirely in the browser: it sends the SMS and
 * confirms the code without this app's servers ever seeing either. Whatever the
 * browser then *says* about that ("I'm +91 98765 43210, log me in") is just a
 * string in a request body — a client can send it without having received any
 * SMS at all. The one artefact of the flow that cannot be forged is the ID
 * token Firebase issues on success: an RS256 JWT signed by Google.
 *
 * So the trust boundary is here. The browser proves phone ownership to Firebase,
 * forwards the resulting token, and this module checks the signature and every
 * claim before /api/auth/phone will mint a Supabase session from it. Nothing the
 * client asserts about *who it is* is read anywhere else in that flow.
 *
 * Implemented against node:crypto rather than firebase-admin on purpose: the
 * whole of what this app needs from the Admin SDK is "is this token genuine",
 * which is ~150 lines of standard JWT verification. Pulling in a large
 * server-side dependency (and its service-account credential to configure,
 * rotate and leak) to avoid them is a bad trade.
 */

/** Google's rotating public certificates for Firebase ID tokens. */
const CERT_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

/**
 * Tolerance for clock drift between this server and Google's, applied to `exp`,
 * `iat` and `auth_time`. Serverless hosts are usually NTP-tight, but a token
 * issued microseconds before a request lands must not be rejected for being
 * "issued in the future".
 */
const CLOCK_SKEW_SECONDS = 60;

/**
 * How recently the SMS code must have been confirmed for the token to buy a
 * Supabase session. Firebase ID tokens live an hour and refresh indefinitely,
 * which is right for Firebase's own purposes and far too loose for ours: this
 * token is a one-time receipt for "someone just proved they hold this SIM",
 * and a receipt that stays valid for an hour is one that can be replayed for an
 * hour. Ten minutes covers a slow network and a fumbled form; it does not cover
 * a token lifted from a device and used later.
 */
const MAX_AUTH_AGE_SECONDS = 10 * 60;

export class FirebaseTokenError extends Error {
  /** Safe to return to the client — deliberately vague about which check failed. */
  readonly publicMessage: string;

  constructor(detail: string, publicMessage = 'Phone verification failed. Please request a new code.') {
    super(detail);
    this.name = 'FirebaseTokenError';
    this.publicMessage = publicMessage;
  }
}

export interface VerifiedPhoneToken {
  /** Firebase UID — stable per phone number within the project. */
  uid: string;
  /** E.164, exactly as Firebase issued it (e.g. `+919876543210`). */
  phoneNumber: string;
  /** Unix seconds at which the SMS code was confirmed. */
  authTime: number;
}

// ─── Certificate cache ───────────────────────────────────────────────────────
// Google rotates these daily and serves a max-age telling us when to look
// again. Re-fetching per request would add a round-trip to Google inside every
// login; never re-fetching would break the moment a key rotates. Honour the
// header, and keep serving a stale set if a refresh fails rather than locking
// everyone out over one flaky fetch.

interface CertCache {
  certs: Record<string, string>;
  expiresAt: number;
}

let certCache: CertCache | null = null;
let inFlight: Promise<Record<string, string>> | null = null;

async function fetchCerts(): Promise<Record<string, string>> {
  const response = await fetch(CERT_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new FirebaseTokenError(`Google cert endpoint returned ${response.status}`);
  }

  const certs = (await response.json()) as Record<string, string>;
  if (!certs || typeof certs !== 'object' || Object.keys(certs).length === 0) {
    throw new FirebaseTokenError('Google cert endpoint returned no certificates');
  }

  const maxAge = Number(/max-age=(\d+)/.exec(response.headers.get('cache-control') ?? '')?.[1]);
  const ttl = Number.isFinite(maxAge) && maxAge > 0 ? maxAge : 3600;

  certCache = { certs, expiresAt: Date.now() + ttl * 1000 };
  return certs;
}

async function getCerts(forceRefresh = false): Promise<Record<string, string>> {
  if (!forceRefresh && certCache && certCache.expiresAt > Date.now()) return certCache.certs;

  // One fetch even if several logins land at once on a cold instance.
  inFlight ??= fetchCerts().finally(() => { inFlight = null; });

  try {
    return await inFlight;
  } catch (err) {
    // A rotation we couldn't fetch is better handled with yesterday's keys
    // (still valid for ~24h) than by failing every sign-in on the instance.
    if (certCache) return certCache.certs;
    throw err;
  }
}

// ─── JWT decoding ────────────────────────────────────────────────────────────

interface JwtHeader { alg?: string; kid?: string }

interface FirebaseClaims {
  iss?: string;
  aud?: string;
  sub?: string;
  exp?: number;
  iat?: number;
  auth_time?: number;
  phone_number?: string;
  firebase?: { sign_in_provider?: string };
}

function decodeSegment<T>(segment: string, label: string): T {
  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as T;
  } catch {
    throw new FirebaseTokenError(`Token ${label} is not valid base64url JSON`);
  }
}

/** Checks the token's RSA signature against one of Google's X.509 certificates. */
function verifySignature(cert: string, signingInput: string, signature: Buffer): boolean {
  try {
    const publicKey = new X509Certificate(cert).publicKey;
    return createVerify('RSA-SHA256').update(signingInput).verify(publicKey, signature);
  } catch {
    return false;
  }
}

/**
 * Verifies a Firebase phone-auth ID token end to end and returns the phone
 * number it proves ownership of.
 *
 * Throws FirebaseTokenError on anything short of a fully valid token. The
 * thrown `message` names the failed check for the server log; `publicMessage`
 * is what the client is allowed to see — an attacker probing the endpoint
 * should not be handed a description of which validation they tripped.
 */
export async function verifyFirebasePhoneToken(idToken: string): Promise<VerifiedPhoneToken> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'palapitta-8b18f';
  if (!projectId) {
    throw new FirebaseTokenError(
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set — cannot validate the token audience',
      'Phone sign-in is not configured on this server.',
    );
  }

  if (typeof idToken !== 'string' || idToken.length === 0 || idToken.length > 8192) {
    throw new FirebaseTokenError('Missing or implausibly sized ID token');
  }

  const parts = idToken.split('.');
  if (parts.length !== 3) throw new FirebaseTokenError('ID token is not a three-part JWT');
  const [headerB64, payloadB64, signatureB64] = parts;

  const header = decodeSegment<JwtHeader>(headerB64, 'header');
  // Pinning the algorithm is what stops the classic JWT forgeries: `alg: none`
  // (no signature at all) and `alg: HS256` (verify the "signature" with the
  // public certificate as an HMAC key, which anyone can compute).
  if (header.alg !== 'RS256') {
    throw new FirebaseTokenError(`Unexpected token algorithm: ${header.alg}`);
  }
  if (!header.kid) throw new FirebaseTokenError('Token header has no key id');

  const claims = decodeSegment<FirebaseClaims>(payloadB64, 'payload');
  const now = Math.floor(Date.now() / 1000);

  // Audience and issuer must both name *this* Firebase project. Without these
  // two, a token minted by any other Firebase project on earth — including one
  // the attacker created themselves — carries a signature that verifies
  // against the very same Google certificates.
  if (claims.aud !== projectId) {
    throw new FirebaseTokenError(`Token audience ${claims.aud} is not ${projectId}`);
  }
  if (claims.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new FirebaseTokenError(`Token issuer ${claims.iss} is not this project`);
  }

  if (typeof claims.sub !== 'string' || claims.sub.length === 0 || claims.sub.length > 128) {
    throw new FirebaseTokenError('Token subject is missing or malformed');
  }

  if (typeof claims.exp !== 'number' || claims.exp <= now - CLOCK_SKEW_SECONDS) {
    throw new FirebaseTokenError('Token has expired');
  }
  if (typeof claims.iat !== 'number' || claims.iat > now + CLOCK_SKEW_SECONDS) {
    throw new FirebaseTokenError('Token was issued in the future');
  }

  // This must be a phone sign-in specifically. Firebase issues structurally
  // identical tokens for anonymous and email sign-ins, and an anonymous one is
  // free to obtain — without this check it would be a session for anybody.
  if (claims.firebase?.sign_in_provider !== 'phone') {
    throw new FirebaseTokenError(`Token sign-in provider is ${claims.firebase?.sign_in_provider}, not phone`);
  }
  if (typeof claims.phone_number !== 'string' || !/^\+[1-9]\d{7,14}$/.test(claims.phone_number)) {
    throw new FirebaseTokenError('Token carries no valid E.164 phone number');
  }

  const authTime = claims.auth_time;
  if (typeof authTime !== 'number' || authTime > now + CLOCK_SKEW_SECONDS) {
    throw new FirebaseTokenError('Token auth_time is missing or in the future');
  }
  if (authTime < now - MAX_AUTH_AGE_SECONDS) {
    throw new FirebaseTokenError(
      `SMS was confirmed ${now - authTime}s ago, beyond the ${MAX_AUTH_AGE_SECONDS}s window`,
      'That verification has expired. Please request a new code.',
    );
  }

  // Signature last: the cheap claim checks reject malformed and stale tokens
  // without an RSA verification or a possible round-trip to Google.
  const signingInput = `${headerB64}.${payloadB64}`;
  const signature = Buffer.from(signatureB64, 'base64url');
  if (signature.length === 0) throw new FirebaseTokenError('Token signature is empty');

  let certs = await getCerts();
  let cert = certs[header.kid];

  // An unknown `kid` on a token that is otherwise well-formed usually means
  // Google rotated keys inside our cache window, so look once more with a
  // forced refresh before calling it a forgery.
  if (!cert) {
    certs = await getCerts(true);
    cert = certs[header.kid];
  }
  if (!cert) throw new FirebaseTokenError(`No Google certificate matches key id ${header.kid}`);

  if (!verifySignature(cert, signingInput, signature)) {
    throw new FirebaseTokenError('Token signature does not verify against Google\'s certificate');
  }

  return { uid: claims.sub, phoneNumber: claims.phone_number, authTime };
}
