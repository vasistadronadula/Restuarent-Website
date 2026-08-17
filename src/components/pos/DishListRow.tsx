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
  onDecrement?: (item: MenuItem, portion?: Portion) => void;
}

function DishListRow({ item, inBill, quantityByPortion, onAdd, onDecrement }: Props) {
  const isVeg = item.vegStatus === 'veg';
  const isEgg = item.vegStatus === 'egg';
  const portions = sellablePortions(item);
  const active = inBill > 0;

  const hasPortionChoice = portions.length > 1;
  const unitPrice = portions.length === 1 ? portions[0].price : item.price;

  // Regulated veg mark — the console's one sanctioned second colour.
  const vegColor = isVeg ? 'var(--ad-ok)' : isEgg ? 'var(--ad-warn)' : 'var(--ad-accent)';

  return (
    <div
      className={`flex items-center gap-3.5 px-4 py-3 min-h-16 transition-colors ${active ? 'bg-ad-surface' : 'bg-ad-bg ad-hover'}`}
      style={{ borderLeft: `4px solid ${active ? 'var(--ad-accent)' : 'transparent'}` }}
    >
      {/* Veg mark */}
      <span
        className="shrink-0 size-4.5 border-2 bg-ad-bg grid place-items-center"
        style={{ borderColor: vegColor }}
      >
        <span className="size-2 rounded-full" style={{ background: vegColor }} />
      </span>

      {/* Name + Price */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="ad-num text-[15px] leading-tight truncate m-0">{item.name}</h4>
          {item.isPopular && <span className="ad-tag ad-tag-solid text-[9px] px-1.5">Top</span>}
        </div>

        {hasPortionChoice ? (
          <div className="flex gap-2 mt-1.5 flex-wrap">
            {portions.map(({ portion, price }) => {
              const qty = quantityByPortion?.[`${item.id}::${portion}`] || 0;
              const selected = qty > 0;
              return selected ? (
                <div key={portion} className="flex items-center gap-1.5">
                  <span className="text-[12px] ad-muted">{PORTION_LABEL[portion]}</span>
                  <div className="flex items-center border border-ad-line overflow-hidden shrink-0">
                    <button
                      type="button"
                      onClick={() => onDecrement?.(item, portion)}
                      className="ad-btn size-7 p-0 ad-hover-strong"
                      aria-label={`Decrease ${item.name} ${PORTION_LABEL[portion]}`}
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="min-w-6 text-center ad-num text-[13px]">{qty}</span>
                    <button
                      type="button"
                      onClick={() => onAdd(item, portion)}
                      className="ad-btn ad-btn-primary size-7 p-0"
                      aria-label={`Increase ${item.name} ${PORTION_LABEL[portion]}`}
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  key={portion}
                  type="button"
                  onClick={() => onAdd(item, portion)}
                  className="ad-tab h-7 px-2.5 flex items-center gap-1 whitespace-nowrap text-[12px] font-semibold"
                >
                  {PORTION_LABEL[portion]} <span className="font-normal text-ad-muted">₹{price}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <span className="ad-num text-[15px] mt-0.5 block">₹{unitPrice}</span>
        )}
      </div>

      {/* Qty Stepper or Fast Add Button */}
      {hasPortionChoice ? (
        active && (
          <span className="shrink-0 min-w-8 h-8 px-2.5 bg-ad-accent text-ad-bg grid place-items-center ad-num text-[13px]">
            {inBill}
          </span>
        )
      ) : active ? (
        <div className="flex items-center border border-ad-line overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => onDecrement?.(item)}
            aria-label={`Less ${item.name}`}
            className="ad-btn w-9 h-9 p-0 ad-hover-strong"
          >
            <Minus className="size-4" />
          </button>
          <span className="min-w-7 text-center ad-num text-[15px] px-1">{inBill}</span>
          <button
            type="button"
            onClick={() => onAdd(item)}
            aria-label={`More ${item.name}`}
            className="ad-btn ad-btn-primary w-9 h-9 p-0"
          >
            <Plus className="size-4" />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => onAdd(item)} className="ad-btn ad-btn-dark shrink-0 h-9 px-4">
          <Plus className="size-3.5" />
          Add
        </button>
      )}
    </div>
  );
}

export default React.memo(DishListRow);
