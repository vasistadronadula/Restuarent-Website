'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Rating, Avatar, Paper, IconButton, Chip,
} from '@mui/material';
import { ChevronLeft, ChevronRight, FormatQuote, Verified } from '@mui/icons-material';
import { reviews } from '@/data/mockData';

const SLIDE_MS = 5000;
const SWIPE_THRESHOLD = 45;

export default function ReviewSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // `currentIndex` in the deps restarts the countdown after manual navigation.
  useEffect(() => {
    if (isPaused || reviews.length <= 1) return;
    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % reviews.length);
    }, SLIDE_MS);
    return () => clearTimeout(timer);
  }, [isPaused, currentIndex]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? reviews.length - 1 : prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % reviews.length);
  }, []);

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

  const review = reviews[currentIndex];

  const arrowSx = {
    bgcolor: 'white',
    border: '1px solid #FFCCBC',
    color: '#C62828',
    width: 38,
    height: 38,
    flexShrink: 0,
    boxShadow: '0 3px 12px rgba(0,0,0,0.06)',
    '&:hover': { bgcolor: '#C62828', color: 'white', borderColor: '#C62828' },
    transition: 'background-color 0.2s ease, color 0.2s ease',
  } as const;

  return (
    <Box
      role="region"
      aria-roledescription="carousel"
      aria-label="Customer reviews"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      sx={{ position: 'relative', maxWidth: 880, mx: 'auto', width: '100%' }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 4, md: 5 },
          borderRadius: '24px',
          bgcolor: 'white',
          boxShadow: '0 12px 40px rgba(0,0,0,0.07)',
          border: '1px solid rgba(198,40,40,0.1)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Watermark. Clipped by the card's own overflow, and pushed behind the
            copy by the content wrapper's z-index below. */}
        <FormatQuote
          aria-hidden
          sx={{
            position: 'absolute',
            top: 12,
            right: 16,
            fontSize: { xs: 64, sm: 90 },
            color: 'rgba(198,40,40,0.06)',
            transform: 'rotate(180deg)',
            pointerEvents: 'none',
          }}
        />

        {/* Keyed on the review so each one fades up as it arrives. */}
        <Box key={review.id} sx={{ position: 'relative', zIndex: 2, animation: 'ppr-fade-up 500ms ease both' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Rating value={review.rating} readOnly precision={0.5} size="small" />
            <Chip
              icon={<Verified sx={{ fontSize: 14, color: '#2E7D32 !important' }} />}
              label={`${review.rating}.0 Verified Diner`}
              size="small"
              sx={{ bgcolor: 'rgba(46,125,50,0.1)', color: '#2E7D32', fontWeight: 700, fontSize: '11px' }}
            />
          </Box>

          {/* A floor under the quote keeps the card from resizing between a
              one-line review and a four-line one, which would jolt the whole
              section on every auto-advance. */}
          <Typography
            component="blockquote"
            sx={{
              fontWeight: 500,
              color: '#333',
              fontStyle: 'italic',
              lineHeight: 1.7,
              minHeight: { xs: 132, sm: 112 },
              mb: 3,
              fontSize: { xs: '0.98rem', sm: '1.15rem' },
            }}
          >
            &quot;{review.comment}&quot;
          </Typography>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              pt: 2.5,
              borderTop: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <Avatar
              sx={{
                bgcolor: '#C62828',
                width: 48,
                height: 48,
                fontSize: '17px',
                fontWeight: 800,
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(198,40,40,0.3)',
              }}
            >
              {review.avatar}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800, color: '#212121', fontSize: '1rem' }}>
                {review.customerName}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.5 }}>
                Ordered <Box component="strong" sx={{ color: '#C62828' }}>{review.dish}</Box> • {review.date}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Controls sit under the card, arrows flanking the dots. The previous
          layout tucked them inside the card beside the diner's name, where they
          collided with long names on narrow screens. */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mt: 3 }}>
        <IconButton onClick={handlePrev} aria-label="Previous review" sx={arrowSx}>
          <ChevronLeft fontSize="small" />
        </IconButton>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {reviews.map((r, idx) => (
            <Box
              key={r.id}
              role="button"
              tabIndex={0}
              aria-label={`Show review ${idx + 1}`}
              aria-current={currentIndex === idx}
              onClick={() => setCurrentIndex(idx)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setCurrentIndex(idx);
                }
              }}
              sx={{
                width: currentIndex === idx ? 22 : 8,
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

        <IconButton onClick={handleNext} aria-label="Next review" sx={arrowSx}>
          <ChevronRight fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}
