'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { MenuItem } from '@/types/pos';
import { useCartStore } from '@/store/usePosCartStore';
import { Plus, Ban, Check, Sparkles, Flame } from 'lucide-react';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&q=80';

interface MenuItemCardProps {
  item: MenuItem;
}

export default function MenuItemCard({ item }: MenuItemCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.cartItems);

  // Check if item has portion pricing
  const hasPortions =
    item.portionPrices &&
    (item.portionPrices.single || item.portionPrices.large);

  const [selectedPortion, setSelectedPortion] = useState<'single' | 'full' | 'large'>('full');

  const currentPrice =
    item.portionPrices && item.portionPrices[selectedPortion]
      ? item.portionPrices[selectedPortion]!
      : item.price;

  // Cart quantity for this item + portion
  const cartItem = cartItems.find(
    (ci) =>
      ci.id === item.id &&
      (ci.selectedPortion || 'full') === selectedPortion
  );
  const totalItemCountInCart = cartItems
    .filter((ci) => ci.id === item.id)
    .reduce((sum, ci) => sum + ci.quantity, 0);

  const isVeg = item.vegStatus === 'veg';
  const isEgg = item.vegStatus === 'egg';

  const handleClick = (e: React.MouseEvent) => {
    if (!item.isAvailable) return;
    addItem(item, selectedPortion, currentPrice);
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={item.isAvailable ? 0 : -1}
      aria-disabled={!item.isAvailable}
      aria-label={`Add ${item.name} (₹${currentPrice}) to cart${
        !item.isAvailable ? ' - currently unavailable' : ''
      }`}
      className={`relative flex flex-col justify-between rounded-xl bg-white border shadow-sm transition-all duration-150 group select-none overflow-hidden ${
        item.isAvailable
          ? 'cursor-pointer hover:border-[#2563EB] hover:shadow-md active:scale-[0.98]'
          : 'cursor-not-allowed opacity-60 bg-slate-50'
      } ${
        totalItemCountInCart > 0
          ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20 bg-blue-50/10'
          : 'border-[#E2E8F0]'
      }`}
    >
      {/* Top Section: Food Photo with Status Badges */}
      <div className="relative w-full aspect-[16/10] bg-slate-100 overflow-hidden shrink-0">
        <Image
          src={item.image || FALLBACK_IMAGE}
          alt={item.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Gradient overlay for text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

        {/* Veg / Non-Veg Indicator (Top Left) */}
        <div className="absolute top-2 left-2 z-10">
          <span
            className={`inline-flex items-center justify-center size-4.5 rounded-[4px] border-2 bg-white/95 backdrop-blur-xs shadow-xs ${
              isVeg
                ? 'border-emerald-600'
                : isEgg
                ? 'border-amber-500'
                : 'border-rose-600'
            }`}
            title={isVeg ? 'Vegetarian' : isEgg ? 'Egg' : 'Non-Vegetarian'}
          >
            <span
              className={`size-2 rounded-full ${
                isVeg
                  ? 'bg-emerald-600'
                  : isEgg
                  ? 'bg-amber-500'
                  : 'bg-rose-600'
              }`}
            />
          </span>
        </div>

        {/* Badges (Top Right): Special / Popular / Availability */}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1 z-10">
          {item.isAvailable ? (
            item.isSpecial ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                <Sparkles className="size-2.5" /> Special
              </span>
            ) : item.isPopular ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-xs">
                <Flame className="size-2.5" /> Popular
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs">
                <Check className="size-2.5 stroke-[3]" /> In Stock
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#DC2626] text-white shadow-xs">
              <Ban className="size-2.5" /> Sold Out
            </span>
          )}
        </div>

        {/* Portion Selector Pills (Overlay on bottom of photo) */}
        {hasPortions && item.isAvailable && (
          <div
            className="absolute bottom-1.5 inset-x-2 flex items-center justify-center gap-1 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {item.portionPrices?.single && (
              <button
                type="button"
                onClick={() => setSelectedPortion('single')}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md transition-all ${
                  selectedPortion === 'single'
                    ? 'bg-[#2563EB] text-white shadow-xs ring-1 ring-white/50'
                    : 'bg-black/60 text-white/90 hover:bg-black/80'
                }`}
              >
                Half: ₹{item.portionPrices.single}
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedPortion('full')}
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md transition-all ${
                selectedPortion === 'full'
                  ? 'bg-[#2563EB] text-white shadow-xs ring-1 ring-white/50'
                  : 'bg-black/60 text-white/90 hover:bg-black/80'
              }`}
            >
              Full: ₹{item.portionPrices?.full ?? item.price}
            </button>
            {item.portionPrices?.large && (
              <button
                type="button"
                onClick={() => setSelectedPortion('large')}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md transition-all ${
                  selectedPortion === 'large'
                    ? 'bg-[#2563EB] text-white shadow-xs ring-1 ring-white/50'
                    : 'bg-black/60 text-white/90 hover:bg-black/80'
                }`}
              >
                Large: ₹{item.portionPrices.large}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Section: Name, Category, Price & Cart indicator */}
      <div className="p-3 flex flex-col justify-between flex-1">
        <div>
          <h3 className="font-semibold text-sm text-[#0F172A] line-clamp-1 group-hover:text-[#2563EB] transition-colors">
            {item.name}
          </h3>
          <p className="text-[11px] text-[#475569] line-clamp-1 mt-0.5">
            {item.description || item.category}
          </p>
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E2E8F0]">
          <span className="text-base font-bold text-[#2563EB]">
            ₹{currentPrice}
          </span>

          {item.isAvailable && (
            <div className="flex items-center gap-1.5">
              {totalItemCountInCart > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold text-white bg-[#2563EB] rounded-full shadow-xs">
                  {totalItemCountInCart}
                </span>
              )}
              <span
                className="inline-flex items-center justify-center size-6.5 rounded-md bg-blue-50 text-[#2563EB] group-hover:bg-[#2563EB] group-hover:text-white transition-colors"
                aria-hidden="true"
              >
                <Plus className="size-3.5 stroke-[2.5]" />
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
