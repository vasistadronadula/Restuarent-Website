'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';

import { cn, formatCurrency, FALLBACK_DISH_IMAGE } from '@/lib/utils';
import type { CartItem } from '@/types';
import { useCartStore } from '@/store/useCartStore';
import { Button } from '@/components/ui/button';
import { QuantityStepper } from '@/components/ui/quantity-stepper';

/**
 * One row of the cart. Used by the drawer and the cart page so a line item
 * behaves the same in both — notably the minus button at quantity 1, which
 * removes the line in one place and refused to move in the other.
 */
export function CartLineItem({
  item,
  compact = false,
  className,
}: {
  item: CartItem;
  compact?: boolean;
  className?: string;
}) {
  const unitPrice = item.selectedPrice ?? item.price;
  const remove = () => useCartStore.getState().removeItem(item.id);

  return (
    <li
      className={cn(
        'bg-card flex items-center gap-2.5 sm:gap-3 rounded-xl border border-stone-200/80 dark:border-stone-800 p-2.5 sm:p-3.5 shadow-xs transition-colors hover:border-amber-500/40',
        className
      )}
    >
      {/* Dish Image */}
      <img
        src={item.image}
        alt=""
        loading="lazy"
        decoding="async"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = FALLBACK_DISH_IMAGE;
        }}
        className={cn(
          'shrink-0 rounded-lg object-cover bg-stone-100 dark:bg-stone-800',
          compact ? 'size-12 sm:size-14' : 'size-14 sm:size-16'
        )}
      />

      {/* Item info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={item.vegStatus === 'veg' ? 'veg-indicator' : 'non-veg-indicator'}
            role="img"
            aria-label={item.vegStatus === 'veg' ? 'Vegetarian' : 'Non-vegetarian'}
          />
          <p className="truncate text-xs sm:text-sm leading-tight font-bold text-foreground">
            {item.name}
          </p>
          {item.selectedPortion && (
            <span className="text-[10px] sm:text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded capitalize">
              {item.selectedPortion}
            </span>
          )}
        </div>
        <p className="text-primary mt-0.5 font-black text-xs sm:text-sm tabular-nums">
          {formatCurrency(unitPrice * item.quantity)}
        </p>
        <p className="text-muted-foreground text-[10px] sm:text-[11px] tabular-nums">
          {formatCurrency(unitPrice)} × {item.quantity}
        </p>
      </div>

      {/* Stepper and Remove Action */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        <QuantityStepper
          value={item.quantity}
          size={compact ? 'sm' : 'default'}
          label={`quantity of ${item.name}`}
          onIncrease={() => useCartStore.getState().increaseQty(item.id)}
          onDecrease={() => useCartStore.getState().decreaseQty(item.id)}
          onRemove={remove}
        />
        {!compact && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:bg-destructive/10 size-7 sm:size-8"
            onClick={remove}
            aria-label={`Remove ${item.name} from cart`}
          >
            <Trash2 className="size-3.5 sm:size-4" />
          </Button>
        )}
      </div>
    </li>
  );
}
