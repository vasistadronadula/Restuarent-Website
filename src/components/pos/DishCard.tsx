'use client';

import React from 'react';
import Image from 'next/image';
import { Plus, Minus, Star } from 'lucide-react';
import type { MenuItem } from '@/types';
import { PORTION_LABEL, sellablePortions, type Portion } from '@/hooks/usePosCart';
import { cn } from '@/lib/utils';

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

  const handleCardClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
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
          sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 20vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Veg / non-veg mark */}
        <span
          className="absolute top-1.5 left-1.5 size-3.5 border-2 bg-ad-bg grid place-items-center z-10"
          style={{ borderColor: vegColor }}
        >
          <span className="size-1.5 rounded-full" style={{ background: vegColor }} />
        </span>

        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
          {item.isPopular && (
            <span className="ad-tag ad-tag-solid text-[8.5px] px-1 py-0 shadow-xs">
              <Star className="size-2 fill-current" />
            </span>
          )}
          {active && (
            <span className="min-w-5 h-5 px-1.5 bg-ad-accent text-ad-bg font-bold grid place-items-center ad-num text-[11px] shadow-xs">
              {inBill}
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-2.5 flex flex-col gap-1.5 flex-1 min-w-0 justify-between">
        <div>
          <h4 className="ad-num text-[13px] font-bold leading-snug line-clamp-2 m-0 text-ad-ink">
            {item.name}
          </h4>
          {!hasPortionChoice && (
            <span className="ad-num text-[14px] font-bold block mt-0.5 text-ad-accent">
              ₹{unitPrice}
            </span>
          )}
        </div>

        {/* Portion rows — each size gets its own working +/- stepper */}
        {hasPortionChoice ? (
          <div className="flex flex-col gap-1.5 pt-0.5">
            {portions.map(({ portion, price }) => {
              const portionKey = `${item.id}::${portion}`;
              const portionQty = quantityByPortion ? quantityByPortion[portionKey] || 0 : 0;
              const portionActive = portionQty > 0;

              return (
                <div
                  key={portion}
                  className={cn(
                    "flex items-center justify-between gap-1.5 px-2 py-1 rounded-[calc(var(--ad-radius)-2px)] border text-[11.5px] transition-colors",
                    portionActive
                      ? "bg-ad-surface border-ad-accent/50"
                      : "bg-ad-n100/60 border-ad-line/80 hover:bg-ad-n200/80"
                  )}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="font-bold text-ad-ink capitalize whitespace-nowrap">
                      {PORTION_LABEL[portion]}
                    </span>
                    <span className="ad-num text-[11px] font-semibold text-ad-muted whitespace-nowrap">
                      ₹{price}
                    </span>
                  </div>

                  {portionActive ? (
                    <div className="flex items-center border border-ad-line overflow-hidden shrink-0 bg-ad-bg rounded-[2px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDecrement?.(item, portion);
                        }}
                        className="size-5.5 grid place-items-center hover:bg-ad-n200 text-ad-ink transition-colors"
                        aria-label={`Decrease ${item.name} ${PORTION_LABEL[portion]}`}
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="ad-num text-[11px] font-bold px-1.5 min-w-4 text-center">{portionQty}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAdd(item, portion);
                        }}
                        className="size-5.5 grid place-items-center bg-ad-accent text-white hover:bg-ad-accent/90 transition-colors"
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
                      className="h-5.5 px-2 bg-ad-ink text-white hover:bg-ad-accent text-[10.5px] font-bold rounded-[2px] flex items-center gap-0.5 shrink-0 transition-colors whitespace-nowrap"
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
              <div className="flex items-center justify-between gap-1 border border-ad-line p-0.5 bg-ad-bg rounded-[var(--ad-radius)]">
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

                <span className="ad-num text-[12.5px] font-bold px-1">{inBill}</span>

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
              <button type="button" onClick={handleCardClick} className="ad-btn ad-btn-dark w-full h-7 text-[11px] font-bold">
                <Plus className="size-3" />
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
