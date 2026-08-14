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
    //
    // ORDER IS LOad-BEARING, and getting it wrong is a bug that already bit
    // once. Changing a user's password invalidates any outstanding magic-link
    // token for that user, so a token minted *before* the account is hardened
    // is dead by the time the browser tries to redeem it — every phone sign-in
    // failed on its first attempt with "Email link is invalid or has expired".
    //
    // So: settle the account first, mint the token last. Nothing may mutate
    // auth.users between the generateLink call below and the response.
    //
    // `generateLink` doubles as find-or-create (it creates the user when the
    // email is unknown), which is why the first call exists at all — its token
    // is discarded, we only want the user record.
    const lookup = await admin.auth.admin.generateLink({ type: 'magiclink', email });

    if (lookup.error || !lookup.data?.user) {
      console.error('[auth/phone] could not find or create account:', lookup.error?.message);
      return NextResponse.json(
        { error: 'Could not create your account. Please try again.' },
        { status: 500 },
      );
    }

    const authUser: AuthUser = lookup.data.user;

    // Hardening may rotate the password, so it happens before the real token
    // is minted — and it reports back whether it did, since only a password
    // change requires a fresh one.
    const passwordRotated = await hardenAccount(admin, authUser, mobile, phoneNumber, requestedName);

    let tokenHash = lookup.data.properties?.hashed_token;
    if (passwordRotated) {
      const reissued = await admin.auth.admin.generateLink({ type: 'magiclink', email });
      if (reissued.error || !reissued.data?.properties?.hashed_token) {
        console.error('[auth/phone] could not reissue link after hardening:', reissued.error?.message);
        return NextResponse.json(
          { error: 'Could not start your session. Please try again.' },
          { status: 500 },
        );
      }
      tokenHash = reissued.data.properties.hashed_token;
    }

    if (!tokenHash) {
      console.error('[auth/phone] generateLink returned no token hash');
      return NextResponse.json(
        { error: 'Could not start your session. Please try again.' },
        { status: 500 },
      );
    }

    // Safe to run after the token is minted — a `profiles` write does not touch
    // auth.users and leaves the token valid (unlike a password change).
    const syncRes = await syncProfile(admin, authUser.id, email, mobile, requestedName);

    // Sync metadata to authUser if details exist
    if (syncRes.profile?.full_name || syncRes.profile?.email) {
      await admin.auth.admin.updateUserById(authUser.id, {
        user_metadata: {
          full_name: syncRes.profile.full_name || authUser.user_metadata?.full_name,
          email: syncRes.profile.email && !syncRes.profile.email.endsWith('@palapitta.internal')
            ? syncRes.profile.email
            : authUser.user_metadata?.email,
          phone: mobile,
        },
      }).catch((e) => console.warn('[auth/phone] could not sync auth metadata:', e));
    }

    // Only the single-use hash crosses back. No password, and no account
    // email: both would be credentials in a response body, which is precisely
    // what this route was built to stop shipping.
    return NextResponse.json(
      {
        tokenHash,
        isNewUser: syncRes.isNewUser,
        hasDetails: syncRes.hasDetails,
        profile: syncRes.profile,
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
 * Settles the auth user before a session token is minted for it: gives the
 * account an unguessable password and records the phone number in metadata.
 *
 * Two kinds of account need the password set. Ones created by the old flow
 * carry `PPR_Otp_<digits>_AuthKey!`, computed from the phone number, so anyone
 * who knew a customer's mobile could sign in as them. Ones auto-created by
 * `generateLink` have no password at all. Both end up with 48 random bytes that
 * are never stored or sent anywhere — the OTP is the only way in.
 *
 * Runs once per account: the `phone_auth_secured` flag records that it is done,
 * so later sign-ins skip it entirely and cost no extra write.
 *
 * @returns whether the password was changed — the caller must mint a fresh
 *          magic-link token when it was, because a password change invalidates
 *          any token already outstanding for that user.
 */
async function hardenAccount(
  admin: AdminClient,
  user: AuthUser,
  mobile: string,
  phoneE164: string,
  requestedName: string,
): Promise<boolean> {
  const metadata = user.user_metadata ?? {};
  const alreadySecured = metadata.phone_auth_secured === true;
  const existingName = typeof metadata.full_name === 'string' ? metadata.full_name.trim() : '';
  // Only fills a blank — a customer who set their name in their profile must
  // not have it overwritten by whatever was typed on a later sign-in form.
  const nameNeedsFilling = !existingName && Boolean(requestedName);

  if (alreadySecured && !nameNeedsFilling) return false;

  const rotatePassword = !alreadySecured;

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    ...(rotatePassword ? { password: randomBytes(48).toString('base64url') } : {}),
    user_metadata: {
      ...metadata,
      full_name: existingName || requestedName || `Customer ${mobile.slice(-4)}`,
      phone: mobile,
      phone_e164: phoneE164,
      phone_auth_secured: true,
    },
  });

  if (error) {
    // Swallowed on purpose: the customer in front of us has verified their SMS
    // and should not be turned away because a hardening write had a bad
    // moment. Reporting no rotation keeps the already-valid token in play, and
    // the next sign-in retries this.
    console.warn('[auth/phone] could not harden account:', error.message);
    return false;
  }

  return rotatePassword;
}

interface SyncProfileResult {
  isNewUser: boolean;
  hasDetails: boolean;
  profile: { full_name: string; email: string; phone: string } | null;
}

/**
 * Makes sure a `profiles` row exists for this account and returns profile status.
 */
async function syncProfile(
  admin: AdminClient,
  userId: string,
  internalEmail: string,
  mobile: string,
  requestedName: string,
): Promise<SyncProfileResult> {
  // 1. Try to find profile by ID or Phone
  const { data: byId, error: readError } = await admin
    .from('profiles')
    .select('id, full_name, email, phone')
    .eq('id', userId)
    .maybeSingle();
  let existing = byId;

  if (!existing && !readError) {
    const { data: phoneMatch } = await admin
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('phone', mobile)
      .maybeSingle();
    if (phoneMatch) existing = phoneMatch;
  }

  if (readError) {
    console.warn('[auth/phone] could not read profile:', readError.message);
  }

  const isGenericName = (name?: string) => !name || name.trim().startsWith('Customer ');
  const isInternalEmail = (email?: string) => !email || email.trim().endsWith('@palapitta.internal');

  if (!existing) {
    const fullName = requestedName || `Customer ${mobile.slice(-4)}`;
    const { error } = await admin.from('profiles').insert({
      id: userId,
      email: internalEmail,
      full_name: fullName,
      phone: mobile,
      role: 'customer',
    });
    if (error) console.warn('[auth/phone] could not create profile:', error.message);

    const hasDetails = !isGenericName(requestedName);
    return {
      isNewUser: true,
      hasDetails,
      profile: { full_name: requestedName, email: '', phone: mobile },
    };
  }

  // 2. Profile exists
  const patch: { full_name?: string; phone?: string } = {};
  if (isGenericName(existing.full_name) && requestedName) patch.full_name = requestedName;
  if (!existing.phone?.trim()) patch.phone = mobile;

  if (Object.keys(patch).length > 0) {
    const { error: patchError } = await admin.from('profiles').update(patch).eq('id', existing.id);
    if (patchError) {
      console.warn('[auth/phone] profile patch error:', patchError.message);
    }
  }

  const finalName = patch.full_name || existing.full_name || '';
  const finalEmail = isInternalEmail(existing.email) ? '' : existing.email;
  const hasDetails = !isGenericName(finalName) && Boolean(finalEmail);

  return {
    isNewUser: false,
    hasDetails,
    profile: { full_name: finalName, email: finalEmail, phone: existing.phone || mobile },
  };
}
