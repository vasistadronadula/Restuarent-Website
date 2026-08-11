'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Plus, Minus, Heart, Check } from 'lucide-react';
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
  const [favorite, setFavorite] = useState(false);
  const isVeg = item.vegStatus === 'veg';
  const isEgg = item.vegStatus === 'egg';
  const portions = sellablePortions(item);
  const active = inBill > 0;

  const hasPortionChoice = portions.length > 1;
  const unitPrice = portions.length === 1 ? portions[0].price : item.price;

  const handleCardClick = () => {
    if (!hasPortionChoice) {
      onAdd(item);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`rounded-2xl border flex flex-col h-full bg-white dark:bg-stone-900 overflow-hidden text-left transition-all select-none cursor-pointer group active:scale-[0.98] ${
        active
          ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md'
          : 'border-stone-200/90 dark:border-stone-800 shadow-xs hover:border-blue-300 hover:shadow-md'
      }`}
    >
      {/* Image container */}
      <div className="relative w-full h-32 sm:h-36 bg-stone-100 dark:bg-stone-800 overflow-hidden flex-shrink-0">
        <Image
          src={item.image || FALLBACK_IMAGE}
          alt={item.name}
          fill
          sizes="(max-width:600px) 50vw, (max-width:1200px) 25vw, 200px"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Favorite Heart Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setFavorite(!favorite);
          }}
          className="absolute top-2 right-2 size-7 rounded-full bg-white/90 dark:bg-stone-900/90 backdrop-blur-xs flex items-center justify-center text-stone-500 hover:text-rose-500 transition-colors shadow-xs z-10"
        >
          <Heart className={`size-4 ${favorite ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>

        {/* Active Quantity Badge */}
        {active && (
          <div className="absolute top-2 left-2 min-w-[22px] h-5 px-1.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-md z-10">
            {inBill}
          </div>
        )}
      </div>

      {/* Content Body */}
      <div className="p-3 flex flex-col gap-1.5 flex-1 min-w-0">
        {/* Veg/Non-Veg Icon & Title */}
        <div className="flex items-start gap-1.5">
          <span className="shrink-0 mt-0.5 text-xs font-bold">
            {isVeg ? (
              <span className="inline-block size-3.5 rounded-xs border border-emerald-600 p-0.5 leading-none">
                <span className="block size-full rounded-full bg-emerald-600" />
              </span>
            ) : isEgg ? (
              <span className="inline-block size-3.5 rounded-xs border border-amber-600 p-0.5 leading-none">
                <span className="block size-full rounded-full bg-amber-600" />
              </span>
            ) : (
              <span className="inline-block size-3.5 rounded-xs border border-rose-600 p-0.5 leading-none">
                <span className="block size-0 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[6px] border-b-rose-600 mx-auto" />
              </span>
            )}
          </span>
          <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 leading-tight line-clamp-2">
            {item.name}
          </h4>
        </div>

        {/* Price & Prep Time */}
        <div className="flex items-center justify-between mt-0.5">
          <div className="text-sm font-black text-stone-900 dark:text-stone-100">
            ₹{unitPrice}
          </div>
          <div className="text-xs font-semibold text-stone-400">
            {item.prepTime || 15} min
          </div>
        </div>

        {/* Portion Choices if multiple */}
        {hasPortionChoice && (
          <div className="mt-1 flex gap-1 flex-wrap">
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
                  className={`flex-1 min-w-0 h-7 px-1.5 text-[11px] font-bold rounded-lg ${
                    isSelected
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
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

        {/* Bottom Button */}
        <div className="mt-2 pt-1 border-t border-stone-100 dark:border-stone-800">
          {active ? (
            <div className="flex items-center justify-between py-0.5 px-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-blue-700 hover:bg-blue-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onDecrement?.(item);
                }}
                aria-label={`Decrease ${item.name}`}
              >
                <Minus className="w-3.5 h-3.5" />
              </Button>

              <span className="text-xs font-black text-blue-900 dark:text-blue-200 px-2">
                {inBill} in Cart
              </span>

              <Button
                size="icon"
                className="h-7 w-7 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
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
              type="button"
              variant="outline"
              size="sm"
              className="w-full h-8 rounded-xl text-xs font-bold border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 bg-white dark:bg-stone-900 shadow-3xs"
              onClick={() => onAdd(item)}
            >
              + Add
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(DishCard);
