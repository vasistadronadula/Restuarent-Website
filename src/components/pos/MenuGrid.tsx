'use client';

import React from 'react';
import { MenuItem } from '@/types/pos';
import MenuItemCard from './MenuItemCard';
import { UtensilsCrossed } from 'lucide-react';

interface MenuGridProps {
  items: MenuItem[];
}

export default function MenuGrid({ items }: MenuGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-lg border border-dashed border-[#E2E8F0] my-4">
        <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center text-[#475569] mb-3">
          <UtensilsCrossed className="size-6 text-[#CBD5E1]" aria-hidden="true" />
        </div>
        <h4 className="text-base font-semibold text-[#0F172A] mb-1">
          No menu items found
        </h4>
        <p className="text-xs text-[#475569] max-w-xs">
          Try adjusting your search keywords or switching to a different category.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-8">
      {items.map((item) => (
        <MenuItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
