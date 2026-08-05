'use client';

import React, { Suspense, useMemo, useRef, useState } from 'react';
import {
  Box, Typography, TextField, Button, InputAdornment, IconButton,
  CircularProgress, Divider, Alert, Checkbox, FormControlLabel,
  Link as MuiLink,
} from '@mui/material';
import { Email, Lock, Visibility, VisibilityOff, Person, Phone } from '@mui/icons-material';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { useAuth, landAfterLogin } from '@/context/AuthContext';
import {
  validateEmail, validateName, validatePhone, validatePassword,
  normalizePhone, getPasswordStrength, safeRedirect, MIN_PASSWORD_LENGTH,
} from '@/lib/validation';
import AuthShell from '@/components/customer/AuthShell';
import GoogleIcon from '@/components/customer/GoogleIcon';
import PhoneOtpAuth from '@/components/customer/PhoneOtpAuth';

/**
 * Account creation.
 *
 * Every field here is validated before Supabase is called, which is not
 * pedantry: a signup that round-trips only to come back "Password should be at
 * least 8 characters" has already cost the customer a wait, and on a phone it
 * usually costs the typed password too. The strength meter and the live rules
 * exist so the requirement is visible while the password is being chosen
 * rather than after it has been rejected.
 */

type Field = 'name' | 'phone' | 'email' | 'password';

function SignupForm() {
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const searchParams = useSearchParams();

  // Where a new customer lands. Defaults to the menu — they came here to
  // order, and an empty home page is not where that continues.
  const redirectTo = safeRedirect(searchParams.get('redirect'), '/menu');

  const [values, setValues] = useState({ name: '', phone: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Four separate refs rather than one object of them: reading `refs.email`
  // while rendering counts as touching a ref during render, which React's
  // lint rules reject outright.
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  /** Called only from the submit handler, never during render. */
  const focusField = (field: Field) => {
    const target =
      field === 'name' ? nameRef
        : field === 'phone' ? phoneRef
          : field === 'email' ? emailRef
            : passwordRef;
    target.current?.focus();
  };

  const strength = useMemo(() => getPasswordStrength(values.password), [values.password]);

  const setField = (field: Field, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    // Clearing as they type means a corrected field stops shouting immediately
    // instead of waiting for another blur.
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

    // Focus the first thing that is wrong, top to bottom — otherwise on a long
    // form the customer is told "something failed" with the offending field
    // scrolled off screen.
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
      // signUpWithEmail surfaces Supabase's own message as a toast (it is the
      // one that knows whether this was a duplicate address or a rejected
      // password); this keeps a persistent copy on screen after it fades.
      setFormError('We could not create that account. The email may already be registered — try logging in instead.');
      return;
    }

    landAfterLogin(res.role ?? 'customer', redirectTo);
  };

  const [authMethod, setAuthMethod] = useState<'otp' | 'email'>('otp');

  const loginHref = redirectTo === '/menu' ? '/login' : `/login?redirect=${encodeURIComponent(redirectTo)}`;

  return (
    <AuthShell
      title="Create account"
      subtitle="Join Pala Pitta Ruchulu in seconds. Track orders, earn rewards, and manage table reservations."
      footer={
        <Typography sx={{ fontSize: '13.5px', color: 'text.secondary' }}>
          Already have an account?{' '}
          <MuiLink
            component={Link}
            href={loginHref}
            sx={{
              color: 'primary.main',
              fontWeight: 800,
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Log in
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
          component={Link}
          href={loginHref}
          sx={{
            borderRadius: '12px',
            py: 0.8,
            fontWeight: 700,
            fontSize: '13.5px',
            color: 'text.secondary',
            '&:hover': { color: 'primary.main', bgcolor: 'rgba(255,255,255,0.4)' },
          }}
        >
          Log In
        </Button>
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
            containerIdPrefix="signup-page"
            isSignUpMode
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
            Sign up with Google
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
            OR SIGN UP WITH EMAIL
          </Divider>
        </>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate>
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

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            inputRef={nameRef}
            label="Full name"
            name="name"
            value={values.name}
            onChange={(e) => setField('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            error={Boolean(showError('name'))}
            helperText={showError('name')}
            autoComplete="name"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Person sx={{ color: 'primary.main', fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
          />

          <TextField
            fullWidth
            inputRef={phoneRef}
            label="Mobile number"
            name="phone"
            type="tel"
            value={values.phone}
            onChange={(e) => setField('phone', e.target.value)}
            onBlur={() => handleBlur('phone')}
            error={Boolean(showError('phone'))}
            helperText={showError('phone') ?? 'For delivery updates & table reservations'}
            autoComplete="tel"
            slotProps={{
              htmlInput: { inputMode: 'tel', maxLength: 15 },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Phone sx={{ color: 'primary.main', fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
          />

          <TextField
            fullWidth
            inputRef={emailRef}
            label="Email address"
            name="email"
            type="email"
            value={values.email}
            onChange={(e) => setField('email', e.target.value)}
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
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={values.password}
              onChange={(e) => setField('password', e.target.value)}
              onBlur={() => handleBlur('password')}
              error={Boolean(showError('password'))}
              helperText={showError('password')}
              autoComplete="new-password"
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

            {/* Strength meter */}
            {values.password ? (
              <Box sx={{ mt: 1.25, px: 0.5 }}>
                <Box sx={{ display: 'flex', gap: 0.8, mb: 0.75 }}>
                  {[1, 2, 3, 4].map((segment) => (
                    <Box
                      key={segment}
                      sx={{
                        flex: 1,
                        height: 4,
                        borderRadius: 2,
                        bgcolor: strength.score >= segment ? strength.color : 'rgba(0,0,0,0.08)',
                        boxShadow: strength.score >= segment ? `0 0 6px ${strength.color}40` : 'none',
                        transition: 'all .3s ease',
                      }}
                    />
                  ))}
                </Box>
                <Typography aria-live="polite" sx={{ fontSize: '11.5px', fontWeight: 700, color: strength.color }}>
                  {strength.label}
                  <Box component="span" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                    {strength.hint ? ` · ${strength.hint}` : ' — good password'}
                  </Box>
                </Typography>
              </Box>
            ) : (
              <Typography sx={{ fontSize: '11.5px', color: 'text.secondary', mt: 0.75, ml: 1 }}>
                Must be at least {MIN_PASSWORD_LENGTH} characters long
              </Typography>
            )}
          </Box>

          <FormControlLabel
            control={
              <Checkbox
                checked={acceptedTerms}
                onChange={(e) => { setAcceptedTerms(e.target.checked); if (e.target.checked) setFormError(null); }}
                size="small"
                sx={{
                  color: 'primary.main',
                  '&.Mui-checked': { color: 'primary.main' },
                  pt: 0.25,
                }}
              />
            }
            sx={{ alignItems: 'flex-start', mr: 0, ml: -0.5, mt: 0.5 }}
            label={
              <Typography sx={{ fontSize: '12.5px', color: 'text.secondary', lineHeight: 1.5, mt: 0.4 }}>
                I agree to the{' '}
                <MuiLink component={Link} href="/terms" target="_blank" underline="hover" sx={{ color: 'primary.main', fontWeight: 700 }}>
                  Terms of Service
                </MuiLink>{' '}
                and{' '}
                <MuiLink component={Link} href="/privacy-policy" target="_blank" underline="hover" sx={{ color: 'primary.main', fontWeight: 700 }}>
                  Privacy Policy
                </MuiLink>
              </Typography>
            }
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{
              py: 1.5,
              mt: 1,
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
            {loading ? <CircularProgress size={23} color="inherit" /> : 'Create account'}
          </Button>
        </Box>
      </Box>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#FAF4ED' }}>
          <CircularProgress color="primary" />
        </Box>
      }
    >
      <SignupForm />
    </Suspense>
  );
}


