'use client';

import React, { useMemo, useState } from 'react';
import { MenuItem } from '@/types/pos';
import SearchBar from './SearchBar';
import CategoryFilter from './CategoryFilter';
import MenuGrid from './MenuGrid';
import { MenuCategory } from '@/types';

interface MenuSectionProps {
  menuItems: MenuItem[];
  categories?: MenuCategory[];
}

const CATEGORY_NAMES: Record<string, string> = {
  all: 'All Dishes',
  combos: 'Combos & Specials',
  starters: 'Starters',
  biryani: 'Biryani & Pulao',
  tandoori: 'Tandoori & Kebabs',
  'south-indian': 'Curries & Bagara',
  'north-indian': 'North Indian Curries',
  chinese: 'Chinese & Noodles',
  rice: 'Rice & Flavors',
  breads: 'Roties & Breads',
  desserts: 'Desserts & Sweets',
  beverages: 'Cool Drinks & Soups',
};

export default function MenuSection({ menuItems, categories: dbCategories = [] }: MenuSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [vegFilter, setVegFilter] = useState<'all' | 'veg' | 'non-veg'>('all');

  // Compute category list with real item counts
  const categoryTabs = useMemo(() => {
    const list: Array<{ id: string; label: string; count: number }> = [
      { id: 'all', label: 'All Dishes', count: menuItems.length },
    ];

    // Collect all distinct categories present in menuItems
    const presentCategories = Array.from(
      new Set(menuItems.map((item) => item.category).filter(Boolean))
    );

    // If dbCategories exist, sort according to dbCategories order
    if (dbCategories.length > 0) {
      dbCategories
        .filter((c) => c.isActive)
        .forEach((c) => {
          const count = menuItems.filter((i) => i.category === c.slug || i.category === c.name).length;
          if (count > 0) {
            list.push({
              id: c.slug,
              label: c.name,
              count,
            });
          }
        });
    } else {
      presentCategories.forEach((catSlug) => {
        const count = menuItems.filter((i) => i.category === catSlug).length;
        list.push({
          id: catSlug,
          label: CATEGORY_NAMES[catSlug] || catSlug.charAt(0).toUpperCase() + catSlug.slice(1),
          count,
        });
      });
    }

    return list;
  }, [menuItems, dbCategories]);

  // Filter items in real time
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      // 1. Category Filter
      const matchesCategory =
        selectedCategory === 'all' ||
        item.category === selectedCategory ||
        item.category.toLowerCase() === selectedCategory.toLowerCase();

      // 2. Veg/Diet Filter
      const matchesDiet =
        vegFilter === 'all' ||
        (vegFilter === 'veg' && item.vegStatus === 'veg') ||
        (vegFilter === 'non-veg' && (item.vegStatus === 'non-veg' || item.vegStatus === 'egg'));

      // 3. Search Filter
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query)) ||
        (item.tags && item.tags.some((t) => t.toLowerCase().includes(query)));

      return matchesCategory && matchesDiet && matchesSearch;
    });
  }, [menuItems, selectedCategory, vegFilter, searchQuery]);

  return (
    <section aria-label="Menu and Order Entry" className="flex flex-col w-full">
      {/* Sticky Top Bar: Search Bar & Dynamic Realtime Categories */}
      <div className="sticky top-0 z-10 bg-[#F8FAFC]/95 backdrop-blur-md pt-2 pb-3 space-y-2.5 border-b border-[#E2E8F0]/80">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
        <CategoryFilter
          categories={categoryTabs}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          vegFilter={vegFilter}
          onVegFilterChange={setVegFilter}
        />
      </div>

      {/* Realtime Dishes Grid */}
      <div className="mt-3.5" id="menu-items-grid">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <span className="text-xs font-semibold text-[#475569]">
            Showing <strong className="text-[#0F172A]">{filteredItems.length}</strong> items
          </span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-[#2563EB] hover:underline font-medium"
            >
              Reset search
            </button>
          )}
        </div>
        <MenuGrid items={filteredItems} />
      </div>
    </section>
  );
}
