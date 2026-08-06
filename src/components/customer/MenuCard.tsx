'use client';

import React, { useState, memo } from 'react';
import Image from 'next/image';
import { Clock, Heart, Plus, Star } from 'lucide-react';

import { cn, formatCurrency, FALLBACK_DISH_IMAGE } from '@/lib/utils';
import { MenuItem } from '@/types';
import { useDishPortion, PORTION_LABELS } from '@/hooks/useDishPortion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import CartStepper from './CartStepper';

interface Props {
  item: MenuItem;
  compact?: boolean;
}

// Wrapped in React.memo — only re-renders when `item` changes or the specific
// cart entry for the selected portion does.
const MenuCard = memo(function MenuCard({ item, compact = false }: Props) {
  const [liked, setLiked] = useState(false);

  // Portion selection, pricing and the add/increase/decrease actions are shared
  // with the dish rail and the dish list, so all three put an identical row in
  // the cart for the same dish rather than three near-identical ones.
  const {
    availablePortions, hasPortions, selectedPortion, setSelectedPortion,
    activePrice, cartItem, add, increase, decrease,
  } = useDishPortion(item);

  const unavailable = !item.isAvailable;

  return (
    <article
      className={cn(
        'bg-card group relative flex h-full flex-col overflow-hidden rounded-2xl border shadow-sm transition-shadow duration-300 hover:shadow-lg',
        unavailable && 'opacity-70'
      )}
    >
      {/* Image */}
      <div className={cn('relative overflow-hidden', compact ? 'h-37.5' : 'h-47.5')}>
        <Image
          src={item.image || FALLBACK_DISH_IMAGE}
          alt=""
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
          className="object-cover transition-transform duration-300 group-hover:scale-106"
        />

        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
          {item.isSpecial && <Badge variant="warning">Chef&apos;s Special</Badge>}
          {item.isPopular && !item.isSpecial && <Badge>Popular</Badge>}
        </div>

        {unavailable && (
          <div className="absolute inset-0 grid place-items-center bg-black/60">
            <Badge variant="outline" className="border-white/30 bg-white text-black">
              Currently Unavailable
            </Badge>
          </div>
        )}

        <button
          type="button"
          onClick={() => setLiked(!liked)}
          aria-pressed={liked}
          aria-label={liked ? `Remove ${item.name} from favourites` : `Save ${item.name} to favourites`}
          className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-white/90 backdrop-blur-sm transition-transform hover:scale-110 focus-visible:ring-ring/40 focus-visible:ring-[3px] outline-none"
        >
          <Heart
            className={cn('size-4', liked ? 'fill-primary text-primary' : 'text-neutral-600')}
          />
        </button>
      </div>

      {/* Content */}
      <div className={cn('flex flex-1 flex-col', compact ? 'p-3' : 'p-4')}>
        <div className="mb-1 flex items-start gap-2">
          <span
            className={cn(
              'mt-1 shrink-0',
              item.vegStatus === 'veg' ? 'veg-indicator' : 'non-veg-indicator'
            )}
            role="img"
            aria-label={item.vegStatus === 'veg' ? 'Vegetarian' : 'Non-vegetarian'}
          />
          <h3 className={cn('font-display leading-snug font-bold', compact ? 'text-sm' : 'text-base')}>
            {item.name}
          </h3>
        </div>

        {!compact && (
          <p className="text-muted-foreground mb-2 line-clamp-2 text-xs leading-relaxed">
            {item.description}
          </p>
        )}

        <div className="text-muted-foreground mb-2 flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <Star className="fill-accent text-accent size-3.5" />
            <span className="text-foreground font-bold">{item.rating}</span>
            <span>({item.reviewCount})</span>
          </span>
          {item.prepTime && (
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {item.prepTime} min
            </span>
          )}
        </div>

        {/* Portion selector — only when a dish genuinely has more than one size. */}
        {hasPortions && (
          <div className="mb-3">
            <p className="text-muted-foreground mb-1 text-[10px] font-bold tracking-wide uppercase">
              Portion size
            </p>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={selectedPortion}
              onValueChange={(val) => val && setSelectedPortion(val as typeof selectedPortion)}
              className="w-full"
            >
              {availablePortions.map((portion) => (
                <ToggleGroupItem key={portion} value={portion} className="text-[11px]">
                  {PORTION_LABELS[portion].charAt(0)} {formatCurrency(item.portionPrices?.[portion] ?? 0)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        )}

        {/* Price + action, pinned to the bottom so a short description doesn't
            float the ADD button up out of line with its neighbours. */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className={cn('text-primary font-extrabold', compact ? 'text-base' : 'text-lg')}>
            {formatCurrency(activePrice)}
          </span>

          {cartItem ? (
            <CartStepper
              quantity={cartItem.quantity}
              onIncrease={increase}
              onDecrease={decrease}
              size="small"
              label={item.name}
            />
          ) : (
            <Button variant="brand" size="sm" disabled={unavailable} onClick={add}>
              <Plus />
              Add
            </Button>
          )}
        </div>
      </div>
    </article>
  );
});

export default MenuCard;
