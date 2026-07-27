'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box, Typography, IconButton, Button, Chip, Skeleton,
} from '@mui/material';
import {
  ChevronLeft, ChevronRight, Add, Star, LocalFireDepartment,
  Timer, Favorite, FavoriteBorder, AutoAwesome, PlayCircle, PauseCircle,
} from '@mui/icons-material';

import { useCart } from '@/context/CartContext';
import { useAdmin } from '@/context/AdminContext';
import toast from 'react-hot-toast';

const SLIDE_MS = 4500;
const SWIPE_THRESHOLD = 45;
/** Beyond this many dishes the dot row stops fitting; a counter replaces it. */
const MAX_DOTS = 8;

const spiceLevelColors = ['#FF9800', '#FF5722', '#C62828'];

const CATEGORIES = [
  { id: 'all', label: '🔥 All Bestsellers' },
  { id: 'combos', label: '🎉 Unlimited Combos' },
  { id: 'biryani', label: '🍗 Dum Biryanis' },
  { id: 'starters', label: '🍢 Signature Starters' },
  { id: 'south-indian', label: '🍲 Royal Curries' },
  { id: 'desserts', label: '🍧 Desserts' },
];

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80';

export default function FoodMenuSlider() {
  const { menuItems: liveMenuItems, isLoadingDB } = useAdmin();
  const [activeCategory, setActiveCategory] = useState('all');
  const [rawIndex, setRawIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const { state: cartState, addItem, increaseQty, decreaseQty } = useCart();

  const filteredDishes = React.useMemo(() => {
    const dishes = activeCategory === 'all'
      ? liveMenuItems.filter((i) => i.isPopular || i.isSpecial)
      : liveMenuItems.filter((i) => i.category === activeCategory);
    return dishes.length > 0 ? dishes : liveMenuItems.slice(0, 6);
  }, [activeCategory, liveMenuItems]);

  const maxIndex = Math.max(0, filteredDishes.length - 1);

  // A category switch — or a realtime menu update that pulls a dish — can
  // shorten the list out from under the stored index. Clamping here, during
  // render, means the track can never point at a slide that no longer exists.
  const currentIndex = Math.min(rawIndex, maxIndex);

  const goTo = useCallback((index: number) => {
    const count = maxIndex + 1;
    setRawIndex(((index % count) + count) % count);
  }, [maxIndex]);

  // `currentIndex` in the deps restarts the countdown after manual navigation,
  // so a dish the visitor just picked never flips away early.
  useEffect(() => {
    if (isPaused || filteredDishes.length <= 1) return;
    const timer = setTimeout(() => {
      setRawIndex(currentIndex >= maxIndex ? 0 : currentIndex + 1);
    }, SLIDE_MS);
    return () => clearTimeout(timer);
  }, [isPaused, filteredDishes.length, maxIndex, currentIndex]);

  const handleCategoryChange = (catId: string) => {
    setActiveCategory(catId);
    setRawIndex(0);
  };

  const handlePrev = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex]);
  const handleNext = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) handleNext();
    else handlePrev();
  };

  const toggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const navButtonSx = {
    bgcolor: 'white',
    color: '#C62828',
    border: '1px solid rgba(198,40,40,0.22)',
    boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
    width: 38,
    height: 38,
    '&:hover': { bgcolor: '#C62828', color: 'white', borderColor: '#C62828' },
    '&.Mui-disabled': { bgcolor: 'rgba(0,0,0,0.04)', color: 'rgba(0,0,0,0.26)', borderColor: 'transparent' },
    transition: 'background-color 0.25s ease, color 0.25s ease',
  } as const;

  return (
    <Box
      component="section"
      role="region"
      aria-roledescription="carousel"
      aria-label="Most loved dishes"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      sx={{ position: 'relative', width: '100%' }}
    >
      {/* Heading + category filter */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', lg: 'center' },
          gap: { xs: 2, lg: 3 },
          mb: { xs: 2.5, md: 3.5 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
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
              flexShrink: 0,
            }}
          >
            <AutoAwesome />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, color: '#212121', lineHeight: 1.25, fontSize: { xs: '1.05rem', md: '1.25rem' } }}>
              Animated Dish Showcase
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Swipe or slide through our mouth-watering specialties
            </Typography>
          </Box>
        </Box>

        {/* Horizontally scrollable pills. The mask fades the trailing edge so
            there is a visible hint that the row continues past the viewport. */}
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            overflowX: 'auto',
            overscrollBehaviorX: 'contain',
            scrollSnapType: 'x proximity',
            WebkitOverflowScrolling: 'touch',
            pb: 0.5,
            mx: { xs: -0.5, lg: 0 },
            px: 0.5,
            maskImage: { xs: 'linear-gradient(to right, #000 88%, transparent 100%)', lg: 'none' },
            scrollbarWidth: 'none',
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
                aria-pressed={isSelected}
                sx={{
                  borderRadius: '20px',
                  px: 2,
                  py: 0.7,
                  fontSize: '13px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  scrollSnapAlign: 'start',
                  transition: 'background-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease',
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

      {/* Slider shell */}
      <Box
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        sx={{
          position: 'relative',
          borderRadius: '24px',
          p: { xs: 1, sm: 1.5, md: 2 },
          bgcolor: 'rgba(255, 248, 242, 0.75)',
          border: '1px solid rgba(255, 152, 0, 0.18)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Countdown rail across the top of the shell. Keyed on the index so it
            replays from zero on every slide, manual or automatic. */}
        <Box aria-hidden sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', bgcolor: 'rgba(198,40,40,0.08)' }}>
          <Box
            key={`rail-${activeCategory}-${currentIndex}`}
            sx={{
              height: '100%',
              bgcolor: '#FF9800',
              transformOrigin: 'left center',
              animation: `ppr-progress ${SLIDE_MS}ms linear both`,
              animationPlayState: isPaused || filteredDishes.length <= 1 ? 'paused' : 'running',
            }}
          />
        </Box>

        {isLoadingDB && filteredDishes.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, p: { xs: 1, sm: 2 } }}>
            <Skeleton variant="rounded" sx={{ width: { xs: '100%', md: '50%' }, aspectRatio: { xs: '16 / 10', md: 'auto' }, minHeight: { md: 320 }, borderRadius: '20px' }} />
            <Box sx={{ width: { xs: '100%', md: '50%' }, py: 1 }}>
              <Skeleton width="40%" height={22} />
              <Skeleton width="80%" height={42} />
              <Skeleton width="100%" height={20} />
              <Skeleton width="90%" height={20} />
              <Skeleton width="55%" height={56} sx={{ mt: 3 }} />
            </Box>
          </Box>
        ) : filteredDishes.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: { xs: 6, md: 9 }, px: 3 }}>
            <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>🍽️</Typography>
            <Typography sx={{ fontWeight: 800, color: '#212121', mb: 0.5 }}>
              Nothing on the pass right now
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This category is being restocked — try another one above.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              transition: 'transform 0.55s cubic-bezier(0.25, 1, 0.5, 1)',
              transform: `translateX(-${currentIndex * 100}%)`,
              width: '100%',
            }}
          >
            {filteredDishes.map((dish, idx) => {
              const cartItem = cartState.items.find((i) => i.id === dish.id);
              const isLiked = !!likedIds[dish.id];

              return (
                <Box
                  key={dish.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${idx + 1} of ${filteredDishes.length}`}
                  aria-hidden={idx !== currentIndex}
                  sx={{
                    minWidth: '100%',
                    width: '100%',
                    flexShrink: 0,
                    px: { xs: 0.5, sm: 1.5, md: 2 },
                    py: { xs: 1, sm: 1.5 },
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
                      transition: 'box-shadow 0.3s ease',
                      '&:hover': { boxShadow: '0 16px 40px rgba(198,40,40,0.14)' },
                    }}
                  >
                    {/* Dish photo. An aspect ratio on phones and a stretched
                        half on desktop — no fixed pixel height to overflow. */}
                    <Box
                      sx={{
                        width: { xs: '100%', md: '48%' },
                        flexShrink: 0,
                        position: 'relative',
                        aspectRatio: { xs: '16 / 11', md: 'auto' },
                        minHeight: { md: 360 },
                        overflow: 'hidden',
                        '&:hover img': { transform: 'scale(1.07)' },
                      }}
                    >
                      <Box
                        component="img"
                        src={dish.image}
                        alt={dish.name}
                        loading={idx === 0 ? 'eager' : 'lazy'}
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'transform 0.6s ease',
                        }}
                        onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                          const img = e.target as HTMLImageElement;
                          // Guard against a fallback that itself 404s looping forever.
                          if (img.src !== FALLBACK_IMAGE) img.src = FALLBACK_IMAGE;
                        }}
                      />

                      <Box sx={{ position: 'absolute', top: 12, left: 12, right: 60, display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                        {dish.isSpecial && (
                          <Chip
                            label="🌟 Chef's Special"
                            size="small"
                            sx={{ bgcolor: '#FF9800', color: 'white', fontWeight: 800, fontSize: '11px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}
                          />
                        )}
                        {dish.isPopular && (
                          <Chip
                            label="🔥 Popular"
                            size="small"
                            sx={{ bgcolor: '#C62828', color: 'white', fontWeight: 800, fontSize: '11px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}
                          />
                        )}
                      </Box>

                      <IconButton
                        onClick={(e) => toggleLike(dish.id, e)}
                        aria-label={isLiked ? `Remove ${dish.name} from wishlist` : `Add ${dish.name} to wishlist`}
                        aria-pressed={isLiked}
                        sx={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          bgcolor: 'rgba(255,255,255,0.92)',
                          backdropFilter: 'blur(6px)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          '&:hover': { bgcolor: 'white', transform: 'scale(1.08)' },
                          transition: 'transform 0.2s ease',
                        }}
                      >
                        {isLiked
                          ? <Favorite sx={{ color: '#C62828', fontSize: 20 }} />
                          : <FavoriteBorder sx={{ color: '#616161', fontSize: 20 }} />}
                      </IconButton>

                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 12,
                          left: 12,
                          bgcolor: 'rgba(0,0,0,0.65)',
                          backdropFilter: 'blur(8px)',
                          color: 'white',
                          px: 1.4,
                          py: 0.5,
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.4,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Timer sx={{ fontSize: 14, color: '#FF9800' }} />
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>{dish.prepTime || 25} min</Typography>
                        </Box>
                        {dish.spiceLevel && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }} aria-label={`Spice level ${dish.spiceLevel} of 3`}>
                            {Array.from({ length: dish.spiceLevel }).map((_, i) => (
                              <LocalFireDepartment key={i} sx={{ fontSize: 13, color: spiceLevelColors[dish.spiceLevel! - 1] }} />
                            ))}
                          </Box>
                        )}
                      </Box>
                    </Box>

                    {/* Details */}
                    <Box
                      sx={{
                        width: { xs: '100%', md: '52%' },
                        p: { xs: 2.25, sm: 3, md: 3.5 },
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 2,
                        minWidth: 0,
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Box className={dish.vegStatus === 'veg' ? 'veg-indicator' : 'non-veg-indicator'} />
                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {dish.category}
                          </Typography>
                        </Box>

                        <Typography
                          component="h3"
                          sx={{
                            fontWeight: 800,
                            color: '#212121',
                            mb: 1,
                            lineHeight: 1.25,
                            fontSize: { xs: '1.3rem', sm: '1.6rem', md: '1.75rem' },
                          }}
                        >
                          {dish.name}
                        </Typography>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mb: 2,
                            lineHeight: 1.6,
                            // Descriptions come from the admin console and can be
                            // any length; clamping keeps every slide the same
                            // height so the track doesn't jump between dishes.
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {dish.description}
                        </Typography>

                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            bgcolor: 'rgba(255,152,0,0.12)',
                            px: 1.2,
                            py: 0.5,
                            borderRadius: '8px',
                          }}
                        >
                          <Star sx={{ color: '#FF9800', fontSize: 16 }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#D84315' }}>
                            {dish.rating}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ({dish.reviewCount} reviews)
                          </Typography>
                        </Box>
                      </Box>

                      <Box
                        sx={{
                          pt: 2,
                          borderTop: '1px solid rgba(0,0,0,0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 1.5,
                        }}
                      >
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', letterSpacing: 0.5 }}>
                            PRICE
                          </Typography>
                          <Typography sx={{ fontWeight: 900, color: '#C62828', fontSize: { xs: '1.6rem', md: '1.9rem' }, lineHeight: 1.15 }}>
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
                            <IconButton size="small" onClick={() => decreaseQty(dish.id)} aria-label={`Remove one ${dish.name}`}>
                              <Box sx={{ color: '#C62828', fontWeight: 800, fontSize: 18, lineHeight: 1, px: 0.5 }}>−</Box>
                            </IconButton>
                            <Typography sx={{ px: 1.5, fontWeight: 800, color: '#C62828', fontSize: 16 }}>
                              {cartItem.quantity}
                            </Typography>
                            <IconButton size="small" onClick={() => increaseQty(dish.id)} aria-label={`Add one more ${dish.name}`}>
                              <Add sx={{ color: '#C62828', fontSize: 20 }} />
                            </IconButton>
                          </Box>
                        ) : (
                          <Button
                            variant="contained"
                            onClick={() => {
                              addItem(dish);
                              toast.success(`${dish.name} added to cart! 🛒`, { icon: '🍽️' });
                            }}
                            startIcon={<Add />}
                            sx={{
                              borderRadius: '14px',
                              px: { xs: 2.5, sm: 3.5 },
                              py: 1.25,
                              fontSize: '15px',
                              fontWeight: 700,
                              background: 'linear-gradient(135deg, #C62828, #EF5350)',
                              boxShadow: '0 6px 20px rgba(198,40,40,0.35)',
                              '&:hover': {
                                background: 'linear-gradient(135deg, #B71C1C, #C62828)',
                                boxShadow: '0 8px 24px rgba(198,40,40,0.45)',
                                transform: 'translateY(-2px)',
                              },
                              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
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
        )}

        {/* Controls. Previously two absolutely-positioned arrows floated over
            the dish photo and the Add to Cart button; grouped down here they
            are reachable on every screen size and cover nothing. */}
        {filteredDishes.length > 1 && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 1.5,
              px: { xs: 1, sm: 2 },
              pt: 1,
              pb: 0.5,
            }}
          >
            <Box
              role="button"
              tabIndex={0}
              onClick={() => setIsPaused((p) => !p)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsPaused((p) => !p);
                }
              }}
              aria-label={isPaused ? 'Resume automatic sliding' : 'Pause automatic sliding'}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                cursor: 'pointer',
                color: 'text.secondary',
                borderRadius: '8px',
                flexShrink: 0,
                '&:hover': { color: '#C62828' },
                '&:focus-visible': { outline: '2px solid #C62828', outlineOffset: 3 },
              }}
            >
              {isPaused ? <PlayCircle fontSize="small" /> : <PauseCircle fontSize="small" />}
              <Typography variant="caption" sx={{ fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>
                {isPaused ? 'Paused' : 'Auto-sliding'}
              </Typography>
            </Box>

            {filteredDishes.length <= MAX_DOTS ? (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', minWidth: 0 }}>
                {filteredDishes.map((dish, idx) => (
                  <Box
                    key={dish.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Show dish ${idx + 1}`}
                    aria-current={currentIndex === idx}
                    onClick={() => goTo(idx)}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        goTo(idx);
                      }
                    }}
                    sx={{
                      width: currentIndex === idx ? 24 : 8,
                      height: 8,
                      borderRadius: 4,
                      bgcolor: currentIndex === idx ? '#C62828' : 'rgba(0,0,0,0.18)',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'width 0.3s ease, background-color 0.3s ease',
                      '&:hover': { bgcolor: '#C62828' },
                      '&:focus-visible': { outline: '2px solid #C62828', outlineOffset: 3 },
                    }}
                  />
                ))}
              </Box>
            ) : (
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', flexShrink: 0 }}>
                {currentIndex + 1} / {filteredDishes.length}
              </Typography>
            )}

            <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
              <IconButton onClick={handlePrev} aria-label="Previous dish" sx={navButtonSx}>
                <ChevronLeft fontSize="small" />
              </IconButton>
              <IconButton onClick={handleNext} aria-label="Next dish" sx={navButtonSx}>
                <ChevronRight fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
