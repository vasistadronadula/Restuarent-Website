'use client';

import React, { useState } from 'react';
import {
  Container, Box, Paper, Typography, TextField, Button,
  InputAdornment, IconButton, CircularProgress, Divider,
} from '@mui/material';
import { Email, Lock, Visibility, VisibilityOff, ArrowBack, Person, Phone } from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import PalaPittaLogo from '@/components/customer/PalaPittaLogo';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export default function SignupPage() {
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    const res = await signUpWithEmail(email, password, name, phone);
    setLoading(false);

    if (res.success) {
      router.push('/menu');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FFF8F2', py: 6, display: 'flex', alignItems: 'center' }}>
      <Container maxWidth="xs">
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Button startIcon={<ArrowBack />} sx={{ color: '#616161', fontWeight: 600 }}>
              Home
            </Button>
          </Link>
          <PalaPittaLogo size="medium" />
        </Box>

        <Paper sx={{ p: 4, borderRadius: '24px', boxShadow: '0 12px 40px rgba(0,0,0,0.08)' }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#C62828', mb: 0.5, textAlign: 'center' }}>
            Create an Account 🎉
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, textAlign: 'center' }}>
            Sign up to start adding delicious dishes to your cart
          </Typography>

          <Button
            fullWidth
            variant="outlined"
            onClick={signInWithGoogle}
            startIcon={<GoogleIcon />}
            sx={{
              py: 1.2,
              mb: 2.5,
              borderRadius: '12px',
              borderColor: '#E0E0E0',
              color: '#333333',
              fontWeight: 600,
              fontSize: '14px',
              textTransform: 'none',
              '&:hover': {
                borderColor: '#BDBDBD',
                bgcolor: '#F5F5F5',
              },
            }}
          >
            Continue with Google
          </Button>

          <Divider sx={{ mb: 2.5, fontSize: '12px', color: 'text.secondary' }}>OR EMAIL</Divider>

          <form onSubmit={handleSignup}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person sx={{ color: '#C62828' }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                fullWidth
                label="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone sx={{ color: '#C62828' }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                fullWidth
                label="Email Address *"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email sx={{ color: '#C62828' }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                fullWidth
                label="Password *"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock sx={{ color: '#C62828' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{
                  mt: 1,
                  py: 1.5,
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '16px',
                  background: 'linear-gradient(135deg, #C62828, #FF9800)',
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
              </Button>
            </Box>
          </form>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link href="/login" style={{ color: '#C62828', fontWeight: 700, textDecoration: 'none' }}>
                Log In
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
