'use client';

import React from 'react';
import { Plus, Minus } from 'lucide-react';
import type { MenuItem } from '@/types';
import { PORTION_LABEL, sellablePortions, type Portion } from '@/hooks/usePosCart';

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
  const portions = sellablePortions(item);
  const active = inBill > 0;

  const hasPortionChoice = portions.length > 1;
  const unitPrice = portions.length === 1 ? portions[0].price : item.price;

  const vegDotClass = isVeg
    ? 'bg-emerald-600 border-emerald-600'
    : isEgg
    ? 'bg-amber-500 border-amber-500'
    : 'bg-rose-600 border-rose-600';

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 min-h-[68px] transition-all border-l-4 ${
        active
          ? 'bg-orange-50 border-l-orange-500'
          : 'bg-white border-l-transparent hover:bg-stone-50'
      }`}
    >
      {/* Veg indicator */}
      <span
        className={`shrink-0 inline-flex size-4 rounded-[3px] border-2 items-center justify-center ${vegDotClass}`}
      >
        <span className="size-1.5 rounded-full bg-white/80" />
      </span>

      {/* Name + price */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-stone-900 leading-tight line-clamp-2">
          {item.name}
        </h4>

        {hasPortionChoice ? (
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {portions.map(({ portion, price }) => {
              const qty = quantityByPortion?.[`${item.id}::${portion}`] || 0;
              const selected = qty > 0;
              return (
                <button
                  key={portion}
                  type="button"
                  onClick={() => onAdd(item, portion)}
                  className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    selected
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-stone-100 text-stone-700 border border-stone-200 hover:bg-orange-50 hover:border-orange-300'
                  }`}
                >
                  {PORTION_LABEL[portion]} ₹{price}
                  {qty > 0 && (
                    <span className="ml-0.5 bg-white/30 text-white text-[10px] font-black px-1 rounded-full">
                      {qty}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <span className="text-sm font-black text-orange-600 mt-0.5 block">₹{unitPrice}</span>
        )}
      </div>

      {/* Qty stepper or ADD */}
      {hasPortionChoice ? (
        active && (
          <span className="shrink-0 min-w-[32px] h-7 px-2.5 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-black shadow-sm">
            {inBill}
          </span>
        )
      ) : active ? (
        <div className="flex items-center gap-0 bg-white border-2 border-orange-400 rounded-xl overflow-hidden shrink-0 shadow-sm">
          <button
            type="button"
            onClick={() => onDecrement?.(item)}
            aria-label={`Less ${item.name}`}
            className="w-10 h-10 flex items-center justify-center text-orange-600 hover:bg-orange-50 transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="min-w-[28px] text-center text-sm font-black text-orange-700 px-1 tabular-nums">
            {inBill}
          </span>
          <button
            type="button"
            onClick={() => onAdd(item)}
            aria-label={`More ${item.name}`}
            className="w-10 h-10 flex items-center justify-center bg-orange-500 text-white hover:bg-orange-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onAdd(item)}
          className="shrink-0 w-16 h-10 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-sm font-bold flex items-center justify-center gap-1 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      )}
    </div>
  );
}

export default React.memo(DishListRow);
