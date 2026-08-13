'use client';

import React, { useMemo, useState } from 'react';
import { MenuItem } from '@/types/pos';
import SearchBar from './SearchBar';
import CategoryFilter from './CategoryFilter';
import MenuGrid from './MenuGrid';

interface MenuSectionProps {
  menuItems: MenuItem[];
}

export default function MenuSection({ menuItems }: MenuSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const list = [
      { id: 'all', label: 'All', count: menuItems.length },
      {
        id: 'Starters',
        label: 'Starters',
        count: menuItems.filter((i) => i.category === 'Starters').length,
      },
      {
        id: 'Mains',
        label: 'Mains',
        count: menuItems.filter((i) => i.category === 'Mains').length,
      },
      {
        id: 'Desserts',
        label: 'Desserts',
        count: menuItems.filter((i) => i.category === 'Desserts').length,
      },
      {
        id: 'Beverages',
        label: 'Beverages',
        count: menuItems.filter((i) => i.category === 'Beverages').length,
      },
    ];
    return list;
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      // Category match
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;

      // Search match
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  return (
    <section aria-label="Menu and Order Entry" className="flex flex-col w-full">
      {/* Top Bar: Sticky Search & Category Filter */}
      <div className="sticky top-0 z-10 bg-[#F8FAFC]/95 backdrop-blur-md pt-2 pb-3.5 space-y-2.5 border-b border-[#E2E8F0]/80">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      </div>

      {/* Menu Item Grid */}
      <div className="mt-4" id="menu-items-grid">
        <MenuGrid items={filteredItems} />
      </div>
    </section>
  );
}
