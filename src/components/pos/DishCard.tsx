'use client';

import React from 'react';
import Image from 'next/image';
import { Box, Button, Paper, Typography } from '@mui/material';
import { Add, Remove } from '@mui/icons-material';
import type { MenuItem } from '@/types';
import { PORTION_LABEL, sellablePortions, type Portion } from '@/hooks/usePosCart';
import { pos } from '@/theme/posColors';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80';

interface Props {
  item: MenuItem;
  /** How many of this dish are already on the bill. */
  inBill: number;
  onAdd: (item: MenuItem, portion?: Portion) => void;
  onDecrement?: (item: MenuItem) => void;
}

function DishCard({ item, inBill, onAdd, onDecrement }: Props) {
  const isVeg = item.vegStatus === 'veg';
  const isEgg = item.vegStatus === 'egg';
  const portions = sellablePortions(item);
  const single = portions.length === 0;
  const active = inBill > 0;

  const vegColor = isVeg ? pos.veg : isEgg ? pos.egg : pos.nonVeg;

  /* ── Card Body: Image + Title + Price ───────────────────────── */
  const body = (
    <>
      <Box
        sx={{
          position: 'relative', width: '100%',
          height: { xs: 66, sm: 84, lg: 96 },
          bgcolor: pos.bg, overflow: 'hidden',
        }}
      >
        <Image
          src={item.image || FALLBACK_IMAGE}
          alt={item.name}
          fill
          sizes="(max-width:600px) 50vw, (max-width:1200px) 25vw, 160px"
          style={{ objectFit: 'cover' }}
        />

        {/* Veg/Non-veg dot badge */}
        <Box
          sx={{
            position: 'absolute', top: 4, left: 4,
            width: 12, height: 12, borderRadius: '2px',
            bgcolor: '#FFFFFF', border: `1.5px solid ${vegColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          }}
        >
          <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: vegColor }} />
        </Box>

        {/* In-bill count badge (top right) */}
        {active && (
          <Box
            sx={{
              position: 'absolute', top: 4, right: 4,
              minWidth: 20, height: 20, px: 0.5,
              borderRadius: '10px', bgcolor: pos.brand, color: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10.5, fontWeight: 900,
              boxShadow: '0 2px 6px rgba(198,40,40,0.4)',
            }}
          >
            {inBill}
          </Box>
        )}
      </Box>

      {/* Info section */}
      <Box sx={{ p: { xs: 0.6, sm: 0.75 }, display: 'flex', flexDirection: 'column', gap: 0.2, flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: { xs: 11, sm: 12, lg: 12.5 },
            fontWeight: 700, color: pos.text,
            lineHeight: 1.2, textAlign: 'left',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.name}
        </Typography>

        {single ? (
          <Typography
            sx={{
              mt: 'auto', fontSize: { xs: 12, sm: 13.5 },
              fontWeight: 900, color: pos.brand, textAlign: 'left',
            }}
          >
            ₹{item.price}
          </Typography>
        ) : (
          <Box sx={{ mt: 'auto', display: 'flex', gap: 0.3, flexWrap: 'wrap' }}>
            {portions.map(({ portion, price }) => (
              <Button
                key={portion}
                size="small"
                onClick={(e) => { e.stopPropagation(); onAdd(item, portion); }}
                sx={{
                  flex: '1 1 auto', minWidth: 0, px: 0.4, py: 0.2, minHeight: 26,
                  borderRadius: '5px', textTransform: 'none', fontWeight: 800,
                  fontSize: { xs: 9, sm: 10 },
                  bgcolor: portion === 'full' ? pos.brand : pos.brandSoft,
                  color: portion === 'full' ? '#FFFFFF' : pos.brand,
                  border: `1px solid ${portion === 'full' ? pos.brand : '#FECACA'}`,
                  '&:hover': {
                    bgcolor: portion === 'full' ? pos.brandDark : '#FEE2E2',
                  },
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
    borderRadius: '10px',
    border: `1.5px solid ${active ? pos.brand : pos.border}`,
    boxShadow: active ? '0 2px 8px rgba(198,40,40,0.15)' : pos.shadowSm,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    bgcolor: pos.surface,
    textAlign: 'left' as const,
    transition: 'transform 0.1s ease, box-shadow 0.1s ease, border-color 0.1s ease',
  };

  /* ── When item is selected (inBill > 0): - QTY + Stepper at bottom ── */
  if (active) {
    return (
      <Paper elevation={0} sx={surface}>
        {body}
        <Box
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            py: 0.4, px: 0.5, bgcolor: pos.brandSoft, borderTop: `1px solid #FECACA`,
          }}
        >
          <Button
            size="small"
            onClick={(e) => { e.stopPropagation(); onDecrement?.(item); }}
            sx={{
              minWidth: 28, height: 28, borderRadius: '7px', p: 0,
              color: pos.brand, bgcolor: '#FFFFFF',
              border: `1px solid #FECACA`,
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              '&:hover': { bgcolor: '#FEE2E2' },
              '&:active': { transform: 'scale(0.92)' },
            }}
            aria-label={`Decrease ${item.name}`}
          >
            <Remove sx={{ fontSize: 16, fontWeight: 900 }} />
          </Button>

          <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: pos.brand, px: 0.25 }}>
            {inBill}
          </Typography>

          <Button
            size="small"
            onClick={(e) => { e.stopPropagation(); onAdd(item); }}
            sx={{
              minWidth: 28, height: 28, borderRadius: '7px', p: 0,
              color: '#FFFFFF', bgcolor: pos.brand,
              boxShadow: '0 2px 5px rgba(198,40,40,0.3)',
              '&:hover': { bgcolor: pos.brandDark },
              '&:active': { transform: 'scale(0.92)' },
            }}
            aria-label={`Increase ${item.name}`}
          >
            <Add sx={{ fontSize: 16, fontWeight: 900 }} />
          </Button>
        </Box>
      </Paper>
    );
  }

  /* ── Single portion dish, not in bill ── */
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
          '&:hover': {
            boxShadow: pos.shadowMd,
            borderColor: pos.brand,
          },
          '&:active': { transform: 'scale(0.97)' },
        }}
      >
        {body}
        <Box
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.2,
            py: 0.5, bgcolor: pos.brandSoft, color: pos.brand,
            fontSize: 11, fontWeight: 800, borderTop: `1px solid ${pos.borderSubtle}`,
          }}
        >
          <Add sx={{ fontSize: 14 }} /> Add
        </Box>
      </Paper>
    );
  }

  /* Multi-portion dish */
  return <Paper elevation={0} sx={surface}>{body}</Paper>;
}

export default React.memo(DishCard);
