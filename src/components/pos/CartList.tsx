'use client';

import React from 'react';
import { useCartStore } from '@/store/usePosCartStore';
import CartItemRow from './CartItemRow';
import { ShoppingCart } from 'lucide-react';

export default function CartList() {
  const cartItems = useCartStore((s) => s.cartItems);

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 px-4 text-center my-auto min-h-[220px]">
        <ShoppingCart
          size={48}
          color="#CBD5E1"
          strokeWidth={1.5}
          className="mb-3 animate-fade-in"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-[#475569]">
          No items added yet
        </p>
        <span className="text-xs text-[#94A3B8] mt-1">
          Click any available menu item on the left to add
        </span>
      </div>
    );
  }

  return (
    <div
      className="overflow-y-auto max-h-[50vh] scrollbar-thin scrollbar-thumb-slate-200 divide-y divide-[#E2E8F0] pr-1"
      role="region"
      aria-label="Order items list"
    >
      {cartItems.map((item) => (
        <CartItemRow key={item.id} item={item} />
      ))}
    </div>
  );
}
