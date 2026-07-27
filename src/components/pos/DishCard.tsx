'use client';

import React from 'react';
import Image from 'next/image';
import { Box, Button, Paper, Typography } from '@mui/material';
import { Add, Remove } from '@mui/icons-material';
import type { MenuItem } from '@/types';
import { PORTION_LABEL, sellablePortions, type Portion } from '@/hooks/usePosCart';
import { adminColors } from '@/theme/adminColors';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80';

interface Props {
  item: MenuItem;
  /** How many of this dish are already on the bill. */
  inBill: number;
  dense: boolean;
  onAdd: (item: MenuItem, portion?: Portion) => void;
  onDecrement?: (item: MenuItem) => void;
}

function DishCard({ item, inBill, dense, onAdd, onDecrement }: Props) {
  const isVeg = item.vegStatus === 'veg';
  const isEgg = item.vegStatus === 'egg';
  const portions = sellablePortions(item);
  const single = portions.length === 0;

  const spiceText = item.spiceLevel ? '🌶️'.repeat(item.spiceLevel) : '';

  const body = (
    <>
      <Box sx={{ position: 'relative', width: '100%', height: dense ? 82 : 108, bgcolor: '#1E293B', overflow: 'hidden' }}>
        <Image
          src={item.image || FALLBACK_IMAGE}
          alt={item.name}
          fill
          sizes="(max-width: 600px) 45vw, (max-width: 1200px) 30vw, 200px"
          style={{ objectFit: 'cover' }}
        />
        {/* Veg/non-veg/egg indicator badge */}
        <Box
          sx={{
            position: 'absolute', top: 6, left: 6,
            width: 16, height: 16, borderRadius: '4px', bgcolor: '#FFFFFF',
            border: `2px solid ${isVeg ? '#10B981' : isEgg ? '#F59E0B' : '#EF4444'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }}
        >
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: isVeg ? '#10B981' : isEgg ? '#F59E0B' : '#EF4444' }} />
        </Box>

        {spiceText && (
          <Box
            sx={{
              position: 'absolute', bottom: 6, left: 6,
              px: 0.6, py: 0.1, borderRadius: '6px',
              bgcolor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
              fontSize: 10, lineHeight: 1,
            }}
          >
            {spiceText}
          </Box>
        )}

        {inBill > 0 && (
          <Box
            sx={{
              position: 'absolute', top: 6, right: 6, minWidth: 24, height: 24, px: 0.6,
              borderRadius: '12px', bgcolor: adminColors.brand, color: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 900, boxShadow: '0 4px 10px rgba(198,40,40,0.4)',
            }}
          >
            {inBill}
          </Box>
        )}
      </Box>

      <Box sx={{ p: 1.1, display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: dense ? 12.5 : 13.5, fontWeight: 700, color: adminColors.textPrimary,
            lineHeight: 1.25, textAlign: 'left',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}
        >
          {item.name}
        </Typography>

        {single ? (
          <Typography sx={{ mt: 'auto', fontSize: dense ? 14 : 15, fontWeight: 900, color: adminColors.brand, textAlign: 'left' }}>
            ₹{item.price}
          </Typography>
        ) : (
          <Box sx={{ mt: 'auto', display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {portions.map(({ portion, price }) => (
              <Button
                key={portion}
                size="small"
                onClick={(e) => { e.stopPropagation(); onAdd(item, portion); }}
                sx={{
                  flex: '1 1 auto', minWidth: 0, px: 0.7, py: 0.5, minHeight: 38,
                  borderRadius: '10px', textTransform: 'none', fontWeight: 800, fontSize: 11.5,
                  bgcolor: portion === 'full' ? adminColors.brand : adminColors.brandSoft,
                  color: portion === 'full' ? '#FFFFFF' : adminColors.brand,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  '&:hover': { bgcolor: portion === 'full' ? adminColors.brandDark : '#FBE4E4' },
                }}
              >
                {PORTION_LABEL[portion]} ₹{price}
              </Button>
            ))}
          </Box>
        )}
      </Box>
    </>
  );

  const surface = {
    borderRadius: '16px',
    border: `1.5px solid ${inBill > 0 ? adminColors.brand : adminColors.border}`,
    boxShadow: inBill > 0 ? `0 4px 16px rgba(198,40,40,0.18)` : '0 2px 8px rgba(0,0,0,0.04)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    bgcolor: '#FFFFFF',
    textAlign: 'left' as const,
    transition: 'transform 0.15s ease, boxShadow 0.15s ease, borderColor 0.15s ease',
  };

  if (single) {
    if (inBill > 0) {
      return (
        <Paper elevation={0} sx={surface}>
          {body}
          <Box
            sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              py: 0.6, px: 0.85, bgcolor: adminColors.brandSoft, color: adminColors.brand,
            }}
          >
            <Button
              size="small"
              onClick={(e) => { e.stopPropagation(); onDecrement?.(item); }}
              sx={{
                minWidth: 32, height: 32, borderRadius: '9px', p: 0,
                color: adminColors.brand, bgcolor: '#FFFFFF',
                boxShadow: '0 2px 5px rgba(0,0,0,0.08)',
                '&:hover': { bgcolor: '#FEE2E2' },
              }}
            >
              <Remove sx={{ fontSize: 17 }} />
            </Button>

            <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: adminColors.brand }}>
              {inBill} in bill
            </Typography>

            <Button
              size="small"
              onClick={(e) => { e.stopPropagation(); onAdd(item); }}
              sx={{
                minWidth: 32, height: 32, borderRadius: '9px', p: 0,
                color: '#FFFFFF', bgcolor: adminColors.brand,
                boxShadow: '0 2px 6px rgba(198,40,40,0.3)',
                '&:hover': { bgcolor: adminColors.brandDark },
              }}
            >
              <Add sx={{ fontSize: 17 }} />
            </Button>
          </Box>
        </Paper>
      );
    }

    return (
      <Paper
        elevation={0}
        component="button"
        type="button"
        onClick={() => onAdd(item)}
        aria-label={`Add ${item.name}, ₹${item.price}`}
        sx={{
          ...surface,
          p: 0, cursor: 'pointer', font: 'inherit', width: '100%',
          '&:hover': { boxShadow: '0 8px 20px rgba(28,25,23,0.12)', transform: 'translateY(-2px)' },
          '&:active': { transform: 'scale(0.97)' },
        }}
      >
        {body}
        <Box
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.4,
            py: 0.9, bgcolor: adminColors.brandSoft, color: adminColors.brand,
            fontSize: 12.5, fontWeight: 800,
          }}
        >
          <Add sx={{ fontSize: 16 }} /> Add
        </Box>
      </Paper>
    );
  }

  return <Paper elevation={0} sx={surface}>{body}</Paper>;
}

export default React.memo(DishCard);
