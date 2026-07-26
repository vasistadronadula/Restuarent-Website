'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Slide } from '@mui/material';
import { ArrowForward, ShoppingBag } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { openCart, selectTotalItems, selectGrandTotal } from '@/store/cartSlice';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function FloatingCartBar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const totalItems = useAppSelector(selectTotalItems);
  const grandTotal = useAppSelector(selectGrandTotal);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (totalItems > 0) {
      const pulseTimer = setTimeout(() => setPulse(true), 0);
      const resetTimer = setTimeout(() => setPulse(false), 800);
      return () => {
        clearTimeout(pulseTimer);
        clearTimeout(resetTimer);
      };
    }
  }, [totalItems]);

  if (pathname?.startsWith('/admin') || totalItems === 0) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: { xs: 16, sm: 24 },
        left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        zIndex: 1200, pointerEvents: 'none',
      }}
    >
      <Slide direction="up" in={totalItems > 0} mountOnEnter unmountOnExit>
        <Box sx={{ pointerEvents: 'auto', width: { xs: 'calc(100% - 32px)', sm: 'auto' }, minWidth: { sm: 420 }, maxWidth: 580 }}>
          <Box
            sx={{
              background: 'linear-gradient(135deg, #1A0A0A 0%, #C62828 100%)',
              color: 'white', borderRadius: '20px',
              p: 1.5, px: { xs: 2, sm: 2.5 },
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: { xs: 1.5, sm: 3 },
              boxShadow: '0 12px 40px rgba(198,40,40,0.45)',
              border: '1.5px solid rgba(255,152,0,0.4)',
              backdropFilter: 'blur(12px)',
              transition: 'transform 0.2s ease',
              animation: pulse ? 'bounce 0.6s ease' : 'none',
              '@keyframes bounce': {
                '0%, 100%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.04)' },
              },
            }}
          >
            {/* Left: Cart Info */}
            <Box
              onClick={() => dispatch(openCart())}
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', flexShrink: 0 }}
            >
              <Box sx={{ position: 'relative', width: 44, height: 44, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFD54F', flexShrink: 0 }}>
                <ShoppingBag sx={{ fontSize: 24, display: 'block' }} />
                <Box sx={{
                  position: 'absolute', top: -5, right: -5,
                  bgcolor: '#FF9800', color: 'white', fontWeight: 900, fontSize: '11px',
                  height: 18, minWidth: 18, px: 0.5, borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid #1A0A0A', boxShadow: '0 2px 6px rgba(0,0,0,0.4)', lineHeight: 1,
                }}>
                  {totalItems}
                </Box>
              </Box>
              <Box sx={{ flexShrink: 0 }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700, display: 'block', fontSize: '10.5px', letterSpacing: 0.5 }}>
                  {totalItems} {totalItems === 1 ? 'ITEM' : 'ITEMS'} IN CART
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.1, color: '#FFD54F', fontSize: '17px' }}>
                  ₹{Math.round(grandTotal).toLocaleString()}
                </Typography>
              </Box>
            </Box>

            {/* Right: CTA Buttons */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="outlined" size="small"
                onClick={() => dispatch(openCart())}
                sx={{
                  color: 'white', borderColor: 'rgba(255,255,255,0.4)', borderRadius: '10px',
                  px: 1.8, py: 0.8, fontWeight: 700, fontSize: '13px',
                  display: { xs: 'none', sm: 'inline-flex' },
                  '&:hover': { borderColor: '#FFD54F', color: '#FFD54F', bgcolor: 'rgba(255,213,79,0.1)' },
                }}
              >
                View Cart
              </Button>
              <Link href="/checkout" style={{ textDecoration: 'none' }}>
                <Button
                  variant="contained" size="small" endIcon={<ArrowForward fontSize="small" />}
                  sx={{
                    background: 'linear-gradient(135deg, #FF9800, #F57C00)', color: 'white',
                    borderRadius: '10px', px: 2.2, py: 0.9, fontWeight: 800, fontSize: '13px',
                    boxShadow: '0 4px 14px rgba(255,152,0,0.4)',
                    '&:hover': { background: 'linear-gradient(135deg, #F57C00, #E65100)', transform: 'translateY(-1px)' },
                  }}
                >
                  Checkout
                </Button>
              </Link>
            </Box>
          </Box>
        </Box>
      </Slide>
    </Box>
  );
}
