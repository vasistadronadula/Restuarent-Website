'use client';

import React from 'react';
import Image from 'next/image';
import { Plus, Minus, Check } from 'lucide-react';
import type { MenuItem } from '@/types';
import { PORTION_LABEL, sellablePortions, type Portion } from '@/hooks/usePosCart';
import { Button } from '@/components/ui/button';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80';

interface Props {
  item: MenuItem;
  inBill: number;
  quantityByPortion?: Record<string, number>;
  onAdd: (item: MenuItem, portion?: Portion) => void;
  onDecrement?: (item: MenuItem) => void;
}

function DishCard({ item, inBill, quantityByPortion, onAdd, onDecrement }: Props) {
  const isVeg = item.vegStatus === 'veg';
  const isEgg = item.vegStatus === 'egg';
  const portions = sellablePortions(item);
  const active = inBill > 0;

  const hasPortionChoice = portions.length > 1;
  const unitPrice = portions.length === 1 ? portions[0].price : item.price;
  const vegColorClass = isVeg ? 'bg-emerald-600 border-emerald-600' : isEgg ? 'bg-amber-600 border-amber-600' : 'bg-rose-600 border-rose-600';

  const handleCardClick = () => {
    if (!hasPortionChoice) {
      onAdd(item);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`rounded-xl border flex flex-col h-full bg-white dark:bg-stone-900 overflow-hidden text-left transition-all select-none cursor-pointer group active:scale-[0.98] ${
        active
          ? 'border-amber-600 ring-2 ring-amber-500/20 shadow-md shadow-amber-600/10'
          : 'border-stone-200 dark:border-stone-800 shadow-xs hover:border-amber-400'
      }`}
    >
      <div className="relative w-full h-16 sm:h-20 lg:h-22 bg-stone-100 dark:bg-stone-800 overflow-hidden flex-shrink-0">
        <Image
          src={item.image || FALLBACK_IMAGE}
          alt={item.name}
          fill
          sizes="(max-width:600px) 50vw, (max-width:1200px) 25vw, 160px"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />

        <div className="absolute top-1 left-1 w-3.5 h-3.5 rounded-sm bg-white border border-stone-200 flex items-center justify-center shadow-xs z-10">
          <div className={`w-1.5 h-1.5 rounded-full ${vegColorClass}`} />
        </div>

        {item.prepTime && (
          <div className="absolute bottom-1 left-1 bg-stone-900/80 backdrop-blur-xs text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 z-10">
            <span>⏱️ {item.prepTime}m</span>
          </div>
        )}

        {active && (
          <div className="absolute top-1 right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[11px] font-black shadow-md z-10">
            {inBill}
          </div>
        )}
      </div>

      <div className="p-2 flex flex-col gap-1 flex-1 min-w-0">
        <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 leading-tight line-clamp-2">
          {item.name}
        </h4>

        <div className="text-xs sm:text-sm font-black text-amber-700 dark:text-amber-500">
          ₹{unitPrice}
        </div>

        {hasPortionChoice && (
          <div className="mt-auto flex gap-1 flex-wrap pt-1">
            {portions.map(({ portion, price }) => {
              const portionKey = `${item.id}::${portion}`;
              const portionQty = quantityByPortion ? quantityByPortion[portionKey] || 0 : 0;
              const isSelected = portionQty > 0;

              return (
                <Button
                  key={portion}
                  size="sm"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdd(item, portion);
                  }}
                  className={`flex-1 min-w-0 h-7 px-1.5 text-[11px] font-black rounded-md ${
                    isSelected
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-200'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 mr-0.5" />}
                  {PORTION_LABEL[portion]} ₹{price}
                  {portionQty > 0 ? ` (${portionQty})` : ''}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-stone-100 dark:border-stone-800 mt-auto flex-shrink-0">
        {active ? (
          <div className="flex items-center justify-between py-1 px-1.5 bg-amber-50 dark:bg-amber-950/30">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-md border-amber-200 text-amber-700 hover:bg-amber-100"
              onClick={(e) => {
                e.stopPropagation();
                onDecrement?.(item);
              }}
              aria-label={`Decrease ${item.name}`}
            >
              <Minus className="w-3.5 h-3.5" />
            </Button>

            <span className="text-xs font-black text-amber-800 dark:text-amber-400 px-1">
              {inBill}
            </span>

            <Button
              size="icon"
              className="h-7 w-7 rounded-md bg-amber-600 text-white hover:bg-amber-700"
              onClick={(e) => {
                e.stopPropagation();
                onAdd(item);
              }}
              aria-label={`Increase ${item.name}`}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-8 rounded-none text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            onClick={() => onAdd(item)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add
          </Button>
        )}
      </div>
    </div>
  );
}

export default React.memo(DishCard);
