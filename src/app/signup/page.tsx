'use client';

import React, { Suspense, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, Lock, Mail, Phone, User, UserPlus, Smartphone } from 'lucide-react';

import { useAuth, landAfterLogin } from '@/context/AuthContext';
import {
  validateEmail, validateName, validatePhone, validatePassword,
  normalizePhone, getPasswordStrength, safeRedirect, MIN_PASSWORD_LENGTH,
} from '@/lib/validation';
import { useRedirectIfSignedIn } from '@/hooks/useRedirectIfSignedIn';
import { scrollToAndFocus } from '@/lib/utils';
import AuthShell from '@/components/customer/AuthShell';
import GoogleIcon from '@/components/customer/GoogleIcon';
import PhoneOtpAuth from '@/components/customer/PhoneOtpAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

type Field = 'name' | 'phone' | 'email' | 'password';
type AuthMethod = 'email' | 'otp';

function TermsNote() {
  return (
    <p className="mt-4 text-center text-[10px] text-ink-4 leading-relaxed font-semibold">
      By continuing you agree to our{' '}
      <Link href="/terms" target="_blank" className="font-extrabold text-brand-600 hover:underline dark:text-brand-400">
        Terms of Service
      </Link>{' '}
      and{' '}
      <Link href="/privacy-policy" target="_blank" className="font-extrabold text-brand-600 hover:underline dark:text-brand-400">
        Privacy Policy
      </Link>
    </p>
  );
}

function SignupForm() {
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const searchParams = useSearchParams();

  const explicitRedirect = safeRedirect(searchParams.get('redirect'), '');
  const redirectTo = explicitRedirect || '/menu';
  const leaving = useRedirectIfSignedIn(redirectTo);

  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [values, setValues] = useState({ name: '', phone: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const focusField = (field: Field) => {
    const target =
      field === 'name' ? nameRef
        : field === 'phone' ? phoneRef
          : field === 'email' ? emailRef
            : passwordRef;
    scrollToAndFocus(target.current);
  };

  const strength = useMemo(() => getPasswordStrength(values.password), [values.password]);

  const setField = (field: Field, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const showError = (field: Field) => (touched[field] ? errors[field] : undefined);

  const runValidation = () => {
    const next: Partial<Record<Field, string>> = {};
    const name = validateName(values.name);
    const phone = validatePhone(values.phone);
    const email = validateEmail(values.email);
    const password = validatePassword(values.password, 'new');
    if (name) next.name = name;
    if (phone) next.phone = phone;
    if (email) next.email = email;
    if (password) next.password = password;
    setErrors(next);
    return next;
  };

  const handleBlur = (field: Field) => {
    setTouched((t) => ({ ...t, [field]: true }));
    runValidation();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const found = runValidation();
    setTouched({ name: true, phone: true, email: true, password: true });

    const firstBad = (['name', 'phone', 'email', 'password'] as Field[]).find((f) => found[f]);
    if (firstBad) { focusField(firstBad); return; }

    if (!acceptedTerms) {
      setFormError('Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setLoading(true);
    const res = await signUpWithEmail(
      values.email.trim(),
      values.password,
      values.name.trim(),
      normalizePhone(values.phone),
    );

    if (!res.success) {
      setLoading(false);
      setFormError('We could not create that account. The email may already be registered — try logging in instead.');
      return;
    }

    landAfterLogin(res.role ?? 'customer', redirectTo);
  };

  const loginHref = explicitRedirect ? `/login?redirect=${encodeURIComponent(explicitRedirect)}` : '/login';

  return (
    <AuthShell
      title={authMethod === 'email' ? 'Create your account' : 'Sign up with phone'}
      subtitle="Order, track and book a table with one royal account."
      icon={
        authMethod === 'email' ? (
          <UserPlus className="size-5 text-brand-600" />
        ) : (
          <Smartphone className="size-5 text-brand-600" />
        )
      }
      footer={
        <p className="text-xs text-ink-3 dark:text-ink-4">
          Already have an account?{' '}
          <Link href={loginHref} prefetch className="font-extrabold text-brand-600 hover:underline dark:text-brand-400">
            Log in
          </Link>
        </p>
      }
    >
      {leaving && (
        <div className="mb-4 rounded-xl border border-brand/30 bg-brand/10 p-3 text-xs font-medium text-brand-700 dark:text-brand-400">
          Already signed in — redirecting…
        </div>
      )}

      {authMethod === 'otp' ? (
        <>
          <PhoneOtpAuth
            isSignUpMode
            onSuccess={(role) => landAfterLogin(role ?? 'customer', redirectTo)}
            customSocials={
              <div className="space-y-4 pt-1">
                <div className="relative my-4 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-hair-1 dark:border-stone-800" /></div>
                  <span className="relative bg-white/70 dark:bg-ink-1/65 px-3 text-[10px] font-bold text-ink-4 dark:text-ink-3 uppercase">
                    Or sign up with
                  </span>
                </div>
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={signInWithGoogle}
                    className="w-10 h-10 border border-hair-1 dark:border-stone-800 rounded-full flex items-center justify-center bg-white dark:bg-cobalt-900 hover:bg-hair-2 dark:hover:bg-ink-1 transition-colors shadow-xs"
                    title="Sign up with Google"
                  >
                    <GoogleIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMethod('email'); setFormError(null); }}
                    className="w-10 h-10 border border-hair-1 dark:border-stone-800 rounded-full flex items-center justify-center bg-white dark:bg-cobalt-900 hover:bg-hair-2 dark:hover:bg-ink-1 transition-colors shadow-xs text-ink-2 dark:text-ink-4"
                    title="Sign up with Email"
                  >
                    <Mail className="size-4 text-ink-3" />
                  </button>
                </div>
              </div>
            }
          />
          <TermsNote />
        </>
      ) : (
        <div className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            {formError && (
              <div role="alert" className="rounded-2xl border border-destructive/25 bg-destructive/5 dark:bg-destructive/10 p-3 text-xs font-semibold text-destructive leading-relaxed">
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-4 dark:text-ink-3 transition-colors" />
                <Input
                  id="signup-name"
                  ref={nameRef}
                  name="name"
                  value={values.name}
                  onChange={(e) => setField('name', e.target.value)}
                  onBlur={() => handleBlur('name')}
                  autoComplete="name"
                  maxLength={80}
                  placeholder="Full Name"
                  className="pl-9 h-11 rounded-xl bg-hair-2/50 dark:bg-cobalt-900/30 border-hair-1 dark:border-hair-1 text-ink-1 dark:text-stone-100 placeholder:text-ink-4 focus-visible:ring-1 focus-visible:ring-brand focus-visible:border-brand text-xs font-bold"
                />
              </div>
              {showError('name') && <p className="text-[10px] font-bold text-destructive">{showError('name')}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-4 dark:text-ink-3 transition-colors" />
                <Input
                  id="signup-phone"
                  ref={phoneRef}
                  name="phone"
                  type="tel"
                  value={values.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                  onBlur={() => handleBlur('phone')}
                  autoComplete="tel"
                  maxLength={15}
                  placeholder="Mobile Number"
                  className="pl-9 h-11 rounded-xl bg-hair-2/50 dark:bg-cobalt-900/30 border-hair-1 dark:border-hair-1 text-ink-1 dark:text-stone-100 placeholder:text-ink-4 focus-visible:ring-1 focus-visible:ring-brand focus-visible:border-brand text-xs font-bold"
                />
              </div>
              {showError('phone') && <p className="text-[10px] font-bold text-destructive">{showError('phone')}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-4 dark:text-ink-3 transition-colors" />
                <Input
                  id="signup-email"
                  ref={emailRef}
                  name="email"
                  type="email"
                  value={values.email}
                  onChange={(e) => setField('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  autoComplete="email"
                  placeholder="Email"
                  className="pl-9 h-11 rounded-xl bg-hair-2/50 dark:bg-cobalt-900/30 border-hair-1 dark:border-hair-1 text-ink-1 dark:text-stone-100 placeholder:text-ink-4 focus-visible:ring-1 focus-visible:ring-brand focus-visible:border-brand text-xs font-bold"
                />
              </div>
              {showError('email') && <p className="text-[10px] font-bold text-destructive">{showError('email')}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-4 dark:text-ink-3 transition-colors" />
                <Input
                  id="signup-password"
                  ref={passwordRef}
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={values.password}
                  onChange={(e) => setField('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  autoComplete="new-password"
                  placeholder="Password"
                  className="pl-9 pr-10 h-11 rounded-xl bg-hair-2/50 dark:bg-cobalt-900/30 border-hair-1 dark:border-hair-1 text-ink-1 dark:text-stone-100 placeholder:text-ink-4 focus-visible:ring-1 focus-visible:ring-brand focus-visible:border-brand text-xs font-bold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-0 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-xl text-ink-4 hover:text-ink-2 dark:text-ink-3 dark:hover:text-stone-300"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {showError('password') ? (
                <p className="text-[10px] font-bold text-destructive">{showError('password')}</p>
              ) : values.password ? (
                <div className="mt-2 space-y-1 px-1">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((segment) => (
                      <div
                        key={segment}
                        className="h-1 flex-1 rounded-full transition-colors"
                        style={{
                          backgroundColor: strength.score >= segment ? strength.color : 'rgba(0,0,0,0.08)',
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] font-black" style={{ color: strength.color }}>
                    {strength.label}
                    <span className="font-normal text-ink-4">
                      {strength.hint ? ` · ${strength.hint}` : ' — strong password'}
                    </span>
                  </p>
                </div>
              ) : (
                <p className="text-[10px] text-ink-4 font-semibold">
                  Must be at least {MIN_PASSWORD_LENGTH} characters long
                </p>
              )}
            </div>

            <div className="flex items-start space-x-2 pt-1">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => {
                  setAcceptedTerms(Boolean(checked));
                  if (checked) setFormError(null);
                }}
              />
              <Label htmlFor="terms" className="text-xs leading-relaxed text-ink-3 dark:text-ink-4 font-bold select-none cursor-pointer">
                I agree to the{' '}
                <Link href="/terms" target="_blank" className="font-extrabold text-brand-600 hover:text-brand-700 dark:text-brand-400 hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy-policy" target="_blank" className="font-extrabold text-brand-600 hover:text-brand-700 dark:text-brand-400 hover:underline">
                  Privacy Policy
                </Link>
              </Label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="bg-brand hover:bg-brand-600 h-11 w-full rounded-xl text-xs font-black text-white shadow-md transition-all"
            >
              {loading ? <><Loader2 className="size-4 animate-spin" /> Creating account…</> : 'Create account'}
            </Button>
          </form>

          <div className="relative my-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-hair-1 dark:border-stone-800" /></div>
            <span className="relative bg-white/70 dark:bg-ink-1/65 px-3 text-[10px] font-bold text-ink-4 dark:text-ink-3 uppercase">
              Or sign up with
            </span>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={signInWithGoogle}
              className="w-10 h-10 border border-hair-1 dark:border-stone-800 rounded-full flex items-center justify-center bg-white dark:bg-cobalt-900 hover:bg-hair-2 dark:hover:bg-ink-1 transition-colors shadow-xs"
              title="Sign up with Google"
            >
              <GoogleIcon />
            </button>
            <button
              type="button"
              onClick={() => { setAuthMethod('otp'); setFormError(null); }}
              className="w-10 h-10 border border-hair-1 dark:border-stone-800 rounded-full flex items-center justify-center bg-white dark:bg-cobalt-900 hover:bg-hair-2 dark:hover:bg-ink-1 transition-colors shadow-xs text-ink-2 dark:text-ink-4"
              title="Sign up with Mobile OTP"
            >
              <Phone className="size-4 text-ink-3" />
            </button>
          </div>
        </div>
      )}
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-1 w-full overflow-hidden bg-transparent">
          <div className="h-full w-full bg-gradient-to-r from-amber-400 via-brand to-amber-500 animate-pulse" />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
