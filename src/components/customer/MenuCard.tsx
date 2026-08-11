'use client';

import React, { memo } from 'react';
import Image from 'next/image';
import { Star, Clock } from 'lucide-react';

import { cn, formatCurrency, FALLBACK_DISH_IMAGE } from '@/lib/utils';
import { MenuItem } from '@/types';
import { useDishPortion, PORTION_LABELS, type Portion } from '@/hooks/useDishPortion';
import CartStepper from './CartStepper';

interface Props {
  item: MenuItem;
}

const MenuCard = memo(function MenuCard({ item }: Props) {
  const {
    availablePortions,
    hasPortions,
    selectedPortion,
    setSelectedPortion,
    activePrice,
    cartItem,
    add,
    increase,
    decrease,
  } = useDishPortion(item);

  const unavailable = !item.isAvailable;
  const inCart = !!cartItem;
  const quantity = cartItem?.quantity || 0;

  return (
    <article
      className={cn(
        'bg-white group relative flex flex-col items-stretch rounded-2xl border select-none transition-all duration-300 overflow-hidden h-full justify-between',
        inCart
          ? 'border-amber-500 shadow-md shadow-amber-500/5 ring-1 ring-amber-500/30 scale-[0.99]'
          : 'border-stone-200/80 shadow-2xs hover:shadow-sm hover:border-stone-300 hover:scale-[1.01]',
        unavailable && 'opacity-60 cursor-not-allowed'
      )}
    >
      {/* ── Top: Image with Overlays ── */}
      <div className="relative w-full aspect-[4/3] bg-stone-50 overflow-hidden border-b border-stone-100/50">
        <Image
          src={item.image || FALLBACK_DISH_IMAGE}
          alt={item.name}
          fill
          sizes="(max-width: 640px) 45vw, 250px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Veg/Non-veg Status Tag */}
        <div className="absolute top-2.5 left-2.5 z-10 bg-white/95 backdrop-blur-3xs p-1 rounded-lg shadow-3xs flex items-center justify-center">
          <span
            className={
              item.vegStatus === 'veg'
                ? 'veg-indicator'
                : item.vegStatus === 'egg'
                ? 'egg-indicator'
                : 'non-veg-indicator'
            }
            role="img"
            aria-label={
              item.vegStatus === 'veg'
                ? 'Vegetarian'
                : item.vegStatus === 'egg'
                ? 'Egg'
                : 'Non-vegetarian'
            }
          />
        </div>

        {/* Bestseller / Chef's Special badges */}
        {item.isSpecial ? (
          <div className="absolute top-2.5 right-2.5 z-10 bg-gradient-to-r from-orange-600 to-amber-500 text-white text-[9px] font-black tracking-wide uppercase px-2 py-0.5 rounded-full shadow-sm">
            ★ Chef&apos;s Special
          </div>
        ) : item.isPopular ? (
          <div className="absolute top-2.5 right-2.5 z-10 bg-amber-500 text-stone-950 text-[9px] font-black tracking-wide uppercase px-2 py-0.5 rounded-full shadow-sm">
            🔥 Bestseller
          </div>
        ) : null}

        {/* Out of Stock Ribbon */}
        {unavailable && (
          <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center">
            <span className="bg-rose-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider shadow-md">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* ── Bottom: Product Info ── */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-3 bg-white">
        
        {/* Name and Description */}
        <div className="space-y-1">
          <h3 className="text-xs sm:text-sm font-black text-stone-900 leading-snug line-clamp-1 group-hover:text-amber-600 transition-colors">
            {item.name}
          </h3>

          <div className="flex items-center gap-2 text-[10px] text-stone-500 font-bold">
            <div className="flex items-center gap-0.5 text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">
              <Star className="size-2.5 fill-current" />
              <span>{item.rating?.toFixed(1) || '4.5'}</span>
            </div>
            {item.prepTime != null && item.prepTime > 0 && (
              <div className="flex items-center gap-1 bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">
                <Clock className="size-2.5" />
                <span>{item.prepTime}m</span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-stone-400 font-medium line-clamp-2 leading-normal mt-1.5">
            {item.description || 'No description available.'}
          </p>
        </div>

        {/* Portion Selector (rendered only if dish has portions) */}
        {hasPortions && (
          <div className="flex flex-wrap gap-1.5 my-1">
            {availablePortions.map((portion: Portion) => {
              const selected = portion === selectedPortion;
              return (
                <button
                  key={portion}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPortion(portion);
                  }}
                  className={cn(
                    'rounded-md border px-2 py-0.5 text-[9px] font-bold transition-all outline-none',
                    selected
                      ? 'border-amber-500 bg-amber-500/10 text-amber-800 font-black'
                      : 'border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-300'
                  )}
                >
                  {PORTION_LABELS[portion]}
                </button>
              );
            })}
          </div>
        )}

        {/* Footer row: Price & Add Button */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-stone-100 gap-2">
          <div className="flex flex-col">
            <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider leading-none">Price</span>
            <span className="font-mono text-xs sm:text-sm font-black text-stone-900 mt-0.5">
              {formatCurrency(activePrice)}
            </span>
          </div>

          {/* ADD / Stepper Control */}
          <div onClick={(e) => e.stopPropagation()} className="shrink-0">
            {cartItem ? (
              <CartStepper
                quantity={quantity}
                onIncrease={increase}
                onDecrease={decrease}
                size="small"
                label={item.name}
              />
            ) : (
              <button
                type="button"
                onClick={add}
                disabled={unavailable}
                className={cn(
                  'h-8 px-4.5 rounded-xl border-[1.5px] text-xs font-black tracking-wide transition-all outline-none active:scale-95 shadow-3xs',
                  'border-emerald-650 bg-white text-emerald-600 hover:bg-emerald-600 hover:text-white',
                  'disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed disabled:shadow-none'
                )}
              >
                ADD
              </button>
            )}
          </div>
        </div>

      </div>
    </article>
  );
});

export default MenuCard;
