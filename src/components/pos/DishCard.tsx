'use client';

import React from 'react';
import Image from 'next/image';
import { Plus, Minus, Check, Sparkles, Star } from 'lucide-react';
import type { MenuItem } from '@/types';
import { PORTION_LABEL, sellablePortions, type Portion } from '@/hooks/usePosCart';
import { Badge } from '@/components/ui/badge';

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

  const handleCardClick = () => {
    if (!hasPortionChoice) {
      onAdd(item);
    }
  };

  // Veg indicator dot
  const vegDotColor = isVeg
    ? 'border-emerald-600'
    : isEgg
    ? 'border-amber-500'
    : 'border-rose-600';

  const vegDotFill = isVeg
    ? 'bg-emerald-600'
    : isEgg
    ? 'bg-amber-500'
    : 'bg-rose-600';

  return (
    <div
      onClick={handleCardClick}
      className={`rounded-3xl flex flex-col overflow-hidden text-left transition-all select-none cursor-pointer group active:scale-[0.98] duration-150 ${
        active
          ? 'border-2 border-blue-600 ring-4 ring-blue-500/15 shadow-lg shadow-blue-500/10 bg-white'
          : 'border border-slate-200/90 shadow-xs hover:border-blue-400 hover:shadow-md bg-white'
      }`}
    >
      {/* Food Photo Container */}
      <div className="relative w-full aspect-[4/3] bg-slate-100 overflow-hidden flex-shrink-0">
        <Image
          src={item.image || FALLBACK_IMAGE}
          alt={item.name}
          fill
          sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Veg / Non-Veg Indicator Icon (Top Left) */}
        <span className={`absolute top-2.5 left-2.5 size-4.5 rounded-[4px] border-2 bg-white/95 backdrop-blur-xs flex items-center justify-center ${vegDotColor} z-10 shadow-xs`}>
          <span className={`size-2 rounded-full ${vegDotFill}`} />
        </span>

        {/* Popular / Chef Special Badges (Top Right) */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 z-10">
          {item.isPopular && (
            <span className="bg-amber-500 text-slate-950 font-black text-[9px] uppercase px-2 py-0.5 rounded-full shadow-xs flex items-center gap-0.5">
              <Star className="size-2.5 fill-current" /> Top
            </span>
          )}
          {active && (
            <span className="min-w-[24px] h-6 px-2 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-md">
              {inBill}
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3.5 flex flex-col gap-2 flex-1 min-w-0 justify-between">
        <div>
          <h4 className="text-[15px] font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
            {item.name}
          </h4>

          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-black text-slate-950 font-mono">
              ₹{unitPrice}
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              {item.prepTime || 15}m prep
            </span>
          </div>
        </div>

        {/* Portion Price Multi-Select (if multiple sizes) */}
        {hasPortionChoice ? (
          <div className="flex gap-1.5 flex-wrap pt-1">
            {portions.map(({ portion, price }) => {
              const portionKey = `${item.id}::${portion}`;
              const portionQty = quantityByPortion ? quantityByPortion[portionKey] || 0 : 0;
              const isSelected = portionQty > 0;

              return (
                <button
                  key={portion}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdd(item, portion);
                  }}
                  className={`flex-1 min-w-0 h-8.5 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-all border ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300'
                  }`}
                >
                  {isSelected && <Check className="size-3 shrink-0" />}
                  <span className="truncate">{PORTION_LABEL[portion]} ₹{price}</span>
                  {portionQty > 0 && (
                    <span className="shrink-0 bg-white/30 text-white text-[10px] font-black px-1 rounded-full ml-0.5">
                      {portionQty}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          /* One-Touch Add or Stepper */
          <div className="pt-1">
            {active ? (
              <div className="flex items-center justify-between bg-blue-50/80 border-2 border-blue-400 rounded-2xl p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDecrement?.(item);
                  }}
                  className="size-8.5 rounded-xl flex items-center justify-center text-blue-700 hover:bg-blue-100/80 active:scale-95 transition-all"
                  aria-label={`Decrease ${item.name}`}
                >
                  <Minus className="size-4" />
                </button>

                <span className="text-sm font-black text-blue-900 font-mono px-2 tabular-nums">
                  {inBill} in cart
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdd(item);
                  }}
                  className="size-8.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center justify-center shadow-xs transition-all"
                  aria-label={`Increase ${item.name}`}
                >
                  <Plus className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCardClick}
                className="w-full h-9.5 rounded-2xl bg-slate-900 hover:bg-blue-600 active:scale-[0.98] text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-xs"
              >
                <Plus className="size-4" />
                <span>+ Add Item</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(DishCard);
