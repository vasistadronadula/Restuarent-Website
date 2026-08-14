'use client';

import React from 'react';
import Image from 'next/image';
import { Plus, Minus, Star } from 'lucide-react';
import type { MenuItem } from '@/types';
import { PORTION_LABEL, sellablePortions, type Portion } from '@/hooks/usePosCart';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80';

interface Props {
  item: MenuItem;
  inBill: number;
  quantityByPortion?: Record<string, number>;
  onAdd: (item: MenuItem, portion?: Portion) => void;
  onDecrement?: (item: MenuItem, portion?: Portion) => void;
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

  // The veg mark is the one place the console runs a second colour: it is a
  // regulated symbol in India and diners read it by hue, not by shape.
  const vegColor = isVeg ? 'var(--ad-ok)' : isEgg ? 'var(--ad-warn)' : 'var(--ad-accent)';

  return (
    <div
      onClick={handleCardClick}
      className="flex flex-col overflow-hidden text-left select-none cursor-pointer group bg-ad-bg border border-ad-line hover:border-ad-ink transition-colors"
      style={active ? { outline: '2px solid var(--ad-accent)', outlineOffset: '-2px', borderColor: 'var(--ad-accent)' } : undefined}
    >
      {/* Food Photo Container */}
      <div className="relative w-full aspect-square bg-ad-n200 overflow-hidden shrink-0">
        <Image
          src={item.image || FALLBACK_IMAGE}
          alt={item.name}
          fill
          sizes="(max-width:640px) 33vw, (max-width:1024px) 20vw, 14vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Veg / non-veg mark */}
        <span
          className="absolute top-1 left-1 size-3.5 border-2 bg-ad-bg grid place-items-center z-10"
          style={{ borderColor: vegColor }}
        >
          <span className="size-1.5 rounded-full" style={{ background: vegColor }} />
        </span>

        <div className="absolute top-1 right-1 flex items-center gap-1 z-10">
          {item.isPopular && (
            <span className="ad-tag ad-tag-solid text-[8px] px-1 py-0">
              <Star className="size-2 fill-current" />
            </span>
          )}
          {active && (
            <span className="min-w-5 h-5 px-1.5 bg-ad-accent text-ad-bg grid place-items-center ad-num text-[11px]">
              {inBill}
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-2 flex flex-col gap-1 flex-1 min-w-0 justify-between">
        <div>
          <h4 className="ad-num text-[12px] leading-snug line-clamp-2 m-0">{item.name}</h4>
          <span className="ad-num text-[14px]">₹{unitPrice}</span>
        </div>

        {/* Portion rows — each size gets its own working +/- stepper instead
            of one tap-to-add button, so a cashier can dial in "2 Half, 1
            Full" without hunting for a decrement control that wasn't there. */}
        {hasPortionChoice ? (
          <div className="flex flex-col gap-1 pt-0.5">
            {portions.map(({ portion, price }) => {
              const portionKey = `${item.id}::${portion}`;
              const portionQty = quantityByPortion ? quantityByPortion[portionKey] || 0 : 0;
              const portionActive = portionQty > 0;

              return (
                <div key={portion} className="flex items-center justify-between gap-1.5">
                  <span className="min-w-0 flex-1 text-[11px] font-semibold truncate">
                    {PORTION_LABEL[portion]} <span className="ad-muted font-normal">₹{price}</span>
                  </span>

                  {portionActive ? (
                    <div className="flex items-center border border-ad-line overflow-hidden shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDecrement?.(item, portion);
                        }}
                        className="ad-btn ad-btn-secondary size-5.5 p-0 border-0"
                        aria-label={`Decrease ${item.name} ${PORTION_LABEL[portion]}`}
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="ad-num text-[11px] px-1 min-w-4 text-center">{portionQty}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAdd(item, portion);
                        }}
                        className="ad-btn ad-btn-primary size-5.5 p-0"
                        aria-label={`Increase ${item.name} ${PORTION_LABEL[portion]}`}
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAdd(item, portion);
                      }}
                      className="ad-btn ad-btn-dark h-5.5 px-2 text-[10px] shrink-0"
                    >
                      <Plus className="size-2.5" />
                      <span>Add</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* One-Touch Add or Stepper */
          <div className="pt-0.5">
            {active ? (
              <div className="flex items-center justify-between gap-1 border border-ad-line p-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDecrement?.(item);
                  }}
                  className="ad-btn ad-btn-secondary size-6.5 p-0 border-0"
                  aria-label={`Decrease ${item.name}`}
                >
                  <Minus className="size-3.5" />
                </button>

                <span className="ad-num text-[12px] px-1">{inBill}</span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdd(item);
                  }}
                  className="ad-btn ad-btn-primary size-6.5 p-0"
                  aria-label={`Increase ${item.name}`}
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={handleCardClick} className="ad-btn ad-btn-dark w-full h-7">
                <Plus className="size-3.5" />
                <span>Add</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(DishCard);
