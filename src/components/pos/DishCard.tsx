'use client';

import React from 'react';
import Image from 'next/image';
import { Plus, Minus, Check, Star } from 'lucide-react';
import type { MenuItem } from '@/types';
import { PORTION_LABEL, sellablePortions, type Portion } from '@/hooks/usePosCart';

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
      className={`rounded-2xl flex flex-col overflow-hidden text-left transition-all select-none cursor-pointer group active:scale-[0.98] duration-150 relative ${
        active
          ? 'border-2 border-emerald-600 bg-emerald-50/20 shadow-xs'
          : 'border border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-md bg-white'
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
        <span
          className={`absolute top-2 left-2 size-4 rounded-[3px] border-2 bg-white/95 backdrop-blur-xs flex items-center justify-center ${vegDotColor} z-10 shadow-2xs`}
        >
          <span className={`size-1.5 rounded-full ${vegDotFill}`} />
        </span>

        {/* Active Quantity Badge (Exact Match: Emerald Green Circle in Top Right) */}
        {active && (
          <div className="absolute top-2 right-2 size-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-xs z-10 font-mono">
            {inBill}
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-3 flex flex-col flex-1 min-w-0 justify-between gap-1.5 bg-transparent">
        <div>
          <h4 className="text-[14px] font-bold text-slate-900 leading-snug line-clamp-1 group-hover:text-emerald-700 transition-colors">
            {item.name}
          </h4>

          <p className="text-[11.5px] text-slate-500 line-clamp-2 leading-tight mt-0.5">
            {item.description || `${item.category || 'Special dish'} freshly prepared`}
          </p>
        </div>

        {/* Price Tag & Portions */}
        <div className="pt-1 mt-auto">
          {hasPortionChoice ? (
            <div className="flex gap-1 flex-wrap">
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
                    className={`flex-1 min-w-0 h-7 px-1.5 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all border ${
                      isSelected
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300'
                    }`}
                  >
                    <span className="truncate">{PORTION_LABEL[portion]} ₹{price}</span>
                    {portionQty > 0 && (
                      <span className="shrink-0 bg-white/30 text-white text-[9px] font-black px-1 rounded-full">
                        {portionQty}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-[14.5px] font-bold text-emerald-700 font-mono">
                ₹{unitPrice.toFixed(2)}
              </span>
              {active && onDecrement && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDecrement(item);
                    }}
                    className="size-6 rounded-md bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 flex items-center justify-center transition-colors"
                  >
                    <Minus className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAdd(item);
                    }}
                    className="size-6 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-colors"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(DishCard);
