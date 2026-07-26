'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';

export default function RedirectBillsToPOS() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/pos');
  }, [router]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#FFF8F2', color: '#212121', gap: 2 }}>
      <CircularProgress sx={{ color: '#FF9800' }} />
      <Typography variant="h6" sx={{ fontWeight: 700 }}>Redirecting to Cashier POS...</Typography>
    </Box>
  );
}
