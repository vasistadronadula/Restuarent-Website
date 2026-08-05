'use client';

import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import Link from 'next/link';
import PalaPittaLogo from './PalaPittaLogo';

/**
 * The frame around every account screen — log in, sign up, reset password.
 *
 * Deliberately not a card on a picture. This is the layout the ordering apps
 * themselves use: one centred column on a plain surface, the form sitting
 * directly on the page with nothing boxed around it. The gain is width — with
 * no card padding and no photo to stay clear of, the fields run the full
 * measure of the column on a phone, which is where nearly every signup on a
 * restaurant site actually happens.
 *
 * The only ornament is a brand strip along the top edge. It is 4px of
 * gradient, it costs no layout, and it keeps the screen from reading as an
 * unstyled form on white.
 */

interface Props {
  /** Card heading, e.g. "Welcome back". */
  title: string;
  subtitle: string;
  children: React.ReactNode;
  /** Sits under the form — the "no account yet?" line. */
  footer?: React.ReactNode;
}

export default function AuthShell({ title, subtitle, children, footer }: Props) {
  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100dvh',
        bgcolor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        // A wide desktop window would otherwise be a 420px column stranded in
        // white. Two very faint warm pools give the empty space a temperature
        // without putting anything in it to read.
        backgroundImage:
          'radial-gradient(circle at 12% 8%, rgba(255,152,0,0.07) 0%, transparent 42%), ' +
          'radial-gradient(circle at 88% 92%, rgba(198,40,40,0.06) 0%, transparent 45%)',
      }}
    >
      <Box
        aria-hidden
        sx={{
          height: 4,
          flexShrink: 0,
          background: 'linear-gradient(90deg, #C62828 0%, #FF9800 55%, #FFD54F 100%)',
        }}
      />

      {/* Top bar: the way out, and the brand. */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: 1160,
          mx: 'auto',
          px: { xs: 2, sm: 3 },
          py: 2,
        }}
      >
        <Button
          component={Link}
          href="/"
          startIcon={<ArrowBack />}
          sx={{
            color: 'text.secondary',
            fontWeight: 700,
            fontSize: '13px',
            px: 1,
            ml: -1,
            '&:hover': { color: 'primary.main', bgcolor: 'transparent' },
          }}
        >
          Back to site
        </Button>

        <Link href="/" aria-label="Pala Pitta Ruchulu — Home" style={{ display: 'inline-flex' }}>
          <PalaPittaLogo size="small" />
        </Link>
      </Box>

      {/* The column. `justifyContent: center` only once there is room to spare,
          so the tall signup form starts at the top and scrolls normally
          instead of being centred into a clipped middle. */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          px: { xs: 2.5, sm: 3 },
          py: { xs: 2, sm: 5 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <Typography
            component="h1"
            sx={{
              fontWeight: 900,
              fontSize: { xs: '1.75rem', sm: '2rem' },
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              color: '#1A0C0C',
              mb: 1,
            }}
          >
            {title}
          </Typography>
          <Typography
            sx={{
              color: 'text.secondary',
              fontSize: '14px',
              lineHeight: 1.6,
              mb: { xs: 3, sm: 3.5 },
            }}
          >
            {subtitle}
          </Typography>

          {children}

          {footer && (
            <Box
              sx={{
                mt: 3.5,
                pt: 2.5,
                borderTop: '1px solid rgba(0,0,0,0.07)',
                textAlign: 'center',
              }}
            >
              {footer}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
