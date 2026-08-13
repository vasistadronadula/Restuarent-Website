'use client';

import React, { useRef, useState } from 'react';
import { CartItem } from '@/types/pos';
import { useCartStore } from '@/store/usePosCartStore';
import { Minus, Plus, Trash2 } from 'lucide-react';

interface CartItemRowProps {
  item: CartItem;
}

export default function CartItemRow({ item }: CartItemRowProps) {
  const removeItem = useCartStore((s) => s.removeItem);
  const incrementQuantity = useCartStore((s) => s.incrementQuantity);
  const decrementQuantity = useCartStore((s) => s.decrementQuantity);

  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiped, setIsSwiped] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const lineTotal = item.price * item.quantity;

  /* Touch event handlers for swipe left to reveal red Remove button */
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - touchStartX.current;

    // Only allow leftward swipe up to -72px
    if (deltaX < 0) {
      setSwipeOffset(Math.max(-72, deltaX));
    } else if (isSwiped) {
      // Allow swiping back right to close
      setSwipeOffset(Math.min(0, -72 + deltaX));
    }
  };

  const handleTouchEnd = () => {
    touchStartX.current = null;
    if (swipeOffset < -36) {
      setSwipeOffset(-72);
      setIsSwiped(true);
    } else {
      setSwipeOffset(0);
      setIsSwiped(false);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeItem(item.id);
  };

  return (
    <div
      className="relative overflow-hidden group select-none py-2.5 px-1 border-b border-[#E2E8F0] last:border-b-0"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Red Remove Button (Revealed on Swipe) */}
      <div className="absolute inset-y-0 right-0 w-[72px] flex items-center justify-center bg-[#DC2626] rounded-r-lg z-0">
        <button
          type="button"
          onClick={handleRemove}
          aria-label={`Remove ${item.name} from cart`}
          className="w-full h-full flex flex-col items-center justify-center text-white text-xs font-semibold gap-0.5 active:bg-red-700"
        >
          <Trash2 className="size-4" />
          <span>Delete</span>
        </button>
      </div>

      {/* Foreground Row Content */}
      <div
        className="relative bg-white flex items-center justify-between gap-3 transition-transform duration-150 ease-out z-10"
        style={{ transform: `translateX(${swipeOffset}px)` }}
      >
        {/* Left: Item Info */}
        <div className="flex-1 min-w-0 pr-1">
          <h4 className="font-semibold text-sm text-[#0F172A] truncate">
            {item.name}
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-[#475569]">
              ${item.price.toFixed(2)} each
            </span>
            <span className="text-xs font-medium text-[#475569]/60">•</span>
            <span className="text-xs font-medium text-[#475569]">
              {item.category}
            </span>
          </div>
        </div>

        {/* Middle: Quantity Stepper (- [qty] +) */}
        <div className="flex items-center bg-slate-100/90 rounded-lg p-0.5 border border-[#E2E8F0] shrink-0">
          <button
            type="button"
            onClick={() => decrementQuantity(item.id)}
            disabled={item.quantity <= 1}
            aria-label={`Decrease quantity of ${item.name}`}
            className="size-7 rounded-md flex items-center justify-center text-[#475569] hover:bg-white hover:text-[#0F172A] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#475569] transition-all shadow-xs"
          >
            <Minus className="size-3.5 stroke-[2.5]" />
          </button>

          <span className="min-w-6 text-center text-xs font-bold text-[#0F172A] px-1">
            {item.quantity}
          </span>

          <button
            type="button"
            onClick={() => incrementQuantity(item.id)}
            aria-label={`Increase quantity of ${item.name}`}
            className="size-7 rounded-md flex items-center justify-center text-[#475569] hover:bg-white hover:text-[#0F172A] transition-all shadow-xs"
          >
            <Plus className="size-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Right: Line Total and Delete button for mouse/desktop */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold text-[#0F172A] min-w-[56px] text-right">
            ${lineTotal.toFixed(2)}
          </span>

          {/* Desktop/Direct Remove Button */}
          <button
            type="button"
            onClick={handleRemove}
            aria-label={`Remove ${item.name} from order`}
            className="size-7 rounded-md flex items-center justify-center text-[#475569] hover:text-[#DC2626] hover:bg-rose-50 transition-colors opacity-70 group-hover:opacity-100 focus:opacity-100"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
