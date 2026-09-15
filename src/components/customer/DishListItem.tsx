'use client';

import React, { memo } from 'react';

import { cn, formatCurrency, FALLBACK_DISH_IMAGE } from '@/lib/utils';
import type { MenuItem } from '@/types';
import { useDishPortion } from '@/hooks/useDishPortion';
import CartStepper, { AddButton } from './CartStepper';
import PortionSelector from './PortionSelector';
import { DishFlag, RatingPill, VegMark } from './store-ui';

interface Props {
  item: MenuItem;
  /** Hides the hairline under the last row of a list. */
  divider?: boolean;
}

/**
 * A single dish as a full-width row: everything you read on the left, the
 * photo and the ADD button on the right.
 *
 * This is the shape every Indian delivery app converged on, and the reason is
 * width. A card grid gives each dish half a 360px screen, which leaves no room
 * for a description and squeezes the price and the button onto separate lines.
 * A row gives the name and description the full column and still keeps the
 * photo at a legible ~118px — so a customer can read what they are ordering
 * without opening anything.
 *
 * Reading order is fixed and never varies between dishes: mark → flag → name →
 * price → rating → description. A row where the rating sometimes sits above
 * the price and sometimes below forces the eye to re-find each field on every
 * row, which is what makes a long menu tiring to scan.
 *
 * The ADD button deliberately overhangs the bottom edge of the photo. It puts
 * the primary action at a fixed, predictable place in every row instead of
 * wherever a variable-length description happens to end.
 */
const DishListItem = memo(function DishListItem({ item, divider = true }: Props) {
  const {
    availablePortions, hasPortions, selectedPortion, setSelectedPortion,
    activePrice, cartItem, atMax, add, increase, decrease,
  } = useDishPortion(item);

  const unavailable = !item.isAvailable;

  return (
    <article
      className={cn(
        // Hover card: the row lifts onto a white card so the dish under the
        // finger separates from the list. Negative margins keep the text
        // column exactly where it was — no layout shift on hover.
        'group -mx-2 flex items-start gap-4 rounded-2xl px-2 py-5 transition-all duration-200 outline-none hover:bg-white hover:shadow-store sm:-mx-3 sm:gap-8 sm:px-3',
        divider && 'rule-dash',
        unavailable && 'opacity-55'
      )}
    >
      {/* ── Left: everything you read ───────────────────────────────────── */}
      <div className="min-w-0 flex-1">
        <VegMark status={item.vegStatus} />

        {(item.isSpecial || item.isPopular) && (
          <div className="mt-1.5">
            <DishFlag kind={item.isSpecial ? 'special' : 'popular'} />
          </div>
        )}

        <h3 className="text-ink-1 mt-1 font-sans text-[16px] leading-snug font-bold sm:text-[17px]">
          {item.name}
        </h3>

        <p className="text-cobalt-800 mt-1 text-[15px] font-extrabold tabular-nums sm:text-[15.5px]">
          {formatCurrency(activePrice)}
        </p>

        {item.rating > 0 && (
          <div className="mt-1.5">
            <RatingPill value={item.rating} count={item.reviewCount} />
          </div>
        )}

        {item.description && (
          // Capped measure: on a wide desktop column a 2-line-clamped
          // description stretching edge to edge reads as an unfinished
          // sentence rather than a short blurb, since the eye expects a line
          // this short to wrap well before it does.
          <p className="text-ink-3 mt-2 line-clamp-2 max-w-[62ch] text-[13px] leading-[1.45]">
            {item.description}
          </p>
        )}

        {item.prepTime != null && item.prepTime > 0 && (
          <p className="text-ink-4 mt-2 text-[12px] font-semibold">
            Ready in ~{item.prepTime} mins
          </p>
        )}

        {/* Portion pills. Only rendered when a dish genuinely has more than one
            size — a lone "Full" pill is a control that can't do anything. */}
        {hasPortions && (
          <div className="mt-3 max-w-sm">
            <PortionSelector portions={availablePortions} selected={selectedPortion} onSelect={setSelectedPortion} label={item.name} prices={item.portionPrices} />
          </div>
        )}
      </div>

      {/* ── Right: photo with the action pinned to it ────────────────────── */}
      {/* 104px under 400px viewports: at 320–360px a 118px photo leaves the
          name column ~150px wide, truncating most dish names to one word. */}
      <div className="relative w-[104px] shrink-0 pb-4 min-[400px]:w-[118px] sm:w-[130px]">
        <div className="bg-hair-2 relative aspect-[4/3.4] w-full overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element -- dish images
              come from Supabase Storage and arbitrary admin-pasted URLs, which
              next/image's loader would need a remotePatterns entry per host. */}
          <img
            src={item.image || FALLBACK_DISH_IMAGE}
            alt={item.image ? `Photo of ${item.name}` : `${item.name} (photo coming soon)`}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              const img = e.currentTarget;
              // Guard against a fallback that itself 404s looping forever.
              if (img.src !== FALLBACK_DISH_IMAGE) img.src = FALLBACK_DISH_IMAGE;
            }}
            className="block size-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          />

          {unavailable && (
            <div className="absolute inset-0 grid place-items-center bg-black/55">
              <span className="text-ink-1 rounded-md bg-white px-2 py-0.5 text-[10px] font-extrabold tracking-wide uppercase">
                Sold out
              </span>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-1/2 z-10 flex -translate-x-1/2 justify-center">
          {cartItem ? (
            <CartStepper
              quantity={cartItem.quantity}
              onIncrease={increase}
              onDecrease={decrease}
              size="small"
              label={item.name}
              atMax={atMax || unavailable}
            />
          ) : (
            <AddButton onClick={add} disabled={unavailable || atMax} atMax={atMax && !unavailable} label={item.name} size="small" />
          )}
        </div>
      </div>
    </article>
  );
});

export default DishListItem;
