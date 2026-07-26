'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Box, CircularProgress, Typography, Paper, Button } from '@mui/material';
import { Lock, Home } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { adminColors } from '@/theme/adminColors';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        toast.error('Please log in with your Admin account to access the Admin Panel.', { id: 'admin-denied' });
        router.replace('/');
      } else if (userRole !== 'admin') {
        toast.error('403 Access Denied: You do not have administrator permissions.', { id: 'admin-denied' });
        router.replace('/');
      }
    }
  }, [user, userRole, loading, router]);

  // Loading state
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: adminColors.bgPanel,
          color: adminColors.textPrimary,
          gap: 2,
        }}
      >
        <CircularProgress size={48} sx={{ color: adminColors.accentOrange }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Verifying Admin Authorization...
        </Typography>
      </Box>
    );
  }

  // Access Denied state (while redirecting)
  if (!user || userRole !== 'admin') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: adminColors.bgDanger,
          p: 3,
        }}
      >
        <Paper
          sx={{
            p: 5,
            maxWidth: 460,
            textAlign: 'center',
            borderRadius: '24px',
            bgcolor: adminColors.bgDangerPanel,
            color: adminColors.textPrimary,
            border: `1px solid ${adminColors.dangerBorder}`,
            boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              bgcolor: 'rgba(198,40,40,0.15)',
              color: adminColors.danger,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2.5,
            }}
          >
            <Lock sx={{ fontSize: 36 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: adminColors.dangerStrong, mb: 1 }}>
            403 - Access Denied
          </Typography>
          <Typography variant="body2" sx={{ color: adminColors.textMuted, mb: 3.5, lineHeight: 1.6 }}>
            This section is restricted strictly to authorized website administrators.
            Your account role is <strong>{userRole || 'Guest'}</strong>.
          </Typography>
          <Button
            variant="contained"
            onClick={() => router.push('/')}
            startIcon={<Home />}
            sx={{
              py: 1.2,
              px: 4,
              borderRadius: '12px',
              fontWeight: 700,
              background: adminColors.gradientDanger,
            }}
          >
            Return to Home
          </Button>
        </Paper>
      </Box>
    );
  }

  // Access Granted for Admin
  return <>{children}</>;
}
