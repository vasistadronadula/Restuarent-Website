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

  // The veg mark is the one place the console runs a second colour: it is a
  // regulated symbol in India and diners read it by hue, not by shape.
  const vegColor = isVeg ? 'var(--ad-ok)' : isEgg ? 'var(--ad-warn)' : 'var(--ad-accent)';

  return (
    <div
      onClick={handleCardClick}
      className="flex flex-col overflow-hidden text-left select-none cursor-pointer group bg-ad-bg transition-colors"
      style={active ? { outline: '2px solid var(--ad-accent)', outlineOffset: '-2px' } : undefined}
    >
      {/* Food Photo Container */}
      <div className="relative w-full aspect-[4/3] bg-ad-n200 overflow-hidden shrink-0">
        <Image
          src={item.image || FALLBACK_IMAGE}
          alt={item.name}
          fill
          sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Veg / non-veg mark */}
        <span
          className="absolute top-2 left-2 size-4.5 border-2 bg-ad-bg grid place-items-center z-10"
          style={{ borderColor: vegColor }}
        >
          <span className="size-2 rounded-full" style={{ background: vegColor }} />
        </span>

        <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
          {item.isPopular && (
            <span className="ad-tag ad-tag-solid text-[9px] px-1.5">
              <Star className="size-2.5 fill-current" /> Top
            </span>
          )}
          {active && (
            <span className="min-w-6 h-6 px-2 bg-ad-accent text-ad-bg grid place-items-center ad-num text-[12px]">
              {inBill}
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3.5 flex flex-col gap-2 flex-1 min-w-0 justify-between">
        <div>
          <h4 className="ad-num text-[15px] leading-snug line-clamp-2 m-0">{item.name}</h4>

          <div className="flex items-baseline justify-between gap-2 mt-1.5">
            <span className="ad-num text-[19px]">₹{unitPrice}</span>
            <span className="ad-kicker">{item.prepTime || 15}m prep</span>
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
                  className="ad-tab flex-1 min-w-0 h-8.5 px-2 flex items-center justify-center gap-1"
                  data-active={isSelected}
                >
                  {isSelected && <Check className="size-3 shrink-0" />}
                  <span className="truncate">{PORTION_LABEL[portion]} ₹{price}</span>
                  {portionQty > 0 && <span className="shrink-0 tabular-nums">{portionQty}</span>}
                </button>
              );
            })}
          </div>
        ) : (
          /* One-Touch Add or Stepper */
          <div className="pt-1">
            {active ? (
              <div className="flex items-center justify-between gap-1 border border-ad-line p-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDecrement?.(item);
                  }}
                  className="ad-btn ad-btn-secondary size-8.5 p-0 border-0"
                  aria-label={`Decrease ${item.name}`}
                >
                  <Minus className="size-4" />
                </button>

                <span className="ad-num text-[15px] px-2">{inBill}</span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdd(item);
                  }}
                  className="ad-btn ad-btn-primary size-8.5 p-0"
                  aria-label={`Increase ${item.name}`}
                >
                  <Plus className="size-4" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={handleCardClick} className="ad-btn ad-btn-dark w-full h-9.5">
                <Plus className="size-4" />
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
