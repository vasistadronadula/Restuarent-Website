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

  /* ── Card body: image + info ────────────────────────────────── */
  const body = (
    <>
      <Box
        sx={{
          position: 'relative', width: '100%',
          height: { xs: 76, sm: 90, lg: 100 },
          bgcolor: '#0F172A', overflow: 'hidden',
        }}
      >
        <Image
          src={item.image || FALLBACK_IMAGE}
          alt={item.name}
          fill
          sizes="(max-width:600px) 30vw, (max-width:1200px) 20vw, 160px"
          style={{ objectFit: 'cover', opacity: active ? 0.8 : 1 }}
        />

        {/* Veg/Non-veg badge */}
        <Box
          sx={{
            position: 'absolute', top: 5, left: 5,
            width: 14, height: 14, borderRadius: '3px',
            bgcolor: '#FFFFFF', border: `2px solid ${vegColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: vegColor }} />
        </Box>

        {/* In-bill count badge */}
        {active && (
          <Box
            sx={{
              position: 'absolute', top: 5, right: 5,
              minWidth: 22, height: 22, px: 0.5,
              borderRadius: '11px', bgcolor: pos.charge, color: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 900,
              boxShadow: '0 2px 8px rgba(16,185,129,0.5)',
            }}
          >
            {inBill}
          </Box>
        )}
      </Box>

      <Box sx={{ p: 0.8, display: 'flex', flexDirection: 'column', gap: 0.3, flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: { xs: 11, sm: 12, lg: 12.5 },
            fontWeight: 700, color: pos.text,
            lineHeight: 1.25, textAlign: 'left',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.name}
        </Typography>

        {single ? (
          <Typography
            sx={{
              mt: 'auto', fontSize: { xs: 12.5, sm: 13.5 },
              fontWeight: 900, color: pos.charge, textAlign: 'left',
            }}
          >
            ₹{item.price}
          </Typography>
        ) : (
          <Box sx={{ mt: 'auto', display: 'flex', gap: 0.4, flexWrap: 'wrap' }}>
            {portions.map(({ portion, price }) => (
              <Button
                key={portion}
                size="small"
                onClick={(e) => { e.stopPropagation(); onAdd(item, portion); }}
                sx={{
                  flex: '1 1 auto', minWidth: 0, px: 0.5, py: 0.3, minHeight: 30,
                  borderRadius: '8px', textTransform: 'none', fontWeight: 800,
                  fontSize: { xs: 9.5, sm: 10.5 },
                  bgcolor: portion === 'full' ? pos.charge : pos.chargeSoft,
                  color: portion === 'full' ? '#FFFFFF' : pos.charge,
                  '&:hover': {
                    bgcolor: portion === 'full' ? pos.chargeDark : 'rgba(16,185,129,0.2)',
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
    borderRadius: '12px',
    border: `1.5px solid ${active ? pos.charge : pos.border}`,
    boxShadow: active ? '0 0 12px rgba(16,185,129,0.2)' : pos.shadowSm,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    bgcolor: pos.surface,
    textAlign: 'left' as const,
    transition: 'transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease',
  };

  /* Single-price dish that is already in the bill: show −/count/+ stepper */
  if (single && active) {
    return (
      <Paper elevation={0} sx={surface}>
        {body}
        <Box
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            py: 0.5, px: 0.6, bgcolor: pos.chargeSoft,
          }}
        >
          <Button
            size="small"
            onClick={(e) => { e.stopPropagation(); onDecrement?.(item); }}
            sx={{
              minWidth: 28, height: 28, borderRadius: '7px', p: 0,
              color: pos.danger, bgcolor: pos.surface,
              '&:hover': { bgcolor: pos.dangerSoft },
            }}
          >
            <Remove sx={{ fontSize: 15 }} />
          </Button>

          <Typography sx={{ fontSize: 11.5, fontWeight: 900, color: pos.charge }}>
            {inBill} in bill
          </Typography>

          <Button
            size="small"
            onClick={(e) => { e.stopPropagation(); onAdd(item); }}
            sx={{
              minWidth: 28, height: 28, borderRadius: '7px', p: 0,
              color: '#FFFFFF', bgcolor: pos.charge,
              '&:hover': { bgcolor: pos.chargeDark },
            }}
          >
            <Add sx={{ fontSize: 15 }} />
          </Button>
        </Box>
      </Paper>
    );
  }

  /* Single-price dish, not in bill: tappable card */
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
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            transform: 'translateY(-1px)',
            borderColor: pos.surfaceHover,
          },
          '&:active': { transform: 'scale(0.97)' },
        }}
      >
        {body}
        <Box
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.3,
            py: 0.6, bgcolor: pos.chargeSoft, color: pos.charge,
            fontSize: 11, fontWeight: 800,
          }}
        >
          <Add sx={{ fontSize: 14 }} /> Add
        </Box>
      </Paper>
    );
  }

  /* Multi-portion dish — buttons are inside the body */
  return <Paper elevation={0} sx={surface}>{body}</Paper>;
}

export default React.memo(DishCard);
