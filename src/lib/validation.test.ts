import { describe, expect, it } from 'vitest';
import {
  validateEmail,
  validateName,
  validatePhone,
  normalizePhone,
  validatePassword,
  getPasswordStrength,
  safeRedirect,
  MIN_PASSWORD_LENGTH,
} from './validation';

describe('validateEmail', () => {
  it('rejects empty and malformed addresses', () => {
    expect(validateEmail('')).toBe('Email is required');
    expect(validateEmail('not-an-email')).toBeTruthy();
    expect(validateEmail('missing@domain')).toBeTruthy();
  });

  it('accepts a well-formed address', () => {
    expect(validateEmail('someone@example.com')).toBeNull();
  });
});

describe('validateName', () => {
  it('requires at least 2 characters', () => {
    expect(validateName('')).toBeTruthy();
    expect(validateName('A')).toBeTruthy();
    expect(validateName('Al')).toBeNull();
  });
});

describe('validatePhone / normalizePhone', () => {
  it('treats an empty phone as valid — it is optional on signup', () => {
    expect(validatePhone('')).toBeNull();
  });

  it('accepts a 10-digit Indian mobile number with or without +91', () => {
    expect(validatePhone('9876543210')).toBeNull();
    expect(validatePhone('+91 98765 43210')).toBeNull();
    expect(validatePhone('09876543210')).toBeNull();
  });

  it('rejects a number that is not a valid Indian mobile', () => {
    expect(validatePhone('12345')).toBeTruthy();
    expect(validatePhone('1234567890')).toBeTruthy(); // leading 1, not 6-9
  });

  it('normalizes to the bare 10 digits regardless of formatting', () => {
    expect(normalizePhone('+91 98765-43210')).toBe('9876543210');
    expect(normalizePhone('09876543210')).toBe('9876543210');
  });
});

describe('validatePassword', () => {
  it('requires a value on both login and signup', () => {
    expect(validatePassword('', 'login')).toBeTruthy();
    expect(validatePassword('', 'new')).toBeTruthy();
  });

  it('does not enforce a minimum length on login — an old password must still work', () => {
    expect(validatePassword('short', 'login')).toBeNull();
  });

  it('enforces the minimum length only for a new password', () => {
    expect(validatePassword('short', 'new')).toBeTruthy();
    expect(validatePassword('a'.repeat(MIN_PASSWORD_LENGTH), 'new')).toBeNull();
  });
});

describe('getPasswordStrength', () => {
  it('scores an empty password as zero with no hint', () => {
    const s = getPasswordStrength('');
    expect(s.score).toBe(0);
    expect(s.hint).toBeNull();
  });

  it('increases the score as more character classes are used', () => {
    const weak = getPasswordStrength('lowercase');
    const strong = getPasswordStrength('Str0ng!Password');
    expect(strong.score).toBeGreaterThan(weak.score);
    expect(strong.hint).toBeNull();
  });
});

describe('safeRedirect', () => {
  it('allows a same-site, path-absolute target', () => {
    expect(safeRedirect('/orders', '/')).toBe('/orders');
  });

  it('falls back for a missing value', () => {
    expect(safeRedirect(null, '/fallback')).toBe('/fallback');
    expect(safeRedirect(undefined, '/fallback')).toBe('/fallback');
  });

  it('blocks an absolute URL to another origin', () => {
    expect(safeRedirect('https://evil.example/', '/fallback')).toBe('/fallback');
  });

  it('blocks a protocol-relative URL', () => {
    expect(safeRedirect('//evil.example', '/fallback')).toBe('/fallback');
  });

  it('blocks a backslash-disguised protocol-relative URL', () => {
    expect(safeRedirect('/\\evil.example', '/fallback')).toBe('/fallback');
  });
});
