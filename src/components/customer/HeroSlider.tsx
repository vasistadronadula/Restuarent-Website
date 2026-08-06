'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight, Star, Plus, ChevronLeft, ChevronRight,
  Trophy, UtensilsCrossed, Clock,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { flyToCart } from '@/lib/flyToCart';
import type { VegStatus } from '@/types';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const SLIDE_MS = 5500;
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
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) handleNext();
    else handlePrev();
  };

  const slide = HERO_SLIDES[currentSlide];

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured dishes"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative min-h-[580px] md:min-h-[min(82dvh,760px)] flex items-center overflow-hidden text-white bg-stone-950 w-full"
    >
      {HERO_SLIDES.map((s, idx) => {
        const isActive = idx === currentSlide;
        return (
          <div
            key={s.id}
            aria-hidden="true"
            className={`absolute inset-0 transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'} z-0`}
          >
            <div className={`absolute inset-0 ${isActive ? 'scale-105 transition-transform duration-[7000ms] ease-out' : 'scale-100'}`}>
              <Image
                src={s.img}
                alt=""
                fill
                priority={idx === 0}
                sizes="100vw"
                style={{ objectFit: 'cover' }}
              />
            </div>
          </div>
        );
      })}

      <div
        aria-hidden="true"
        className="absolute inset-0 z-1 bg-gradient-to-b from-stone-950/90 via-stone-950/80 to-amber-950/90 md:bg-gradient-to-r md:from-stone-950/95 md:via-stone-950/85 md:to-amber-900/60"
      />

      <div className="relative z-2 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-7">
            <div key={slide.id} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 backdrop-blur-md font-bold px-3 py-1 text-xs mb-4 inline-flex items-center gap-1.5 rounded-full">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                {slide.badge}
              </Badge>

              <h1 className="font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight leading-none mb-4 text-balance">
                {slide.titlePrefix}{' '}
                <span className="block bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent drop-shadow-sm">
                  {slide.titleHighlight}
                </span>
              </h1>

              <p className="text-stone-300 text-sm sm:text-base md:text-lg leading-relaxed mb-6 max-w-xl">
                {slide.desc}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 text-white font-bold rounded-xl shadow-lg shadow-amber-900/30 text-base"
                >
                  <Link href="/menu" className="flex items-center gap-2">
                    Explore Full Menu
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="bg-white/10 hover:bg-amber-500/20 text-white border-white/30 hover:border-amber-400 font-bold rounded-xl backdrop-blur-md text-base"
                >
                  <Link href="/reservation" className="flex items-center gap-2">
                    <UtensilsCrossed className="w-5 h-5" />
                    Reserve Table
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/20">
              {HERO_STATS.map((s) => (
                <div key={s.t}>
                  <div className="text-amber-300 font-black text-xl md:text-2xl">{s.n}</div>
                  <div className="text-stone-400 text-xs font-medium">{s.t}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden md:block md:col-span-5">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-5 border border-white/20 shadow-2xl shadow-black/50 transition-all">
              <div key={slide.featuredDish.id} className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden mb-4 animate-in fade-in duration-500">
                <Image
                  src={slide.featuredDish.image}
                  alt={slide.featuredDish.name}
                  fill
                  sizes="(max-width: 900px) 100vw, 420px"
                  style={{ objectFit: 'cover' }}
                  priority={currentSlide === 0}
                />
                <Badge className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md text-white font-bold text-xs flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  {slide.featuredDish.prepTime} min
                </Badge>
              </div>

              <div className="flex justify-between items-start gap-3 mb-3">
                <div>
                  <h3 className="font-extrabold text-white text-lg leading-snug">
                    {slide.featuredDish.name}
                  </h3>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-bold text-white/90">
                      {slide.featuredDish.rating} ({slide.featuredDish.reviewCount} reviews)
                    </span>
                  </div>
                </div>
                <div className="font-black text-amber-400 text-2xl">
                  ₹{slide.featuredDish.price}
                </div>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-extrabold rounded-xl py-3 shadow-md"
                onClick={(e) => {
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
                  flyToCart({
                    source: e.currentTarget,
                    imageUrl: slide.featuredDish.image,
                  });
                  toast.success(`${slide.featuredDish.name} added to cart`, { duration: 1800 });
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Order Featured Dish
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 mt-8 md:mt-10">
          <div className="flex items-center gap-2">
            {HERO_SLIDES.map((s, idx) => {
              const isActive = idx === currentSlide;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`Go to slide ${idx + 1}`}
                  onClick={() => goTo(idx)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    isActive ? 'w-10 bg-amber-500' : 'w-2.5 bg-white/40 hover:bg-white/70'
                  }`}
                />
              );
            })}
          </div>

          <div className="hidden md:flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrev}
              aria-label="Previous slide"
              className="bg-white/10 text-white border-white/20 hover:bg-amber-600 hover:border-amber-600 rounded-full w-10 h-10 backdrop-blur-md"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              aria-label="Next slide"
              className="bg-white/10 text-white border-white/20 hover:bg-amber-600 hover:border-amber-600 rounded-full w-10 h-10 backdrop-blur-md"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
