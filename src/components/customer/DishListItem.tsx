'use client';

import React, { memo } from 'react';
import { Box, Typography, Button, Chip } from '@mui/material';
import { Star, Timer, LocalFireDepartment } from '@mui/icons-material';
import Link from 'next/link';
import type { MenuItem } from '@/types';
import { useDishPortion, PORTION_LABELS, type Portion } from '@/hooks/useDishPortion';
import CartStepper from './CartStepper';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80';

interface Props {
  item: MenuItem;
  /** Hides the hairline under the last row of a list. */
  divider?: boolean;
}

/**
 * A single dish as a full-width row: text on the left, photo and the ADD
 * button on the right.
 *
 * This is the shape delivery apps settled on for phones, and the reason is
 * width. A card grid gives each dish half a 360px screen, which leaves no room
 * for a description and squeezes the price and the button onto separate lines.
 * A row gives the name and description the full column and keeps the photo at
 * a legible 112px — so a customer can actually read what they are ordering
 * without opening anything.
 *
 * The ADD button deliberately overhangs the bottom edge of the photo. It puts
 * the primary action at a fixed, predictable place in every row instead of
 * wherever a variable-length description happens to end.
 */
const DishListItem = memo(function DishListItem({ item, divider = true }: Props) {
  const {
    availablePortions, hasPortions, selectedPortion, setSelectedPortion,
    activePrice, cartItem, add, increase, decrease,
  } = useDishPortion(item);

  const unavailable = !item.isAvailable;

  return (
    <Box
      sx={{
        display: 'flex',
        gap: { xs: 1.5, sm: 2.5 },
        py: { xs: 2, sm: 2.5 },
        borderBottom: divider ? '1px dashed' : 'none',
        borderColor: 'rgba(0,0,0,0.1)',
        opacity: unavailable ? 0.55 : 1,
      }}
    >
      {/* ── Left: everything you read ───────────────────────────────────── */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75, flexWrap: 'wrap' }}>
          <Box
            className={item.vegStatus === 'veg' ? 'veg-indicator' : 'non-veg-indicator'}
            role="img"
            aria-label={item.vegStatus === 'veg' ? 'Vegetarian' : 'Non-vegetarian'}
          />
          {item.isSpecial ? (
            <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#E65100', letterSpacing: 0.3 }}>
              ⭐ CHEF&apos;S SPECIAL
            </Typography>
          ) : item.isPopular ? (
            <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#C62828', letterSpacing: 0.3 }}>
              🔥 BESTSELLER
            </Typography>
          ) : null}
        </Box>

        <Typography
          component={Link}
          href={`/menu?q=${encodeURIComponent(item.name)}`}
          sx={{
            fontWeight: 700,
            fontSize: { xs: '15px', sm: '16.5px' },
            color: 'text.primary',
            textDecoration: 'none',
            '&:hover': { color: 'primary.main' },
            display: 'block',
            lineHeight: 1.3,
            mb: 0.5,
          }}
        >
          {item.name}
        </Typography>

        <Typography sx={{ fontWeight: 800, fontSize: { xs: '14.5px', sm: '15.5px' }, color: 'text.primary', mb: 0.75 }}>
          ₹{activePrice}
        </Typography>

        {/* Rating and prep time. Both are quick scan signals — they sit on one
            line so the description keeps its two full lines below. */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75, flexWrap: 'wrap' }}>
          <Box
            sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.4,
              border: '1px solid rgba(46,125,50,0.35)', borderRadius: '6px',
              px: 0.7, py: 0.15,
            }}
          >
            <Star sx={{ fontSize: 13, color: 'success.main' }} />
            <Typography sx={{ fontSize: '12px', fontWeight: 800, color: 'success.main' }}>
              {item.rating}
            </Typography>
            <Typography sx={{ fontSize: '11px', color: 'text.secondary' }}>
              ({item.reviewCount})
            </Typography>
          </Box>

          {item.prepTime && (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35 }}>
              <Timer sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography sx={{ fontSize: '11.5px', color: 'text.secondary', fontWeight: 600 }}>
                {item.prepTime} min
              </Typography>
            </Box>
          )}

          {item.spiceLevel ? (
            <Box sx={{ display: 'inline-flex', gap: 0.15 }} aria-label={`Spice level ${item.spiceLevel} of 3`}>
              {Array.from({ length: item.spiceLevel }).map((_, i) => (
                <LocalFireDepartment key={i} sx={{ fontSize: 13, color: '#E65100' }} />
              ))}
            </Box>
          ) : null}
        </Box>

        <Typography
          sx={{
            fontSize: { xs: '12.5px', sm: '13px' },
            color: 'text.secondary',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.description}
        </Typography>

        {/* Portion pills. Only rendered when a dish genuinely has more than one
            size — a lone "Full" pill is a control that can't do anything. */}
        {hasPortions && (
          <Box sx={{ display: 'flex', gap: 0.75, mt: 1.25, flexWrap: 'wrap' }}>
            {availablePortions.map((portion: Portion) => {
              const selected = portion === selectedPortion;
              return (
                <Box
                  key={portion}
                  component="button"
                  type="button"
                  onClick={() => setSelectedPortion(portion)}
                  aria-pressed={selected}
                  sx={{
                    font: 'inherit',
                    cursor: 'pointer',
                    px: 1.2, py: 0.4,
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    border: '1.5px solid',
                    borderColor: selected ? 'primary.main' : 'rgba(0,0,0,0.14)',
                    bgcolor: selected ? 'rgba(198,40,40,0.07)' : 'white',
                    color: selected ? 'primary.main' : 'text.secondary',
                    transition: 'border-color .18s ease, background-color .18s ease',
                  }}
                >
                  {PORTION_LABELS[portion]} ₹{item.portionPrices?.[portion]}
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {/* ── Right: photo with the action pinned to it ────────────────────── */}
      <Box
        sx={{
          width: { xs: 112, sm: 132 },
          flexShrink: 0,
          position: 'relative',
          // Room for the button that hangs off the bottom of the photo.
          pb: 2.5,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1 / 1',
            borderRadius: '16px',
            overflow: 'hidden',
            bgcolor: '#F5F5F5',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
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
              // Guard against a fallback that itself 404s looping forever.
              if (img.src !== FALLBACK_IMAGE) img.src = FALLBACK_IMAGE;
            }}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />

          {unavailable && (
            <Box
              sx={{
                position: 'absolute', inset: 0,
                bgcolor: 'rgba(0,0,0,0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Chip
                label="Sold out"
                size="small"
                sx={{ bgcolor: 'white', fontWeight: 800, fontSize: '10px', height: 20 }}
              />
            </Box>
          )}
        </Box>

        <Box
          sx={{
            position: 'absolute',
            left: '50%',
            bottom: 0,
            transform: 'translateX(-50%)',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
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
                minWidth: 92,
                height: 32,
                px: 2,
                bgcolor: 'white',
                color: 'success.main',
                border: '1.5px solid',
                borderColor: 'success.main',
                borderRadius: '12px',
                fontWeight: 900,
                fontSize: '13px',
                letterSpacing: 0.5,
                boxShadow: '0 4px 14px rgba(46,125,50,0.18)',
                '&:hover': { bgcolor: 'rgba(46,125,50,0.06)', boxShadow: '0 6px 18px rgba(46,125,50,0.26)' },
                '&.Mui-disabled': { bgcolor: '#EEEEEE', color: '#9E9E9E', borderColor: 'transparent', boxShadow: 'none' },
              }}
            >
              ADD
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
});

export default DishListItem;
