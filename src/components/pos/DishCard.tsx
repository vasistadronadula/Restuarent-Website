'use client';

import React from 'react';
import Image from 'next/image';
import { Box, Button, Paper, Typography } from '@mui/material';
import { Add } from '@mui/icons-material';
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
}

/**
 * A dish tile built for one thing: being hit accurately, once, by a thumb
 * moving fast. The whole tile is the add button for a single-price dish;
 * dishes with portions get one button per portion, sized to the same target.
 * Nothing here opens a dialog — a counter can't afford a modal per item.
 */
function DishCard({ item, inBill, dense, onAdd }: Props) {
  const isVeg = item.vegStatus === 'veg';
  const portions = sellablePortions(item);
  const single = portions.length === 0;

  const body = (
    <>
      <Box sx={{ position: 'relative', width: '100%', height: dense ? 76 : 104, bgcolor: '#F1EFED' }}>
        <Image
          src={item.image || FALLBACK_IMAGE}
          alt=""
          fill
          sizes="(max-width: 600px) 45vw, (max-width: 1200px) 30vw, 200px"
          style={{ objectFit: 'cover' }}
        />
        {/* Veg/non-veg mark, the way an Indian menu is read at a glance. */}
        <Box
          sx={{
            position: 'absolute', top: 5, left: 5,
            width: 15, height: 15, borderRadius: '3px', bgcolor: 'white',
            border: `2px solid ${isVeg ? adminColors.success : adminColors.brand}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: isVeg ? adminColors.success : adminColors.brand }} />
        </Box>
        {inBill > 0 && (
          <Box
            sx={{
              position: 'absolute', top: 5, right: 5, minWidth: 22, height: 22, px: 0.5,
              borderRadius: '11px', bgcolor: adminColors.brand, color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11.5, fontWeight: 900,
            }}
          >
            {inBill}
          </Box>
        )}
      </Box>

      <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 0.6, flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: dense ? 12 : 13, fontWeight: 700, color: adminColors.textPrimary,
            lineHeight: 1.25, textAlign: 'left',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}
        >
          {item.name}
        </Typography>

        {single ? (
          <Typography sx={{ mt: 'auto', fontSize: dense ? 13 : 14.5, fontWeight: 900, color: adminColors.brand, textAlign: 'left' }}>
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
                  flex: '1 1 auto', minWidth: 0, px: 0.6, py: 0.4, minHeight: 32,
                  borderRadius: '9px', textTransform: 'none', fontWeight: 800, fontSize: 11,
                  bgcolor: portion === 'full' ? adminColors.brand : adminColors.brandSoft,
                  color: portion === 'full' ? '#FFFFFF' : adminColors.brand,
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
    borderRadius: '14px',
    border: `1px solid ${inBill > 0 ? adminColors.brand : adminColors.border}`,
    boxShadow: inBill > 0 ? `0 0 0 1px ${adminColors.brand}` : 'none',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    bgcolor: '#FFFFFF',
    textAlign: 'left' as const,
    transition: 'box-shadow .12s ease, border-color .12s ease',
  };

  // Single-price dishes: the entire tile is the tap target, so adding one is
  // a single hit anywhere rather than a hunt for a small "+" button.
  if (single) {
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
          '&:hover': { boxShadow: '0 6px 16px rgba(28,25,23,0.10)' },
          '&:active': { transform: 'scale(0.98)' },
        }}
      >
        {body}
        <Box
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.4,
            py: 0.6, bgcolor: adminColors.brandSoft, color: adminColors.brand,
            fontSize: 11.5, fontWeight: 800,
          }}
        >
          <Add sx={{ fontSize: 15 }} /> Add
        </Box>
      </Paper>
    );
  }

  return <Paper elevation={0} sx={surface}>{body}</Paper>;
}

// The grid re-renders on every cart change; without this every tile in a
// 100-dish menu would re-render each time a quantity ticks up.
export default React.memo(DishCard);
