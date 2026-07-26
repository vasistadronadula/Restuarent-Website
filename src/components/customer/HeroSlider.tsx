'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Box, Container, Typography, Button, Stack, Chip, Grid, IconButton,
} from '@mui/material';
import {
  ArrowForward, Star, Add, ChevronLeft, ChevronRight,
  EmojiEvents, TableRestaurant,
} from '@mui/icons-material';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import type { VegStatus } from '@/types';
import toast from 'react-hot-toast';

const HERO_SLIDES = [
  {
    id: 'slide-1',
    badge: '🏆 #1 Authentic Dum Biryani – Hyderabad',
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
    badge: '🔥 Telangana & Rayalaseema Specialty',
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
    badge: '🍧 Traditional Royal Desserts',
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

export default function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const { addItem } = useCart();

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [isPaused]);

  const slide = HERO_SLIDES[currentSlide];

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  return (
    <Box
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      sx={{
        position: 'relative',
        minHeight: { xs: '65vh', md: '72vh' },
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        color: 'white',
      }}
    >
      {/* Background Slides */}
      {HERO_SLIDES.map((s, idx) => (
        <Box
          key={s.id}
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `linear-gradient(135deg, rgba(15, 3, 3, 0.92) 0%, rgba(198, 40, 40, 0.72) 100%), url(${s.img})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: idx === currentSlide ? 1 : 0,
            transform: idx === currentSlide ? 'scale(1)' : 'scale(1.06)',
            transition: 'opacity 1s ease-in-out, transform 1.2s ease-in-out',
            zIndex: idx === currentSlide ? 1 : 0,
          }}
        />
      ))}

      {/* Hero Foreground Content */}
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, pt: { xs: 4, md: 3 }, pb: 4 }}>
        <Grid container spacing={3} sx={{ alignItems: 'center' }}>
          {/* Left Text Column */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Box
              sx={{
                animation: 'fadeInUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)',
                '@keyframes fadeInUp': {
                  from: { opacity: 0, transform: 'translateY(24px)' },
                  to: { opacity: 1, transform: 'translateY(0)' },
                },
              }}
            >
              <Chip
                icon={<EmojiEvents sx={{ color: '#FF9800 !important' }} />}
                label={slide.badge}
                sx={{
                  bgcolor: 'rgba(255,152,0,0.22)',
                  color: '#FFD54F',
                  border: '1px solid rgba(255,152,0,0.45)',
                  backdropFilter: 'blur(10px)',
                  fontWeight: 800,
                  mb: 2,
                  fontSize: { xs: '10px', sm: '12px' },
                  px: 0.8,
                  height: 26,
                }}
              />

              <Typography
                variant="h1"
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: '2rem', sm: '2.8rem', md: '3.5rem' },
                  lineHeight: 1.15,
                  mb: 1.8,
                  letterSpacing: '-1px',
                  textShadow: '0 4px 20px rgba(0,0,0,0.5)',
                }}
              >
                {slide.titlePrefix} <br />
                <Box
                  component="span"
                  sx={{
                    background: 'linear-gradient(135deg, #FF9800 0%, #FFD54F 50%, #FFA726 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 2px 8px rgba(255,152,0,0.3))',
                  }}
                >
                  {slide.titleHighlight}
                </Box>
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  color: 'rgba(255,255,255,0.88)',
                  fontSize: { xs: '0.9rem', md: '1.05rem' },
                  fontWeight: 400,
                  lineHeight: 1.6,
                  mb: 3,
                  maxWidth: 540,
                }}
              >
                {slide.desc}
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3.5 }}>
                <Link href="/menu" style={{ textDecoration: 'none' }}>
                  <Button
                    variant="contained"
                    size="medium"
                    endIcon={<ArrowForward />}
                    sx={{
                      py: 1.2,
                      px: 3,
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #C62828 0%, #FF9800 100%)',
                      boxShadow: '0 6px 24px rgba(198,40,40,0.4)',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.25s ease',
                    }}
                  >
                    Explore Full Menu
                  </Button>
                </Link>
                <Link href="/reservation" style={{ textDecoration: 'none' }}>
                  <Button
                    variant="outlined"
                    size="medium"
                    startIcon={<TableRestaurant />}
                    sx={{
                      py: 1.2,
                      px: 3,
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'white',
                      borderColor: 'rgba(255,255,255,0.45)',
                      backdropFilter: 'blur(8px)',
                      bgcolor: 'rgba(255,255,255,0.06)',
                      '&:hover': {
                        borderColor: '#FF9800',
                        color: '#FF9800',
                        bgcolor: 'rgba(255,152,0,0.15)',
                      },
                      transition: 'all 0.25s ease',
                    }}
                  >
                    Reserve Table
                  </Button>
                </Link>
              </Stack>

              {/* Stats Bar */}
              <Box
                sx={{
                  display: 'flex',
                  gap: { xs: 3, sm: 4 },
                  flexWrap: 'wrap',
                  pt: 2.5,
                  borderTop: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                {[
                  { n: '500k+', t: 'Happy Diners' },
                  { n: '4.9 ★', t: 'Customer Rating' },
                  { n: '100+', t: 'Authentic Dishes' },
                  { n: '30 Min', t: 'Fast Delivery' },
                ].map((s) => (
                  <Box key={s.t}>
                    <Typography variant="h5" sx={{ color: '#FFD54F', fontWeight: 800 }}>
                      {s.n}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px' }}>
                      {s.t}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Grid>

          {/* Right Floating Showcase Card */}
          <Grid size={{ xs: 12, md: 5 }} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Box
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                p: 3,
                border: '1px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
                position: 'relative',
                animation: 'float 4s ease-in-out infinite',
                '@keyframes float': {
                  '0%, 100%': { transform: 'translateY(0px)' },
                  '50%': { transform: 'translateY(-10px)' },
                },
              }}
            >
              <Box sx={{ position: 'relative', width: '100%', height: 230, borderRadius: '16px', overflow: 'hidden', mb: 2 }}>
                <Image
                  src={slide.featuredDish.image}
                  alt={slide.featuredDish.name}
                  fill
                  sizes="(max-width: 900px) 100vw, 420px"
                  style={{ objectFit: 'cover' }}
                  priority={currentSlide === 0}
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'white', lineHeight: 1.3 }}>
                    {slide.featuredDish.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Star sx={{ color: '#FF9800', fontSize: 16 }} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'white' }}>
                      {slide.featuredDish.rating} ({slide.featuredDish.reviewCount})
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#FFD54F' }}>
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
                  boxShadow: '0 4px 15px rgba(255,152,0,0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #F57C00, #E65100)',
                  },
                }}
              >
                Order Featured Dish
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Hero Slide Arrows */}
      <IconButton
        onClick={handlePrev}
        sx={{
          position: 'absolute',
          left: 20,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 5,
          color: 'white',
          bgcolor: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.2)',
          '&:hover': { bgcolor: '#C62828', transform: 'translateY(-50%) scale(1.1)' },
          transition: 'all 0.25s',
        }}
      >
        <ChevronLeft fontSize="large" />
      </IconButton>

      <IconButton
        onClick={handleNext}
        sx={{
          position: 'absolute',
          right: 20,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 5,
          color: 'white',
          bgcolor: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.2)',
          '&:hover': { bgcolor: '#C62828', transform: 'translateY(-50%) scale(1.1)' },
          transition: 'all 0.25s',
        }}
      >
        <ChevronRight fontSize="large" />
      </IconButton>

      {/* Hero Slide Dots */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 5,
          display: 'flex',
          gap: 1.5,
        }}
      >
        {HERO_SLIDES.map((_, idx) => (
          <Box
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            sx={{
              width: currentSlide === idx ? 32 : 10,
              height: 10,
              borderRadius: 5,
              bgcolor: currentSlide === idx ? '#FF9800' : 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: currentSlide === idx ? '0 0 10px #FF9800' : 'none',
              '&:hover': { bgcolor: '#FF9800' },
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
