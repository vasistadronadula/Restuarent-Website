'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Box, Container, Typography, Button, Stack, Chip, Grid, IconButton,
} from '@mui/material';
import {
  ArrowForward, Star, Add, ChevronLeft, ChevronRight,
  EmojiEvents, TableRestaurant, Timer,
} from '@mui/icons-material';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import type { VegStatus } from '@/types';
import toast from 'react-hot-toast';

const SLIDE_MS = 5500;
/** Horizontal travel, in px, that counts as a swipe rather than a tap or scroll. */
const SWIPE_THRESHOLD = 45;

const HERO_SLIDES = [
  {
    id: 'slide-1',
    badge: '#1 Authentic Dum Biryani – Hyderabad',
    titlePrefix: 'Experience Royal',
    titleHighlight: 'Pala Pitta Dum Biryani',
    desc: 'Savour traditional Telangana & Andhra flavours, slow-cooked in brass handis with hand-ground spices and pure cow ghee.',
    img: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=1600&q=80',
    featuredDish: {
      id: 'biry-01',
      name: 'Pala Pitta Special Dum Biryani',
      price: 349,
      rating: 4.9,
      reviewCount: 420,
      image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80',
      prepTime: 25,
      vegStatus: 'non-veg',
    },
  },
  {
    id: 'slide-2',
    badge: 'Telangana & Rayalaseema Specialty',
    titlePrefix: 'Authentic Smoky',
    titleHighlight: 'Kamju Pitta Fry & Natukodi',
    desc: 'Tender quail fry marinated in rustic spices and traditional country chicken pulusu served with piping hot Ragi Sangati.',
    img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=1600&q=80',
    featuredDish: {
      id: 'star-01',
      name: 'Kamju Pitta Fry (Quail Special)',
      price: 299,
      rating: 4.8,
      reviewCount: 280,
      image: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=500&q=80',
      prepTime: 20,
      vegStatus: 'non-veg',
    },
  },
  {
    id: 'slide-3',
    badge: 'Traditional Royal Desserts',
    titlePrefix: 'Indulge in Sweet',
    titleHighlight: 'Hyderabadi Apricot Delight',
    desc: 'Handcrafted traditional desserts, Double Ka Meetha, hot Bobbatlu with ghee, and creamy Apricot Delight.',
    img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1600&q=80',
    featuredDish: {
      id: 'des-01',
      name: 'Hyderabadi Apricot Delight',
      price: 149,
      rating: 4.9,
      reviewCount: 310,
      image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&q=80',
      prepTime: 10,
      vegStatus: 'veg',
    },
  },
];

const HERO_STATS = [
  { n: '500k+', t: 'Happy Diners' },
  { n: '4.9 ★', t: 'Customer Rating' },
  { n: '100+', t: 'Authentic Dishes' },
  { n: '30 Min', t: 'Fast Delivery' },
];

export default function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const { addItem } = useCart();

  const goTo = useCallback((index: number) => {
    setCurrentSlide(((index % HERO_SLIDES.length) + HERO_SLIDES.length) % HERO_SLIDES.length);
  }, []);

  const handlePrev = useCallback(() => goTo(currentSlide - 1), [goTo, currentSlide]);
  const handleNext = useCallback(() => goTo(currentSlide + 1), [goTo, currentSlide]);

  // `currentSlide` is a dependency on purpose: any manual navigation restarts
  // the countdown, so a slide the visitor just chose never flips away early.
  useEffect(() => {
    if (isPaused) return;
    const timer = setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, SLIDE_MS);
    return () => clearTimeout(timer);
  }, [isPaused, currentSlide]);

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
    // Only act on a mostly-horizontal gesture, otherwise a vertical scroll that
    // drifts sideways would yank the carousel out from under the reader.
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) handleNext();
    else handlePrev();
  };

  const slide = HERO_SLIDES[currentSlide];

  const arrowSx = {
    color: 'white',
    bgcolor: 'rgba(255,255,255,0.12)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.25)',
    width: 40,
    height: 40,
    '&:hover': { bgcolor: '#C62828', borderColor: '#C62828' },
    transition: 'background-color 0.25s ease, border-color 0.25s ease',
  } as const;

  return (
    <Box
      component="section"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured dishes"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      sx={{
        position: 'relative',
        // Content-driven on phones so nothing is ever clipped or overlapped;
        // a capped viewport fraction on larger screens so the hero still fills
        // the fold. dvh, not vh — vh is measured against the viewport with the
        // mobile address bar retracted and overflows once it is showing.
        minHeight: { xs: 'auto', md: 'min(82dvh, 760px)' },
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        color: 'white',
        bgcolor: '#160808',
      }}
    >
      {/* Background layer: one <Image> per slide, cross-faded. */}
      {HERO_SLIDES.map((s, idx) => {
        const isActive = idx === currentSlide;
        return (
          <Box
            key={s.id}
            aria-hidden
            sx={{
              position: 'absolute',
              inset: 0,
              opacity: isActive ? 1 : 0,
              transition: 'opacity 900ms ease-in-out',
              zIndex: 0,
            }}
          >
            {/* The push-in scales this wrapper rather than the <Image>, whose
                own `fill` positioning must stay untouched. Keyed on the active
                index so the motion restarts each time the slide comes round. */}
            <Box
              key={isActive ? `kb-${currentSlide}` : 'kb-idle'}
              sx={{
                position: 'absolute',
                inset: 0,
                animation: isActive ? `ppr-ken-burns ${SLIDE_MS + 1500}ms ease-out both` : 'none',
              }}
            >
              <Image
                src={s.img}
                alt=""
                fill
                priority={idx === 0}
                sizes="100vw"
                style={{ objectFit: 'cover' }}
              />
            </Box>
          </Box>
        );
      })}

      {/* Legibility scrim. Sits above the photos, below every bit of content. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background: {
            xs: 'linear-gradient(180deg, rgba(15,3,3,0.86) 0%, rgba(15,3,3,0.78) 45%, rgba(114,20,20,0.82) 100%)',
            md: 'linear-gradient(105deg, rgba(15,3,3,0.94) 0%, rgba(15,3,3,0.80) 45%, rgba(198,40,40,0.62) 100%)',
          },
        }}
      />

      <Container
        maxWidth="lg"
        sx={{
          position: 'relative',
          zIndex: 2,
          px: { xs: 2.5, sm: 3, md: 4 },
          py: { xs: 5, sm: 6, md: 8 },
        }}
      >
        <Grid container spacing={{ xs: 4, md: 5 }} sx={{ alignItems: 'center' }}>
          {/* Copy column */}
          <Grid size={{ xs: 12, md: 7 }}>
            {/* Keyed on the slide so the entrance replays on every change. */}
            <Box key={slide.id} sx={{ animation: 'ppr-fade-up 700ms cubic-bezier(0.2, 0.8, 0.2, 1) both' }}>
              <Chip
                icon={<EmojiEvents sx={{ color: '#FFB74D !important' }} />}
                label={slide.badge}
                sx={{
                  bgcolor: 'rgba(255,152,0,0.20)',
                  color: '#FFD54F',
                  border: '1px solid rgba(255,152,0,0.45)',
                  backdropFilter: 'blur(10px)',
                  fontWeight: 800,
                  mb: { xs: 2, md: 2.5 },
                  fontSize: { xs: '10.5px', sm: '12px' },
                  letterSpacing: 0.3,
                  height: 28,
                  maxWidth: '100%',
                  '& .MuiChip-label': { px: 1, overflow: 'hidden', textOverflow: 'ellipsis' },
                }}
              />

              <Typography
                variant="h1"
                sx={{
                  fontWeight: 900,
                  // clamp() keeps the headline proportional at every width in
                  // between the breakpoints, including foldables and tablets.
                  fontSize: { xs: 'clamp(1.9rem, 8.5vw, 2.6rem)', sm: '2.9rem', md: 'clamp(2.8rem, 4.4vw, 3.6rem)' },
                  lineHeight: 1.12,
                  mb: { xs: 1.5, md: 2 },
                  letterSpacing: '-0.02em',
                  textShadow: '0 4px 24px rgba(0,0,0,0.45)',
                  textWrap: 'balance',
                }}
              >
                {slide.titlePrefix}{' '}
                <Box
                  component="span"
                  sx={{
                    display: 'block',
                    background: 'linear-gradient(135deg, #FF9800 0%, #FFD54F 50%, #FFA726 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 2px 10px rgba(255,152,0,0.35))',
                  }}
                >
                  {slide.titleHighlight}
                </Box>
              </Typography>

              <Typography
                sx={{
                  color: 'rgba(255,255,255,0.86)',
                  fontSize: { xs: '0.94rem', md: '1.06rem' },
                  fontWeight: 400,
                  lineHeight: 1.65,
                  mb: { xs: 3, md: 3.5 },
                  maxWidth: 560,
                }}
              >
                {slide.desc}
              </Typography>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                sx={{ mb: { xs: 3.5, md: 4 } }}
              >
                <Button
                  component={Link}
                  href="/menu"
                  variant="contained"
                  endIcon={<ArrowForward />}
                  sx={{
                    py: 1.35,
                    px: 3.2,
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #C62828 0%, #FF9800 100%)',
                    boxShadow: '0 10px 30px rgba(198,40,40,0.45)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #B71C1C 0%, #F57C00 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 14px 34px rgba(198,40,40,0.55)',
                    },
                    transition: 'transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease',
                  }}
                >
                  Explore Full Menu
                </Button>
                <Button
                  component={Link}
                  href="/reservation"
                  variant="outlined"
                  startIcon={<TableRestaurant />}
                  sx={{
                    py: 1.35,
                    px: 3.2,
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: 700,
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.45)',
                    backdropFilter: 'blur(8px)',
                    bgcolor: 'rgba(255,255,255,0.08)',
                    '&:hover': {
                      borderColor: '#FF9800',
                      color: '#FFD54F',
                      bgcolor: 'rgba(255,152,0,0.16)',
                      transform: 'translateY(-2px)',
                    },
                    transition: 'transform 0.25s ease, background-color 0.25s ease, border-color 0.25s ease',
                  }}
                >
                  Reserve Table
                </Button>
              </Stack>
            </Box>

            {/* Stats sit outside the keyed block — they are the same on every
                slide, so re-animating them on each change would be noise.
                A 2×2 grid on phones instead of a wrapping row: fixed columns
                can't leave one orphan stat stranded on its own line. */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, auto)' },
                columnGap: { xs: 2, sm: 3.5, md: 4.5 },
                rowGap: 2,
                justifyContent: { sm: 'flex-start' },
                pt: 2.5,
                borderTop: '1px solid rgba(255,255,255,0.18)',
              }}
            >
              {HERO_STATS.map((s) => (
                <Box key={s.t} sx={{ minWidth: 0 }}>
                  <Typography sx={{ color: '#FFD54F', fontWeight: 800, fontSize: { xs: '1.25rem', md: '1.45rem' }, lineHeight: 1.2 }}>
                    {s.n}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontSize: '12px', fontWeight: 500 }}>
                    {s.t}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Grid>

          {/* Featured dish card — desktop only. On phones the same dish is one
              tap away in the showcase below, and stacking it here would push
              the primary CTAs off the fold. */}
          <Grid size={{ xs: 12, md: 5 }} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Box
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.10)',
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                p: 2.5,
                border: '1px solid rgba(255, 255, 255, 0.22)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
                animation: 'ppr-float 5s ease-in-out infinite',
              }}
            >
              <Box
                key={slide.featuredDish.id}
                sx={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '4 / 3',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  mb: 2,
                  animation: 'ppr-fade-in 600ms ease both',
                }}
              >
                <Image
                  src={slide.featuredDish.image}
                  alt={slide.featuredDish.name}
                  fill
                  sizes="(max-width: 900px) 100vw, 420px"
                  style={{ objectFit: 'cover' }}
                  priority={currentSlide === 0}
                />
                <Chip
                  icon={<Timer sx={{ fontSize: 14, color: '#FFD54F !important' }} />}
                  label={`${slide.featuredDish.prepTime} min`}
                  size="small"
                  sx={{
                    position: 'absolute',
                    bottom: 10,
                    left: 10,
                    bgcolor: 'rgba(0,0,0,0.62)',
                    backdropFilter: 'blur(8px)',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '11px',
                  }}
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5, mb: 0.5 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, color: 'white', lineHeight: 1.3, fontSize: '1rem' }}>
                    {slide.featuredDish.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: 0.5 }}>
                    <Star sx={{ color: '#FF9800', fontSize: 16 }} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                      {slide.featuredDish.rating} ({slide.featuredDish.reviewCount} reviews)
                    </Typography>
                  </Box>
                </Box>
                <Typography sx={{ fontWeight: 900, color: '#FFD54F', fontSize: '1.6rem', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                  ₹{slide.featuredDish.price}
                </Typography>
              </Box>

              <Button
                fullWidth
                variant="contained"
                onClick={() => {
                  addItem({
                    id: slide.featuredDish.id,
                    name: slide.featuredDish.name,
                    price: slide.featuredDish.price,
                    image: slide.featuredDish.image,
                    category: 'biryani',
                    rating: slide.featuredDish.rating,
                    reviewCount: slide.featuredDish.reviewCount,
                    isPopular: true,
                    isSpecial: true,
                    isAvailable: true,
                    description: slide.desc,
                    prepTime: slide.featuredDish.prepTime,
                    vegStatus: slide.featuredDish.vegStatus as VegStatus,
                    tags: ['Special', 'Bestseller'],
                  });
                  toast.success(`${slide.featuredDish.name} added to cart! 🛒`);
                }}
                startIcon={<Add />}
                sx={{
                  mt: 1.5,
                  py: 1.2,
                  borderRadius: '12px',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #FF9800, #F57C00)',
                  color: 'white',
                  boxShadow: '0 6px 20px rgba(255,152,0,0.4)',
                  '&:hover': { background: 'linear-gradient(135deg, #F57C00, #E65100)' },
                }}
              >
                Order Featured Dish
              </Button>
            </Box>
          </Grid>
        </Grid>

        {/* Carousel controls live in the content flow, not floated over it.
            Absolutely-positioned side arrows used to sit directly on top of
            the headline and the stats row at narrow widths. */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: { xs: 'center', md: 'space-between' },
            gap: 2,
            mt: { xs: 4, md: 5 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            {HERO_SLIDES.map((s, idx) => {
              const isActive = idx === currentSlide;
              return (
                <Box
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Go to slide ${idx + 1}`}
                  aria-current={isActive}
                  onClick={() => goTo(idx)}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      goTo(idx);
                    }
                  }}
                  sx={{
                    width: isActive ? 40 : 10,
                    height: 10,
                    borderRadius: 5,
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    bgcolor: isActive ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.38)',
                    transition: 'width 0.35s cubic-bezier(0.22, 0.61, 0.36, 1), background-color 0.25s ease',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.6)' },
                    '&:focus-visible': { outline: '2px solid #FFD54F', outlineOffset: 3 },
                  }}
                >
                  {isActive && (
                    // Fills left-to-right over exactly one slide interval, so the
                    // dot doubles as a countdown to the next change.
                    <Box
                      key={`progress-${currentSlide}`}
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        bgcolor: '#FF9800',
                        transformOrigin: 'left center',
                        animation: `ppr-progress ${SLIDE_MS}ms linear both`,
                        animationPlayState: isPaused ? 'paused' : 'running',
                      }}
                    />
                  )}
                </Box>
              );
            })}
          </Box>

          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
            <IconButton onClick={handlePrev} aria-label="Previous slide" sx={arrowSx}>
              <ChevronLeft />
            </IconButton>
            <IconButton onClick={handleNext} aria-label="Next slide" sx={arrowSx}>
              <ChevronRight />
            </IconButton>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
