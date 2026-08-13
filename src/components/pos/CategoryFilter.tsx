'use client';

import React from 'react';

interface CategoryItem {
  id: string;
  label: string;
  count?: number;
}

interface CategoryFilterProps {
  categories: CategoryItem[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  vegFilter: 'all' | 'veg' | 'non-veg';
  onVegFilterChange: (filter: 'all' | 'veg' | 'non-veg') => void;
}

export default function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  vegFilter,
  onVegFilterChange,
}: CategoryFilterProps) {
  return (
    <div className="w-full space-y-2">
      {/* Category Pills (Horizontal Scrollable) */}
      <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 pb-1 pt-0.5">
        <div
          className="flex items-center gap-1.5 min-w-max"
          role="tablist"
          aria-label="Menu categories"
        >
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                role="tab"
                aria-selected={isActive}
                aria-controls="menu-items-grid"
                onClick={() => onSelectCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 select-none shrink-0 ${
                  isActive
                    ? 'bg-[#2563EB] text-white shadow-xs ring-2 ring-[#2563EB]/20'
                    : 'bg-white text-[#475569] border border-[#E2E8F0] hover:border-slate-300 hover:text-[#0F172A]'
                }`}
              >
                <span>{cat.label}</span>
                {typeof cat.count === 'number' && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
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

      {/* Quick Veg / Non-Veg Diet Filter Bar */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-[#475569] font-medium text-[11px]">Diet:</span>
        <div className="inline-flex bg-white p-0.5 rounded-lg border border-[#E2E8F0] shadow-2xs">
          <button
            type="button"
            onClick={() => onVegFilterChange('all')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
              vegFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => onVegFilterChange('veg')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors ${
              vegFilter === 'veg'
                ? 'bg-emerald-600 text-white'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <span className="size-1.5 rounded-full bg-emerald-500 ring-1 ring-white" />
            Veg Only
          </button>
          <button
            type="button"
            onClick={() => onVegFilterChange('non-veg')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors ${
              vegFilter === 'non-veg'
                ? 'bg-rose-600 text-white'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            <span className="size-1.5 rounded-full bg-rose-500 ring-1 ring-white" />
            Non-Veg
          </button>
        </div>
      </div>
    </div>
  );
}
