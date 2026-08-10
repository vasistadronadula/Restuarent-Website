'use client';

import React, { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, UtensilsCrossed, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import { Container } from '@/components/customer/Container';
import MenuCard from '@/components/customer/MenuCard';
import DishListItem from '@/components/customer/DishListItem';
import { categoryLabels } from '@/data/menuData';
import { useAdmin } from '@/context/AdminContext';
import { Category, VegStatus } from '@/types';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const categories: (Category | 'all')[] = [
  'all', 'combos', 'starters', 'tandoori', 'biryani', 'south-indian',
  'rice', 'breads', 'desserts', 'beverages',
];

const categoryEmojis: Record<string, string> = {
  all: '🍽️', combos: '🎉', starters: '🥗', 'south-indian': '🥘',
  biryani: '🍚', tandoori: '🔥', rice: '🍚', breads: '🫓',
  desserts: '🍮', beverages: '🥤',
};

type SortOption = 'popular' | 'price-asc' | 'price-desc' | 'rating';

const SORT_LABELS: Record<SortOption, string> = {
  popular: 'Most popular',
  'price-asc': 'Price: low → high',
  'price-desc': 'Price: high → low',
  rating: 'Highest rated',
};

const VEG_OPTIONS: { value: VegStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'veg', label: '🟢 Veg' },
  { value: 'non-veg', label: '🔴 Non-veg' },
  { value: 'egg', label: '🟡 Egg' },
];

const isCategory = (value: string | null): value is Category =>
  value !== null && value !== 'all' && (categories as string[]).includes(value);

const isVegStatus = (value: string | null): value is VegStatus =>
  value !== null && ['veg', 'non-veg', 'egg'].includes(value);

function MenuBrowser() {
  const { menuItems: liveMenuItems, isLoadingDB } = useAdmin();
  const searchParams = useSearchParams();

  const categoryParam = searchParams.get('category');
  const queryParam = searchParams.get('q');
  const vegParam = searchParams.get('veg');

  const [searchQuery, setSearchQuery] = useState(queryParam ?? '');
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>(
    isCategory(categoryParam) ? categoryParam : 'all'
  );
  const [vegFilter, setVegFilter] = useState<VegStatus | 'all'>(
    isVegStatus(vegParam) ? vegParam : 'all'
  );
  const [sortBy, setSortBy] = useState<SortOption>('popular');

  const [syncedParams, setSyncedParams] = useState(() => ({ categoryParam, queryParam, vegParam }));
  if (
    syncedParams.categoryParam !== categoryParam ||
    syncedParams.queryParam !== queryParam ||
    syncedParams.vegParam !== vegParam
  ) {
    setSyncedParams({ categoryParam, queryParam, vegParam });
    setActiveCategory(isCategory(categoryParam) ? categoryParam : 'all');
    setSearchQuery(queryParam ?? '');
    setVegFilter(isVegStatus(vegParam) ? vegParam : 'all');
  }

  const isPhone = useMediaQuery('(max-width: 899.95px)');

  const filtered = useMemo(() => {
    let items = [...liveMenuItems];
    if (activeCategory !== 'all') items = items.filter((i) => i.category === activeCategory);
    if (vegFilter !== 'all') items = items.filter((i) => i.vegStatus === vegFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    switch (sortBy) {
      case 'popular':    items.sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0)); break;
      case 'price-asc':  items.sort((a, b) => a.price - b.price); break;
      case 'price-desc': items.sort((a, b) => b.price - a.price); break;
      case 'rating':     items.sort((a, b) => b.rating - a.rating); break;
    }
    return items;
  }, [liveMenuItems, searchQuery, activeCategory, vegFilter, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setActiveCategory('all');
    setVegFilter('all');
    setSortBy('popular');
  };

  const hasActiveFilters = searchQuery.trim() || activeCategory !== 'all' || vegFilter !== 'all';

  return (
    <>
      <Navbar />

      {/* ── Clean Page Header ─────────────────────────────── */}
      <div className="bg-white border-b border-stone-100">
        <Container className="py-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-stone-900">Our Menu</h1>
              <p className="text-sm text-stone-500 mt-0.5">
                {isLoadingDB ? 'Loading…' : `${liveMenuItems.length} dishes — Telangana, Andhra & Hyderabadi cooking`}
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400"
                aria-hidden="true"
              />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dishes…"
                aria-label="Search the menu"
                className="h-10 rounded-lg pl-9 pr-9 text-sm border-stone-200 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-2.5 grid size-6 -translate-y-1/2 place-items-center rounded text-stone-400 hover:text-stone-600"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </Container>
      </div>

      <main className="min-h-[60vh] bg-stone-50 pb-12">
        <Container className="pt-6">

          {/* ── Category rail ────────────────────────────── */}
          <div
            role="tablist"
            aria-label="Dish categories"
            className="scrollbar-none -mx-5 mb-5 flex gap-2 overflow-x-auto px-5 pb-1"
          >
            {categories.map((cat) => {
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors outline-none',
                    'focus-visible:ring-2 focus-visible:ring-amber-500/40',
                    active
                      ? 'border-amber-600 bg-amber-600 text-white'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50'
                  )}
                >
                  <span aria-hidden="true">{categoryEmojis[cat]}</span>
                  {cat === 'all' ? 'All items' : categoryLabels[cat as Category]}
                </button>
              );
            })}
          </div>

          {/* ── Filter bar (single row) ───────────────────── */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            {/* Veg filter — compact inline select */}
            <Select value={vegFilter} onValueChange={(v) => setVegFilter(v as VegStatus | 'all')}>
              <SelectTrigger className="w-36 h-9 text-sm border-stone-200 bg-white rounded-lg" aria-label="Dietary filter">
                <SelectValue placeholder="Dietary" />
              </SelectTrigger>
              <SelectContent>
                {VEG_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-44 h-9 text-sm border-stone-200 bg-white rounded-lg" aria-label="Sort dishes">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                  <SelectItem key={key} value={key}>{SORT_LABELS[key]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-9 text-sm text-stone-500 hover:text-stone-700 px-3"
              >
                <X className="w-3.5 h-3.5 mr-1.5" />
                Clear
              </Button>
            )}

            {/* Result count */}
            <p className="text-sm text-stone-400 ml-auto tabular-nums">
              {filtered.length} {filtered.length === 1 ? 'dish' : 'dishes'}
            </p>
          </div>

          {/* ── Results ─────────────────────────────────── */}
          {isLoadingDB ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={UtensilsCrossed}
              title="No dishes match those filters"
              description="Try a different category, or clear the search."
              action={
                <Button variant="brand" onClick={resetFilters}>Clear filters</Button>
              }
            />
          ) : isPhone ? (
            <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
              {filtered.map((item, i) => (
                <DishListItem key={item.id} item={item} divider={i < filtered.length - 1} />
              ))}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((item) => (
                <MenuCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </Container>
      </main>

      <Footer />
    </>
  );
}

export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center">
          <Skeleton className="size-12 rounded-full" />
        </div>
      }
    >
      <MenuBrowser />
    </Suspense>
  );
}
