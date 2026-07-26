import React from 'react';
import { Box } from '@mui/material';

interface LogoProps {
  variant?: 'light' | 'dark';
  size?: 'small' | 'medium' | 'large';
}

export default function PalaPittaLogo({ variant = 'dark', size = 'medium' }: LogoProps) {
  const isLight = variant === 'light'; // Light background (Navbar)
  
  // Height options
  const logoHeight = size === 'small' ? 42 : size === 'large' ? 80 : 58;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        bgcolor: isLight ? '#0B0404' : 'transparent',
        p: isLight ? '4px 12px' : 0,
        borderRadius: isLight ? '12px' : '0px',
        boxShadow: isLight ? '0 4px 16px rgba(0,0,0,0.25)' : 'none',
        transition: 'all 0.2s ease',
        border: isLight ? '1px solid rgba(255,152,0,0.2)' : 'none',
        '&:hover': {
          transform: 'scale(1.03)',
        },
      }}
    >
      <Box
        component="img"
        src="/logo.png"
        alt="Pala Pitta Ruchulu Logo"
        sx={{
          height: logoHeight,
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </Box>
  );
}
