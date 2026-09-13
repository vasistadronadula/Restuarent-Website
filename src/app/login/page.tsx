'use client';

import React, { Suspense, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail, MailCheck, LogIn, Phone, Smartphone, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth, landAfterLogin } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';
import { scrollToAndFocus } from '@/lib/utils';
import { validateEmail, validatePassword, safeRedirect } from '@/lib/validation';
import { useRedirectIfSignedIn } from '@/hooks/useRedirectIfSignedIn';
import AuthShell from '@/components/customer/AuthShell';
import GoogleIcon from '@/components/customer/GoogleIcon';
import PhoneOtpAuth from '@/components/customer/PhoneOtpAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Field = 'email' | 'password';
type AuthMethod = 'email' | 'otp';

function LoginForm() {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const searchParams = useSearchParams();

  const redirectTo = safeRedirect(searchParams.get('redirect'), '/');
  const leaving = useRedirectIfSignedIn(redirectTo);

  const [mode, setMode] = useState<'login' | 'forgot'>(
    searchParams.get('mode') === 'forgot' ? 'forgot' : 'login',
  );
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSentTo, setResetSentTo] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const showError = (field: Field) => (touched[field] ? errors[field] : undefined);

  const runValidation = () => {
    const next: Partial<Record<Field, string>> = {};
    const emailProblem = validateEmail(email);
    if (emailProblem) next.email = emailProblem;

    if (mode === 'login') {
      const passwordProblem = validatePassword(password, 'login');
      if (passwordProblem) next.password = passwordProblem;
    }
    setErrors(next);
    return next;
  };

  const focusField = (field: Field) => {
    scrollToAndFocus(field === 'email' ? emailRef.current : passwordRef.current);
  };

  const handleBlur = (field: Field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    runValidation();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    setTouched({ email: true, password: true });
    const found = runValidation();
    const firstBad = (['email', 'password'] as Field[]).find((f) => found[f]);
    if (firstBad) { focusField(firstBad); return; }

    setLoading(true);
    try {
      const res = await signInWithEmail(email, password);
      if (res.success) {
        landAfterLogin(res.role ?? 'customer', redirectTo);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setFormError(getErrorMessage(err) || 'Sign in failed. Check credentials.');
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    setTouched({ email: true });
    const emailProblem = validateEmail(email);
    if (emailProblem) {
      setErrors({ email: emailProblem });
      focusField('email');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setFormError(error.message);
        setLoading(false);
        return;
      }
      setResetSentTo(email);
      toast.success('Password reset email sent');
    } catch (err) {
      setFormError(getErrorMessage(err) || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Reset sent success ────────────────────────────────────────────────── */
  if (resetSentTo) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`We sent a password reset link to ${resetSentTo}. Click the link inside to set a new password.`}
        icon={<MailCheck className="size-5 text-brand-600" />}
      >
        <div className="space-y-4">
          <Button
            className="w-full h-11 font-extrabold shadow-md bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-all text-xs"
            onClick={() => { setResetSentTo(null); setMode('login'); setEmail(''); }}
          >
            Back to sign in
          </Button>
          <Button
            variant="ghost"
            className="text-ink-3 hover:text-ink-1 w-full text-xs font-semibold"
            onClick={() => setResetSentTo(null)}
          >
            Use a different email address
          </Button>
        </div>
      </AuthShell>
    );
  }

  /* ── Forgot password ──────────────────────────────────────────────────── */
  if (mode === 'forgot') {
    return (
      <AuthShell
        title="Reset your password"
        subtitle="Enter your email to receive a password reset link."
        icon={<KeyRound className="size-5 text-brand-600" />}
      >
        <form onSubmit={handleForgot} className="space-y-4">
          {formError && (
            <div role="alert" className="rounded-2xl border border-destructive/25 bg-destructive/5 dark:bg-destructive/10 p-3 text-xs font-semibold text-destructive leading-relaxed">
              {formError}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-4 dark:text-ink-3 transition-colors" />
              <Input
                id="forgot-email"
                ref={emailRef}
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleBlur('email')}
                autoFocus
                placeholder="Email Address"
                className="pl-9 h-11 rounded-xl bg-hair-2/50 border-hair-1 text-ink-1 placeholder:text-ink-4 focus-visible:ring-1 focus-visible:ring-brand focus-visible:border-brand text-xs font-bold"
              />
            </div>
            {showError('email') && (
              <p className="text-[10px] font-bold text-destructive">{showError('email')}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 font-extrabold shadow-md bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-all text-xs"
          >
            {loading ? <Loader2 className="size-4 animate-spin text-white" /> : 'Send reset link'}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => { setMode('login'); setFormError(null); setErrors({}); setTouched({}); }}
            className="w-full text-xs font-semibold text-ink-3 hover:text-ink-1 gap-1.5"
          >
            <ArrowLeft className="size-4" />
            Back to log in
          </Button>
        </form>
      </AuthShell>
    );
  }

  /* ── Log in ───────────────────────────────────────────────────────────── */
  return (
    <AuthShell
      title={authMethod === 'email' ? 'Sign in with email' : 'Sign in with phone'}
      subtitle={authMethod === 'email' ? 'Enter your credentials to access your account' : 'Confirm your mobile number below to request an OTP code.'}
      icon={
        authMethod === 'email' ? (
          <LogIn className="size-5 text-brand-600" />
        ) : (
          <Smartphone className="size-5 text-brand-600" />
        )
      }
      footer={
        <p className="text-xs text-ink-3 dark:text-ink-4">
          New here?{' '}
          <Link
            href={redirectTo === '/' ? '/signup' : `/signup?redirect=${encodeURIComponent(redirectTo)}`}
            prefetch
            className="font-extrabold text-brand-600 hover:underline dark:text-brand-400"
          >
            Create an account
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
        <PhoneOtpAuth
          onSuccess={(role) => landAfterLogin(role ?? 'customer', redirectTo)}
          customSocials={
            <div className="space-y-4 pt-1">
              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-hair-1 dark:border-ink-1" /></div>
                <span className="relative bg-white/70 dark:bg-ink-1/65 px-3 text-[10px] font-bold text-ink-4 dark:text-ink-3 uppercase">
                  Or sign in with
                </span>
              </div>
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="w-10 h-10 border border-hair-1 dark:border-ink-1 rounded-full flex items-center justify-center bg-white dark:bg-cobalt-900 hover:bg-hair-2 dark:hover:bg-ink-1 transition-colors shadow-xs"
                  title="Sign in with Google"
                >
                  <GoogleIcon />
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMethod('email'); setFormError(null); }}
                  className="w-10 h-10 border border-hair-1 dark:border-ink-1 rounded-full flex items-center justify-center bg-white dark:bg-cobalt-900 hover:bg-hair-2 dark:hover:bg-ink-1 transition-colors shadow-xs text-ink-2 dark:text-ink-4"
                  title="Sign in with Email"
                >
                  <Mail className="size-4 text-ink-3" />
                </button>
              </div>
            </div>
          }
        />
      ) : (
        <div className="space-y-4">
          <form onSubmit={handleLogin} className="space-y-3">
            {formError && (
              <div role="alert" className="rounded-2xl border border-destructive/25 bg-destructive/5 dark:bg-destructive/10 p-3 text-xs font-semibold text-destructive leading-relaxed">
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-4 dark:text-ink-3 transition-colors" />
                <Input
                  id="login-email"
                  ref={emailRef}
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleBlur('email')}
                  autoComplete="email"
                  placeholder="Email"
                  className="pl-9 h-11 rounded-xl bg-hair-2/50 border-hair-1 text-ink-1 placeholder:text-ink-4 focus-visible:ring-1 focus-visible:ring-brand focus-visible:border-brand text-xs font-bold"
                />
              </div>
              {showError('email') && (
                <p className="text-[10px] font-bold text-destructive">{showError('email')}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-4 dark:text-ink-3 transition-colors" />
                <Input
                  id="login-password"
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => handleBlur('password')}
                  autoComplete="current-password"
                  placeholder="Password"
                  className="pl-9 pr-10 h-11 rounded-xl bg-hair-2/50 border-hair-1 text-ink-1 placeholder:text-ink-4 focus-visible:ring-1 focus-visible:ring-brand focus-visible:border-brand text-xs font-bold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-0 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-xl text-ink-4 hover:text-ink-2"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {showError('password') && (
                <p className="text-[10px] font-bold text-destructive">{showError('password')}</p>
              )}
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setFormError(null); setErrors({}); setTouched({}); }}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="bg-brand hover:bg-brand-600 h-11 w-full rounded-xl text-xs font-black text-white shadow-md transition-all"
            >
              {loading ? <><Loader2 className="size-4 animate-spin" /> Signing in…</> : 'Sign in'}
            </Button>
          </form>

          <div className="relative my-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-hair-1 dark:border-ink-1" /></div>
            <span className="relative bg-white/70 dark:bg-ink-1/65 px-3 text-[10px] font-bold text-ink-4 dark:text-ink-3 uppercase">
              Or sign in with
            </span>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={signInWithGoogle}
              className="w-10 h-10 border border-hair-1 dark:border-ink-1 rounded-full flex items-center justify-center bg-white dark:bg-cobalt-900 hover:bg-hair-2 dark:hover:bg-ink-1 transition-colors shadow-xs"
              title="Sign in with Google"
            >
              <GoogleIcon />
            </button>
            <button
              type="button"
              onClick={() => { setAuthMethod('otp'); setFormError(null); }}
              className="w-10 h-10 border border-hair-1 dark:border-ink-1 rounded-full flex items-center justify-center bg-white dark:bg-cobalt-900 hover:bg-hair-2 dark:hover:bg-ink-1 transition-colors shadow-xs text-ink-2 dark:text-ink-4"
              title="Sign in with Mobile OTP"
            >
              <Phone className="size-4 text-ink-3" />
            </button>
          </div>
        </div>
      )}
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-1 w-full overflow-hidden bg-transparent">
          <div className="h-full w-full bg-gradient-to-r from-amber-400 via-brand to-amber-500 animate-pulse" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
