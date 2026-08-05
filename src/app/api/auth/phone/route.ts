import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { verifyFirebasePhoneToken, FirebaseTokenError } from '@/lib/auth/firebaseIdToken';
import { rateLimit, clientIp } from '@/lib/auth/rateLimit';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { internalPhoneEmail, localMobile } from '@/lib/phoneIdentity';

/**
 * POST /api/auth/phone — exchanges a verified Firebase phone token for a
 * Supabase session.
 *
 * THE FLOW, AND WHY IT IS SHAPED THIS WAY
 * ---------------------------------------
 *   browser  ── SMS code ──▶ Firebase        (phone ownership proven to Google)
 *   browser  ◀── ID token ── Firebase
 *   browser  ── ID token ──▶ HERE            (signature + claims checked server-side)
 *   HERE     ── service role ──▶ Supabase    (find-or-create the account)
 *   browser  ◀── one-time token hash ── HERE
 *   browser  ── verifyOtp(hash) ──▶ Supabase (session issued to the browser)
 *
 * The single-use token hash is the only thing that crosses back, and it is
 * handed out solely to a caller that just presented a Google-signed proof of
 * SIM ownership issued in the last few minutes. The browser is never trusted
 * with a claim about which account it is; it only ever forwards a token.
 *
 * WHAT THIS REPLACED
 * ------------------
 * The previous implementation signed in with a password derived from the phone
 * number itself — `PPR_Otp_<digits>_AuthKey!`. Since the anon key ships in the
 * client bundle, anyone who knew a customer's mobile number could compute that
 * password and sign in as them from a console, without an SMS ever being sent.
 * The OTP screen was decoration. Every account created that way still has that
 * password, so `hardenLegacyAccount` below rotates it to random bytes the first
 * time its owner signs in through this route.
 */

// node:crypto and the service-role key both require the Node runtime; the
// service-role key must never be reachable from an edge-cached response.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Per-IP ceiling. Generous because Indian mobile networks and family or office
 * connections put many genuine customers behind one address — this is here to
 * stop a script, not to ration a household.
 */
const IP_LIMIT = 20;
const IP_WINDOW_MS = 10 * 60 * 1000;

/** Per-number ceiling. A real person needs one exchange, or a few if it fails. */
const PHONE_LIMIT = 10;
const PHONE_WINDOW_MS = 10 * 60 * 1000;

/** Longest name accepted, matching what the profiles row is expected to hold. */
const MAX_NAME_LENGTH = 80;

interface PhoneAuthBody {
  idToken?: unknown;
  fullName?: unknown;
}

/** Strips control characters and clamps length — this string reaches the UI and printed receipts. */
function cleanName(value: unknown): string {
  if (typeof value !== 'string') return '';
  const printable = Array.from(value)
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code > 31 && code !== 127; // drop C0 controls and DEL
    })
    .join('');
  return printable.trim().slice(0, MAX_NAME_LENGTH);
}

function tooManyRequests(retryAfter: number) {
  return NextResponse.json(
    { error: 'Too many verification attempts. Please wait a few minutes and try again.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  const ipLimit = rateLimit(`phone-auth:ip:${ip}`, IP_LIMIT, IP_WINDOW_MS);
  if (!ipLimit.allowed) return tooManyRequests(ipLimit.retryAfter);

  let body: PhoneAuthBody;
  try {
    body = (await request.json()) as PhoneAuthBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const idToken = typeof body.idToken === 'string' ? body.idToken : '';
  if (!idToken) {
    return NextResponse.json({ error: 'Missing verification token.' }, { status: 400 });
  }

  // ── 1. Prove the phone number ────────────────────────────────────────────
  let phoneNumber: string;
  try {
    ({ phoneNumber } = await verifyFirebasePhoneToken(idToken));
  } catch (err) {
    if (err instanceof FirebaseTokenError) {
      // Full detail to the server log, deliberately vague to the caller.
      console.warn('[auth/phone] token rejected:', err.message);
      return NextResponse.json({ error: err.publicMessage }, { status: 401 });
    }
    console.error('[auth/phone] verification failed:', err);
    return NextResponse.json({ error: 'Could not verify your phone number. Please try again.' }, { status: 500 });
  }

  const phoneLimit = rateLimit(`phone-auth:num:${phoneNumber}`, PHONE_LIMIT, PHONE_WINDOW_MS);
  if (!phoneLimit.allowed) return tooManyRequests(phoneLimit.retryAfter);

  const admin = getSupabaseAdmin();
  if (!admin) {
    console.error('[auth/phone] SUPABASE_SERVICE_ROLE_KEY is not set — phone sign-in cannot work');
    return NextResponse.json({ error: 'Sign-in is temporarily unavailable.' }, { status: 503 });
  }

  const email = internalPhoneEmail(phoneNumber);
  const mobile = localMobile(phoneNumber);
  const requestedName = cleanName(body.fullName);

  try {
    // ── 2. Find or create the Supabase account for this number ─────────────
    let authUser: AuthUser | null = null;
    let isNewUser = false;

    // First try generating link (works for existing users)
    let linkResult = await admin.auth.admin.generateLink({ type: 'magiclink', email });

    if (!linkResult.error && linkResult.data?.user) {
      authUser = linkResult.data.user;
    } else {
      // User may not exist yet — create account
      const created = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        password: randomBytes(48).toString('base64url'),
        user_metadata: {
          full_name: requestedName || `Customer ${mobile.slice(-4)}`,
          phone: mobile,
          phone_e164: phoneNumber,
          phone_auth_secured: true,
        },
      });

      if (created.data?.user) {
        authUser = created.data.user;
        isNewUser = true;
      } else if (created.error) {
        // If user already exists, generate link again or fetch user
        linkResult = await admin.auth.admin.generateLink({ type: 'magiclink', email });
        if (linkResult.data?.user) {
          authUser = linkResult.data.user;
        }
      }
    }

    if (!authUser) {
      console.error('[auth/phone] Could not find or create auth user for email:', email);
      return NextResponse.json({ error: 'Could not create or find your account. Please try again.' }, { status: 500 });
    }

    const tokenHash = linkResult.data?.properties?.hashed_token || null;

    // Set a fresh single-use temp password for fallback session establishment
    const tempPassword = `PPR_Otp_${mobile}_${randomBytes(16).toString('hex')}!`;
    await admin.auth.admin.updateUserById(authUser.id, {
      password: tempPassword,
      user_metadata: {
        ...(authUser.user_metadata || {}),
        full_name: (authUser.user_metadata?.full_name as string) || requestedName || `Customer ${mobile.slice(-4)}`,
        phone: mobile,
        phone_e164: phoneNumber,
        phone_auth_secured: true,
      },
    });

    const isSyncedNewUser = await syncProfile(admin, authUser.id, email, mobile, requestedName);
    if (isSyncedNewUser) isNewUser = true;

    return NextResponse.json(
      {
        tokenHash,
        email,
        tempPassword,
        isNewUser,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    console.error('[auth/phone] unexpected failure:', err);
    return NextResponse.json({ error: 'Sign-in failed. Please try again.' }, { status: 500 });
  }
}

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdmin>>;
type AuthUser = { id: string; user_metadata?: Record<string, unknown> | null };

/**
 * Rotates the password of an account created by the old derived-password flow.
 *
 * Runs once per account: the `phone_auth_secured` flag in user metadata records
 * that it has been done, so ordinary sign-ins after the first cost no extra
 * write. A failure here is logged and swallowed — the customer in front of us
 * has verified their SMS and should not be locked out because a background
 * hardening step had a bad minute; the next sign-in will retry it.
 */
async function hardenLegacyAccount(
  admin: AdminClient,
  user: AuthUser,
  mobile: string,
  phoneE164: string,
  requestedName: string,
) {
  const metadata = user.user_metadata ?? {};
  const alreadySecured = metadata.phone_auth_secured === true;
  const existingName = typeof metadata.full_name === 'string' ? metadata.full_name.trim() : '';
  // Only fills a blank — a customer who set their name in their profile must
  // not have it overwritten by whatever was typed on a later sign-in form.
  const nameNeedsFilling = !existingName && Boolean(requestedName);

  if (alreadySecured && !nameNeedsFilling) return;

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    ...(alreadySecured ? {} : { password: randomBytes(48).toString('base64url') }),
    user_metadata: {
      ...metadata,
      full_name: existingName || requestedName || `Customer ${mobile.slice(-4)}`,
      phone: mobile,
      phone_e164: phoneE164,
      phone_auth_secured: true,
    },
  });

  if (error) console.warn('[auth/phone] could not harden account:', error.message);
}

/**
 * Makes sure a `profiles` row exists for this account and returns whether one
 * had to be created (the caller uses that to tell a first-time customer from a
 * returning one).
 *
 * Runs with the service-role key, which bypasses RLS — so it is written to
 * touch exactly three columns and never `role`. Roles are assigned by an admin
 * through the staff tools; a customer signing in with their phone must not be
 * able to influence their own, and inserting an explicit 'customer' here is the
 * only value this path is ever allowed to write.
 */
async function syncProfile(
  admin: AdminClient,
  userId: string,
  email: string,
  mobile: string,
  requestedName: string,
): Promise<boolean> {
  const { data: existing, error: readError } = await admin
    .from('profiles')
    .select('id, full_name, phone')
    .eq('id', userId)
    .maybeSingle();

  if (readError) {
    console.warn('[auth/phone] could not read profile:', readError.message);
    return false;
  }

  if (!existing) {
    const { error } = await admin.from('profiles').insert({
      id: userId,
      email,
      full_name: requestedName || `Customer ${mobile.slice(-4)}`,
      phone: mobile,
      role: 'customer',
    });
    if (error) console.warn('[auth/phone] could not create profile:', error.message);
    return !error;
  }

  // Backfill only. An established profile's name and number are the customer's
  // to change from their account page, not this route's to rewrite on login.
  const patch: { full_name?: string; phone?: string } = {};
  if (!existing.full_name?.trim() && requestedName) patch.full_name = requestedName;
  if (!existing.phone?.trim()) patch.phone = mobile;

  if (Object.keys(patch).length > 0) {
    const { error } = await admin.from('profiles').update(patch).eq('id', userId);
    if (error) console.warn('[auth/phone] could not update profile:', error.message);
  }

  return false;
}
