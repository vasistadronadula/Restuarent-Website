'use client';
import React from 'react';
import {
  Box, Typography, Button, Chip, Rating, IconButton, Tooltip,
} from '@mui/material';
import { Add, Favorite, FavoriteBorder, Star, LocalFireDepartment, Timer } from '@mui/icons-material';
import { MenuItem } from '@/types';
import { useCart } from '@/context/CartContext';
import toast from 'react-hot-toast';
import { useState } from 'react';

interface Props {
  item: MenuItem;
  compact?: boolean;
}

const spiceLevelColors = ['#FF9800', '#FF5722', '#C62828'];

export default function MenuCard({ item, compact = false }: Props) {
  const { state, addItem, increaseQty, decreaseQty } = useCart();
  const [liked, setLiked] = useState(false);
  const cartItem = state.items.find((i) => i.id === item.id);

  const handleAdd = () => {
    addItem(item);
    toast.success(`${item.name} added to cart! 🛒`, { icon: '🍽️' });
  };

  return (
    <Box
      className="card-hover"
      sx={{
        bgcolor: 'white',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Image */}
      <Box sx={{ position: 'relative', overflow: 'hidden', height: compact ? 160 : 200 }}>
        <Box
          component="img"
          src={item.image}
          alt={item.name}
          sx={{
            width: '100%', height: '100%', objectFit: 'cover',
            transition: 'transform 0.4s ease',
            '&:hover': { transform: 'scale(1.08)' },
          }}
          onError={(e: any) => {
            e.target.src = `https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80`;
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
          <Box sx={{
            position: 'absolute', inset: 0,
            bgcolor: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
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
        {/* Veg/NonVeg + Name */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
          <Box
            className={item.vegStatus === 'veg' ? 'veg-indicator' : 'non-veg-indicator'}
            sx={{ mt: 0.3, flexShrink: 0 }}
          />
          <Typography
            variant={compact ? 'body2' : 'subtitle1'}
            sx={{ fontWeight: 700, lineHeight: 1.3, color: '#212121' }}
          >
            {item.name}
          </Typography>
        </Box>

        {/* Description */}
        {!compact && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 1, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {item.description}
          </Typography>
        )}

        {/* Rating + Prep time */}
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
          {item.spiceLevel && (
            <Tooltip title={`Spice: ${['Mild', 'Medium', 'Hot'][item.spiceLevel - 1]}`}>
              <Box sx={{ display: 'flex', gap: 0.2 }}>
                {Array.from({ length: item.spiceLevel }).map((_, i) => (
                  <LocalFireDepartment key={i} sx={{ fontSize: 12, color: spiceLevelColors[item.spiceLevel! - 1] }} />
                ))}
              </Box>
            </Tooltip>
          )}
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* Price + Add to Cart */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
          <Box>
            <Typography variant={compact ? 'subtitle1' : 'h6'} color="primary" sx={{ fontWeight: 800 }}>
              ₹{item.price}
            </Typography>
          </Box>

          {cartItem ? (
            <Box sx={{
              display: 'flex', alignItems: 'center',
              bgcolor: 'rgba(198,40,40,0.08)', borderRadius: '10px',
              border: '1.5px solid #C62828',
            }}>
              <IconButton size="small" onClick={() => decreaseQty(item.id)} sx={{ p: 0.5 }}>
                <Box sx={{ color: '#C62828', fontWeight: 700, fontSize: 18, lineHeight: 1, px: 0.5 }}>−</Box>
              </IconButton>
              <Typography sx={{ px: 1, fontWeight: 700, color: '#C62828', fontSize: 15, minWidth: 20, textAlign: 'center' }}>
                {cartItem.quantity}
              </Typography>
              <IconButton size="small" onClick={() => { increaseQty(item.id); }} sx={{ p: 0.5 }}>
                <Add sx={{ color: '#C62828', fontSize: 18 }} />
              </IconButton>
            </Box>
          ) : (
            <Button
              variant="contained"
              color="primary"
              size="small"
              disabled={!item.isAvailable}
              onClick={handleAdd}
              startIcon={<Add />}
              sx={{
                borderRadius: '10px', px: 2, py: 0.8,
                fontSize: '13px', fontWeight: 600,
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
}
