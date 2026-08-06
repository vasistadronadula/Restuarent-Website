'use client';

import React, { Suspense, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail, MailCheck, LogIn, Phone, Smartphone, KeyRound, Apple } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth, landAfterLogin } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';
import { validateEmail, validatePassword, safeRedirect } from '@/lib/validation';
import { useRedirectIfSignedIn } from '@/hooks/useRedirectIfSignedIn';
import AuthShell from '@/components/customer/AuthShell';
import GoogleIcon from '@/components/customer/GoogleIcon';
import PhoneOtpAuth from '@/components/customer/PhoneOtpAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
    return Object.keys(next).length === 0;
  };

  const handleBlur = (field: Field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    runValidation();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    setTouched({ email: true, password: true });
    if (!runValidation()) return;

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
        icon={<MailCheck className="size-5 text-amber-600" />}
      >
        <div className="space-y-4">
          <Button
            className="w-full h-11 font-extrabold shadow-md bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-all text-xs"
            onClick={() => { setResetSentTo(null); setMode('login'); setEmail(''); }}
          >
            Back to sign in
          </Button>
          <Button
            variant="ghost"
            className="w-full text-xs font-semibold text-stone-500 hover:text-stone-850"
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
        icon={<KeyRound className="size-5 text-amber-650" />}
      >
        <form onSubmit={handleForgot} className="space-y-4">
          {formError && (
            <div role="alert" className="rounded-2xl border border-destructive/25 bg-destructive/5 dark:bg-destructive/10 p-3 text-xs font-semibold text-destructive leading-relaxed">
              {formError}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400 dark:text-stone-550 transition-colors" />
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
                className="pl-9 h-11 rounded-xl bg-stone-50/50 dark:bg-stone-950/30 border-stone-200 dark:border-stone-850 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus-visible:ring-1 focus-visible:ring-amber-500 focus-visible:border-amber-500 text-xs font-bold"
              />
            </div>
            {showError('email') && (
              <p className="text-[10px] font-bold text-destructive">{showError('email')}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 font-extrabold shadow-md bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-all text-xs"
          >
            {loading ? <Loader2 className="size-4 animate-spin text-white" /> : 'Send reset link'}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => { setMode('login'); setFormError(null); setErrors({}); setTouched({}); }}
            className="w-full text-xs font-semibold text-stone-500 hover:text-stone-800 gap-1.5"
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
          <LogIn className="size-5 text-amber-600" />
        ) : (
          <Smartphone className="size-5 text-amber-600" />
        )
      }
      redirectTo={redirectTo === '/' ? undefined : redirectTo}
      footer={
        <p className="text-xs text-stone-500 dark:text-stone-400">
          New here?{' '}
          <Link
            href={redirectTo === '/' ? '/signup' : `/signup?redirect=${encodeURIComponent(redirectTo)}`}
            prefetch
            className="font-extrabold text-amber-600 hover:underline dark:text-amber-400"
          >
            Create an account
          </Link>
        </p>
      }
    >
      {leaving && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-medium text-amber-700 dark:text-amber-450">
          Already signed in — redirecting…
        </div>
      )}

      {authMethod === 'otp' ? (
        <PhoneOtpAuth
          onSuccess={(role) => landAfterLogin(role ?? 'customer', redirectTo)}
          customSocials={
            <div className="space-y-4 pt-1">
              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200 dark:border-stone-800" /></div>
                <span className="relative bg-white/70 dark:bg-stone-900/65 px-3 text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase">
                  Or sign in with
                </span>
              </div>
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="w-10 h-10 border border-stone-250 dark:border-stone-800 rounded-full flex items-center justify-center bg-white dark:bg-stone-950 hover:bg-stone-50 dark:hover:bg-stone-900 transition-colors shadow-xs"
                  title="Sign in with Google"
                >
                  <GoogleIcon />
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMethod('email'); setFormError(null); }}
                  className="w-10 h-10 border border-stone-250 dark:border-stone-800 rounded-full flex items-center justify-center bg-white dark:bg-stone-950 hover:bg-stone-50 dark:hover:bg-stone-900 transition-colors shadow-xs text-stone-600 dark:text-stone-400"
                  title="Sign in with Email"
                >
                  <Mail className="size-4 text-stone-500" />
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
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400 dark:text-stone-500 transition-colors" />
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
                  className="pl-9 h-11 rounded-xl bg-stone-50/50 dark:bg-stone-950/30 border-stone-200 dark:border-stone-850 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus-visible:ring-1 focus-visible:ring-amber-500 focus-visible:border-amber-500 text-xs font-bold"
                />
              </div>
              {showError('email') && (
                <p className="text-[10px] font-bold text-destructive">{showError('email')}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400 dark:text-stone-500 transition-colors" />
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
                  className="pl-9 pr-10 h-11 rounded-xl bg-stone-50/50 dark:bg-stone-950/30 border-stone-200 dark:border-stone-850 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus-visible:ring-1 focus-visible:ring-amber-500 focus-visible:border-amber-500 text-xs font-bold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
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
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-350"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 font-black bg-stone-950 hover:bg-stone-900 text-white dark:bg-stone-50 dark:hover:bg-stone-200 dark:text-stone-950 rounded-xl transition-all text-xs"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : 'Get Started'}
            </Button>
          </form>

          <div className="relative my-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200 dark:border-stone-800" /></div>
            <span className="relative bg-white/70 dark:bg-stone-900/65 px-3 text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase">
              Or sign in with
            </span>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={signInWithGoogle}
              className="w-10 h-10 border border-stone-250 dark:border-stone-800 rounded-full flex items-center justify-center bg-white dark:bg-stone-950 hover:bg-stone-50 dark:hover:bg-stone-900 transition-colors shadow-xs"
              title="Sign in with Google"
            >
              <GoogleIcon />
            </button>
            <button
              type="button"
              onClick={() => { setAuthMethod('otp'); setFormError(null); }}
              className="w-10 h-10 border border-stone-250 dark:border-stone-800 rounded-full flex items-center justify-center bg-white dark:bg-stone-950 hover:bg-stone-50 dark:hover:bg-stone-900 transition-colors shadow-xs text-stone-600 dark:text-stone-400"
              title="Sign in with Mobile OTP"
            >
              <Phone className="size-4 text-stone-500" />
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
        <div className="min-h-screen w-full flex items-center justify-center bg-background">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
