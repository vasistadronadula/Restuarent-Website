'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Typography, Button, IconButton, Skeleton } from '@mui/material';
import { Star, ChevronLeft, ChevronRight, Timer } from '@mui/icons-material';
import Link from 'next/link';
import type { MenuItem } from '@/types';
import { useDishPortion } from '@/hooks/useDishPortion';
import CartStepper from './CartStepper';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80';

/* ─── One card ──────────────────────────────────────────────────────────── */

function RailCard({ item }: { item: MenuItem }) {
  const { activePrice, hasPortions, cartItem, add, increase, decrease } = useDishPortion(item);
  const unavailable = !item.isAvailable;

  return (
    <Box
      sx={{
        width: { xs: 158, sm: 186 },
        flexShrink: 0,
        scrollSnapAlign: 'start',
        opacity: unavailable ? 0.55 : 1,
      }}
    >
      <Box sx={{ position: 'relative', mb: 2 }}>
        <Box
          component={Link}
          href={`/menu?q=${encodeURIComponent(item.name)}`}
          sx={{
            display: 'block',
            position: 'relative',
            width: '100%',
            aspectRatio: '1 / 1',
            borderRadius: '18px',
            overflow: 'hidden',
            bgcolor: '#F5F5F5',
            boxShadow: '0 6px 20px rgba(0,0,0,0.1)',
            cursor: 'pointer',
          }}
        >
          <Box
            component="img"
            src={item.image || FALLBACK_IMAGE}
            alt={item.name}
            loading="lazy"
            decoding="async"
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              const img = e.currentTarget;
              if (img.src !== FALLBACK_IMAGE) img.src = FALLBACK_IMAGE;
            }}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />

          {(item.isSpecial || item.isPopular) && (
            <Box
              sx={{
                position: 'absolute', top: 8, left: 8,
                bgcolor: item.isSpecial ? 'secondary.main' : 'primary.main',
                color: 'white',
                px: 0.9, py: 0.25,
                borderRadius: '7px',
                fontSize: '9.5px', fontWeight: 900, letterSpacing: 0.4,
                boxShadow: '0 3px 10px rgba(0,0,0,0.25)',
              }}
            >
              {item.isSpecial ? "CHEF'S PICK" : 'BESTSELLER'}
            </Box>
          )}
        </Box>

        {/* Same overhanging action as the list rows, so ADD is always in the
            same place relative to a dish photo wherever a dish is shown. */}
        <Box sx={{ position: 'absolute', left: '50%', bottom: -16, transform: 'translateX(-50%)' }}>
          {cartItem ? (
            <CartStepper
              quantity={cartItem.quantity}
              onIncrease={increase}
              onDecrease={decrease}
              size="small"
              label={item.name}
            />
          ) : (
            <Button
              onClick={add}
              disabled={unavailable}
              aria-label={`Add ${item.name} to cart`}
              sx={{
                minWidth: 92, height: 32, px: 2,
                bgcolor: 'white', color: 'success.main',
                border: '1.5px solid', borderColor: 'success.main',
                borderRadius: '12px',
                fontWeight: 900, fontSize: '13px', letterSpacing: 0.5,
                boxShadow: '0 4px 14px rgba(46,125,50,0.2)',
                '&:hover': { bgcolor: 'rgba(46,125,50,0.06)' },
                '&.Mui-disabled': { bgcolor: '#EEEEEE', color: '#9E9E9E', borderColor: 'transparent', boxShadow: 'none' },
              }}
            >
              ADD
            </Button>
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mb: 0.5 }}>
        <Box
          className={item.vegStatus === 'veg' ? 'veg-indicator' : 'non-veg-indicator'}
          role="img"
          aria-label={item.vegStatus === 'veg' ? 'Vegetarian' : 'Non-vegetarian'}
          sx={{ mt: 0.35 }}
        />
        <Typography
          component={Link}
          href={`/menu?q=${encodeURIComponent(item.name)}`}
          sx={{
            fontWeight: 700,
            fontSize: { xs: '13.5px', sm: '14.5px' },
            lineHeight: 1.32,
            color: 'text.primary',
            textDecoration: 'none',
            '&:hover': { color: 'primary.main' },
            // Fixed two lines: without it a one-word dish name and a long one
            // sitting side by side push their prices onto different baselines.
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: { xs: 36, sm: 39 },
          }}
        >
          {item.name}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4 }}>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3 }}>
          <Star sx={{ fontSize: 13, color: 'success.main' }} />
          <Typography sx={{ fontSize: '11.5px', fontWeight: 800, color: 'success.main' }}>
            {item.rating}
          </Typography>
        </Box>
        {item.prepTime && (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3 }}>
            <Timer sx={{ fontSize: 12, color: 'text.secondary' }} />
            <Typography sx={{ fontSize: '11px', color: 'text.secondary', fontWeight: 600 }}>
              {item.prepTime} min
            </Typography>
          </Box>
        )}
      </Box>

      <Typography sx={{ fontWeight: 800, fontSize: '14.5px', color: 'text.primary' }}>
        {hasPortions ? 'From ' : ''}₹{activePrice}
      </Typography>
    </Box>
  );
}

/* ─── The rail ──────────────────────────────────────────────────────────── */

interface Props {
  items: MenuItem[];
  loading?: boolean;
  /** Names the scroll region for screen readers. */
  ariaLabel: string;
}

export default function DishRail({ items, loading = false, ariaLabel }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const syncEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    // 4px of slack: sub-pixel widths mean scrollLeft rarely lands exactly on
    // the maximum, and without it the right arrow never disables.
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    syncEdges();
    const el = trackRef.current;
    if (!el) return;
    // The track's own width changes with the viewport, and the item list
    // changes when a category filter is applied — both move the edges.
    const observer = new ResizeObserver(syncEdges);
    observer.observe(el);
    return () => observer.disconnect();
  }, [syncEdges, items.length]);

  const scrollBy = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.round(el.clientWidth * 0.8), behavior: 'smooth' });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', gap: { xs: 1.75, sm: 2.5 }, overflow: 'hidden' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Box key={i} sx={{ width: { xs: 158, sm: 186 }, flexShrink: 0 }}>
            <Skeleton variant="rounded" sx={{ width: '100%', aspectRatio: '1 / 1', borderRadius: '18px', mb: 2.5 }} />
            <Skeleton width="90%" height={18} />
            <Skeleton width="55%" height={18} />
          </Box>
        ))}
      </Box>
    );
  }

  if (items.length === 0) {
    return (
      <Box sx={{ py: 5, textAlign: 'center' }}>
        <Typography sx={{ fontSize: '2rem', mb: 0.5 }}>🍽️</Typography>
        <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>Nothing on the pass right now</Typography>
        <Typography sx={{ fontSize: '13px', color: 'text.secondary' }}>
          This selection is being restocked — try another category.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        ref={trackRef}
        onScroll={syncEdges}
        role="region"
        aria-label={ariaLabel}
        sx={{
          display: 'flex',
          gap: { xs: 1.75, sm: 2.5 },
          overflowX: 'auto',
          overscrollBehaviorX: 'contain',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          // Bleeds to the screen edges on phones so the row visibly runs off
          // the side — the cue that tells a thumb there is more to swipe to.
          mx: { xs: -2.5, md: 0 },
          px: { xs: 2.5, md: 0 },
          pb: 1,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {items.map((item) => <RailCard key={item.id} item={item} />)}
      </Box>

      {/* Desktop-only arrows. A mouse has no swipe, and a scrollbar is hidden. */}
      {[-1, 1].map((dir) => {
        const isPrev = dir === -1;
        const disabled = isPrev ? atStart : atEnd;
        return (
          <IconButton
            key={dir}
            onClick={() => scrollBy(dir as 1 | -1)}
            disabled={disabled}
            aria-label={isPrev ? 'Scroll left' : 'Scroll right'}
            sx={{
              display: { xs: 'none', md: 'inline-flex' },
              position: 'absolute',
              top: '38%',
              [isPrev ? 'left' : 'right']: -20,
              transform: 'translateY(-50%)',
              bgcolor: 'white',
              color: 'primary.main',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 6px 20px rgba(0,0,0,0.14)',
              width: 40, height: 40,
              opacity: disabled ? 0 : 1,
              pointerEvents: disabled ? 'none' : 'auto',
              transition: 'opacity .2s ease, background-color .2s ease',
              '&:hover': { bgcolor: 'primary.main', color: 'white' },
            }}
          >
            {isPrev ? <ChevronLeft /> : <ChevronRight />}
          </IconButton>
        );
      })}
    </Box>
  );
}
