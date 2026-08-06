'use client';

import * as React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * The −/qty/+ control used in the cart, the menu cards, and the POS bill.
 *
 * All three had their own copy before, with three different touch-target sizes
 * and two different behaviours at quantity 1: one silently refused to go lower,
 * another removed the line without warning. Here it is one prop — `onRemove`
 * swaps the minus for a bin at qty 1, so the destructive step is always
 * labelled as what it is.
 */
function QuantityStepper({
  value,
  onIncrease,
  onDecrease,
  onRemove,
  min = 1,
  max = 99,
  size = 'default',
  label = 'quantity',
  className,
  ...props
}: Omit<React.ComponentProps<'div'>, 'onChange'> & {
  value: number;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove?: () => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'default';
  label?: string;
}) {
  const atMin = value <= min;
  const atMax = value >= max;
  const showRemove = atMin && !!onRemove;

  const btn = cn(
    'grid place-items-center rounded-md transition-colors outline-none',
    'text-primary hover:bg-primary/10 focus-visible:ring-ring/40 focus-visible:ring-[3px]',
    'disabled:pointer-events-none disabled:opacity-40',
    size === 'sm' ? 'size-7' : 'size-9'
  );

  return (
    <div
      data-slot="quantity-stepper"
      className={cn(
        'border-primary/25 bg-primary/5 inline-flex items-center gap-0.5 rounded-lg border p-0.5',
        className
      )}
      {...props}
    >
      <button
        type="button"
        onClick={showRemove ? onRemove : onDecrease}
        disabled={atMin && !onRemove}
        aria-label={showRemove ? `Remove item` : `Decrease ${label}`}
        className={cn(btn, showRemove && 'text-destructive hover:bg-destructive/10')}
      >
        {showRemove ? (
          <Trash2 className={size === 'sm' ? 'size-3.5' : 'size-4'} />
        ) : (
          <Minus className={size === 'sm' ? 'size-3.5' : 'size-4'} />
        )}
      </button>

      {/* aria-live so a screen reader hears the new count without the focus
          moving — the buttons keep focus across the whole interaction. */}
      <span
        aria-live="polite"
        aria-label={`${label}: ${value}`}
        className={cn(
          'text-foreground min-w-6 text-center font-bold tabular-nums',
          size === 'sm' ? 'text-xs' : 'text-sm'
        )}
      >
        {value}
      </span>

      <button
        type="button"
        onClick={onIncrease}
        disabled={atMax}
        aria-label={`Increase ${label}`}
        className={btn}
      >
        <Plus className={size === 'sm' ? 'size-3.5' : 'size-4'} />
      </button>
    </div>
  );
}

export { QuantityStepper };
