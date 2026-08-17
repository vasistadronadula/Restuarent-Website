'use client';

import React, { memo } from 'react';

import { cn, formatCurrency, FALLBACK_DISH_IMAGE } from '@/lib/utils';
import type { MenuItem } from '@/types';
import { useDishPortion, PORTION_LABELS, type Portion } from '@/hooks/useDishPortion';
import CartStepper, { AddButton } from './CartStepper';
import { RatingPill, VegMark } from './store-ui';

interface Props {
  item: MenuItem;
}

/**
 * A dish as a photo-first card, for the grid view.
 *
 * The row (`DishListItem`) is the default because it reads better, but a grid
 * genuinely wins in one case: browsing a category you don't know by name —
 * "show me the biryanis" — where the photo is the thing being compared and the
 * description is noise. The toggle on the menu page exists for that.
 *
 * The card keeps the row's field order and the row's ADD control, so switching
 * views changes the density and nothing else. It's the same menu, not a second
 * design.
 */
const MenuCard = memo(function MenuCard({ item }: Props) {
  const {
    availablePortions,
    hasPortions,
    selectedPortion,
    setSelectedPortion,
    activePrice,
    cartItem,
    add,
    increase,
    decrease,
  } = useDishPortion(item);

  const unavailable = !item.isAvailable;

  return (
    <article
      className={cn(
        // Deliberately not `overflow-hidden`: the ADD control overhangs the
        // photo's bottom edge and clipping the card would cut it in half.
        'group border-hair-1 shadow-store relative flex h-full flex-col rounded-2xl border bg-white',
        'transition-shadow duration-200 hover:shadow-store-lifted',
        unavailable && 'opacity-60'
      )}
    >
      {/* ── Photo ─────────────────────────────────────────────────────────
          The wrapper is not clipped, so the ADD control can hang over the
          bottom edge exactly as it does in the row; the inner div does the
          clipping for the photo's hover zoom. */}
      <div className="relative w-full">
        <div className="bg-hair-2 relative aspect-[4/3] w-full overflow-hidden rounded-t-2xl">
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
              if (img.src !== FALLBACK_DISH_IMAGE) img.src = FALLBACK_DISH_IMAGE;
            }}
            className="block size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />

          {/* The mark sits on its own white chip rather than directly on the
              photo — a green outline on a green curry is invisible. */}
          <span className="absolute top-2.5 left-2.5 grid place-items-center rounded-md bg-white/95 p-1 shadow-sm">
            <VegMark status={item.vegStatus} size={14} />
          </span>

          {(item.isSpecial || item.isPopular) && (
            <span className="bg-brand absolute top-2.5 right-2.5 rounded-full px-2 py-1 text-[9.5px] font-extrabold tracking-wide text-white uppercase shadow-sm">
              {item.isSpecial ? "Chef's special" : 'Bestseller'}
            </span>
          )}

          {unavailable && (
            <div className="absolute inset-0 grid place-items-center bg-black/55">
              <span className="text-ink-1 rounded-md bg-white px-2.5 py-1 text-[10px] font-extrabold tracking-wide uppercase">
                Sold out
              </span>
            </div>
          )}
        </div>

        {/* Straddles the photo's bottom edge. A 158px-wide card at 360px has no
            room for a price *and* a 104px control on one line, and the overhang
            is also where the eye already is after looking at the photo. */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2"
        >
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

      {/* ── Detail ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-2 p-3.5 pt-7">
        <h3 className="text-ink-1 line-clamp-2 text-[14px] leading-snug font-bold">
          {item.name}
        </h3>

        {item.rating > 0 && <RatingPill value={item.rating} count={item.reviewCount} />}

        {item.description && (
          <p className="text-ink-3 line-clamp-2 text-[12px] leading-[1.4]">{item.description}</p>
        )}

        {hasPortions && (
          <div className="flex flex-wrap gap-1">
            {availablePortions.map((portion: Portion) => {
              const selected = portion === selectedPortion;
              return (
                <button
                  key={portion}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPortion(portion);
                  }}
                  aria-pressed={selected}
                  className={cn(
                    'rounded-md border px-2 py-0.5 text-[10.5px] font-semibold transition-colors outline-none',
                    selected
                      ? 'border-brand-300 bg-brand-50 text-brand-800'
                      : 'border-hair-1 text-ink-3 hover:border-ink-4/60'
                  )}
                >
                  {PORTION_LABELS[portion]}
                </button>
              );
            })}
          </div>
        )}

        {/* Pushed to the bottom so prices line up across a grid of cards with
            unequal description lengths. */}
        <div className="border-hair-2 mt-auto flex items-baseline justify-between gap-2 border-t pt-3">
          <span className="text-ink-1 text-[15px] font-extrabold tabular-nums">
            {formatCurrency(activePrice)}
          </span>
          {item.prepTime != null && item.prepTime > 0 && (
            <span className="text-ink-4 text-[11px] font-semibold">~{item.prepTime} mins</span>
          )}
        </div>
      </div>
    </article>
  );
});

export default MenuCard;
