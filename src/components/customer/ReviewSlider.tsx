'use client';

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Rating, Avatar, Paper, IconButton, Chip,
} from '@mui/material';
import { ChevronLeft, ChevronRight, FormatQuote } from '@mui/icons-material';
import { reviews } from '@/data/mockData';

export default function ReviewSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % reviews.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isPaused]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? reviews.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % reviews.length);
  };

  return (
    <Box
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      sx={{
        position: 'relative',
        maxWidth: 860,
        mx: 'auto',
        px: { xs: 2, sm: 4 },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 5 },
          borderRadius: '24px',
          bgcolor: 'white',
          boxShadow: '0 12px 40px rgba(0,0,0,0.07)',
          border: '1px solid rgba(198,40,40,0.1)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Quote Watermark Icon */}
        <FormatQuote
          sx={{
            position: 'absolute',
            top: 20,
            right: 24,
            fontSize: 90,
            color: 'rgba(198,40,40,0.06)',
            transform: 'rotate(180deg)',
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 2 }}>
          {/* Rating */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Rating value={reviews[currentIndex].rating} readOnly precision={0.5} size="medium" />
            <Chip
              label={`${reviews[currentIndex].rating}.0 Verified Diner`}
              size="small"
              sx={{ bgcolor: 'rgba(46,125,50,0.1)', color: '#2E7D32', fontWeight: 700, fontSize: '11px' }}
            />
          </Box>

          {/* Comment */}
          <Typography
            variant="h6"
            sx={{
              fontWeight: 500,
              color: '#333',
              fontStyle: 'italic',
              lineHeight: 1.7,
              minHeight: 90,
              mb: 3,
              fontSize: { xs: '1rem', sm: '1.2rem' },
            }}
          >
            &quot;{reviews[currentIndex].comment}&quot;
          </Typography>

          {/* Diner details */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              pt: 2.5,
              borderTop: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                sx={{
                  bgcolor: '#C62828',
                  width: 48,
                  height: 48,
                  fontSize: '18px',
                  fontWeight: 800,
                  boxShadow: '0 4px 12px rgba(198,40,40,0.3)',
                }}
              >
                {reviews[currentIndex].avatar}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#212121' }}>
                  {reviews[currentIndex].customerName}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Ordered: <strong style={{ color: '#C62828' }}>{reviews[currentIndex].dish}</strong> • {reviews[currentIndex].date}
                </Typography>
              </Box>
            </Box>

            {/* Slider Arrow Controls */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton
                onClick={handlePrev}
                size="small"
                sx={{
                  bgcolor: '#FFF8F2',
                  border: '1px solid #FFCCBC',
                  color: '#C62828',
                  '&:hover': { bgcolor: '#C62828', color: 'white' },
                  transition: 'all 0.2s',
                }}
              >
                <ChevronLeft />
              </IconButton>
              <IconButton
                onClick={handleNext}
                size="small"
                sx={{
                  bgcolor: '#FFF8F2',
                  border: '1px solid #FFCCBC',
                  color: '#C62828',
                  '&:hover': { bgcolor: '#C62828', color: 'white' },
                  transition: 'all 0.2s',
                }}
              >
                <ChevronRight />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Dots Indicator */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 3 }}>
        {reviews.map((_, idx) => (
          <Box
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            sx={{
              width: currentIndex === idx ? 20 : 8,
              height: 8,
              borderRadius: 4,
              bgcolor: currentIndex === idx ? '#C62828' : 'rgba(0,0,0,0.18)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
