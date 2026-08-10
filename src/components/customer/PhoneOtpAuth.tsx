'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { CheckCircle2, Edit3, Loader2, Mail, RefreshCw, User } from 'lucide-react';
import { toast } from 'sonner';

import {
  sendOtp, verifyOtpCode, clearRecaptcha, describeOtpError, isFirebaseConfigured,
  type ConfirmationResult,
} from '@/lib/firebase';
import { formatMobileForDisplay, isValidMobile, toE164 } from '@/lib/phoneIdentity';
import { validateEmail, validateName } from '@/lib/validation';
import { useAuth, landAfterLogin } from '@/context/AuthContext';
import { isStaffRole } from '@/lib/roleAccess';
import type { UserRole } from '@/types';
import OtpInput from './OtpInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const RESEND_COOLDOWN_SECONDS = 45;
const MAX_VERIFY_ATTEMPTS = 5;
const OTP_LENGTH = 6;

type Step = 'phone' | 'code' | 'details';

interface Props {
  onSuccess?: (role?: UserRole) => void;
  isSignUpMode?: boolean;
  customSocials?: React.ReactNode;
}

export default function PhoneOtpAuth({ onSuccess, isSignUpMode = false, customSocials }: Props) {
  const { signInWithPhoneToken, updateUserProfile } = useAuth();
  const containerId = `recaptcha-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_VERIFY_ATTEMPTS);
  const [verifiedRole, setVerifiedRole] = useState<UserRole | undefined>();
  const [codeRound, setCodeRound] = useState(0);

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const mountedRef = useRef(true);

  const e164 = toE164(phone);
  const phoneIsValid = Boolean(e164);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearRecaptcha(containerId);
    };
  }, [containerId]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step !== 'code') return;
    if (typeof window === 'undefined' || !('OTPCredential' in window)) return;

    const abort = new AbortController();
    navigator.credentials
      .get({ otp: { transport: ['sms'] }, signal: abort.signal } as CredentialRequestOptions)
      .then((credential) => {
        const received = (credential as { code?: string } | null)?.code;
        if (received && mountedRef.current) setCode(received.replace(/\D/g, '').slice(0, OTP_LENGTH));
      })
      .catch(() => { /* dismissed, unsupported, or superseded */ });

    return () => abort.abort();
  }, [step]);

  const handleSend = useCallback(async () => {
    if (busy) return;
    setError(null);

    if (!isValidMobile(phone)) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }

    setBusy(true);
    try {
      confirmationRef.current = await sendOtp(phone, containerId);
      if (!mountedRef.current) return;

      setStep('code');
      setCode('');
      setCodeRound((n) => n + 1);
      setAttemptsLeft(MAX_VERIFY_ATTEMPTS);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success(`Code sent to ${formatMobileForDisplay(e164 ?? phone)}`);
    } catch (err) {
      console.error('[otp] send failed:', err);
      if (!mountedRef.current) return;
      const message = describeOtpError(err);
      setError(message);
      toast.error(message);
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }, [busy, phone, containerId, e164]);

  const submitCode = useCallback(async (entered: string) => {
    if (busy) return;
    setError(null);

    if (entered.length !== OTP_LENGTH) {
      setError(`Enter the ${OTP_LENGTH}-digit code from the SMS.`);
      return;
    }
    const confirmation = confirmationRef.current;
    if (!confirmation) {
      setError('That verification has expired. Please request a new code.');
      setStep('phone');
      return;
    }

    setBusy(true);
    try {
      const idToken = await verifyOtpCode(confirmation, entered);
      const result = await signInWithPhoneToken(idToken, isSignUpMode ? name.trim() : undefined);

      if (!result.success) {
        if (mountedRef.current) setBusy(false);
        return;
      }

      setVerifiedRole(result.role);

      if (result.role && isStaffRole(result.role)) {
        landAfterLogin(result.role);
        return;
      }

      if (!result.hasDetails) {
        if (result.profile?.full_name && !result.profile.full_name.startsWith('Customer ')) {
          setName(result.profile.full_name);
        }
        if (result.profile?.email && !result.profile.email.endsWith('@palapitta.internal')) {
          setEmail(result.profile.email);
        }
        setStep('details');
        if (mountedRef.current) setBusy(false);
        return;
      }

      onSuccess?.(result.role);
      if (mountedRef.current) setBusy(false);
    } catch (err) {
      console.error('[otp] verification failed:', err);
      if (!mountedRef.current) return;

      const remaining = attemptsLeft - 1;
      setAttemptsLeft(remaining);
      setBusy(false);

      if (remaining <= 0) {
        confirmationRef.current = null;
        clearRecaptcha(containerId);
        setStep('phone');
        setCode('');
        setCooldown(0);
        setError('Too many incorrect codes. Please request a new one.');
        return;
      }

      const base = describeOtpError(err);
      setError(remaining <= 2 ? `${base} ${remaining} attempt${remaining === 1 ? '' : 's'} left.` : base);
      setCode('');
      setCodeRound((n) => n + 1);
    }
  }, [busy, attemptsLeft, containerId, isSignUpMode, name, onSuccess, signInWithPhoneToken]);

  const handleSaveProfile = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(null);

    const nameError = validateName(name);
    if (nameError) { setError(nameError); return; }
    const emailError = validateEmail(email);
    if (emailError) { setError(emailError); return; }

    setBusy(true);
    const updated = await updateUserProfile(name.trim(), email.trim(), phone);
    if (!mountedRef.current) return;

    setBusy(false);
    if (updated) onSuccess?.(verifiedRole);
  }, [busy, name, email, phone, updateUserProfile, onSuccess, verifiedRole]);

  const startOver = useCallback(() => {
    confirmationRef.current = null;
    clearRecaptcha(containerId);
    setStep('phone');
    setCode('');
    setError(null);
    setCooldown(0);
    setAttemptsLeft(MAX_VERIFY_ATTEMPTS);
  }, [containerId]);

  if (!isFirebaseConfigured) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-600 dark:text-amber-400">
        Mobile sign-in is unavailable right now. Please use email and password.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div id={containerId} />

      {error && (
        <div role="alert" className="mb-4 rounded-2xl border border-destructive/25 bg-destructive/5 dark:bg-destructive/10 p-3 text-xs font-semibold text-destructive leading-relaxed">
          {error}
        </div>
      )}

      {/* ── Step 1: Phone Number ────────────────────────────────────────── */}
      {step === 'phone' && (
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="space-y-4">
          {isSignUpMode && (
            <div className="space-y-1.5">
              <Label htmlFor="signup-name" className="text-xs font-black text-stone-600 dark:text-stone-400">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400 dark:text-stone-500 transition-colors" />
                <Input
                  id="signup-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  autoComplete="name"
                  maxLength={80}
                  className="pl-9 h-11 rounded-xl bg-stone-50/50 dark:bg-stone-950/30 border-stone-200 dark:border-stone-850 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus-visible:ring-1 focus-visible:ring-amber-500 focus-visible:border-amber-500 text-xs font-bold"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="phone-input" className="text-xs font-black text-stone-600 dark:text-stone-400">Mobile Number</Label>
            <div className="relative flex items-center">
              <div className="absolute left-3 flex items-center border-r pr-2 font-black text-xs text-stone-500 dark:text-stone-450 border-stone-200 dark:border-stone-800">
                +91
              </div>
              <Input
                id="phone-input"
                type="tel"
                inputMode="numeric"
                autoFocus={!isSignUpMode}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210"
                autoComplete="tel-national"
                maxLength={10}
                className="pl-14 h-11 tracking-widest font-black bg-stone-50/50 dark:bg-stone-950/30 border-stone-200 dark:border-stone-850 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus-visible:ring-1 focus-visible:ring-amber-500 focus-visible:border-amber-500 text-xs"
              />
            </div>
            <p className="text-[10px] text-stone-400 dark:text-stone-500 font-semibold">
              We&apos;ll text you a 6-digit code. Standard rates apply.
            </p>
          </div>

          <Button
            type="submit"
            disabled={busy || !phoneIsValid}
            className="w-full h-11 font-extrabold shadow-md bg-stone-950 hover:bg-stone-900 text-white dark:bg-stone-50 dark:hover:bg-stone-200 dark:text-stone-950 rounded-xl transition-all text-xs"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : 'Get Started'}
          </Button>
        </form>
      )}

      {step === 'phone' && customSocials}

      {/* ── Step 2: OTP Code ────────────────────────────────────────────── */}
      {step === 'code' && (
        <form onSubmit={(e) => { e.preventDefault(); submitCode(code); }} className="space-y-5">
          <div className="flex items-center justify-between gap-2 rounded-2xl bg-stone-50 dark:bg-stone-950/40 p-3 border border-stone-200 dark:border-stone-850">
            <div className="min-w-0">
              <p className="text-[10px] text-stone-400 font-semibold">Code sent to</p>
              <p className="text-xs font-black text-stone-900 dark:text-stone-100">{formatMobileForDisplay(e164 ?? phone)}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={startOver}
              disabled={busy}
              className="text-xs font-extrabold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 shrink-0 gap-1 h-8 rounded-full"
            >
              <Edit3 className="size-3.5" />
              Change
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black text-stone-600 dark:text-stone-400">Enter the 6-digit code</Label>
            <OtpInput
              key={codeRound}
              value={code}
              onChange={setCode}
              onComplete={submitCode}
              length={OTP_LENGTH}
              disabled={busy}
              error={Boolean(error)}
              autoFocus
              label="6-digit verification code"
            />
          </div>

          <Button
            type="submit"
            disabled={busy || code.length !== OTP_LENGTH}
            className="w-full h-11 font-extrabold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all text-xs"
          >
            {busy ? <Loader2 className="size-4 animate-spin text-white" /> : 'Verify & Continue'}
          </Button>

          <div className="text-center">
            <span className="text-xs text-stone-500">Didn&apos;t get it? </span>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={handleSend}
              disabled={cooldown > 0 || busy}
              className="text-xs font-black text-amber-600 dark:text-amber-400 p-0 h-auto gap-1"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
            </Button>
          </div>
        </form>
      )}

      {/* ── Step 3: Details ────────────────────────────────────────────── */}
      {step === 'details' && (
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="flex gap-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3.5">
            <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-emerald-800 dark:text-emerald-300">Mobile number verified</p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold leading-relaxed">
                Last step — tell us who you are so we can put a name on your orders.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="details-name" className="text-xs font-black text-stone-600 dark:text-stone-400">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400 dark:text-stone-500 transition-colors" />
              <Input
                id="details-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                autoComplete="name"
                maxLength={80}
                className="pl-9 h-11 rounded-xl bg-stone-50/50 dark:bg-stone-950/30 border-stone-200 dark:border-stone-850 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus-visible:ring-1 focus-visible:ring-amber-500 focus-visible:border-amber-500 text-xs font-bold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="details-email" className="text-xs font-black text-stone-600 dark:text-stone-400">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400 dark:text-stone-500 transition-colors" />
              <Input
                id="details-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. rahul@example.com"
                autoComplete="email"
                className="pl-9 h-11 rounded-xl bg-stone-50/50 dark:bg-stone-950/30 border-stone-200 dark:border-stone-850 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus-visible:ring-1 focus-visible:ring-amber-500 focus-visible:border-amber-500 text-xs font-bold"
              />
            </div>
            <p className="text-[10px] text-stone-450 dark:text-stone-500 font-semibold">
              Where your order receipts and booking confirmations go.
            </p>
          </div>

          <Button
            type="submit"
            disabled={busy || !name.trim() || !email.trim()}
            className="w-full h-11 font-extrabold shadow-md bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-all text-xs"
          >
            {busy ? <Loader2 className="size-4 animate-spin text-white" /> : 'Finish & Continue'}
          </Button>
        </form>
      )}
    </div>
  );
}
