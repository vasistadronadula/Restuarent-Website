'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, TextField, Button, InputAdornment, IconButton,
  CircularProgress, Alert,
} from '@mui/material';
import { Lock, Visibility, VisibilityOff, CheckCircle, ErrorOutlined } from '@mui/icons-material';
import Link from 'next/link';
import toast from 'react-hot-toast';

import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';
import { validatePassword, getPasswordStrength, MIN_PASSWORD_LENGTH } from '@/lib/validation';
import AuthShell from '@/components/customer/AuthShell';

/**
 * The other half of "Forgot password?".
 *
 * Supabase mails a one-time recovery link back to this route. The client is
 * configured with `detectSessionInUrl`, so by the time this page mounts the
 * link's token has been — or is about to be — exchanged for a short-lived
 * session, and `updateUser` is then allowed to set a new password for exactly
 * that account. There is no token handling to do here beyond waiting for that
 * exchange and saying something useful if it never happens.
 */

type Stage = 'checking' | 'ready' | 'invalid' | 'done';

/** How long to wait for the token exchange before calling the link dead. */
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

    /**
     * An expired or already-used link reports itself in the URL fragment
     * rather than as a failed request. Read synchronously, because the
     * Supabase client strips the fragment as soon as it has looked at it —
     * by the time anything async runs, it is gone.
     */
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const urlError = hash.get('error_description') || hash.get('error');

    /** Every state change happens in here, from a callback — never in the
        effect body, which would cascade an extra render on mount. */
    const settle = (next: Stage, message?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (message) setLinkError(message.replace(/\+/g, ' '));
      setStage(next);
    };

    // Either the recovery event fires, or a session is already in place — the
    // second case covers a signed-in customer changing their password directly.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (urlError) return;
      if (event === 'PASSWORD_RECOVERY' || session) settle('ready');
    });

    // Resolves off local storage, so this is the fast path in practice: a dead
    // link reports itself immediately instead of after the timeout.
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
      <Box sx={{
        minHeight: '100dvh', bgcolor: '#FFF8F2',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
      }}>
        <CircularProgress />
        <Typography sx={{ color: 'text.secondary', fontSize: '13.5px' }}>
          Checking your reset link…
        </Typography>
      </Box>
    );
  }

  /* ── Dead link ────────────────────────────────────────────────────────── */
  if (stage === 'invalid') {
    return (
      <AuthShell
        title="This link has expired"
        subtitle="Reset links can only be used once, and they stop working after an hour."
      >
        <Box sx={{ textAlign: 'center', py: 1 }}>
          <Box sx={{
            width: 64, height: 64, borderRadius: '20px', mx: 'auto', mb: 2.5,
            bgcolor: 'rgba(198,40,40,0.1)', color: 'primary.main',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ErrorOutlined sx={{ fontSize: 32 }} />
          </Box>

          {linkError && (
            <Alert severity="warning" sx={{ mb: 2.5, borderRadius: '12px', fontSize: '12.5px', textAlign: 'left' }}>
              {linkError}
            </Alert>
          )}

          <Typography sx={{ color: 'text.secondary', fontSize: '13.5px', lineHeight: 1.6, mb: 3 }}>
            Request a new one and we&apos;ll email it straight away.
          </Typography>

          <Button
            component={Link}
            href="/login?mode=forgot"
            fullWidth
            variant="contained"
            sx={{ py: 1.4, borderRadius: '14px', fontWeight: 800, mb: 1 }}
          >
            Send a new reset link
          </Button>
          <Button
            component={Link}
            href="/login"
            fullWidth
            sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '13px' }}
          >
            Back to log in
          </Button>
        </Box>
      </AuthShell>
    );
  }

  /* ── Done ─────────────────────────────────────────────────────────────── */
  if (stage === 'done') {
    return (
      <AuthShell
        title="Password updated"
        subtitle="You're signed in with your new password — nothing else to do."
      >
        <Box sx={{ textAlign: 'center', py: 1 }}>
          <Box sx={{
            width: 64, height: 64, borderRadius: '20px', mx: 'auto', mb: 2.5,
            bgcolor: 'rgba(46,125,50,0.1)', color: 'success.main',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle sx={{ fontSize: 32 }} />
          </Box>

          <Typography sx={{ color: 'text.secondary', fontSize: '13.5px', lineHeight: 1.6, mb: 3 }}>
            Use your new password the next time you log in on another device.
          </Typography>

          <Button
            component={Link}
            href="/menu"
            fullWidth
            variant="contained"
            sx={{ py: 1.4, borderRadius: '14px', fontWeight: 800, mb: 1 }}
          >
            Start ordering
          </Button>
          <Button
            component={Link}
            href="/"
            fullWidth
            sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '13px' }}
          >
            Go to the home page
          </Button>
        </Box>
      </AuthShell>
    );
  }

  /* ── Choose a new password ────────────────────────────────────────────── */
  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Pick something you haven't used here before. You'll stay signed in on this device."
    >
      <Box component="form" onSubmit={handleSubmit} noValidate>
        {formError && (
          <Alert severity="error" role="alert" sx={{ mb: 2.5, borderRadius: '12px', fontSize: '13px' }}>
            {formError}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
          <Box>
            <TextField
              fullWidth
              label="New password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldError(null); }}
              error={Boolean(fieldError)}
              helperText={fieldError ?? `At least ${MIN_PASSWORD_LENGTH} characters`}
              autoComplete="new-password"
              autoFocus
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start"><Lock sx={{ color: 'primary.main' }} /></InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            {password && (
              <Box sx={{ mt: 1.25 }}>
                <Box sx={{ display: 'flex', gap: 0.6, mb: 0.5 }}>
                  {[1, 2, 3, 4].map((segment) => (
                    <Box
                      key={segment}
                      sx={{
                        flex: 1, height: 4, borderRadius: 2,
                        bgcolor: strength.score >= segment ? strength.color : 'rgba(0,0,0,0.09)',
                        transition: 'background-color .25s ease',
                      }}
                    />
                  ))}
                </Box>
                <Typography aria-live="polite" sx={{ fontSize: '11.5px', fontWeight: 800, color: strength.color }}>
                  {strength.label}
                  {strength.hint && (
                    <Box component="span" sx={{ fontWeight: 500, color: 'text.secondary', ml: 0.75 }}>
                      · {strength.hint}
                    </Box>
                  )}
                </Typography>
              </Box>
            )}
          </Box>

          <TextField
            fullWidth
            label="Confirm new password"
            name="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setConfirmError(null); }}
            error={Boolean(confirmError)}
            helperText={confirmError}
            autoComplete="new-password"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start"><Lock sx={{ color: 'primary.main' }} /></InputAdornment>
                ),
              },
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={saving}
            sx={{ py: 1.5, borderRadius: '14px', fontWeight: 800, fontSize: '15px' }}
          >
            {saving ? <CircularProgress size={23} color="inherit" /> : 'Update password'}
          </Button>
        </Box>
      </Box>
    </AuthShell>
  );
}
