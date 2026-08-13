'use client';

import React from 'react';
import { MenuItem } from '@/types/pos';
import { useCartStore } from '@/store/usePosCartStore';
import { Plus, Ban, Check } from 'lucide-react';

interface MenuItemCardProps {
  item: MenuItem;
}

export default function MenuItemCard({ item }: MenuItemCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.cartItems);

  const cartItem = cartItems.find((ci) => ci.id === item.id);
  const quantityInCart = cartItem?.quantity || 0;

  const handleClick = () => {
    if (!item.available) return;
    addItem(item);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!item.available}
      aria-disabled={!item.available}
      aria-label={`Add ${item.name} ($${item.price.toFixed(2)}) to cart${!item.available ? ' - currently unavailable' : ''}`}
      className={`relative flex flex-col justify-between text-left p-4 rounded-lg bg-white border border-[#E2E8F0] shadow-sm transition-all duration-150 group select-none min-h-[140px] ${
        item.available
          ? 'cursor-pointer hover:border-[#2563EB] hover:shadow-md active:scale-[0.98]'
          : 'cursor-not-allowed opacity-60 bg-slate-50/70'
      }`}
    >
      {/* Top row: Name and Status Badge */}
      <div className="w-full flex items-start justify-between gap-2">
        <div className="flex-1 pr-1">
          <div className="flex items-center gap-1.5 mb-1">
            {item.vegStatus && (
              <span
                className={`inline-block size-2 rounded-full ${
                  item.vegStatus === 'veg' ? 'bg-[#16A34A]' : 'bg-[#DC2626]'
                }`}
                title={item.vegStatus === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}
              />
            )}
            <span className="text-xs font-medium text-[#475569] uppercase tracking-wider">
              {item.category}
            </span>
          </div>
          <h3 className="font-semibold text-base text-[#0F172A] line-clamp-2 leading-snug group-hover:text-[#2563EB] transition-colors">
            {item.name}
          </h3>
        </div>

        {/* Status Badge */}
        {item.available ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-[#16A34A] border border-emerald-200/60 shrink-0">
            <Check className="size-3 stroke-[2.5]" aria-hidden="true" />
            Available
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-[#DC2626] border border-rose-200/60 shrink-0">
            <Ban className="size-3 stroke-[2.5]" aria-hidden="true" />
            Unavailable
          </span>
        )}
      </div>

      {/* Description if present */}
      {item.description && (
        <p className="text-xs text-[#475569] line-clamp-1 mt-1 font-normal">
          {item.description}
        </p>
      )}

      {/* Bottom row: Price and Cart Quantity Indicator / Add Action */}
      <div className="w-full flex items-center justify-between mt-3 pt-2.5 border-t border-[#E2E8F0]/70">
        <span className="text-lg font-bold text-[#2563EB]">
          ${item.price.toFixed(2)}
        </span>

        {item.available && (
          <div className="flex items-center gap-1.5">
            {quantityInCart > 0 && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold text-white bg-[#2563EB] rounded-full shadow-sm">
                {quantityInCart}
              </span>
            )}
            <span
              className="inline-flex items-center justify-center size-7 rounded-md bg-blue-50 text-[#2563EB] group-hover:bg-[#2563EB] group-hover:text-white transition-colors"
              aria-hidden="true"
            >
              <Plus className="size-4 stroke-[2.5]" />
            </span>
          </div>
        )}
      </div>
    </button>
  );
}
