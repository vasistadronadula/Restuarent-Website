'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Minus, Star, Flame,
  Clock, Heart, Sparkles, Play, Pause,
} from 'lucide-react';

import { useCart } from '@/context/CartContext';
import { useAdmin } from '@/context/AdminContext';
import { flyToCart } from '@/lib/flyToCart';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const SLIDE_MS = 4500;
const SWIPE_THRESHOLD = 45;
const MAX_DOTS = 8;

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
  const currentIndex = Math.min(rawIndex, maxIndex);

  const goTo = useCallback((index: number) => {
    const count = maxIndex + 1;
    setRawIndex(((index % count) + count) % count);
  }, [maxIndex]);

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

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="Most loved dishes"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full"
    >
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-stone-900 dark:text-stone-100 text-xl md:text-2xl tracking-tight">
              Animated Dish Showcase
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Swipe or slide through our mouth-watering specialties
            </p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 w-full lg:w-auto scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <Button
                key={cat.id}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleCategoryChange(cat.id)}
                className={`rounded-full px-4 text-xs font-bold transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20'
                    : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800'
                }`}
              >
                {cat.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative rounded-3xl p-3 sm:p-4 bg-amber-500/5 dark:bg-stone-900/60 border border-amber-500/20 shadow-sm overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500/10">
          <div
            key={`rail-${activeCategory}-${currentIndex}`}
            className="h-full bg-amber-600 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / filteredDishes.length) * 100}%` }}
          />
        </div>

        {isLoadingDB && filteredDishes.length === 0 ? (
          <div className="flex flex-col md:flex-row gap-4 p-4">
            <Skeleton className="w-full md:w-1/2 h-64 rounded-2xl" />
            <div className="w-full md:w-1/2 space-y-3">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-12 w-1/2" />
            </div>
          </div>
        ) : filteredDishes.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="text-4xl mb-2">🍽️</div>
            <h3 className="font-extrabold text-stone-900 dark:text-stone-100 mb-1">
              Nothing on the pass right now
            </h3>
            <p className="text-xs text-stone-500">
              This category is being restocked — try another one above.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden w-full">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {filteredDishes.map((dish, idx) => {
                const cartItem = cartState.items.find((i) => i.id === dish.id);
                const isLiked = !!likedIds[dish.id];

                return (
                  <div key={dish.id} className="min-w-full w-full flex-shrink-0 p-1 sm:p-2 box-border">
                    <div className="bg-white dark:bg-stone-900 rounded-2xl overflow-hidden border border-stone-200/80 dark:border-stone-800 shadow-md flex flex-col md:flex-row items-stretch transition-shadow hover:shadow-xl">
                      <div className="w-full md:w-1/2 relative aspect-[16/11] md:aspect-auto md:min-h-[340px] overflow-hidden group">
                        <img
                          src={dish.image || FALLBACK_IMAGE}
                          alt={dish.name}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                          }}
                        />

                        <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                          {dish.isSpecial && (
                            <Badge className="bg-amber-500 text-white font-bold text-xs">
                              🌟 Chef&apos;s Special
                            </Badge>
                          )}
                          {dish.isPopular && (
                            <Badge className="bg-rose-600 text-white font-bold text-xs">
                              🔥 Popular
                            </Badge>
                          )}
                        </div>

                        <Button
                          variant="outline"
                          size="icon"
                          onClick={(e) => toggleLike(dish.id, e)}
                          className="absolute top-3 right-3 rounded-full bg-white/90 dark:bg-stone-900/90 border-none shadow-md hover:scale-110"
                        >
                          <Heart
                            className={`w-4 h-4 ${isLiked ? 'fill-rose-600 text-rose-600' : 'text-stone-500'}`}
                          />
                        </Button>

                        <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md text-white px-3 py-1 rounded-lg flex items-center gap-2 text-xs font-semibold">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>{dish.prepTime || 25} min</span>
                          {dish.spiceLevel && (
                            <div className="flex items-center gap-0.5 ml-1">
                              {Array.from({ length: dish.spiceLevel }).map((_, i) => (
                                <Flame key={i} className="w-3 h-3 text-orange-500 fill-orange-500" />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="w-full md:w-1/2 p-6 flex flex-col justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${dish.vegStatus === 'veg' ? 'bg-emerald-500' : 'bg-rose-600'}`} />
                            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                              {dish.category}
                            </span>
                          </div>

                          <h3 className="font-extrabold text-stone-900 dark:text-stone-100 text-xl sm:text-2xl mb-2">
                            {dish.name}
                          </h3>

                          <p className="text-stone-600 dark:text-stone-400 text-sm line-clamp-3 mb-4 leading-relaxed">
                            {dish.description}
                          </p>

                          <div className="inline-flex items-center gap-1.5 bg-amber-500/10 px-3 py-1 rounded-lg text-amber-700 dark:text-amber-400 font-bold text-xs">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span>{dish.rating}</span>
                            <span className="text-stone-400">({dish.reviewCount} reviews)</span>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] font-bold text-stone-400 tracking-wider">PRICE</div>
                            <div className="font-black text-amber-700 dark:text-amber-500 text-2xl sm:text-3xl">
                              ₹{dish.price}
                            </div>
                          </div>

                          {cartItem ? (
                            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-600/30 rounded-xl p-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
                                onClick={() => decreaseQty(dish.id)}
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <span className="font-extrabold text-amber-700 dark:text-amber-400 text-base px-2">
                                {cartItem.quantity}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
                                onClick={() => increaseQty(dish.id)}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl px-5 py-2.5 shadow-md"
                              onClick={(e) => {
                                addItem(dish);
                                flyToCart({ source: e.currentTarget, imageUrl: dish.image });
                                toast.success(`${dish.name} added to cart`, { duration: 1800 });
                              }}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add to Cart
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {filteredDishes.length > 1 && (
          <div className="flex justify-between items-center px-4 pt-3 pb-1">
            <button
              type="button"
              onClick={() => setIsPaused((p) => !p)}
              className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-amber-600 font-semibold"
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              <span>{isPaused ? 'Paused' : 'Auto-sliding'}</span>
            </button>

            {filteredDishes.length <= MAX_DOTS ? (
              <div className="flex gap-1.5">
                {filteredDishes.map((dish, idx) => (
                  <button
                    key={dish.id}
                    type="button"
                    onClick={() => goTo(idx)}
                    className={`h-2 rounded-full transition-all ${
                      currentIndex === idx ? 'w-6 bg-amber-600' : 'w-2 bg-stone-300 dark:bg-stone-700'
                    }`}
                  />
                ))}
              </div>
            ) : (
              <span className="text-xs font-bold text-stone-500">
                {currentIndex + 1} / {filteredDishes.length}
              </span>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrev}
                className="w-8 h-8 rounded-full border-stone-200 dark:border-stone-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                className="w-8 h-8 rounded-full border-stone-200 dark:border-stone-800"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
