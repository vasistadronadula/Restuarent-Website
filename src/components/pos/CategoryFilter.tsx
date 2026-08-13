'use client';

import React from 'react';
import { MenuCategory } from '@/types/pos';

interface CategoryFilterProps {
  categories: Array<{ id: string; label: string; count?: number }>;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
}

export default function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  return (
    <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 pb-1.5 pt-0.5">
      <div className="flex items-center gap-2 min-w-max" role="tablist" aria-label="Menu categories">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              role="tab"
              aria-selected={isActive}
              aria-controls="menu-items-grid"
              onClick={() => onSelectCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 flex items-center gap-2 select-none shrink-0 ${
                isActive
                  ? 'bg-[#2563EB] text-white shadow-sm ring-2 ring-[#2563EB]/20'
                  : 'bg-white text-[#475569] border border-[#E2E8F0] hover:border-slate-300 hover:text-[#0F172A]'
              }`}
            >
              <span>{cat.label}</span>
              {typeof cat.count === 'number' && (
                <span
                  className={`text-xs px-1.5 py-0.2 rounded-full font-medium ${
                    isActive
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-100 text-[#475569]'
                  }`}
                >
                  {cat.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
