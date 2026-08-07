'use client';

import React, { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, UtensilsCrossed, X } from 'lucide-react';

import { cn, formatCurrency } from '@/lib/utils';
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
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

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
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  rating: 'Highest rated',
};

const VEG_OPTIONS: VegStatus[] = ['veg', 'non-veg', 'egg'];
const VEG_LABELS: Record<VegStatus, string> = {
  veg: 'Veg',
  'non-veg': 'Non-veg',
  egg: 'Egg',
};

const MAX_PRICE = 1000;

const isCategory = (value: string | null): value is Category =>
  value !== null && value !== 'all' && (categories as string[]).includes(value);

const isVegStatus = (value: string | null): value is VegStatus =>
  value !== null && (VEG_OPTIONS as string[]).includes(value);

function MenuBrowser() {
  const { menuItems: liveMenuItems, isLoadingDB } = useAdmin();
  const searchParams = useSearchParams();

  /**
   * The home page's category circles, the hero search box and the footer all
   * link in here with their choice in the query string. Until now none of that
   * arrived: this page opened on "All items" no matter what the link said, so
   * every one of those entry points quietly dropped the thing the customer had
   * just tapped. Params seed the state, and the sync below re-seeds it when a
   * link changes them on a page that is already mounted — a Link to the same
   * route does not remount the component, so the initialiser alone is not
   * enough.
   */
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
  const [priceRange, setPriceRange] = useState<[number, number]>([0, MAX_PRICE]);
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [showFilters, setShowFilters] = useState(false);

  /**
   * Re-seed during render when — and only when — the query string itself
   * changes. This is React's "adjusting state when a prop changes" pattern
   * rather than an effect: an effect would repaint the old filters first and
   * the corrected ones a frame later. Typing in the search box or tapping a
   * pill moves local state without touching the URL, so none of that trips
   * this.
   */
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

  /**
   * Phones get a list, laptops get the card grid.
   *
   * Two cards per row on a 360px screen leaves each dish ~150px — enough for a
   * photo and a truncated name, and nothing else. The list gives the name and
   * description the full width and keeps the photo legible, which is the whole
   * reason delivery apps use rows on phones.
   */
  const isPhone = useMediaQuery('(max-width: 899.95px)');

  const filtered = useMemo(() => {
    let items = [...liveMenuItems];
    if (activeCategory !== 'all') {
      items = items.filter((i) => i.category === activeCategory);
    }
    if (vegFilter !== 'all') {
      items = items.filter((i) => i.vegStatus === vegFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    items = items.filter((i) => i.price >= priceRange[0] && i.price <= priceRange[1]);
    switch (sortBy) {
      case 'popular':    items.sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0)); break;
      case 'price-asc':  items.sort((a, b) => a.price - b.price); break;
      case 'price-desc': items.sort((a, b) => b.price - a.price); break;
      case 'rating':     items.sort((a, b) => b.rating - a.rating); break;
    }
    return items;
  }, [liveMenuItems, searchQuery, activeCategory, vegFilter, priceRange, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setActiveCategory('all');
    setVegFilter('all');
    setPriceRange([0, MAX_PRICE]);
    setSortBy('popular');
  };

  const activeFilterCount = [
    searchQuery.trim() ? 1 : 0,
    activeCategory !== 'all' ? 1 : 0,
    vegFilter !== 'all' ? 1 : 0,
    priceRange[0] > 0 || priceRange[1] < MAX_PRICE ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <>
      <Navbar />

      {/* ─── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-linear-to-br from-primary via-[#8E0000] to-[#1A0A0A] py-4 text-center text-white md:py-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-16 size-64 rounded-full bg-accent/15 blur-3xl"
        />
        <div className="relative mx-auto w-full max-w-2xl px-4">
          <h1 className="font-display text-xl font-black tracking-tight sm:text-2xl md:text-3xl">
            Our Menu
          </h1>
          <p className="mt-1 text-xs text-white/80 md:text-sm">
            Telangana, Andhra and Hyderabadi cooking — {liveMenuItems.length} dishes, made to order.
          </p>

          <div className="relative mt-3 max-w-xl mx-auto">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-neutral-500"
              aria-hidden="true"
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes, ingredients or tags…"
              aria-label="Search the menu"
              className="h-10 rounded-full border-transparent bg-white pr-10 pl-10 text-xs sm:text-sm text-neutral-900 shadow-md placeholder:text-neutral-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute top-1/2 right-2.5 grid size-7 -translate-y-1/2 place-items-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </section>

      <main className="min-h-[60vh] py-6 md:py-10">
        <Container>
          {/* ─── Category rail ───────────────────────────────────────── */}
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
                    'flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors outline-none',
                    'focus-visible:ring-ring/40 focus-visible:ring-[3px]',
                    active
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border bg-card hover:border-primary/40 hover:bg-muted'
                  )}
                >
                  <span aria-hidden="true">{categoryEmojis[cat]}</span>
                  {cat === 'all' ? 'All items' : categoryLabels[cat as Category]}
                </button>
              );
            })}
          </div>

          {/* ─── Filter bar ──────────────────────────────────────────── */}
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowFilters((s) => !s)}
              aria-expanded={showFilters}
              aria-controls="menu-filters"
            >
              <SlidersHorizontal />
              Filters
              {activeFilterCount > 0 && (
                <Badge size="sm" className="ml-1">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-52" aria-label="Sort dishes">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {SORT_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <p className="text-muted-foreground ml-auto text-sm">
              {filtered.length} {filtered.length === 1 ? 'dish' : 'dishes'}
            </p>
          </div>

          {showFilters && (
            <Card id="menu-filters" className="mb-6">
              <CardContent className="grid gap-6 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Dietary</Label>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    value={vegFilter}
                    onValueChange={(v) => setVegFilter((v || 'all') as VegStatus | 'all')}
                  >
                    <ToggleGroupItem value="all">All</ToggleGroupItem>
                    {VEG_OPTIONS.map((v) => (
                      <ToggleGroupItem key={v} value={v}>
                        {VEG_LABELS[v]}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="price-range">
                    Price range
                    <span className="text-muted-foreground ml-auto font-normal tabular-nums">
                      {formatCurrency(priceRange[0])} – {formatCurrency(priceRange[1])}
                    </span>
                  </Label>
                  <Slider
                    id="price-range"
                    min={0}
                    max={MAX_PRICE}
                    step={50}
                    value={priceRange}
                    onValueChange={(v) => setPriceRange([v[0], v[1]] as [number, number])}
                    className="mt-2"
                  />
                </div>

                {activeFilterCount > 0 && (
                  <div className="sm:col-span-2">
                    <Button variant="ghost" size="sm" onClick={resetFilters}>
                      <X />
                      Clear all filters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ─── Results ─────────────────────────────────────────────── */}
          {isLoadingDB ? (
            <div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              aria-busy="true"
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={UtensilsCrossed}
              title="No dishes match those filters"
              description="Try a broader price range, a different category, or clear the search."
              action={
                <Button variant="brand" onClick={resetFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : isPhone ? (
            <div>
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
    // useSearchParams needs a Suspense boundary, or the whole route opts out of
    // static rendering.
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
