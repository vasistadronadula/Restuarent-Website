'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, TextField, Button, CircularProgress,
  InputAdornment, Alert, Stack,
} from '@mui/material';
import { Phone, Lock, Person, Sms, ArrowBack, Refresh } from '@mui/icons-material';
import toast from 'react-hot-toast';
import {
  createRecaptchaVerifier, sendFirebaseOtp, verifyFirebaseOtp, type ConfirmationResult,
} from '@/lib/firebase';
import { useAuth, landAfterLogin } from '@/context/AuthContext';
import { isStaffRole } from '@/lib/roleAccess';
import type { UserRole } from '@/types';
import type { RecaptchaVerifier } from 'firebase/auth';

interface Props {
  onSuccess?: (role?: UserRole) => void;
  isSignUpMode?: boolean;
  containerIdPrefix?: string;
}

export default function PhoneOtpAuth({
  onSuccess,
  isSignUpMode = false,
  containerIdPrefix = 'auth-modal',
}: Props) {
  const { signInWithOtpPhoneUser } = useAuth();

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [provider, setProvider] = useState<'msg91' | 'firebase'>('msg91');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const containerId = `${containerIdPrefix}-recaptcha-container`;

  // Countdown timer for Resend OTP button
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const cleanedPhone = phone.replace(/\D/g, '');
    if (cleanedPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);

    // 1. First attempt: Direct MSG91 SMS API Route (No Firebase Billing required)
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanedPhone }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setProvider('msg91');
        setOtpSent(true);
        setCountdown(30);
        toast.success(`OTP sent to +91 ${cleanedPhone} 📲`);
        setLoading(false);
        return;
      }
    } catch (msg91Err) {
      console.warn('[MSG91 Send Failed, falling back to Firebase]:', msg91Err);
    }

    // 2. Fallback attempt: Firebase Phone Auth
    try {
      const verifier = createRecaptchaVerifier(containerId);
      recaptchaVerifierRef.current = verifier;

      const result = await sendFirebaseOtp(cleanedPhone, verifier);
      setConfirmationResult(result);
      setProvider('firebase');
      setOtpSent(true);
      setCountdown(30);
      toast.success(`OTP sent to +91 ${cleanedPhone} 📲`);
    } catch (err: any) {
      console.error('[Firebase OTP Error]:', err);
      let msg = 'Failed to send OTP. Please try again.';
      if (err.code === 'auth/billing-not-enabled' || err.message?.includes('billing-not-enabled')) {
        msg = 'Firebase billing is disabled. Please upgrade Firebase project to Blaze plan or use Phone Testing numbers in Firebase Console.';
      } else if (err.code === 'auth/operation-not-allowed' || err.message?.includes('auth/operation-not-allowed')) {
        msg = 'Phone authentication or SMS region (India +91) is not enabled in Firebase Console. Please enable Phone Sign-in & India region in Firebase Console > Authentication > Sign-in method.';
      } else if (err.code === 'auth/invalid-phone-number') {
        msg = 'Invalid phone number format.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many OTP requests. Please wait a few minutes.';
      } else if (err.message) {
        msg = err.message;
      }
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanedOtp = otp.trim();
    if (!cleanedOtp || cleanedOtp.length < 4) {
      setErrorMsg('Please enter the OTP code sent to your phone');
      return;
    }

    setLoading(true);
    const cleanedPhone = phone.replace(/\D/g, '');
    const fullPhone = `+91${cleanedPhone}`;

    try {
      // 1. Verify OTP based on provider
      if (provider === 'msg91') {
        const res = await fetch('/api/otp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: cleanedPhone, otp: cleanedOtp }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Incorrect OTP code');
        }
      } else if (provider === 'firebase' && confirmationResult) {
        await verifyFirebaseOtp(confirmationResult, cleanedOtp);
      }

      // 2. Initialize customer session
      const authRes = await signInWithOtpPhoneUser(fullPhone, name.trim());

      if (!authRes.success) {
        setLoading(false);
        return;
      }

      if (authRes.role && isStaffRole(authRes.role)) {
        landAfterLogin(authRes.role);
        return;
      }

      if (onSuccess) {
        onSuccess(authRes.role);
      }
    } catch (err: any) {
      console.error('[OTP Verify Error]:', err);
      let msg = err.message || 'Invalid OTP code. Please check and try again.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Invisible Recaptcha container target */}
      <div id={containerId} style={{ display: 'none' }} />

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '12px', fontSize: '13px' }}>
          {errorMsg}
        </Alert>
      )}

      {!otpSent ? (
        /* STEP 1: Phone Number Entry */
        <form onSubmit={handleSendOtp}>
          <Stack spacing={2}>
            {isSignUpMode && (
              <TextField
                fullWidth
                size="small"
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                slotProps={{
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
              label="Mobile Number"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit mobile number"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography sx={{ fontWeight: 800, fontSize: '14px', color: 'primary.main', mr: 0.5 }}>
                        +91
                      </Typography>
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Phone fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || phone.replace(/\D/g, '').length !== 10}
              sx={{
                py: 1.3,
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '14px',
                background: 'linear-gradient(135deg, #C62828 0%, #E53935 100%)',
                boxShadow: '0 4px 16px rgba(198, 40, 40, 0.25)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #B71C1C 0%, #C62828 100%)',
                },
              }}
            >
              {loading ? (
                <CircularProgress size={22} color="inherit" />
              ) : (
                'Get OTP via SMS'
              )}
            </Button>
          </Stack>
        </form>
      ) : (
        /* STEP 2: OTP Verification */
        <form onSubmit={handleVerifyOtp}>
          <Stack spacing={2}>
            <Box sx={{ bgcolor: '#FFF8F2', p: 1.8, borderRadius: '12px', border: '1px solid #FFE0B2' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.25 }}>
                SMS OTP sent to:
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#C62828' }}>
                +91 {phone.replace(/\D/g, '')}
              </Typography>
            </Box>

            <TextField
              fullWidth
              size="small"
              type="number"
              label="Enter OTP Code"
              required
              autoFocus
              value={otp}
              onChange={(e) => setOtp(e.target.value.slice(0, 6))}
              placeholder="e.g. 123456"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Sms fontSize="small" sx={{ color: 'primary.main' }} />
                    </InputAdornment>
                  ),
                },
                htmlInput: { maxLength: 6 },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || otp.trim().length < 4}
              sx={{
                py: 1.3,
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '14px',
                background: 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)',
                boxShadow: '0 4px 16px rgba(46, 125, 50, 0.25)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)',
                },
              }}
            >
              {loading ? (
                <CircularProgress size={22} color="inherit" />
              ) : (
                'Verify & Continue'
              )}
            </Button>

            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                size="small"
                onClick={() => setOtpSent(false)}
                startIcon={<ArrowBack sx={{ fontSize: 16 }} />}
                sx={{ fontSize: '12px', color: 'text.secondary', textTransform: 'none' }}
              >
                Change Phone
              </Button>

              <Button
                size="small"
                disabled={countdown > 0 || loading}
                onClick={() => handleSendOtp()}
                startIcon={<Refresh sx={{ fontSize: 16 }} />}
                sx={{ fontSize: '12px', fontWeight: 700, color: 'primary.main', textTransform: 'none' }}
              >
                {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
              </Button>
            </Stack>
          </Stack>
        </form>
      )}
    </Box>
  );
}
