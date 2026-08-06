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
        'bg-card flex items-center gap-3 rounded-xl border p-3 shadow-sm',
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- dish images come
          from Supabase Storage and arbitrary admin-pasted URLs, so they can't be
          width-constrained through next/image's loader without a config entry
          per host. */}
      <img
        src={item.image}
        alt=""
        loading="lazy"
        decoding="async"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = FALLBACK_DISH_IMAGE;
        }}
        className={cn('shrink-0 rounded-lg object-cover', compact ? 'size-14' : 'size-16')}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={item.vegStatus === 'veg' ? 'veg-indicator' : 'non-veg-indicator'}
            role="img"
            aria-label={item.vegStatus === 'veg' ? 'Vegetarian' : 'Non-vegetarian'}
          />
          <p className="truncate text-sm leading-tight font-bold">{item.name}</p>
        </div>
        <p className="text-primary mt-0.5 font-extrabold tabular-nums">
          {formatCurrency(unitPrice * item.quantity)}
        </p>
        <p className="text-muted-foreground text-[11px] tabular-nums">
          {formatCurrency(unitPrice)} × {item.quantity}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
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
            className="text-destructive hover:bg-destructive/10"
            onClick={remove}
            aria-label={`Remove ${item.name} from cart`}
          >
            <Trash2 />
          </Button>
        )}
      </div>
    </li>
  );
}
