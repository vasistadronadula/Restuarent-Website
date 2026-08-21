'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Quote, CheckCircle2, Star } from 'lucide-react';
import { reviews } from '@/data/reviews';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const SLIDE_MS = 5000;
const SWIPE_THRESHOLD = 45;

export default function ReviewSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

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

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Customer reviews"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative max-w-4xl mx-auto w-full"
    >
      <div className="p-6 sm:p-10 rounded-3xl bg-white dark:bg-stone-900 border border-amber-900/10 dark:border-stone-800 shadow-xl shadow-amber-950/5 relative overflow-hidden transition-all">
        <Quote
          aria-hidden="true"
          className="absolute top-4 right-6 w-20 h-20 sm:w-28 sm:h-28 text-amber-600/5 rotate-180 pointer-events-none select-none"
        />

        <div key={review.id} className="relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-1 text-amber-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300 dark:text-stone-700'}`}
                />
              ))}
            </div>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-semibold text-xs flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {review.rating}.0 Verified Diner
            </Badge>
          </div>

          <blockquote className="font-medium text-stone-700 dark:text-stone-300 italic leading-relaxed min-h-[110px] mb-6 text-base sm:text-lg">
            &quot;{review.comment}&quot;
          </blockquote>

          <div className="flex items-center gap-4 pt-4 border-t border-stone-100 dark:border-stone-800">
            <Avatar className="w-12 h-12 border-2 border-amber-600 shadow-md">
              <AvatarFallback className="bg-amber-700 text-white font-extrabold text-base">
                {review.avatar}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h4 className="font-extrabold text-stone-900 dark:text-stone-100 text-base">
                {review.customerName}
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Ordered <strong className="text-amber-700 dark:text-amber-500">{review.dish}</strong> • {review.date}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mt-6">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrev}
          aria-label="Previous review"
          className="w-10 h-10 rounded-full border-amber-200 dark:border-stone-800 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-600 text-amber-800 dark:text-stone-200 transition-all shadow-xs"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div className="flex gap-2 items-center">
          {reviews.map((r, idx) => (
            <button
              key={r.id}
              type="button"
              aria-label={`Show review ${idx + 1}`}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                currentIndex === idx ? 'w-7 bg-amber-600' : 'w-2.5 bg-stone-300 dark:bg-stone-700 hover:bg-amber-600'
              }`}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          aria-label="Next review"
          className="w-10 h-10 rounded-full border-amber-200 dark:border-stone-800 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-600 text-amber-800 dark:text-stone-200 transition-all shadow-xs"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
