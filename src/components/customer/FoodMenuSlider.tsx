'use client';

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, IconButton, Button, Chip,
} from '@mui/material';
import {
  ChevronLeft, ChevronRight, Add, Star, LocalFireDepartment,
  Timer, Favorite, FavoriteBorder, AutoAwesome, PlayCircle, PauseCircle,
} from '@mui/icons-material';

import { useCart } from '@/context/CartContext';
import { useAdmin } from '@/context/AdminContext';
import toast from 'react-hot-toast';

const spiceLevelColors = ['#FF9800', '#FF5722', '#C62828'];

const CATEGORIES = [
  { id: 'all', label: '🔥 All Bestsellers' },
  { id: 'combos', label: '🎉 Unlimited Combos' },
  { id: 'biryani', label: '🍗 Dum Biryanis' },
  { id: 'starters', label: '🍢 Signature Starters' },
  { id: 'south-indian', label: '🍲 Royal Curries' },
  { id: 'desserts', label: '🍧 Desserts' },
];

export default function FoodMenuSlider() {
  const { menuItems: liveMenuItems } = useAdmin();
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
  const { state: cartState, addItem, increaseQty, decreaseQty } = useCart();

  // Filter items based on active category
  const filteredDishes = React.useMemo(() => {
    let dishes = liveMenuItems;
    if (activeCategory === 'all') {
      dishes = liveMenuItems.filter((i) => i.isPopular || i.isSpecial);
    } else {
      dishes = liveMenuItems.filter((i) => i.category === activeCategory);
    }
    return dishes.length > 0 ? dishes : liveMenuItems.slice(0, 6);
  }, [activeCategory, liveMenuItems]);

  const maxIndex = Math.max(0, filteredDishes.length - 1);

  // Auto slide timer
  useEffect(() => {
    if (isPaused || filteredDishes.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 4500);

    return () => clearInterval(timer);
  }, [isPaused, filteredDishes.length, maxIndex]);

  // Reset index when category changes
  const handleCategoryChange = (catId: string) => {
    setActiveCategory(catId);
    setCurrentIndex(0);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? maxIndex : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const toggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Box
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      sx={{
        position: 'relative',
        width: '100%',
        py: 2,
      }}
    >
      {/* Header & Category Tabs */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justify: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2,
          mb: 4,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: '12px',
              bgcolor: 'rgba(198,40,40,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#C62828',
            }}
          >
            <AutoAwesome />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#212121', lineHeight: 1.2 }}>
              Animated Dish Showcase
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Swipe or slide through our mouth-watering specialties
            </Typography>
          </Box>
        </Box>

        {/* Category Pill Buttons */}
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            overflowX: 'auto',
            width: '100%',
            maxWidth: { xs: '100%', md: 'auto' },
            pb: { xs: 1, md: 0 },
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <Button
                key={cat.id}
                size="small"
                onClick={() => handleCategoryChange(cat.id)}
                sx={{
                  borderRadius: '20px',
                  px: 2.2,
                  py: 0.8,
                  fontSize: '13px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.3s ease',
                  bgcolor: isSelected ? '#C62828' : 'white',
                  color: isSelected ? 'white' : '#616161',
                  boxShadow: isSelected ? '0 4px 14px rgba(198,40,40,0.35)' : '0 2px 8px rgba(0,0,0,0.06)',
                  border: isSelected ? '1px solid #C62828' : '1px solid rgba(0,0,0,0.08)',
                  '&:hover': {
                    bgcolor: isSelected ? '#B71C1C' : 'rgba(198,40,40,0.06)',
                    color: isSelected ? 'white' : '#C62828',
                  },
                }}
              >
                {cat.label}
              </Button>
            );
          })}
        </Box>
      </Box>

      {/* Slider viewport container */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '24px',
          p: { xs: 1, sm: 2 },
          bgcolor: 'rgba(255, 248, 242, 0.7)',
          border: '1px solid rgba(255, 152, 0, 0.15)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.04)',
        }}
      >
        {/* Animated Progress Bar */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '3px',
            bgcolor: '#FF9800',
            width: isPaused ? '0%' : '100%',
            transition: isPaused ? 'none' : 'width 4.5s linear',
            borderRadius: '3px 3px 0 0',
          }}
        />

        {/* Navigation Arrows */}
        <IconButton
          onClick={handlePrev}
          sx={{
            position: 'absolute',
            left: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            bgcolor: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(8px)',
            color: '#C62828',
            boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
            border: '1px solid rgba(198,40,40,0.2)',
            '&:hover': {
              bgcolor: '#C62828',
              color: 'white',
              transform: 'translateY(-50%) scale(1.1)',
            },
            transition: 'all 0.25s ease',
          }}
        >
          <ChevronLeft fontSize="medium" />
        </IconButton>

        <IconButton
          onClick={handleNext}
          sx={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            bgcolor: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(8px)',
            color: '#C62828',
            boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
            border: '1px solid rgba(198,40,40,0.2)',
            '&:hover': {
              bgcolor: '#C62828',
              color: 'white',
              transform: 'translateY(-50%) scale(1.1)',
            },
            transition: 'all 0.25s ease',
          }}
        >
          <ChevronRight fontSize="medium" />
        </IconButton>

        {/* Slider Track */}
        <Box
          sx={{
            display: 'flex',
            transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
            transform: `translateX(-${currentIndex * 100}%)`,
            width: '100%',
          }}
        >
          {filteredDishes.map((dish) => {
            const cartItem = cartState.items.find((i) => i.id === dish.id);
            const isLiked = !!likedIds[dish.id];

            return (
              <Box
                key={dish.id}
                sx={{
                  minWidth: '100%',
                  px: { xs: 1, sm: 3 },
                  py: 2,
                  boxSizing: 'border-box',
                }}
              >
                <Box
                  sx={{
                    bgcolor: 'white',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: 'stretch',
                    minHeight: 340,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 16px 40px rgba(198,40,40,0.14)',
                    },
                  }}
                >
                  {/* Dish Image Container */}
                  <Box
                    sx={{
                      width: { xs: '100%', md: '50%' },
                      position: 'relative',
                      minHeight: { xs: 220, md: 340 },
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      component="img"
                      src={dish.image}
                      alt={dish.name}
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.6s ease',
                        '&:hover': { transform: 'scale(1.08)' },
                      }}
                      onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80';
                      }}
                    />

                    {/* Badges Overlay */}
                    <Box sx={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {dish.isSpecial && (
                        <Chip
                          label="🌟 Chef's Special"
                          size="small"
                          sx={{
                            bgcolor: '#FF9800',
                            color: 'white',
                            fontWeight: 800,
                            fontSize: '11px',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                          }}
                        />
                      )}
                      {dish.isPopular && (
                        <Chip
                          label="🔥 Popular Choice"
                          size="small"
                          sx={{
                            bgcolor: '#C62828',
                            color: 'white',
                            fontWeight: 800,
                            fontSize: '11px',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                          }}
                        />
                      )}
                    </Box>

                    {/* Wishlist Button */}
                    <IconButton
                      onClick={(e) => toggleLike(dish.id, e)}
                      sx={{
                        position: 'absolute',
                        top: 14,
                        right: 14,
                        bgcolor: 'rgba(255,255,255,0.9)',
                        backdropFilter: 'blur(6px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        '&:hover': { bgcolor: 'white', transform: 'scale(1.1)' },
                        transition: 'all 0.2s',
                      }}
                    >
                      {isLiked ? (
                        <Favorite sx={{ color: '#C62828', fontSize: 20 }} />
                      ) : (
                        <FavoriteBorder sx={{ color: '#616161', fontSize: 20 }} />
                      )}
                    </IconButton>

                    {/* Spice & Prep Floating Tag */}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 14,
                        left: 14,
                        bgcolor: 'rgba(0,0,0,0.65)',
                        backdropFilter: 'blur(8px)',
                        color: 'white',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Timer sx={{ fontSize: 14, color: '#FF9800' }} />
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>{dish.prepTime || 25} min</Typography>
                      </Box>
                      {dish.spiceLevel && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                          {Array.from({ length: dish.spiceLevel }).map((_, i) => (
                            <LocalFireDepartment key={i} sx={{ fontSize: 13, color: spiceLevelColors[dish.spiceLevel! - 1] }} />
                          ))}
                        </Box>
                      )}
                    </Box>
                  </Box>

                  {/* Dish Details Container */}
                  <Box
                    sx={{
                      width: { xs: '100%', md: '50%' },
                      p: { xs: 2.5, sm: 4 },
                      display: 'flex',
                      flexDirection: 'column',
                      justify: 'space-between',
                    }}
                  >
                    <Box>
                      {/* Veg indicator + Title */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Box className={dish.vegStatus === 'veg' ? 'veg-indicator' : 'non-veg-indicator'} />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {dish.category}
                        </Typography>
                      </Box>

                      <Typography variant="h4" sx={{ fontWeight: 800, color: '#212121', mb: 1, fontSize: { xs: '1.4rem', sm: '1.8rem' } }}>
                        {dish.name}
                      </Typography>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.6 }}>
                        {dish.description}
                      </Typography>

                      {/* Ratings & Tags */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'rgba(255,152,0,0.12)', px: 1.2, py: 0.5, borderRadius: '8px' }}>
                          <Star sx={{ color: '#FF9800', fontSize: 16 }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#D84315' }}>
                            {dish.rating}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ({dish.reviewCount} reviews)
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Price and Cart Actions */}
                    <Box
                      sx={{
                        pt: 2,
                        borderTop: '1px solid rgba(0,0,0,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'space-between',
                      }}
                    >
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          PRICE
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: '#C62828' }}>
                          ₹{dish.price}
                        </Typography>
                      </Box>

                      {cartItem ? (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            bgcolor: 'rgba(198,40,40,0.08)',
                            borderRadius: '12px',
                            border: '1.5px solid #C62828',
                            p: 0.5,
                          }}
                        >
                          <IconButton size="small" onClick={() => decreaseQty(dish.id)}>
                            <Box sx={{ color: '#C62828', fontWeight: 800, fontSize: 18, lineHeight: 1, px: 0.5 }}>−</Box>
                          </IconButton>
                          <Typography sx={{ px: 1.5, fontWeight: 800, color: '#C62828', fontSize: 16 }}>
                            {cartItem.quantity}
                          </Typography>
                          <IconButton size="small" onClick={() => increaseQty(dish.id)}>
                            <Add sx={{ color: '#C62828', fontSize: 20 }} />
                          </IconButton>
                        </Box>
                      ) : (
                        <Button
                          variant="contained"
                          size="large"
                          onClick={() => {
                            addItem(dish);
                            toast.success(`${dish.name} added to cart! 🛒`, { icon: '🍽️' });
                          }}
                          startIcon={<Add />}
                          sx={{
                            borderRadius: '14px',
                            px: 3.5,
                            py: 1.3,
                            fontSize: '15px',
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #C62828, #EF5350)',
                            boxShadow: '0 6px 20px rgba(198,40,40,0.35)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #B71C1C, #C62828)',
                              boxShadow: '0 8px 24px rgba(198,40,40,0.45)',
                              transform: 'translateY(-2px)',
                            },
                            transition: 'all 0.2s ease',
                          }}
                        >
                          Add to Cart
                        </Button>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Footer controls: Slide Indicators + Play/Pause */}
        <Box
          sx={{
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            px: 2,
            pt: 1,
            pb: 0.5,
          }}
        >
          {/* Pause / Play Indicator */}
          <Box
            onClick={() => setIsPaused(!isPaused)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              cursor: 'pointer',
              color: 'text.secondary',
              '&:hover': { color: '#C62828' },
            }}
          >
            {isPaused ? <PlayCircle fontSize="small" /> : <PauseCircle fontSize="small" />}
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {isPaused ? 'Paused' : 'Auto-sliding'}
            </Typography>
          </Box>

          {/* Dots Pagination */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {filteredDishes.map((_, idx) => (
              <Box
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                sx={{
                  width: currentIndex === idx ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: currentIndex === idx ? '#C62828' : 'rgba(0,0,0,0.18)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': { bgcolor: '#C62828' },
                }}
              />
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
