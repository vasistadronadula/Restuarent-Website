'use client';

import React, { useState } from 'react';
import {
  Dialog, DialogContent, Box, Typography, TextField, Button,
  IconButton, Tabs, Tab, CircularProgress, InputAdornment, Divider,
  Link as MuiLink, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import { Close, Visibility, VisibilityOff, Lock, Email, Person, Phone, Sms } from '@mui/icons-material';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectIsAuthModalOpen, selectAuthModalTab, openAuthModal, closeAuthModal } from '@/store/authSlice';
import { useAuth, landAfterLogin } from '@/context/AuthContext';
import { isStaffRole } from '@/lib/roleAccess';
import GoogleIcon from './GoogleIcon';
import PhoneOtpAuth from './PhoneOtpAuth';

export default function AuthModal() {
  const dispatch = useAppDispatch();
  const isAuthModalOpen = useAppSelector(selectIsAuthModalOpen);
  const authModalTab = useAppSelector(selectAuthModalTab);
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();

  const [authMethod, setAuthMethod] = useState<'otp' | 'email'>('otp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isLogin = authModalTab === 'login';

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    const res = isLogin
      ? await signInWithEmail(email, password)
      : await signUpWithEmail(email, password, name, phone);

    if (!res?.success) {
      setLoading(false);
      return;
    }

    if (res.role && isStaffRole(res.role)) {
      landAfterLogin(res.role);
      return;
    }

    setLoading(false);
    dispatch(closeAuthModal());
  };

  return (
    <Dialog
      open={isAuthModalOpen}
      onClose={() => dispatch(closeAuthModal())}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '24px',
            overflow: 'hidden',
            p: 0,
            boxShadow: '0 24px 64px rgba(28, 8, 8, 0.28)',
            border: '1px solid rgba(255, 204, 188, 0.4)',
          },
        },
      }}
    >
      {/* Top Branded Header Strip */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1C0808 0%, #2E0F0F 60%, #1A0404 100%)',
          color: '#FFFFFF',
          px: 2.5,
          py: 2,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: '-50%',
            right: '-20%',
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,152,0,0.22) 0%, transparent 70%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1, pr: 5 }}>
          <Box
            component="img"
            src="/logo.png"
            alt="Pala Pitta Ruchulu Logo"
            sx={{ height: 36, width: 'auto', display: 'block' }}
          />
          <Typography sx={{ fontSize: '10.5px', fontWeight: 800, color: '#FFB74D', letterSpacing: 0.8, mt: 0.5 }}>
            A FEAST WORTH CRAVING
          </Typography>
        </Box>

        <IconButton
          onClick={() => dispatch(closeAuthModal())}
          size="small"
          aria-label="Close authentication modal"
          sx={{
            position: 'absolute',
            top: 14,
            right: 14,
            zIndex: 10,
            color: 'rgba(255,255,255,0.85)',
            bgcolor: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(4px)',
            '&:hover': { color: '#FFFFFF', bgcolor: 'rgba(255,255,255,0.25)' },
          }}
        >
          <Close fontSize="small" />
        </IconButton>
      </Box>

      {/* Styled Tab Switcher */}
      <Box sx={{ bgcolor: '#FFFDF9', px: 2, borderBottom: '1px solid #F0E4D8' }}>
        <Tabs
          value={authModalTab}
          onChange={(_, val) => dispatch(openAuthModal(val))}
          variant="fullWidth"
          textColor="primary"
          indicatorColor="primary"
          sx={{
            minHeight: 44,
            '& .MuiTab-root': {
              fontWeight: 800,
              fontSize: '14px',
              textTransform: 'none',
              minHeight: 44,
              py: 0.5,
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
              bgcolor: 'primary.main',
            },
          }}
        >
          <Tab label="Log In" value="login" />
          <Tab label="Sign Up" value="signup" />
        </Tabs>
      </Box>

      <DialogContent sx={{ px: 2.5, py: 2.5, bgcolor: '#FFFFFF', overflowX: 'hidden' }}>
        {/* Method Picker (Mobile OTP vs Email & Password) */}
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
          <ToggleButtonGroup
            value={authMethod}
            exclusive
            onChange={(_, next) => next && setAuthMethod(next)}
            size="small"
            sx={{
              bgcolor: '#F5EBE6',
              p: 0.4,
              borderRadius: '12px',
              '& .MuiToggleButton-root': {
                border: 'none',
                borderRadius: '9px !important',
                px: 2,
                py: 0.6,
                fontWeight: 800,
                fontSize: '12.5px',
                textTransform: 'none',
                color: 'text.secondary',
                '&.Mui-selected': {
                  bgcolor: '#FFFFFF',
                  color: 'primary.main',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                },
              },
            }}
          >
            <ToggleButton value="otp">
              <Sms sx={{ fontSize: 16, mr: 0.8 }} /> Phone OTP
            </ToggleButton>
            <ToggleButton value="email">
              <Email sx={{ fontSize: 16, mr: 0.8 }} /> Email & Password
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {authMethod === 'otp' ? (
          <PhoneOtpAuth
            // Remounted per tab so switching between Log In and Sign Up starts a
            // clean flow rather than carrying a half-entered code across.
            key={isLogin ? 'login' : 'signup'}
            isSignUpMode={!isLogin}
            onSuccess={() => dispatch(closeAuthModal())}
          />
        ) : (
          <form onSubmit={handleEmailSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {!isLogin && (
                <>
                  <TextField
                    fullWidth
                    size="small"
                    label="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                  <TextField
                    fullWidth
                    size="small"
                    label="Mobile Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Phone fontSize="small" sx={{ color: 'primary.main' }} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </>
              )}

              <TextField
                fullWidth
                size="small"
                type="email"
                label="Email Address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email fontSize="small" sx={{ color: 'primary.main' }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                fullWidth
                size="small"
                type={showPassword ? 'text' : 'password'}
                label="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock fontSize="small" sx={{ color: 'primary.main' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              {isLogin && (
                <Box sx={{ textAlign: 'right', mt: -0.25 }}>
                  <MuiLink
                    component={Link}
                    href="/login?mode=forgot"
                    onClick={() => dispatch(closeAuthModal())}
                    sx={{ fontSize: '12px', fontWeight: 700, color: 'primary.main', textDecoration: 'none' }}
                  >
                    Forgot password?
                  </MuiLink>
                </Box>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  mt: 0.5,
                  py: 1.3,
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '14.5px',
                  background: 'linear-gradient(135deg, #C62828 0%, #E53935 100%)',
                  boxShadow: '0 4px 16px rgba(198, 40, 40, 0.25)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #B71C1C 0%, #C62828 100%)',
                  },
                }}
              >
                {loading ? (
                  <CircularProgress size={22} color="inherit" />
                ) : isLogin ? (
                  'Log In & Continue'
                ) : (
                  'Create Account'
                )}
              </Button>
            </Box>
          </form>
        )}

        {/* Google is offered alongside email only. During an OTP flow the
            customer is mid-way through one verification, and a second sign-in
            button under the code field is an invitation to abandon it. */}
        {authMethod === 'email' && (
          <>
            <Divider
              sx={{
                my: 2,
                fontSize: '10.5px',
                fontWeight: 800,
                color: 'text.secondary',
                letterSpacing: 0.8,
                '&::before, &::after': { borderColor: '#F0E4D8' },
              }}
            >
              OR CONTINUE WITH
            </Divider>

            <Button
              fullWidth
              variant="outlined"
              onClick={signInWithGoogle}
              startIcon={<GoogleIcon />}
              sx={{
                py: 1.2,
                borderRadius: '12px',
                borderColor: '#E2E8F0',
                bgcolor: '#FFFFFF',
                color: '#2D3748',
                fontWeight: 700,
                fontSize: '13.5px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                '&:hover': { borderColor: '#CBD5E0', bgcolor: '#F7FAFC' },
              }}
            >
              Continue with Google
            </Button>
          </>
        )}

        <Box sx={{ textAlign: 'center', mt: 2, pt: 1.5, borderTop: '1px solid #F0E4D8' }}>
          <Typography variant="body2" sx={{ fontSize: '12.5px', color: 'text.secondary', display: 'block', mb: 0.25 }}>
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
          </Typography>
          <Button
            variant="text"
            color="primary"
            onClick={() => dispatch(openAuthModal(isLogin ? 'signup' : 'login'))}
            sx={{ fontWeight: 800, fontSize: '13px', p: 0.25, minWidth: 0 }}
          >
            {isLogin ? 'Create Account' : 'Log In'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
