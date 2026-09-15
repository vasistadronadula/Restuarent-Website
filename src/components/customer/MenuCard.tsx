'use client';

import { memo } from 'react';
import { BadgeCheck, ChefHat, Clock3, Sparkles } from 'lucide-react';

import { cn, formatCurrency, FALLBACK_DISH_IMAGE } from '@/lib/utils';
import type { MenuItem } from '@/types';
import { useDishPortion } from '@/hooks/useDishPortion';
import CartStepper, { AddButton } from './CartStepper';
import PortionSelector from './PortionSelector';
import { RatingPill, VegMark } from './store-ui';

/** Photo → highlight → name → price → portions → action, with no overlapping controls. */
const MenuCard = memo(function MenuCard({ item }: { item: MenuItem }) {
  const {
    availablePortions, hasPortions, selectedPortion, setSelectedPortion,
    activePrice, cartItem, atMax, add, increase, decrease,
  } = useDishPortion(item);
  const unavailable = !item.isAvailable;
  const highlight = item.isSpecial
    ? { Icon: ChefHat, label: "Chef's pick", color: 'bg-cobalt-50 text-cobalt-700' }
    : item.isPopular
      ? { Icon: Sparkles, label: 'Bestseller', color: 'bg-brand-50 text-brand-700' }
      : item.rating >= 4.5
        ? { Icon: BadgeCheck, label: 'Top rated', color: 'bg-cream text-ink-2' }
        : null;

  return (
    <article
      aria-label={item.name}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-hair-1 bg-white shadow-xs transition-shadow duration-150 hover:shadow-store-lifted"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-hair-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- Admin images may use arbitrary storage hosts. */}
        <img
          src={item.image || FALLBACK_DISH_IMAGE}
          alt={item.image ? `Photo of ${item.name}` : `${item.name} (photo coming soon)`}
          loading="lazy"
          decoding="async"
          onError={(event) => {
            if (event.currentTarget.src !== FALLBACK_DISH_IMAGE) event.currentTarget.src = FALLBACK_DISH_IMAGE;
          }}
          className={cn('size-full object-cover', unavailable && 'opacity-60 grayscale')}
        />
        <span className="absolute top-2 left-2 grid size-6 place-items-center rounded-md bg-white shadow-sm">
          <VegMark status={item.vegStatus} size={14} />
        </span>
        {item.prepTime != null && item.prepTime > 0 && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-white/95 px-1.5 py-1 text-[10px] font-semibold text-ink-2">
            <Clock3 className="size-3" aria-hidden="true" /> {item.prepTime} min
          </span>
        )}
        {unavailable && (
          <div className="absolute inset-0 grid place-items-center bg-black/20">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-ink-2">Sold out</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3 sm:p-3.5">
        {highlight && (
          <span className={cn('inline-flex w-fit max-w-full items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold', highlight.color)}>
            <highlight.Icon className="size-3 shrink-0" aria-hidden="true" /> {highlight.label}
          </span>
        )}
        <h3 className="line-clamp-2 min-h-[2.6em] font-sans text-[13px] leading-[1.3] font-bold text-ink-1 sm:text-[15px]">
          {item.name}
        </h3>
        {item.description && <p className="line-clamp-2 text-[11px] leading-relaxed text-ink-3 sm:text-xs">{item.description}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[16px] font-extrabold text-ink-1 tabular-nums">{formatCurrency(activePrice)}</span>
          <RatingPill value={item.rating} />
        </div>
        <div className="mt-auto flex flex-col gap-3 pt-1">
          {hasPortions && (
            <PortionSelector portions={availablePortions} selected={selectedPortion} onSelect={setSelectedPortion} label={item.name} />
          )}
          {cartItem ? (
            <CartStepper quantity={cartItem.quantity} onIncrease={increase} onDecrease={decrease} size="small" fullWidth label={item.name} atMax={atMax || unavailable} />
          ) : (
            <AddButton onClick={add} disabled={unavailable || atMax} label={item.name} size="small" fullWidth atMax={atMax && !unavailable} />
          )}
        </div>
      </div>
    </article>
  );
});

export default MenuCard;
