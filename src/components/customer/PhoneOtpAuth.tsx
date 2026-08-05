'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, InputAdornment, Stack, TextField, Typography,
} from '@mui/material';
import { ArrowBack, Person, Refresh, Sms } from '@mui/icons-material';
import toast from 'react-hot-toast';

import {
  sendOtp, verifyOtpCode, clearRecaptcha, describeOtpError, isFirebaseConfigured,
  type ConfirmationResult,
} from '@/lib/firebase';
import { formatMobileForDisplay, isValidMobile, toE164 } from '@/lib/phoneIdentity';
import { useAuth, landAfterLogin } from '@/context/AuthContext';
import { isStaffRole } from '@/lib/roleAccess';
import type { UserRole } from '@/types';

/**
 * PhoneOtpAuth — the two-step SMS sign-in used by the login page, the signup
 * page and the auth modal.
 *
 * It owns the SMS half of the flow only. Confirming the code yields a Firebase
 * ID token, which is handed to AuthContext to be exchanged server-side for a
 * Supabase session; this component never decides who anyone is.
 *
 * Two limits are enforced here that the customer can feel:
 *  - a resend cooldown, so an unreceived SMS doesn't turn into ten sent ones;
 *  - a cap on wrong codes, after which a fresh code must be requested rather
 *    than the same one guessed indefinitely.
 * Neither is a security boundary — Firebase and the API route enforce the real
 * ones. These exist so the honest customer on a slow network isn't the person
 * who burns through the SMS quota.
 */

/** Seconds before Resend becomes available. Long enough for a slow SMS to land. */
const RESEND_COOLDOWN_SECONDS = 45;

/** Wrong codes tolerated before the session is thrown away and a new one required. */
const MAX_VERIFY_ATTEMPTS = 5;

const OTP_LENGTH = 6;

type Step = 'phone' | 'code';

interface Props {
  /** Called after a customer signs in. Staff are routed by this component instead. */
  onSuccess?: (role?: UserRole) => void;
  /** Shows the name field, so a first-time customer isn't left as "Customer 3210". */
  isSignUpMode?: boolean;
}

export default function PhoneOtpAuth({ onSuccess, isSignUpMode = false }: Props) {
  const { signInWithPhoneToken } = useAuth();

  // useId keeps the reCAPTCHA container unique even when two instances mount
  // together — the modal and the page form can both be in the tree during a
  // route transition, and Firebase refuses to render two widgets into one node.
  // Non-alphanumerics are stripped because React's generated ids have carried
  // punctuation (`:r0:`) across versions, and this string is used as a DOM id.
  const containerId = `recaptcha-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_VERIFY_ATTEMPTS);

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  // Guards the async handlers: a resolved promise must not call setState on a
  // form the customer has already closed or navigated away from.
  const mountedRef = useRef(true);

  const e164 = toE164(phone);
  const phoneIsValid = Boolean(e164);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Leaving the widget bound to a removed node is what makes a second
      // visit to this form fail with "reCAPTCHA has already been rendered".
      clearRecaptcha(containerId);
    };
  }, [containerId]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  /**
   * Android Chrome can read the code straight out of the SMS, with the
   * customer's permission, when the message carries the site's origin. If the
   * browser doesn't support it, or the customer dismisses the prompt, nothing
   * happens and they type it in — so this is added without a fallback path.
   */
  useEffect(() => {
    if (step !== 'code') return;
    if (typeof window === 'undefined' || !('OTPCredential' in window)) return;

    const abort = new AbortController();
    navigator.credentials
      .get({ otp: { transport: ['sms'] }, signal: abort.signal } as CredentialRequestOptions)
      .then((credential) => {
        const received = (credential as { code?: string } | null)?.code;
        if (received && mountedRef.current) setCode(received.slice(0, OTP_LENGTH));
      })
      .catch(() => { /* dismissed, unsupported, or superseded — the field still works */ });

    return () => abort.abort();
  }, [step]);

  const handleSend = useCallback(async (isResend = false) => {
    if (busy) return;
    setError(null);

    if (!isValidMobile(phone)) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    if (isSignUpMode && !isResend && name.trim().length < 2) {
      setError('Please tell us your name so we know who the order is for.');
      return;
    }

    setBusy(true);
    try {
      confirmationRef.current = await sendOtp(phone, containerId);
      if (!mountedRef.current) return;

      setStep('code');
      setCode('');
      setAttemptsLeft(MAX_VERIFY_ATTEMPTS);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success(`Code sent to ${formatMobileForDisplay(e164 ?? phone)}`);
      // Autofocus after the step renders, so the keyboard opens on the field
      // the customer needs rather than the one they just left.
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (err) {
      console.error('[otp] send failed:', err);
      if (!mountedRef.current) return;
      const message = describeOtpError(err);
      setError(message);
      toast.error(message);
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }, [busy, phone, name, isSignUpMode, containerId, e164]);

  const handleVerify = useCallback(async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (busy) return;
    setError(null);

    if (code.trim().length !== OTP_LENGTH) {
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
      // Firebase confirms the code and issues the ID token; the token is the
      // only thing the server will accept as proof, so nothing else is sent.
      const idToken = await verifyOtpCode(confirmation, code);
      const result = await signInWithPhoneToken(idToken, isSignUpMode ? name.trim() : undefined);

      if (!result.success) {
        if (mountedRef.current) setBusy(false);
        return;
      }

      // Staff who sign in by phone go to their console; a full page load, for
      // the shared-terminal reasons documented on landAfterLogin.
      if (result.role && isStaffRole(result.role)) {
        landAfterLogin(result.role);
        return; // Navigating away — deliberately stays busy.
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
        // The confirmation is spent — force a fresh code rather than leaving a
        // dead session that returns the same error however often it's tried.
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
      codeRef.current?.select();
    }
  }, [busy, code, attemptsLeft, containerId, isSignUpMode, name, onSuccess, signInWithPhoneToken]);

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
      <Alert severity="warning" sx={{ borderRadius: '12px', fontSize: '13px' }}>
        Phone sign-in is unavailable right now. Please use email and password.
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Firebase renders its invisible reCAPTCHA challenge into this node. */}
      <div id={containerId} />

      {error && (
        <Alert
          severity="error"
          role="alert"
          sx={{ mb: 2, borderRadius: '12px', fontSize: '13px' }}
        >
          {error}
        </Alert>
      )}

      {step === 'phone' ? (
        <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSend(); }} noValidate>
          <Stack spacing={2}>
            {isSignUpMode && (
              <TextField
                fullWidth
                size="small"
                label="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                autoComplete="name"
                slotProps={{
                  htmlInput: { maxLength: 80 },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person fontSize="small" sx={{ color: 'primary.main' }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            )}

            <TextField
              fullWidth
              size="small"
              type="tel"
              label="Mobile number"
              required
              autoFocus={!isSignUpMode}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit mobile number"
              autoComplete="tel-national"
              helperText="We'll text you a 6-digit code. Standard SMS rates apply."
              slotProps={{
                htmlInput: { inputMode: 'numeric', maxLength: 10 },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography sx={{ fontWeight: 800, fontSize: '14px', color: 'primary.main', mr: 0.5 }}>
                        +91
                      </Typography>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={busy || !phoneIsValid}
              sx={{
                py: 1.3,
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '14px',
                background: 'linear-gradient(135deg, #C62828 0%, #E53935 100%)',
                boxShadow: '0 4px 16px rgba(198, 40, 40, 0.25)',
                '&:hover': { background: 'linear-gradient(135deg, #B71C1C 0%, #C62828 100%)' },
              }}
            >
              {busy ? <CircularProgress size={22} color="inherit" /> : 'Send code'}
            </Button>
          </Stack>
        </Box>
      ) : (
        <Box component="form" onSubmit={handleVerify} noValidate>
          <Stack spacing={2}>
            <Box sx={{ bgcolor: '#FFF8F2', p: 1.8, borderRadius: '12px', border: '1px solid #FFE0B2' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.25 }}>
                Code sent to
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#C62828' }}>
                {formatMobileForDisplay(e164 ?? phone)}
              </Typography>
            </Box>

            <TextField
              fullWidth
              size="small"
              inputRef={codeRef}
              // Deliberately `text`, not `number`: a number input accepts `e`,
              // `+` and `-`, drops leading zeros, and puts spinner arrows next
              // to a field where they mean nothing.
              type="text"
              label={`${OTP_LENGTH}-digit code`}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
              placeholder="••••••"
              // The pairing iOS and Android look for to offer the code from the
              // SMS above the keyboard.
              autoComplete="one-time-code"
              slotProps={{
                htmlInput: {
                  inputMode: 'numeric',
                  maxLength: OTP_LENGTH,
                  pattern: '[0-9]*',
                  style: { letterSpacing: '0.4em', fontWeight: 700 },
                },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Sms fontSize="small" sx={{ color: 'primary.main' }} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={busy || code.length !== OTP_LENGTH}
              sx={{
                py: 1.3,
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '14px',
                background: 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)',
                boxShadow: '0 4px 16px rgba(46, 125, 50, 0.25)',
                '&:hover': { background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)' },
              }}
            >
              {busy ? <CircularProgress size={22} color="inherit" /> : 'Verify & continue'}
            </Button>

            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                size="small"
                onClick={startOver}
                disabled={busy}
                startIcon={<ArrowBack sx={{ fontSize: 16 }} />}
                sx={{ fontSize: '12px', color: 'text.secondary', textTransform: 'none' }}
              >
                Change number
              </Button>

              <Button
                size="small"
                onClick={() => handleSend(true)}
                disabled={cooldown > 0 || busy}
                startIcon={<Refresh sx={{ fontSize: 16 }} />}
                sx={{ fontSize: '12px', fontWeight: 700, color: 'primary.main', textTransform: 'none' }}
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
