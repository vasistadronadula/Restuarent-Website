'use client';

import React, { Suspense, useRef, useState } from 'react';
import {
  Box, Typography, TextField, Button, InputAdornment, IconButton,
  CircularProgress, Divider, Alert, Link as MuiLink,
} from '@mui/material';
import { Email, Lock, Visibility, VisibilityOff, MarkEmailRead } from '@mui/icons-material';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { useAuth, landAfterLogin } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';
import { validateEmail, validatePassword, safeRedirect } from '@/lib/validation';
import AuthShell from '@/components/customer/AuthShell';
import GoogleIcon from '@/components/customer/GoogleIcon';
import PhoneOtpAuth from '@/components/customer/PhoneOtpAuth';

/**
 * Sign-in.
 *
 * Three things this screen has to get right, all of which it previously did
 * not: it must say *why* a submission failed without leaking whether an email
 * is registered; it must offer a way out when the password is forgotten; and
 * it must return the customer to whatever they were doing (`?redirect=`)
 * instead of always dumping them on the home page — a login prompted from the
 * checkout that lands you back at the top of the site loses the sale.
 */

type Field = 'email' | 'password';

function LoginForm() {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const searchParams = useSearchParams();

  // Validated, because `?redirect=` is attacker-supplied. See safeRedirect.
  const redirectTo = safeRedirect(searchParams.get('redirect'), '/');

  const [mode, setMode] = useState<'login' | 'forgot'>(
    searchParams.get('mode') === 'forgot' ? 'forgot' : 'login',
  );

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

  /** Errors only appear once a field has been left or the form submitted —
      flagging "email is required" while someone is still typing it is noise. */
  const showError = (field: Field) => (touched[field] ? errors[field] : undefined);

  const runValidation = () => {
    const next: Partial<Record<Field, string>> = {};
    const emailError = validateEmail(email);
    if (emailError) next.email = emailError;
    if (mode === 'login') {
      const passwordError = validatePassword(password, 'login');
      if (passwordError) next.password = passwordError;
    }
    setErrors(next);
    return next;
  };

  const handleBlur = (field: Field) => {
    setTouched((t) => ({ ...t, [field]: true }));
    runValidation();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const found = runValidation();
    setTouched({ email: true, password: true });
    if (found.email) { emailRef.current?.focus(); return; }
    if (found.password) { passwordRef.current?.focus(); return; }

    setLoading(true);
    const res = await signInWithEmail(email.trim(), password);

    if (!res.success) {
      setLoading(false);
      // Deliberately does not distinguish "no such account" from "wrong
      // password" — that difference is a free account-enumeration oracle.
      setFormError("That email and password don't match an account. Check them and try again, or reset your password.");
      passwordRef.current?.focus();
      return;
    }

    // Stays in the loading state on purpose: landAfterLogin triggers a full
    // page load, and re-enabling the button first invites a second submit
    // during the hand-off.
    landAfterLogin(res.role ?? 'customer', redirectTo);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setTouched({ email: true });

    const emailError = validateEmail(email);
    setErrors({ email: emailError ?? undefined });
    if (emailError) { emailRef.current?.focus(); return; }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      // A failure here is reported the same as a success. "No account with
      // that email" is exactly the answer an attacker enumerating addresses
      // wants, and the genuine user's next step is identical either way:
      // check the inbox.
      if (error) console.warn('[auth] password reset request failed:', error.message);
      setResetSentTo(email.trim());
    } catch (err) {
      setFormError(getErrorMessage(err) || 'Could not send the reset email. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Reset email sent ─────────────────────────────────────────────────── */
  if (resetSentTo) {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle="If an account exists for that address, a password reset link has been dispatched."
      >
        <Box sx={{ textAlign: 'center', py: 1 }}>
          <Box
            sx={{
              width: 68,
              height: 68,
              borderRadius: '22px',
              mx: 'auto',
              mb: 2.5,
              background: 'linear-gradient(135deg, rgba(46,125,50,0.12) 0%, rgba(76,175,80,0.18) 100%)',
              color: 'success.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(46,125,50,0.15)',
            }}
          >
            <MarkEmailRead sx={{ fontSize: 36 }} />
          </Box>

          <Typography sx={{ fontWeight: 800, fontSize: '15px', color: '#1A0C0C', mb: 1, wordBreak: 'break-all' }}>
            {resetSentTo}
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '13.5px', lineHeight: 1.6, mb: 3 }}>
            Open the link in that email to choose a new password. It expires in 1 hour. If you don&apos;t see it, check your spam or junk folder.
          </Typography>

          <Button
            fullWidth
            variant="contained"
            onClick={() => { setResetSentTo(null); setMode('login'); setPassword(''); }}
            sx={{
              py: 1.4,
              borderRadius: '14px',
              fontWeight: 800,
              fontSize: '15px',
              mb: 1.25,
              background: 'linear-gradient(135deg, #C62828 0%, #E53935 100%)',
              boxShadow: '0 6px 20px rgba(198, 40, 40, 0.25)',
              '&:hover': { background: 'linear-gradient(135deg, #B71C1C 0%, #C62828 100%)' },
            }}
          >
            Back to log in
          </Button>
          <Button
            fullWidth
            onClick={() => setResetSentTo(null)}
            sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '13px' }}
          >
            Use a different email address
          </Button>
        </Box>
      </AuthShell>
    );
  }

  /* ── Forgot password ──────────────────────────────────────────────────── */
  if (mode === 'forgot') {
    return (
      <AuthShell
        title="Reset password"
        subtitle="Enter the email associated with your account and we'll send you instructions to reset your password."
      >
        <Box component="form" onSubmit={handleForgot} noValidate>
          {formError && (
            <Alert
              severity="error"
              role="alert"
              sx={{
                mb: 2.5,
                borderRadius: '14px',
                fontSize: '13px',
                border: '1px solid rgba(211, 47, 47, 0.2)',
                bgcolor: 'rgba(211, 47, 47, 0.04)',
              }}
            >
              {formError}
            </Alert>
          )}

          <TextField
            fullWidth
            inputRef={emailRef}
            label="Email address"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => handleBlur('email')}
            error={Boolean(showError('email'))}
            helperText={showError('email')}
            autoComplete="email"
            autoFocus
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Email sx={{ color: 'primary.main', fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{
              mt: 3,
              py: 1.5,
              borderRadius: '14px',
              fontWeight: 800,
              fontSize: '15px',
              background: 'linear-gradient(135deg, #C62828 0%, #E53935 100%)',
              boxShadow: '0 6px 20px rgba(198, 40, 40, 0.25)',
              '&:hover': { background: 'linear-gradient(135deg, #B71C1C 0%, #C62828 100%)' },
            }}
          >
            {loading ? <CircularProgress size={23} color="inherit" /> : 'Send reset link'}
          </Button>

          <Button
            fullWidth
            onClick={() => { setMode('login'); setFormError(null); setErrors({}); setTouched({}); }}
            sx={{ mt: 1.5, fontWeight: 700, color: 'text.secondary', fontSize: '13.5px' }}
          >
            Back to log in
          </Button>
        </Box>
      </AuthShell>
    );
  }

  const [authMethod, setAuthMethod] = useState<'otp' | 'email'>('otp');

  /* ── Log in ───────────────────────────────────────────────────────────── */
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to view active orders, track food delivery, and manage table bookings."
      footer={
        <Typography sx={{ fontSize: '13.5px', color: 'text.secondary' }}>
          New to Pala Pitta Ruchulu?{' '}
          <MuiLink
            component={Link}
            href={redirectTo === '/' ? '/signup' : `/signup?redirect=${encodeURIComponent(redirectTo)}`}
            sx={{
              color: 'primary.main',
              fontWeight: 800,
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Create an account
          </MuiLink>
        </Typography>
      }
    >
      {/* Pill Segmented Tab Switcher */}
      <Box
        sx={{
          display: 'flex',
          bgcolor: 'rgba(245, 235, 225, 0.75)',
          p: 0.5,
          borderRadius: '16px',
          mb: 3,
          border: '1px solid rgba(255, 204, 188, 0.5)',
        }}
      >
        <Button
          fullWidth
          disableRipple
          sx={{
            borderRadius: '12px',
            py: 0.8,
            fontWeight: 800,
            fontSize: '13.5px',
            bgcolor: '#FFFFFF',
            color: 'primary.main',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            cursor: 'default',
          }}
        >
          Log In
        </Button>
        <Button
          fullWidth
          component={Link}
          href={redirectTo === '/' ? '/signup' : `/signup?redirect=${encodeURIComponent(redirectTo)}`}
          sx={{
            borderRadius: '12px',
            py: 0.8,
            fontWeight: 700,
            fontSize: '13.5px',
            color: 'text.secondary',
            '&:hover': { color: 'primary.main', bgcolor: 'rgba(255,255,255,0.4)' },
          }}
        >
          Sign Up
        </Button>
      </Box>

      {/* Auth Method Switcher (Phone OTP vs Email) */}
      <Box sx={{ mb: 2.5, display: 'flex', justifyContent: 'center' }}>
        <Box
          sx={{
            display: 'inline-flex',
            bgcolor: '#F5EBE6',
            p: 0.4,
            borderRadius: '12px',
            gap: 0.5,
          }}
        >
          <Button
            size="small"
            onClick={() => setAuthMethod('otp')}
            sx={{
              borderRadius: '9px',
              px: 2,
              py: 0.6,
              fontWeight: 800,
              fontSize: '12.5px',
              textTransform: 'none',
              bgcolor: authMethod === 'otp' ? '#FFFFFF' : 'transparent',
              color: authMethod === 'otp' ? 'primary.main' : 'text.secondary',
              boxShadow: authMethod === 'otp' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            📱 Phone OTP
          </Button>
          <Button
            size="small"
            onClick={() => setAuthMethod('email')}
            sx={{
              borderRadius: '9px',
              px: 2,
              py: 0.6,
              fontWeight: 800,
              fontSize: '12.5px',
              textTransform: 'none',
              bgcolor: authMethod === 'email' ? '#FFFFFF' : 'transparent',
              color: authMethod === 'email' ? 'primary.main' : 'text.secondary',
              boxShadow: authMethod === 'email' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            ✉️ Email & Password
          </Button>
        </Box>
      </Box>

      {authMethod === 'otp' ? (
        <Box sx={{ mb: 2.5 }}>
          <PhoneOtpAuth
            containerIdPrefix="login-page"
            onSuccess={(role) => landAfterLogin(role ?? 'customer', redirectTo)}
          />
        </Box>
      ) : (
        <>
          <Button
            fullWidth
            variant="outlined"
            onClick={signInWithGoogle}
            startIcon={<GoogleIcon />}
            sx={{
              py: 1.3,
              mb: 2.5,
              borderRadius: '14px',
              borderColor: '#E2E8F0',
              bgcolor: 'rgba(255, 255, 255, 0.9)',
              color: '#2D3748',
              fontWeight: 700,
              fontSize: '14px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: '#CBD5E0',
                bgcolor: '#FFFFFF',
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                transform: 'translateY(-1px)',
              },
            }}
          >
            Continue with Google
          </Button>

          <Divider
            sx={{
              mb: 2.5,
              fontSize: '11px',
              fontWeight: 800,
              color: 'text.secondary',
              letterSpacing: 1,
              '&::before, &::after': { borderColor: '#F0E4D8' },
            }}
          >
            OR LOGIN WITH EMAIL
          </Divider>
        </>
      )}

      <Box component="form" onSubmit={handleLogin} noValidate>
        {formError && (
          <Alert
            severity="error"
            role="alert"
            sx={{
              mb: 2.5,
              borderRadius: '14px',
              fontSize: '13px',
              border: '1px solid rgba(211, 47, 47, 0.2)',
              bgcolor: 'rgba(211, 47, 47, 0.04)',
            }}
          >
            {formError}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
          <TextField
            fullWidth
            inputRef={emailRef}
            label="Email address"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => handleBlur('email')}
            error={Boolean(showError('email'))}
            helperText={showError('email')}
            autoComplete="email"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Email sx={{ color: 'primary.main', fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
          />

          <Box>
            <TextField
              fullWidth
              inputRef={passwordRef}
              label="Password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => handleBlur('password')}
              error={Boolean(showError('password'))}
              helperText={showError('password')}
              autoComplete="current-password"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: 'primary.main', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        edge="end"
                        sx={{ color: 'text.secondary' }}
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.75 }}>
              <Button
                onClick={() => { setMode('forgot'); setFormError(null); setErrors({}); setTouched({}); }}
                sx={{
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: 'primary.main',
                  p: 0.5,
                  minWidth: 0,
                  '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                }}
              >
                Forgot password?
              </Button>
            </Box>
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{
              py: 1.5,
              borderRadius: '14px',
              fontWeight: 800,
              fontSize: '15px',
              background: 'linear-gradient(135deg, #C62828 0%, #E53935 100%)',
              boxShadow: '0 6px 20px rgba(198, 40, 40, 0.25)',
              transition: 'all 0.2s ease',
              '&:hover': {
                background: 'linear-gradient(135deg, #B71C1C 0%, #C62828 100%)',
                boxShadow: '0 8px 24px rgba(198, 40, 40, 0.35)',
                transform: 'translateY(-1px)',
              },
            }}
          >
            {loading ? <CircularProgress size={23} color="inherit" /> : 'Log in'}
          </Button>
        </Box>
      </Box>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#FFFFFF' }}>
          <CircularProgress color="primary" />
        </Box>
      }
    >
      <LoginForm />
    </Suspense>
  );
}


