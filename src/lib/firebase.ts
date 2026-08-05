'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type Auth,
  type ConfirmationResult,
} from 'firebase/auth';
import { toE164 } from '@/lib/phoneIdentity';

export type { ConfirmationResult };

/**
 * firebase.ts — browser-side Firebase, used for exactly one thing: sending the
 * SMS code and confirming it.
 *
 * Firebase is the SMS gateway here and nothing more. The session that follows
 * is a Supabase one, minted by /api/auth/phone after it verifies the ID token
 * this module produces — see lib/auth/firebaseIdToken.ts for why that split
 * exists. Nothing outside the OTP screens should import from this file.
 *
 * The config values below are public by design: Firebase web keys identify a
 * project, they don't authorize anything, and they ship in the client bundle of
 * every Firebase site. What actually protects the project is the reCAPTCHA
 * challenge, the authorized-domains list in the Firebase console, and the
 * server-side token check. They live in env vars anyway so a deployment can be
 * pointed at a staging project without a code change.
 */

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCOb5OWVP_ZGoEI1KpFvivj7rf2KfKOuDo",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "palapitta-8b18f.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "palapitta-8b18f",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "palapitta-8b18f.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "14392240197",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:14392240197:web:5d90be8c702818e9009b2c",
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId,
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

/**
 * Initialises on first use rather than at import.
 *
 * Firebase's auth module is a substantial download, and most visits to this
 * site never open a sign-in form. Deferring the work to the moment someone
 * actually asks for an OTP keeps it off the critical path of the menu and
 * checkout pages, which is where the sales are.
 */
function getFirebaseAuth(): Auth {
  if (typeof window === 'undefined') {
    throw new Error('Firebase phone auth is browser-only.');
  }
  if (!isFirebaseConfigured) {
    throw new Error(
      'Phone sign-in is not configured. Set the NEXT_PUBLIC_FIREBASE_* variables in the environment.',
    );
  }
  if (!auth) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    // Sends the SMS and any Firebase-rendered UI in the browser's language.
    auth.useDeviceLanguage();
  }
  return auth;
}

// ─── reCAPTCHA lifecycle ─────────────────────────────────────────────────────
// Firebase requires an app verifier per SMS request. Getting its lifecycle
// wrong is the usual cause of "reCAPTCHA has already been rendered in this
// element" and of a Resend button that silently does nothing: the widget binds
// to a DOM node, and a stale binding survives a React re-render that the node
// itself did not.
//
// One verifier is kept per container id, cleared explicitly when the screen
// unmounts or when a request fails badly enough that the challenge is spent.

const verifiers = new Map<string, RecaptchaVerifier>();

function getVerifier(containerId: string): RecaptchaVerifier {
  // Clear any existing instance/markup to prevent "reCAPTCHA has already been rendered in this element"
  clearRecaptcha(containerId);

  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`reCAPTCHA container #${containerId} is not in the document.`);
  }
  container.innerHTML = '';

  const verifier = new RecaptchaVerifier(getFirebaseAuth(), containerId, { size: 'invisible' });
  verifiers.set(containerId, verifier);
  return verifier;
}

/** Tears down the verifier for a container. Safe to call when there isn't one. */
export function clearRecaptcha(containerId: string): void {
  const verifier = verifiers.get(containerId);
  if (verifier) {
    try { verifier.clear(); } catch { /* already detached */ }
    verifiers.delete(containerId);
  }
  if (typeof document !== 'undefined') {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = '';
  }
}

/**
 * Sends an SMS code to `phone`, which may be in any of the formats a customer
 * might type — it is normalised to E.164 here.
 *
 * @throws when the number isn't a valid mobile, or with the Firebase error
 *         (carrying its `code`) when the send fails. Callers should pass those
 *         through describeOtpError for a message worth showing someone.
 */
export async function sendOtp(phone: string, containerId: string): Promise<ConfirmationResult> {
  const e164 = toE164(phone);
  if (!e164) throw new Error('Enter a valid 10-digit Indian mobile number.');

  try {
    return await signInWithPhoneNumber(getFirebaseAuth(), e164, getVerifier(containerId));
  } catch (err) {
    // A failed attempt consumes the challenge; reusing the same verifier for
    // the retry is what turns one bad send into a stuck form.
    clearRecaptcha(containerId);
    throw err;
  }
}

/**
 * Confirms the code and returns the Firebase ID token — the proof of ownership
 * that /api/auth/phone verifies before issuing a Supabase session.
 */
export async function verifyOtpCode(
  confirmation: ConfirmationResult,
  code: string,
): Promise<string> {
  const credential = await confirmation.confirm(code.trim());
  return credential.user.getIdToken();
}

/**
 * Ends the Firebase session once the Supabase one has been established.
 *
 * Firebase's job finished at "this person holds this SIM". Leaving its session
 * behind means a second identity sitting in local storage, refreshing its token
 * hourly, with a lifetime unrelated to the session the app actually runs on —
 * so it is closed as soon as it has been spent.
 */
export async function endFirebaseSession(): Promise<void> {
  try {
    if (auth) await auth.signOut();
  } catch {
    // Nothing the customer can act on: they are signed in to the app either way.
  }
}

/**
 * Turns a Firebase error into something worth putting in front of a customer.
 *
 * The distinction that matters is whether the person can do anything about it.
 * "Wrong code" and "too many attempts" are actionable; a project misconfiguration
 * is not, so those say plainly that the problem is at our end instead of
 * implying the customer mistyped something. The console keeps the real code.
 */
export function describeOtpError(err: unknown): string {
  const code = typeof err === 'object' && err !== null && 'code' in err
    ? String((err as { code: unknown }).code)
    : '';

  switch (code) {
    case 'auth/invalid-verification-code':
      return 'That code is not right. Check the SMS and try again.';
    case 'auth/code-expired':
      return 'That code has expired. Tap Resend to get a new one.';
    case 'auth/invalid-phone-number':
      return 'That does not look like a valid mobile number.';
    case 'auth/missing-phone-number':
      return 'Enter your mobile number to continue.';
    case 'auth/too-many-requests':
      return 'Too many attempts from this device. Please wait a few minutes before trying again.';
    case 'auth/quota-exceeded':
      return 'We have hit our SMS limit for now. Please try again shortly or sign in with email.';
    case 'auth/network-request-failed':
      return 'Network problem. Check your connection and try again.';
    case 'auth/captcha-check-failed':
    case 'auth/invalid-app-credential':
      return 'Security check failed. Please reload the page and try again.';
    case 'auth/billing-not-enabled':
    case 'auth/operation-not-allowed':
      return 'Phone sign-in is unavailable right now. Please sign in with email instead.';
    case 'auth/user-disabled':
      return 'This number has been blocked. Please contact the restaurant.';
    default:
      break;
  }

  if (err instanceof Error && err.message && !code) return err.message;
  return 'Could not send the code. Please try again in a moment.';
}
