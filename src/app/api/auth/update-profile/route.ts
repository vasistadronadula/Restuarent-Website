import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isInternalPhoneEmail, localMobile } from '@/lib/phoneIdentity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Saves a customer's own name, email and phone.
 *
 * Who the caller is comes from their access token and from nothing else. The
 * previous version fell back to a `userId` in the request body when no token
 * was presented, which meant a single unauthenticated POST with someone else's
 * id rewrote their name, email and phone — and this route holds the service
 * role key, so RLS was never going to catch it. The body is now data only; the
 * identity is the token.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/;

export async function POST(request: Request) {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 503 });
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null;

    if (!token) {
      return NextResponse.json({ error: 'You need to be signed in to do that.' }, { status: 401 });
    }

    const { data: userData, error: tokenError } = await admin.auth.getUser(token);
    const userId = userData?.user?.id;
    if (tokenError || !userId) {
      return NextResponse.json({ error: 'Your session has expired. Please sign in again.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const rawPhone = typeof body.phone === 'string' ? body.phone.replace(/\D/g, '') : '';
    const phone = rawPhone ? localMobile(rawPhone) : '';

    if (fullName.length < 2) {
      return NextResponse.json({ error: 'Please enter your full name.' }, { status: 400 });
    }
    // Validated here as well as in the browser: the browser check is a
    // convenience, this one is the rule. A junk address means receipts and
    // booking confirmations silently go nowhere.
    if (email && (!EMAIL_RE.test(email) || isInternalPhoneEmail(email))) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }
    if (phone && !INDIAN_MOBILE_RE.test(phone)) {
      return NextResponse.json({ error: 'Please enter a valid 10-digit mobile number.' }, { status: 400 });
    }

    // 1. The profiles row — the record every other part of the app reads from.
    const profilePatch: Record<string, string> = { full_name: fullName };
    if (email) profilePatch.email = email;
    if (phone) profilePatch.phone = phone;

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .update(profilePatch)
      .eq('id', userId)
      .select('full_name, email, phone')
      .maybeSingle();

    if (profileError) {
      console.error('[auth/update-profile] profile update error:', profileError.message);
      return NextResponse.json({ error: 'Could not save your details. Please try again.' }, { status: 500 });
    }

    // 2. Mirror onto user_metadata, which is what the navbar and greeting read
    //    without a database round-trip. Merged rather than replaced — this
    //    object also carries fields this route knows nothing about.
    const { data: existingUser } = await admin.auth.admin.getUserById(userId);

    const { data: updatedAuth, error: authError } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...(existingUser?.user?.user_metadata || {}),
        full_name: fullName,
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
      },
    });

    if (authError) {
      console.error('[auth/update-profile] auth update error:', authError.message);
      return NextResponse.json({ error: 'Could not save your details. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: updatedAuth.user,
      profile: profile ?? { full_name: fullName, email, phone },
    });
  } catch (err) {
    console.error('[auth/update-profile] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
