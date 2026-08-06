'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { Clock, Flame, Star } from 'lucide-react';

import { cn, formatCurrency, FALLBACK_DISH_IMAGE } from '@/lib/utils';
import type { MenuItem } from '@/types';
import { useDishPortion, PORTION_LABELS, type Portion } from '@/hooks/useDishPortion';
import CartStepper from './CartStepper';

interface Props {
  item: MenuItem;
  /** Hides the hairline under the last row of a list. */
  divider?: boolean;
}

/**
 * A single dish as a full-width row: text on the left, photo and the ADD
 * button on the right.
 *
 * This is the shape delivery apps settled on for phones, and the reason is
 * width. A card grid gives each dish half a 360px screen, which leaves no room
 * for a description and squeezes the price and the button onto separate lines.
 * A row gives the name and description the full column and keeps the photo at
 * a legible 112px — so a customer can actually read what they are ordering
 * without opening anything.
 *
 * The ADD button deliberately overhangs the bottom edge of the photo. It puts
 * the primary action at a fixed, predictable place in every row instead of
 * wherever a variable-length description happens to end.
 */
const DishListItem = memo(function DishListItem({ item, divider = true }: Props) {
  const {
    availablePortions, hasPortions, selectedPortion, setSelectedPortion,
    activePrice, cartItem, add, increase, decrease,
  } = useDishPortion(item);

  const unavailable = !item.isAvailable;

  return (
    <div
      className={cn(
        'flex gap-3 py-4 sm:gap-6 sm:py-5',
        divider && 'border-b border-dashed',
        unavailable && 'opacity-55'
      )}
    >
      {/* ── Left: everything you read ───────────────────────────────────── */}
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span
            className={item.vegStatus === 'veg' ? 'veg-indicator' : 'non-veg-indicator'}
            role="img"
            aria-label={item.vegStatus === 'veg' ? 'Vegetarian' : 'Non-vegetarian'}
          />
          {item.isSpecial ? (
            <span className="text-[11px] font-extrabold tracking-wide text-[#E65100] uppercase dark:text-warning">
              ★ Chef&apos;s Special
            </span>
          ) : item.isPopular ? (
            <span className="text-primary text-[11px] font-extrabold tracking-wide uppercase">
              Bestseller
            </span>
          ) : null}
        </div>

        <Link
          href={`/menu?q=${encodeURIComponent(item.name)}`}
          className="hover:text-primary font-display mb-1 block text-[15px] leading-snug font-bold transition-colors sm:text-[16.5px]"
        >
          {item.name}
        </Link>

        <p className="mb-1.5 text-[14.5px] font-extrabold tabular-nums sm:text-[15.5px]">
          {formatCurrency(activePrice)}
        </p>

        {/* Rating and prep time. Both are quick scan signals — they sit on one
            line so the description keeps its two full lines below. */}
        <div className="mb-1.5 flex flex-wrap items-center gap-3">
          <span className="border-success/35 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5">
            <Star className="fill-success text-success size-3" />
            <span className="text-success text-xs font-extrabold">{item.rating}</span>
            <span className="text-muted-foreground text-[11px]">({item.reviewCount})</span>
          </span>

          {item.prepTime && (
            <span className="text-muted-foreground inline-flex items-center gap-1 text-[11.5px] font-semibold">
              <Clock className="size-3" />
              {item.prepTime} min
            </span>
          )}

          {item.spiceLevel ? (
            <span
              className="inline-flex gap-px"
              role="img"
              aria-label={`Spice level ${item.spiceLevel} of 3`}
            >
              {Array.from({ length: item.spiceLevel }).map((_, i) => (
                <Flame key={i} className="size-3 fill-[#E65100] text-[#E65100]" />
              ))}
            </span>
          ) : null}
        </div>

        <p className="text-muted-foreground line-clamp-2 text-[12.5px] leading-relaxed sm:text-[13px]">
          {item.description}
        </p>

        {/* Portion pills. Only rendered when a dish genuinely has more than one
            size — a lone "Full" pill is a control that can't do anything. */}
        {hasPortions && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {availablePortions.map((portion: Portion) => {
              const selected = portion === selectedPortion;
              return (
                <button
                  key={portion}
                  type="button"
                  onClick={() => setSelectedPortion(portion)}
                  aria-pressed={selected}
                  className={cn(
                    'rounded-lg border-[1.5px] px-2.5 py-1 text-[11.5px] font-bold transition-colors outline-none',
                    'focus-visible:ring-ring/40 focus-visible:ring-[3px]',
                    selected
                      ? 'border-primary bg-primary/8 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-foreground/25'
                  )}
                >
                  {PORTION_LABELS[portion]} {formatCurrency(item.portionPrices?.[portion] ?? 0)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Right: photo with the action pinned to it ────────────────────── */}
      <div className="relative w-28 shrink-0 pb-5 sm:w-33">
        <div className="bg-muted relative aspect-square w-full overflow-hidden rounded-2xl shadow-md">
          {/* eslint-disable-next-line @next/next/no-img-element -- dish images
              come from Supabase Storage and arbitrary admin-pasted URLs, which
              next/image's loader would need a remotePatterns entry per host. */}
          <img
            src={item.image || FALLBACK_DISH_IMAGE}
            alt=""
            loading="lazy"
            decoding="async"
            onError={(e) => {
              const img = e.currentTarget;
              // Guard against a fallback that itself 404s looping forever.
              if (img.src !== FALLBACK_DISH_IMAGE) img.src = FALLBACK_DISH_IMAGE;
            }}
            className="block size-full object-cover"
          />

          {unavailable && (
            <div className="absolute inset-0 grid place-items-center bg-black/55">
              <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-extrabold text-black">
                Sold out
              </span>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 justify-center">
          {cartItem ? (
            <CartStepper
              quantity={cartItem.quantity}
              onIncrease={increase}
              onDecrease={decrease}
              size="small"
              label={item.name}
            />
          ) : (
            <button
              type="button"
              onClick={add}
              disabled={unavailable}
              aria-label={`Add ${item.name} to cart`}
              className={cn(
                'h-8 min-w-23 rounded-xl border-[1.5px] px-4 text-[13px] font-black tracking-wide transition-all outline-none',
                'focus-visible:ring-ring/40 focus-visible:ring-[3px]',
                'border-success bg-card text-success shadow-[0_4px_14px_rgba(46,125,50,0.18)]',
                'hover:bg-success hover:text-white hover:shadow-[0_6px_18px_rgba(46,125,50,0.26)]',
                'disabled:border-transparent disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none'
              )}
            >
              ADD
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default DishListItem;
