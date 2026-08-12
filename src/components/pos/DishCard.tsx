'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Plus, Minus, Check } from 'lucide-react';
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

  // Veg indicator dot color
  const vegDotClass = isVeg
    ? 'bg-emerald-600 border-emerald-600'
    : isEgg
    ? 'bg-amber-500 border-amber-500'
    : 'bg-rose-600 border-rose-600';

  return (
    <div
      onClick={handleCardClick}
      className={`rounded-2xl flex flex-col overflow-hidden text-left transition-all select-none cursor-pointer group active:scale-[0.97] ${
        active
          ? 'border-2 border-orange-500 ring-2 ring-orange-400/20 shadow-lg shadow-orange-100'
          : 'border border-stone-200 shadow-sm hover:border-orange-300 hover:shadow-md'
      } bg-white`}
    >
      {/* Image */}
      <div className="relative w-full aspect-[4/3] bg-stone-100 overflow-hidden flex-shrink-0">
        <Image
          src={item.image || FALLBACK_IMAGE}
          alt={item.name}
          fill
          sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Veg dot — top-left */}
        <span className={`absolute top-2 left-2 inline-flex size-3.5 rounded-[3px] border-2 items-center justify-center ${vegDotClass} z-10`}>
          <span className="size-1.5 rounded-full bg-white/90" />
        </span>

        {/* Active qty badge — top-right */}
        {active && (
          <span className="absolute top-2 right-2 min-w-[22px] h-5 px-1.5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[11px] font-black shadow-md z-10">
            {inBill}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-2 flex-1 min-w-0">
        <h4 className="text-sm font-bold text-stone-900 leading-tight line-clamp-2">
          {item.name}
        </h4>

        <div className="flex items-center justify-between">
          <span className="text-base font-black text-stone-900">₹{unitPrice}</span>
          <span className="text-[11px] font-medium text-stone-400">{item.prepTime || 15}m</span>
        </div>

        {/* Portion buttons */}
        {hasPortionChoice && (
          <div className="flex gap-1.5 flex-wrap">
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
                  className={`flex-1 min-w-0 h-8 px-2 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${
                    isSelected
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-stone-100 text-stone-700 hover:bg-orange-50 hover:text-orange-700 border border-stone-200'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 shrink-0" />}
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
        )}

        {/* Add / Qty stepper */}
        {!hasPortionChoice && (
          <div className="mt-auto pt-1">
            {active ? (
              <div className="flex items-center justify-between bg-orange-50 border-2 border-orange-400 rounded-xl px-2 py-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDecrement?.(item);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-orange-600 hover:bg-orange-100 transition-colors"
                  aria-label={`Decrease ${item.name}`}
                >
                  <Minus className="w-4 h-4" />
                </button>

                <span className="text-sm font-black text-orange-700 px-2 tabular-nums">
                  {inBill}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdd(item);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-sm"
                  aria-label={`Increase ${item.name}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCardClick}
                className="w-full h-9 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(DishCard);
