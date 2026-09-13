/**
 * phoneIdentity.ts — the single definition of how a phone number becomes an
 * account identifier.
 *
 * Supabase's user table is keyed on email, and these customers sign in with a
 * SIM and nothing else. So each number is mapped to a reserved internal address
 * — `phone_919876543210@palapitta.internal` — which exists to be a stable
 * primary key and is never sent mail. `.internal` is reserved by RFC 8375
 * precisely so it can never resolve to a real domain someone else owns.
 *
 * The format is derived in exactly one place because it has to be byte-identical
 * every time: a second definition that renders the same number differently
 * (with the country code, without it, with a `+`) would silently create a
 * duplicate account for a customer who already has one, orphaning their order
 * history. Both the API route and the browser import from here.
 */

/** Country code assumed for a bare 10-digit number typed into the OTP form. */
export const DEFAULT_COUNTRY_CODE = '91';

/** Indian mobile numbers: 10 digits, first digit 6–9. */
const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/;

/**
 * Converts what a customer typed into E.164 (`+919876543210`), or null when it
 * cannot be one. Accepts the shapes people actually type: `98765 43210`,
 * `+91 98765-43210`, `09876543210`, `919876543210`.
 */
export function toE164(input: string): string | null {
  const digits = (input || '').replace(/\D/g, '');
  if (!digits) return null;

  // Trim the prefixes an Indian number is commonly written with, then require
  // what's left to be a valid mobile — so `+91 0987...` and `00919876...`
  // resolve rather than being rejected on a formatting technicality.
  let local = digits;
  if (local.length > 10 && local.startsWith('00')) local = local.slice(2);
  if (local.length === 12 && local.startsWith(DEFAULT_COUNTRY_CODE)) local = local.slice(2);
  if (local.length === 11 && local.startsWith('0')) local = local.slice(1);

  if (!INDIAN_MOBILE_RE.test(local)) return null;
  return `+${DEFAULT_COUNTRY_CODE}${local}`;
}

/** True when the input is a mobile number this app can send an OTP to. */
export function isValidMobile(input: string): boolean {
  return toE164(input) !== null;
}

/**
 * The 10-digit national number, for display and for the `profiles.phone`
 * column — which has held bare 10-digit numbers since before phone sign-in
 * existed, and is what the kitchen dials.
 */
export function localMobile(e164: string): string {
  const digits = e164.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * The reserved internal address for an E.164 number.
 *
 * The digits include the country code (`91...`), matching the accounts the
 * earlier version of this flow already created — changing the shape now would
 * strand every existing phone customer behind a new, empty account.
 */
export function internalPhoneEmail(e164: string): string {
  return `phone_${e164.replace(/\D/g, '')}@palapitta.internal`;
}

/** `+91 98765 43210` — grouped the way an Indian number is normally read. */
export function formatMobileForDisplay(e164: string): string {
  const local = localMobile(e164);
  if (local.length !== 10) return e164;
  return `+${DEFAULT_COUNTRY_CODE} ${local.slice(0, 5)} ${local.slice(5)}`;
}

/** The reserved suffix, used to recognise an address that must never be shown. */
const INTERNAL_SUFFIX = '@palapitta.internal';

export function isInternalPhoneEmail(email: string | null | undefined): boolean {
  return Boolean(email?.toLowerCase().endsWith(INTERNAL_SUFFIX));
}

/**
 * What to show a signed-in person as "the account you are using".
 *
 * A customer who signed in with a SIM has no email — the address on their
 * account is the internal placeholder, and showing them
 * `phone_919876543210@palapitta.internal` in the account menu reads like a bug
 * and invites support calls asking whose address that is. They get their phone
 * number, which is the credential they actually used.
 */
export function accountIdentityLabel(
  email: string | null | undefined,
  metadataPhone?: string | null,
): string {
  if (email && !isInternalPhoneEmail(email)) return email;

  const fromEmail = email ? email.split('@')[0].replace(/^phone_/, '') : '';
  const digits = (metadataPhone || fromEmail).replace(/\D/g, '');
  return digits.length >= 10 ? formatMobileForDisplay(digits) : 'Mobile account';
}

/**
 * A name to greet someone by, falling back through what is actually known.
 *
 * The email local-part is a reasonable last resort for an email account and a
 * terrible one for a phone account, where it would render as
 * "phone_919876543210" — so that case is excluded rather than left to produce
 * something no customer would recognise as their name.
 */
export function accountDisplayName(user: {
  email?: string | null;
  user_metadata?: { full_name?: string | null; name?: string | null; phone?: string | null } | null;
} | null | undefined): string {
  if (!user) return '';
  const metadata = user.user_metadata ?? {};
  const named = metadata.full_name?.trim() || metadata.name?.trim();
  if (named) return named;

  if (user.email && !isInternalPhoneEmail(user.email)) return user.email.split('@')[0];

  const digits = (metadata.phone || '').replace(/\D/g, '');
  return digits.length >= 10 ? formatMobileForDisplay(digits) : '';
}
