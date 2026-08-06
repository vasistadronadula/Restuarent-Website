'use client';

import React from 'react';
import { Plus, Minus } from 'lucide-react';
import type { MenuItem } from '@/types';
import { PORTION_LABEL, sellablePortions, type Portion } from '@/hooks/usePosCart';
import { Button } from '@/components/ui/button';

interface Props {
  item: MenuItem;
  inBill: number;
  quantityByPortion?: Record<string, number>;
  onAdd: (item: MenuItem, portion?: Portion) => void;
  onDecrement?: (item: MenuItem) => void;
}

function DishListRow({ item, inBill, quantityByPortion, onAdd, onDecrement }: Props) {
  const isVeg = item.vegStatus === 'veg';
  const isEgg = item.vegStatus === 'egg';
  const vegColorClass = isVeg ? 'bg-emerald-600 border-emerald-600' : isEgg ? 'bg-amber-600 border-amber-600' : 'bg-rose-600 border-rose-600';
  const portions = sellablePortions(item);
  const active = inBill > 0;

  const hasPortionChoice = portions.length > 1;
  const unitPrice = portions.length === 1 ? portions[0].price : item.price;

  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-2.5 min-h-[56px] border-l-4 transition-all ${
        active
          ? 'bg-amber-500/10 dark:bg-amber-950/30 border-l-amber-600'
          : 'bg-white dark:bg-stone-900 border-l-transparent'
      }`}
    >
      <div className="flex-shrink-0 w-3.5 h-3.5 rounded-xs border border-stone-300 dark:border-stone-700 flex items-center justify-center">
        <div className={`w-1.5 h-1.5 rounded-full ${vegColorClass}`} />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 leading-tight line-clamp-2">
          {item.name}
        </h4>

        {hasPortionChoice ? (
          <div className="flex gap-1 mt-1 flex-wrap">
            {portions.map(({ portion, price }) => {
              const qty = quantityByPortion?.[`${item.id}::${portion}`] || 0;
              const selected = qty > 0;
              return (
                <Button
                  key={portion}
                  size="sm"
                  type="button"
                  onClick={() => onAdd(item, portion)}
                  className={`h-7 px-2 py-0.5 rounded-md text-[11px] font-black leading-tight ${
                    selected
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {PORTION_LABEL[portion]} ₹{price}
                  {qty > 0 ? ` · ${qty}` : ''}
                </Button>
              );
            })}
          </div>
        ) : (
          <div className="text-xs font-black text-amber-700 dark:text-amber-500 mt-0.5">
            ₹{unitPrice}
          </div>
        )}
      </div>

      {hasPortionChoice ? (
        active && (
          <div className="flex-shrink-0 min-w-[30px] h-7 px-2 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-black">
            {inBill}
          </div>
        )
      ) : active ? (
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onDecrement?.(item)}
            aria-label={`One less ${item.name}`}
            className="w-9 h-9 rounded-lg border-stone-200 dark:border-stone-700 text-amber-700 hover:bg-amber-50"
          >
            <Minus className="w-4 h-4" />
          </Button>

          <span className="min-w-[22px] text-center text-sm font-black text-amber-700 dark:text-amber-400">
            {inBill}
          </span>

          <Button
            size="icon"
            onClick={() => onAdd(item)}
            aria-label={`One more ${item.name}`}
            className="w-9 h-9 rounded-lg bg-amber-600 text-white hover:bg-amber-700"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAdd(item)}
          className="flex-shrink-0 w-20 h-9 rounded-lg font-black text-xs text-amber-700 border-amber-600/30 hover:bg-amber-50 hover:border-amber-600"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          ADD
        </Button>
      )}
    </div>
  );
}

export default React.memo(DishListRow);
