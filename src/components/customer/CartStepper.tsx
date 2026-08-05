'use client';

import React from 'react';
import { Box, IconButton } from '@mui/material';
import { Add, Remove } from '@mui/icons-material';

interface Props {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  /** Matches the ADD button it replaces, so the row doesn't resize on the first tap. */
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  label: string;
}

/**
 * The −/qty/+ control that replaces ADD once a dish is in the cart.
 *
 * It is a component rather than three copies of the same JSX because the swap
 * from ADD to stepper has to be dimensionally identical on every surface — a
 * stepper even a few pixels wider than the button it replaces makes the whole
 * dish list twitch sideways on the first tap.
 */
export default function CartStepper({
  quantity, onIncrease, onDecrease, size = 'medium', fullWidth = false, label,
}: Props) {
  const compact = size === 'small';

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: fullWidth ? '100%' : 'auto',
        minWidth: compact ? 92 : 104,
        height: compact ? 32 : 38,
        bgcolor: 'white',
        border: '1.5px solid',
        borderColor: 'success.main',
        borderRadius: '12px',
        boxShadow: '0 4px 14px rgba(46,125,50,0.18)',
        overflow: 'hidden',
      }}
    >
      <IconButton
        onClick={onDecrease}
        aria-label={`Remove one ${label}`}
        sx={{ borderRadius: 0, color: 'success.main', width: compact ? 28 : 34, height: '100%' }}
      >
        <Remove sx={{ fontSize: compact ? 15 : 17 }} />
      </IconButton>

      <Box
        aria-live="polite"
        sx={{
          fontWeight: 900,
          color: 'success.main',
          fontSize: compact ? '13px' : '15px',
          minWidth: 22,
          textAlign: 'center',
        }}
      >
        {quantity}
      </Box>

      <IconButton
        onClick={onIncrease}
        aria-label={`Add one more ${label}`}
        sx={{ borderRadius: 0, color: 'success.main', width: compact ? 28 : 34, height: '100%' }}
      >
        <Add sx={{ fontSize: compact ? 15 : 17 }} />
      </IconButton>
    </Box>
  );
}
