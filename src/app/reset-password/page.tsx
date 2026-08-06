'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';
import { validatePassword, getPasswordStrength, MIN_PASSWORD_LENGTH } from '@/lib/validation';
import AuthShell from '@/components/customer/AuthShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Stage = 'checking' | 'ready' | 'invalid' | 'done';

const EXCHANGE_TIMEOUT_MS = 6000;

export default function ResetPasswordPage() {
  const [stage, setStage] = useState<Stage>('checking');
  const [linkError, setLinkError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  useEffect(() => {
    let settled = false;

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const urlError = hash.get('error_description') || hash.get('error');

    const settle = (next: Stage, message?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (message) setLinkError(message.replace(/\+/g, ' '));
      setStage(next);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (urlError) return;
      if (event === 'PASSWORD_RECOVERY' || session) settle('ready');
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (urlError) settle('invalid', urlError);
      else if (session) settle('ready');
    });

    const timer = setTimeout(() => settle('invalid'), EXCHANGE_TIMEOUT_MS);

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const passwordProblem = validatePassword(password, 'new');
    const mismatch = password !== confirm ? 'Both passwords must match' : null;
    setFieldError(passwordProblem);
    setConfirmError(mismatch);
    if (passwordProblem || mismatch) return;

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setFormError(error.message || 'Could not update the password. Request a fresh link and try again.');
        setSaving(false);
        return;
      }
      setStage('done');
      toast.success('Password updated');
    } catch (err) {
      setFormError(getErrorMessage(err) || 'Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Waiting on the token exchange ────────────────────────────────────── */
  if (stage === 'checking') {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Checking your reset link…</p>
      </div>
    );
  }

  /* ── Dead link ────────────────────────────────────────────────────────── */
  if (stage === 'invalid') {
    return (
      <AuthShell
        title="This link has expired"
        subtitle="Reset links can only be used once, and they stop working after an hour."
        icon={<AlertCircle className="size-5 text-amber-600" />}
      >
        <div className="text-center py-2 space-y-4">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 shadow-md">
            <AlertCircle className="size-8" />
          </div>

          {linkError && (
            <div role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 text-left">
              {linkError}
            </div>
          )}

          <p className="text-xs text-muted-foreground leading-relaxed">
            Request a new one and we&apos;ll email it straight away.
          </p>

          <Button
            asChild
            className="w-full font-extrabold shadow-md bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white py-2.5 rounded-xl"
          >
            <Link href="/login?mode=forgot">Send a new reset link</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="w-full text-xs font-semibold text-muted-foreground"
          >
            <Link href="/login">Back to log in</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  /* ── Done ─────────────────────────────────────────────────────────────── */
  if (stage === 'done') {
    return (
      <AuthShell
        title="Password updated"
        subtitle="You're signed in with your new password — nothing else to do."
        icon={<CheckCircle2 className="size-5 text-emerald-600" />}
      >
        <div className="text-center py-2 space-y-4">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-md">
            <CheckCircle2 className="size-8" />
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Use your new password the next time you log in on another device.
          </p>

          <Button
            asChild
            className="w-full font-extrabold shadow-md bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white py-2.5 rounded-xl"
          >
            <Link href="/menu">Start ordering</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="w-full text-xs font-semibold text-muted-foreground"
          >
            <Link href="/">Go to the home page</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  /* ── Choose a new password ────────────────────────────────────────────── */
  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Pick something you haven't used here before. You'll stay signed in on this device."
      icon={<Lock className="size-5 text-amber-600" />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div role="alert" className="rounded-2xl border border-destructive/25 bg-destructive/5 dark:bg-destructive/10 p-3 text-xs font-semibold text-destructive leading-relaxed">
            {formError}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="reset-password" className="text-xs font-black text-stone-600 dark:text-stone-400">New password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400 dark:text-stone-500 transition-colors" />
            <Input
              id="reset-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldError(null); }}
              autoFocus
              className="pl-9 pr-10 h-11 rounded-xl bg-stone-50/50 dark:bg-stone-950/30 border-stone-200 dark:border-stone-850 text-stone-900 dark:text-stone-100 focus-visible:ring-1 focus-visible:ring-amber-500 focus-visible:border-amber-500 text-xs font-bold"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {fieldError ? (
            <p className="text-[10px] font-bold text-destructive">{fieldError}</p>
          ) : (
            <p className="text-[10px] text-stone-400 font-semibold">At least {MIN_PASSWORD_LENGTH} characters</p>
          )}

          {password && (
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
                {strength.hint && (
                  <span className="font-normal text-stone-400"> · {strength.hint}</span>
                )}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-password" className="text-xs font-black text-stone-600 dark:text-stone-400">Confirm new password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400 dark:text-stone-500 transition-colors" />
            <Input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setConfirmError(null); }}
              className="pl-9 h-11 rounded-xl bg-stone-50/50 dark:bg-stone-950/30 border-stone-200 dark:border-stone-850 text-stone-900 dark:text-stone-100 focus-visible:ring-1 focus-visible:ring-amber-500 focus-visible:border-amber-500 text-xs font-bold"
            />
          </div>
          {confirmError && <p className="text-[10px] font-bold text-destructive">{confirmError}</p>}
        </div>

        <Button
          type="submit"
          disabled={saving}
          className="w-full h-11 font-extrabold shadow-md bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-all text-xs"
        >
          {saving ? <Loader2 className="size-4 animate-spin text-white" /> : 'Update Password'}
        </Button>
      </form>
    </AuthShell>
  );
}
