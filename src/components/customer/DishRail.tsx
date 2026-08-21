'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Clock, Star, UtensilsCrossed } from 'lucide-react';

import { cn, formatCurrency, FALLBACK_DISH_IMAGE } from '@/lib/utils';
import type { MenuItem } from '@/types';
import { useDishPortion } from '@/hooks/useDishPortion';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import CartStepper, { AddButton } from './CartStepper';

/* ─── One card ──────────────────────────────────────────────────────────── */

function RailCard({ item }: { item: MenuItem }) {
  const { activePrice, hasPortions, cartItem, add, increase, decrease } = useDishPortion(item);
  const unavailable = !item.isAvailable;

  return (
    <div
      className={cn(
        'w-39.5 shrink-0 snap-start sm:w-46.5',
        unavailable && 'opacity-55'
      )}
    >
      <div className="relative mb-8">
        <Link
          href={`/menu?q=${encodeURIComponent(item.name)}`}
          className="bg-muted relative block aspect-square w-full overflow-hidden rounded-[18px] shadow-lg"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- see DishListItem */}
          <img
            src={item.image || FALLBACK_DISH_IMAGE}
            alt={item.name}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src !== FALLBACK_DISH_IMAGE) img.src = FALLBACK_DISH_IMAGE;
            }}
            className="block size-full object-cover"
          />

          {(item.isSpecial || item.isPopular) && (
            <span
              className={cn(
                'absolute top-2 left-2 rounded-[7px] px-2 py-0.5 text-[9.5px] font-black tracking-wide text-white shadow-md',
                item.isSpecial ? 'bg-accent' : 'bg-primary'
              )}
            >
              {item.isSpecial ? "CHEF'S PICK" : 'BESTSELLER'}
            </span>
          )}
        </Link>

        {/* Same overhanging action as the list rows, so ADD is always in the
            same place relative to a dish photo wherever a dish is shown. */}
        <div className="absolute -bottom-4 left-1/2 z-10 -translate-x-1/2">
          {cartItem ? (
            <CartStepper
              quantity={cartItem.quantity}
              onIncrease={increase}
              onDecrease={decrease}
              size="small"
              label={item.name}
            />
          ) : (
            <AddButton onClick={add} disabled={unavailable} label={item.name} size="small" />
          )}
        </div>
      </div>

      <div className="mb-1 flex items-start gap-1.5">
        <span
          className={cn(
            'mt-1 shrink-0',
            item.vegStatus === 'veg' ? 'veg-indicator' : 'non-veg-indicator'
          )}
          role="img"
          aria-label={item.vegStatus === 'veg' ? 'Vegetarian' : 'Non-vegetarian'}
        />
        {/* Fixed two lines: without it a one-word dish name and a long one
            sitting side by side push their prices onto different baselines. */}
        <Link
          href={`/menu?q=${encodeURIComponent(item.name)}`}
          className="hover:text-primary font-display line-clamp-2 min-h-9 text-[13.5px] leading-snug font-bold transition-colors sm:min-h-9.75 sm:text-[14.5px]"
        >
          {item.name}
        </Link>
      </div>

      <div className="mb-1 flex items-center gap-2">
        <span className="text-success inline-flex items-center gap-1 text-[11.5px] font-extrabold">
          <Star className="fill-success size-3" />
          {item.rating}
        </span>
        {item.prepTime && (
          <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px] font-semibold">
            <Clock className="size-3" />
            {item.prepTime} min
          </span>
        )}
      </div>

      <p className="text-[14.5px] font-extrabold tabular-nums">
        {hasPortions ? 'From ' : ''}
        {formatCurrency(activePrice)}
      </p>
    </div>
  );
}

/* ─── The rail ──────────────────────────────────────────────────────────── */

interface Props {
  items: MenuItem[];
  loading?: boolean;
  /** Names the scroll region for screen readers. */
  ariaLabel: string;
}

export default function DishRail({ items, loading = false, ariaLabel }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const syncEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    // 4px of slack: sub-pixel widths mean scrollLeft rarely lands exactly on
    // the maximum, and without it the right arrow never disables.
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    // The track's own width changes with the viewport, and the item list
    // changes when a category filter is applied — both move the edges. The
    // observer fires once on observe(), which covers the initial read too.
    const observer = new ResizeObserver(syncEdges);
    observer.observe(el);
    return () => observer.disconnect();
  }, [syncEdges, items.length]);

  const scrollBy = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.round(el.clientWidth * 0.8), behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex gap-3.5 overflow-hidden sm:gap-5" aria-busy="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-39.5 shrink-0 sm:w-46.5">
            <Skeleton className="mb-5 aspect-square w-full rounded-[18px]" />
            <Skeleton className="mb-2 h-4.5 w-[90%]" />
            <Skeleton className="h-4.5 w-[55%]" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={UtensilsCrossed}
        title="Nothing on the pass right now"
        description="This selection is being restocked — try another category."
      />
    );
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={syncEdges}
        role="region"
        aria-label={ariaLabel}
        className={cn(
          'scrollbar-none flex snap-x snap-mandatory gap-3.5 overflow-x-auto overscroll-x-contain pb-2 sm:gap-5',
          // Bleeds to the screen edges on phones so the row visibly runs off
          // the side — the cue that tells a thumb there is more to swipe to.
          '-mx-5 px-5 md:mx-0 md:px-0'
        )}
      >
        {items.map((item) => (
          <RailCard key={item.id} item={item} />
        ))}
      </div>

      {/* Desktop-only arrows. A mouse has no swipe, and the scrollbar is hidden. */}
      {([-1, 1] as const).map((dir) => {
        const isPrev = dir === -1;
        const disabled = isPrev ? atStart : atEnd;
        return (
          <button
            key={dir}
            type="button"
            onClick={() => scrollBy(dir)}
            disabled={disabled}
            aria-label={isPrev ? 'Scroll left' : 'Scroll right'}
            className={cn(
              'bg-card text-primary hover:bg-primary hover:text-primary-foreground absolute top-[38%] hidden size-10 -translate-y-1/2 place-items-center rounded-full border shadow-lg transition-all md:grid',
              isPrev ? '-left-5' : '-right-5',
              disabled && 'pointer-events-none opacity-0'
            )}
          >
            {isPrev ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
          </button>
        );
      })}
    </div>
  );
}
