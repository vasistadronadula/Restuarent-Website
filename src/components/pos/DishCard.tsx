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
  const active = inBill > 0;

  const vegColor = isVeg ? pos.veg : isEgg ? pos.egg : pos.nonVeg;

  const surface = {
    borderRadius: '10px',
    border: `1.5px solid ${active ? pos.brand : pos.border}`,
    boxShadow: active ? '0 2px 8px rgba(198,40,40,0.18)' : pos.shadowSm,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    bgcolor: pos.surface,
    textAlign: 'left' as const,
    transition: 'border-color 0.1s ease, box-shadow 0.1s ease',
  };

  return (
    <Paper elevation={0} sx={surface}>
      {/* ── 1. Small Thumbnail + Veg Indicator ───────────────────── */}
      <Box
        sx={{
          position: 'relative', width: '100%',
          height: { xs: 62, sm: 76, lg: 86 },
          bgcolor: pos.bg, overflow: 'hidden', flexShrink: 0,
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
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          }}
        >
          <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: vegColor }} />
        </Box>

        {/* Total in bill badge */}
        {active && (
          <Box
            sx={{
              position: 'absolute', top: 4, right: 4,
              minWidth: 22, height: 22, px: 0.6,
              borderRadius: '11px', bgcolor: pos.brand, color: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 900,
              boxShadow: '0 2px 6px rgba(198,40,40,0.4)',
            }}
          >
            {inBill}
          </Box>
        )}
      </Box>

      {/* ── 2. Name & 3. Price & 4. Portion Selection (Full/Half) ── */}
      <Box sx={{ p: { xs: 0.7, sm: 0.85 }, display: 'flex', flexDirection: 'column', gap: 0.3, flex: 1, minWidth: 0 }}>
        {/* Name */}
        <Typography
          sx={{
            fontSize: { xs: 11.5, sm: 12.5 },
            fontWeight: 700, color: pos.text,
            lineHeight: 1.2, textAlign: 'left',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.name}
        </Typography>

        {/* Price */}
        <Typography
          sx={{
            fontSize: { xs: 12.5, sm: 13.5 },
            fontWeight: 900, color: pos.brand, textAlign: 'left',
          }}
        >
          ₹{item.price}
        </Typography>

        {/* 4. Portion Buttons (Full/Half) — Larger & touch-friendly */}
        {portions.length > 0 && (
          <Box sx={{ mt: 'auto', display: 'flex', gap: 0.4, flexWrap: 'wrap', pt: 0.4 }}>
            {portions.map(({ portion, price }) => (
              <Button
                key={portion}
                size="small"
                onClick={(e) => { e.stopPropagation(); onAdd(item, portion); }}
                sx={{
                  flex: '1 1 auto', minWidth: 0, px: 0.75, py: 0.5, minHeight: 34,
                  borderRadius: '7px', textTransform: 'none', fontWeight: 800,
                  fontSize: { xs: 11, sm: 11.5 },
                  bgcolor: portion === 'full' ? pos.brand : pos.brandSoft,
                  color: portion === 'full' ? '#FFFFFF' : pos.brand,
                  border: `1.5px solid ${portion === 'full' ? pos.brand : '#FECACA'}`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  '&:hover': {
                    bgcolor: portion === 'full' ? pos.brandDark : '#FEE2E2',
                  },
                  '&:active': { transform: 'scale(0.95)' },
                }}
              >
                {PORTION_LABEL[portion]} ₹{price}
              </Button>
            ))}
          </Box>
        )}
      </Box>

      {/* ── 5. Bottom Stepper / Add Button (- QTY +) ──────────────── */}
      <Box sx={{ borderTop: `1px solid ${pos.borderSubtle}`, mt: 'auto', flexShrink: 0 }}>
        {active ? (
          <Box
            sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              py: 0.4, px: 0.5, bgcolor: pos.brandSoft,
            }}
          >
            <Button
              size="small"
              onClick={(e) => { e.stopPropagation(); onDecrement?.(item); }}
              sx={{
                minWidth: 32, height: 32, borderRadius: '7px', p: 0,
                color: pos.brand, bgcolor: '#FFFFFF',
                border: `1.5px solid #FECACA`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                '&:hover': { bgcolor: '#FEE2E2' },
                '&:active': { transform: 'scale(0.92)' },
              }}
              aria-label={`Decrease ${item.name}`}
            >
              <Remove sx={{ fontSize: 18, fontWeight: 900 }} />
            </Button>

            <Typography sx={{ fontSize: 13, fontWeight: 900, color: pos.brand, px: 0.5 }}>
              {inBill}
            </Typography>

            <Button
              size="small"
              onClick={(e) => { e.stopPropagation(); onAdd(item); }}
              sx={{
                minWidth: 32, height: 32, borderRadius: '7px', p: 0,
                color: '#FFFFFF', bgcolor: pos.brand,
                boxShadow: '0 2px 6px rgba(198,40,40,0.3)',
                '&:hover': { bgcolor: pos.brandDark },
                '&:active': { transform: 'scale(0.92)' },
              }}
              aria-label={`Increase ${item.name}`}
            >
              <Add sx={{ fontSize: 18, fontWeight: 900 }} />
            </Button>
          </Box>
        ) : (
          <Button
            fullWidth
            size="small"
            onClick={() => onAdd(item)}
            startIcon={<Add sx={{ fontSize: 16 }} />}
            sx={{
              py: 0.6, minHeight: 32, borderRadius: 0, textTransform: 'none',
              fontWeight: 800, fontSize: 12,
              color: pos.brand, bgcolor: pos.brandSoft,
              '&:hover': { bgcolor: '#FEE2E2' },
            }}
          >
            Add
          </Button>
        )}
      </Box>
    </Paper>
  );
}

export default React.memo(DishCard);
