'use client';

import React, { useState, memo } from 'react';
import Image from 'next/image';
import {
  Box, Typography, Button, Chip, IconButton, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import { Add, Favorite, FavoriteBorder, Star, Timer } from '@mui/icons-material';
import { MenuItem } from '@/types';
import { useDishPortion } from '@/hooks/useDishPortion';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80';

interface Props {
  item: MenuItem;
  compact?: boolean;
}

// Wrapped in React.memo — only re-renders when `item` prop or the specific cart entry changes
const MenuCard = memo(function MenuCard({ item, compact = false }: Props) {
  const [liked, setLiked] = useState(false);

  // Portion selection, pricing and the add/increase/decrease actions are shared
  // with the dish rail and the dish list, so all three put an identical row in
  // the cart for the same dish rather than three near-identical ones.
  const {
    availablePortions, selectedPortion, setSelectedPortion,
    activePrice, cartItem, add, increase, decrease,
  } = useDishPortion(item);

  return (
    <Box
      className="card-hover"
      sx={{
        bgcolor: 'white', borderRadius: '16px', overflow: 'hidden',
        boxShadow: '0 2px 16px rgba(0,0,0,0.08)', position: 'relative',
        height: '100%', display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Image */}
      <Box sx={{ position: 'relative', overflow: 'hidden', height: compact ? 150 : 190, '&:hover img': { transform: 'scale(1.06)' } }}>
        <Image
          src={item.image || FALLBACK_IMAGE}
          alt={item.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
          style={{ objectFit: 'cover', transition: 'transform 0.3s ease', willChange: 'transform' }}
          onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
            (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
          }}
        />

        {/* Badges */}
        <Box sx={{ position: 'absolute', top: 10, left: 10, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {item.isSpecial && (
            <Chip label="Chef's Special" size="small"
              sx={{ bgcolor: '#FF9800', color: 'white', fontWeight: 700, fontSize: '10px', height: 22 }} />
          )}
          {item.isPopular && !item.isSpecial && (
            <Chip label="🔥 Popular" size="small"
              sx={{ bgcolor: '#C62828', color: 'white', fontWeight: 700, fontSize: '10px', height: 22 }} />
          )}
        </Box>

        {!item.isAvailable && (
          <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Chip label="Currently Unavailable" sx={{ bgcolor: 'white', fontWeight: 600 }} />
          </Box>
        )}

        {/* Wishlist */}
        <IconButton
          onClick={() => setLiked(!liked)}
          size="small"
          sx={{
            position: 'absolute', top: 8, right: 8,
            bgcolor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)',
            '&:hover': { bgcolor: 'white', transform: 'scale(1.1)' },
            transition: 'all 0.2s',
          }}
        >
          {liked
            ? <Favorite sx={{ color: '#C62828', fontSize: 18 }} />
            : <FavoriteBorder sx={{ color: '#616161', fontSize: 18 }} />}
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ p: compact ? 1.5 : 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
          <Box
            className={item.vegStatus === 'veg' ? 'veg-indicator' : 'non-veg-indicator'}
            sx={{ mt: 0.3, flexShrink: 0 }}
          />
          <Typography variant={compact ? 'body2' : 'subtitle1'} sx={{ fontWeight: 700, lineHeight: 1.3, color: '#212121' }}>
            {item.name}
          </Typography>
        </Box>

        {!compact && (
          <Typography variant="caption" color="text.secondary"
            sx={{ mb: 1, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {item.description}
          </Typography>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
            <Star sx={{ color: '#FF9800', fontSize: 14 }} />
            <Typography variant="caption" color="text.primary" sx={{ fontWeight: 700 }}>{item.rating}</Typography>
            <Typography variant="caption" color="text.secondary">({item.reviewCount})</Typography>
          </Box>
          {item.prepTime && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
              <Timer sx={{ fontSize: 13, color: '#616161' }} />
              <Typography variant="caption" color="text.secondary">{item.prepTime} min</Typography>
            </Box>
          )}
        </Box>

        {/* Portion Selector */}
        {availablePortions.length > 1 && (
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.3, fontSize: '10px' }}>
              SELECT PORTION SIZE:
            </Typography>
            <ToggleButtonGroup
              value={selectedPortion} exclusive
              onChange={(_, val) => val && setSelectedPortion(val)}
              size="small" sx={{ width: '100%', height: 28 }}
            >
              {availablePortions.includes('single') && (
                <ToggleButton value="single" sx={{ flex: 1, fontSize: '11px', fontWeight: 700, py: 0, px: 0.5 }}>
                  S ₹{item.portionPrices?.single}
                </ToggleButton>
              )}
              {availablePortions.includes('full') && (
                <ToggleButton value="full" sx={{ flex: 1, fontSize: '11px', fontWeight: 700, py: 0, px: 0.5 }}>
                  F ₹{item.portionPrices?.full}
                </ToggleButton>
              )}
              {availablePortions.includes('large') && (
                <ToggleButton value="large" sx={{ flex: 1, fontSize: '11px', fontWeight: 700, py: 0, px: 0.5 }}>
                  L ₹{item.portionPrices?.large}
                </ToggleButton>
              )}
            </ToggleButtonGroup>
          </Box>
        )}

        <Box sx={{ flexGrow: 1 }} />

        {/* Price + Add to Cart */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
          <Typography variant={compact ? 'subtitle1' : 'h6'} color="primary" sx={{ fontWeight: 800 }}>
            ₹{activePrice}
          </Typography>

          {cartItem ? (
            <Box sx={{
              display: 'flex', alignItems: 'center',
              bgcolor: 'rgba(198,40,40,0.08)', borderRadius: '10px', border: '1.5px solid #C62828',
            }}>
              <IconButton size="small" onClick={decrease} aria-label={`Remove one ${item.name}`} sx={{ p: 0.5 }}>
                <Box sx={{ color: '#C62828', fontWeight: 700, fontSize: 18, lineHeight: 1, px: 0.5 }}>−</Box>
              </IconButton>
              <Typography sx={{ px: 1, fontWeight: 700, color: '#C62828', fontSize: 15, minWidth: 20, textAlign: 'center' }}>
                {cartItem.quantity}
              </Typography>
              <IconButton size="small" onClick={increase} aria-label={`Add one more ${item.name}`} sx={{ p: 0.5 }}>
                <Add sx={{ color: '#C62828', fontSize: 18 }} />
              </IconButton>
            </Box>
          ) : (
            <Button
              variant="contained" color="primary" size="small"
              disabled={!item.isAvailable}
              onClick={add}
              startIcon={<Add />}
              sx={{
                borderRadius: '10px', px: 2, py: 0.8, fontSize: '13px', fontWeight: 600,
                background: 'linear-gradient(135deg, #C62828, #EF5350)',
                boxShadow: '0 4px 12px rgba(198,40,40,0.3)',
                '&:hover': { boxShadow: '0 6px 20px rgba(198,40,40,0.4)', transform: 'translateY(-1px)' },
                transition: 'all 0.2s',
              }}
            >
              Add
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
});

export default MenuCard;
