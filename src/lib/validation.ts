/**
 * validation.ts — form rules shared by the login, signup and password-reset
 * screens.
 *
 * These live outside the components on purpose: the same email is validated on
 * the login page, the signup page and the auth modal, and three copies of a
 * regex is three chances for them to disagree about what an address is. Every
 * function returns `null` when the value is acceptable and a ready-to-render
 * message when it is not, so a caller can drop the result straight into a
 * TextField's `helperText`.
 */

/**
 * Deliberately loose. A stricter pattern rejects real addresses (plus-tags,
 * new TLDs, unicode locals) and the only authority that actually matters is
 * Supabase's own check plus the confirmation mail — this exists to catch the
 * missing `@` before a round-trip, not to be an RFC parser.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Indian mobile numbers: 10 digits starting 6–9, optionally +91 / 0 prefixed. */
const PHONE_RE = /^(?:\+?91[\s-]?|0)?[6-9]\d{9}$/;

/** Supabase's own floor. Rejecting shorter here saves a failed round-trip. */
export const MIN_PASSWORD_LENGTH = 8;

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return 'Email is required';
  if (!EMAIL_RE.test(email)) return 'Enter a valid email address';
  return null;
}

export function validateName(value: string): string | null {
  const name = value.trim();
  if (!name) return 'Name is required';
  if (name.length < 2) return 'Name is too short';
  return null;
}

/**
 * Phone is optional on signup — an empty string passes. When something has
 * been typed it has to be a real mobile number, because this is what the
 * kitchen calls when an order needs a question answered.
 */
export function validatePhone(value: string): string | null {
  const phone = value.trim();
  if (!phone) return null;
  if (!PHONE_RE.test(phone.replace(/[\s-]/g, ''))) {
    return 'Enter a valid 10-digit mobile number';
  }
  return null;
}

/** Strips formatting so what reaches the profile row is always 10 digits. */
export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * `mode` matters: on login any non-empty value is worth submitting, because
 * the password was chosen under whatever rules applied at the time and telling
 * a returning customer their existing password is "too weak" blocks them from
 * an account that works. Only new passwords are held to the length rule.
 */
export function validatePassword(value: string, mode: 'login' | 'new'): string | null {
  if (!value) return 'Password is required';
  if (mode === 'new' && value.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
}

export interface PasswordStrength {
  /** 0–4. Drives the meter's fill width and colour. */
  score: number;
  label: string;
  color: string;
  /** The single most useful next step, or null once the score is maxed. */
  hint: string | null;
}

/**
 * A hint generator, not a security control. The score is advisory — the only
 * hard requirement is MIN_PASSWORD_LENGTH, enforced by validatePassword.
 */
export function getPasswordStrength(value: string): PasswordStrength {
  if (!value) return { score: 0, label: '', color: '#E0E0E0', hint: null };

  const checks = {
    length: value.length >= MIN_PASSWORD_LENGTH,
    long: value.length >= 12,
    mixedCase: /[a-z]/.test(value) && /[A-Z]/.test(value),
    digit: /\d/.test(value),
    symbol: /[^A-Za-z0-9]/.test(value),
  };

  const score = Math.min(4, Object.values(checks).filter(Boolean).length);

  const hint = !checks.length
    ? `At least ${MIN_PASSWORD_LENGTH} characters`
    : !checks.mixedCase
      ? 'Mix upper and lower case'
      : !checks.digit
        ? 'Add a number'
        : !checks.symbol
          ? 'Add a symbol for extra strength'
          : null;

  const meta = [
    { label: 'Too short', color: '#C62828' },
    { label: 'Weak', color: '#C62828' },
    { label: 'Fair', color: '#F57C00' },
    { label: 'Good', color: '#2E7D32' },
    { label: 'Strong', color: '#1B5E20' },
  ][score];

  return { score, label: meta.label, color: meta.color, hint };
}

/**
 * Guards the `?redirect=` parameter the login and signup pages accept.
 *
 * Only same-site, path-absolute targets are allowed. Without this check an
 * attacker can mail out `/login?redirect=https://evil.example/` — the victim
 * signs in on the genuine site and is handed straight to a copy of it, which
 * is a textbook open redirect. `//evil.example` is rejected too: browsers read
 * a leading double slash as protocol-relative and it leaves the origin.
 */
export function safeRedirect(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  // A backslash is normalised to a forward slash by some browsers, so `/\evil`
  // is another way of writing a protocol-relative URL.
  if (value.startsWith('/\\')) return fallback;
  return value;
}
