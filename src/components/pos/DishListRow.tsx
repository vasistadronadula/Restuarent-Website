'use client';

import React from 'react';
import { Plus, Minus, Check, Star } from 'lucide-react';
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
      className={`flex items-center gap-3.5 px-4 py-3 min-h-[64px] transition-all border-l-4 ${
        active
          ? 'bg-blue-50/70 border-l-blue-600'
          : 'bg-white border-l-transparent hover:bg-slate-50'
      }`}
    >
      {/* Veg Indicator Dot */}
      <span className={`shrink-0 size-4.5 rounded-[4px] border-2 bg-white flex items-center justify-center ${vegDotColor}`}>
        <span className={`size-2 rounded-full ${vegDotFill}`} />
      </span>

      {/* Name + Price */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-slate-900 leading-tight truncate">
            {item.name}
          </h4>
          {item.isPopular && (
            <span className="shrink-0 text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
              Top
            </span>
          )}
        </div>

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
                  className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${
                    selected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50'
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
          <span className="text-sm font-black text-slate-950 font-mono mt-0.5 block">
            ₹{unitPrice}
          </span>
        )}
      </div>

      {/* Qty Stepper or Fast Add Button */}
      {hasPortionChoice ? (
        active && (
          <span className="shrink-0 min-w-[32px] h-8 px-2.5 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-xs font-mono">
            {inBill}
          </span>
        )
      ) : active ? (
        <div className="flex items-center gap-0 bg-white border-2 border-blue-400 rounded-xl overflow-hidden shrink-0 shadow-xs">
          <button
            type="button"
            onClick={() => onDecrement?.(item)}
            aria-label={`Less ${item.name}`}
            className="w-9 h-9 flex items-center justify-center text-blue-700 hover:bg-blue-50 transition-colors"
          >
            <Minus className="size-4" />
          </button>
          <span className="min-w-[28px] text-center text-sm font-black text-blue-950 font-mono px-1 tabular-nums">
            {inBill}
          </span>
          <button
            type="button"
            onClick={() => onAdd(item)}
            aria-label={`More ${item.name}`}
            className="w-9 h-9 flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onAdd(item)}
          className="shrink-0 h-9 px-4 rounded-xl bg-slate-900 hover:bg-blue-600 active:scale-95 text-white text-xs font-black flex items-center justify-center gap-1 transition-all shadow-xs"
        >
          <Plus className="size-3.5" />
          Add
        </button>
      )}
    </div>
  );
}

export default React.memo(DishListRow);
