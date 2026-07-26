'use client';

import React, { useState } from 'react';
import {
  Dialog, DialogContent, Box, Typography, TextField, Button,
  IconButton, Tabs, Tab, CircularProgress, InputAdornment, Alert, Divider,
} from '@mui/material';
import { Close, Visibility, VisibilityOff, Lock, Email, Person, Phone } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectIsAuthModalOpen, selectAuthModalTab, openAuthModal, closeAuthModal } from '@/store/authSlice';
import { useAuth } from '@/context/AuthContext';
import PalaPittaLogo from './PalaPittaLogo';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

export default function AuthModal() {
  const dispatch = useAppDispatch();
  const isAuthModalOpen = useAppSelector(selectIsAuthModalOpen);
  const authModalTab = useAppSelector(selectAuthModalTab);
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isLogin = authModalTab === 'login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    const res = isLogin
      ? await signInWithEmail(email, password)
      : await signUpWithEmail(email, password, name, phone);
    setLoading(false);
    if (res?.success) {
      dispatch(closeAuthModal());
    }
  };

  return (
    <Dialog
      open={isAuthModalOpen}
      onClose={() => dispatch(closeAuthModal())}
      maxWidth="xs" fullWidth
      slotProps={{ paper: { sx: { borderRadius: '24px', overflow: 'hidden', p: 1, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' } } }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, pt: 1.5 }}>
        <PalaPittaLogo size="small" />
        <IconButton onClick={() => dispatch(closeAuthModal())} size="small"><Close /></IconButton>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 1 }}>
        <Tabs
          value={authModalTab}
          onChange={(_, val) => dispatch(openAuthModal(val))}
          variant="fullWidth" textColor="primary" indicatorColor="primary"
        >
          <Tab label="🔑 Login" value="login" sx={{ fontWeight: 700 }} />
          <Tab label="📝 Sign Up" value="signup" sx={{ fontWeight: 700 }} />
        </Tabs>
      </Box>

      <DialogContent sx={{ pt: 3 }}>
        <Alert severity="info" sx={{ mb: 2.5, borderRadius: '12px', fontSize: '12px' }}>
          💡 Log in to save your order history & preferences, or <strong>continue as guest</strong> to order right away!
        </Alert>

        <Button
          fullWidth variant="outlined"
          onClick={signInWithGoogle}
          startIcon={<GoogleIcon />}
          sx={{
            py: 1.2, mb: 2.5, borderRadius: '12px', borderColor: '#E0E0E0',
            color: '#333333', fontWeight: 600, fontSize: '14px', textTransform: 'none',
            '&:hover': { borderColor: '#BDBDBD', bgcolor: '#F5F5F5' },
          }}
        >
          Continue with Google
        </Button>

        <Divider sx={{ mb: 2.5, fontSize: '12px', color: 'text.secondary' }}>OR EMAIL</Divider>

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {!isLogin && (
              <>
                <TextField fullWidth size="small" label="Full Name" value={name}
                  onChange={(e) => setName(e.target.value)}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start"><Person fontSize="small" sx={{ color: '#C62828' }} /></InputAdornment> } }}
                />
                <TextField fullWidth size="small" label="Phone Number" value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start"><Phone fontSize="small" sx={{ color: '#C62828' }} /></InputAdornment> } }}
                />
              </>
            )}
            <TextField fullWidth size="small" type="email" label="Email Address *" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><Email fontSize="small" sx={{ color: '#C62828' }} /></InputAdornment> } }}
            />
            <TextField fullWidth size="small" type={showPassword ? 'text' : 'password'}
              label="Password *" required value={password} onChange={(e) => setPassword(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start"><Lock fontSize="small" sx={{ color: '#C62828' }} /></InputAdornment>,
                  endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment>,
                },
              }}
            />
            <Button type="submit" fullWidth variant="contained" disabled={loading}
              sx={{ mt: 1, py: 1.5, borderRadius: '12px', fontWeight: 700, fontSize: '15px', background: 'linear-gradient(135deg, #C62828, #FF9800)' }}>
              {loading ? <CircularProgress size={22} color="inherit" /> : isLogin ? 'Log In & Continue' : 'Create Account'}
            </Button>
          </Box>
        </form>

        <Button fullWidth variant="outlined" color="secondary"
          onClick={() => dispatch(closeAuthModal())}
          sx={{ mt: 2, py: 1.2, borderRadius: '12px', fontWeight: 700, fontSize: '14px', borderColor: '#FF9800', color: '#D84315', '&:hover': { borderColor: '#E65100', bgcolor: 'rgba(255,152,0,0.08)' } }}>
          👤 Continue as Guest
        </Button>

        <Divider sx={{ my: 2.5 }} />
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
          </Typography>
          <Button variant="text" color="primary"
            onClick={() => dispatch(openAuthModal(isLogin ? 'signup' : 'login'))}
            sx={{ fontWeight: 700 }}>
            {isLogin ? 'Sign Up Now' : 'Log In Here'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
