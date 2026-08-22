'use client';

import React, { Suspense, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowDownWideNarrow, ArrowUpNarrowWide, Clock, LayoutGrid, MapPin, Rows3,
  Search, Star, UtensilsCrossed, X,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import { Container } from '@/components/customer/Container';
import MenuCard from '@/components/customer/MenuCard';
import DishListItem from '@/components/customer/DishListItem';
import CategoryRail, { type RailCategory } from '@/components/customer/CategoryRail';
import { CouponTeaser } from '@/components/customer/CouponTeaser';
import MenuNavSheet from '@/components/customer/MenuNavSheet';
import StoreCartBar from '@/components/customer/StoreCartBar';
import { FilterPill, SectionHeading, VegMark } from '@/components/customer/store-ui';
import { useAdmin } from '@/context/AdminContext';
import { restaurantInfo } from '@/data/restaurantInfo';
import type { MenuItem, VegStatus } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

import { useCartStore, getCartBillTotals } from '@/store/useCartStore';

const ALL = 'all';

type SortMode = 'default' | 'price-asc' | 'price-desc';

const isVegStatus = (value: string | null): value is VegStatus =>
  value !== null && ['veg', 'non-veg', 'egg'].includes(value);

/* ------------------------------------------------------------------ */
/*  Menu browser                                                       */
/* ------------------------------------------------------------------ */

function MenuBrowser() {
  const { menuItems, isLoadingDB, categories } = useAdmin();
  const router = useRouter();
  const searchParams = useSearchParams();

  /* ── URL-backed state ───────────────────────────────────────────── */

  const categoryParam = searchParams.get('category');
  const queryParam = searchParams.get('q');
  const vegParam = searchParams.get('veg');

  const [searchQuery, setSearchQuery] = useState(queryParam ?? '');
  const [activeCategory, setActiveCategory] = useState<string>(
    categoryParam && categoryParam !== ALL ? categoryParam : ALL
  );
  const [vegFilter, setVegFilter] = useState<VegStatus | typeof ALL>(
    isVegStatus(vegParam) ? vegParam : ALL
  );

  // Re-sync when the URL changes underneath us — a back/forward navigation, or
  // a link into /menu?category=biryani from elsewhere on the site.
  const [syncedParams, setSyncedParams] = useState(() => ({ categoryParam, queryParam, vegParam }));
  if (
    syncedParams.categoryParam !== categoryParam ||
    syncedParams.queryParam !== queryParam ||
    syncedParams.vegParam !== vegParam
  ) {
    setSyncedParams({ categoryParam, queryParam, vegParam });
    setActiveCategory(categoryParam && categoryParam !== ALL ? categoryParam : ALL);
    setSearchQuery(queryParam ?? '');
    setVegFilter(isVegStatus(vegParam) ? vegParam : ALL);
  }

  /* ── View-only state ────────────────────────────────────────────── */
  // Deliberately not in the URL. A shared link should carry *what* someone is
  // looking at, not how they happened to have their sort set.
  const [bestsellerOnly, setBestsellerOnly] = useState(false);
  const [topRatedOnly, setTopRatedOnly] = useState(false);
  const [sort, setSort] = useState<SortMode>('default');
  const [layout, setLayout] = useState<'list' | 'grid'>('grid');

  /* ── Cart ───────────────────────────────────────────────────────── */

  const cartItems = useCartStore((s) => s.items);
  const couponDiscount = useCartStore((s) => s.couponDiscount);
  const couponMaxDiscount = useCartStore((s) => s.couponMaxDiscount);

  const cartTotals = useMemo(
    () => getCartBillTotals(cartItems, couponDiscount, couponMaxDiscount),
    [cartItems, couponDiscount, couponMaxDiscount]
  );

  /* ── Derived catalogue data ─────────────────────────────────────── */

  const countByCategory = useMemo(() => {
    const counts: Record<string, number> = { [ALL]: menuItems.length };
    menuItems.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [menuItems]);

  const categoryLabels = useMemo(() => {
    const map: Record<string, string> = { [ALL]: 'All dishes' };
    categories.forEach((c) => { map[c.slug] = c.name; });
    return map;
  }, [categories]);

  /**
   * Categories that are active *and* actually have dishes behind them.
   *
   * A category with no photo of its own borrows one from a dish inside it
   * rather than falling back to a letter in a circle. Most of this menu's
   * categories have never had a photo uploaded, and a rail of "U · S · T · B"
   * initials teaches a customer nothing about what is in them — which was the
   * entire reason for showing pictures instead of a list of names.
   */
  const railCategories = useMemo<RailCategory[]>(() => {
    const coverByCategory = new Map<string, string>();
    menuItems.forEach((item) => {
      if (item.image && !coverByCategory.has(item.category)) {
        coverByCategory.set(item.category, item.image);
      }
    });

    const list: RailCategory[] = [
      { id: ALL, label: 'All dishes', image: '', count: menuItems.length, icon: UtensilsCrossed },
    ];
    categories
      .filter((c) => c.isActive && (countByCategory[c.slug] || 0) > 0)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((c) => {
        list.push({
          id: c.slug,
          label: c.name,
          image: c.image || coverByCategory.get(c.slug) || '',
          count: countByCategory[c.slug] || 0,
        });
      });
    return list;
  }, [categories, countByCategory, menuItems]);

  /**
   * The headline rating, averaged over the dishes that actually carry one.
   * It used to be a hard-coded 4.6 with "1,200+ ratings" underneath, which is
   * a number the restaurant would have had to defend without ever having
   * measured it.
   */
  const houseRating = useMemo(() => {
    const rated = menuItems.filter((i) => (i.rating ?? 0) > 0);
    if (rated.length === 0) return null;
    const average = rated.reduce((sum, i) => sum + i.rating, 0) / rated.length;
    const reviews = menuItems.reduce((sum, i) => sum + (i.reviewCount ?? 0), 0);
    return { average, reviews };
  }, [menuItems]);

  const hasEggDishes = useMemo(() => menuItems.some((i) => i.vegStatus === 'egg'), [menuItems]);

  /* ── Filtering ──────────────────────────────────────────────────── */

  const filteredItems = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();

    let items = menuItems.filter((item) => {
      if (activeCategory !== ALL && item.category !== activeCategory) return false;
      if (vegFilter !== ALL && item.vegStatus !== vegFilter) return false;
      if (bestsellerOnly && !item.isPopular && !item.isSpecial) return false;
      if (topRatedOnly && (item.rating ?? 0) < 4) return false;
      if (!needle) return true;
      return (
        item.name.toLowerCase().includes(needle) ||
        item.description.toLowerCase().includes(needle) ||
        item.tags.some((t) => t.toLowerCase().includes(needle))
      );
    });

    if (sort === 'price-asc') {
      items = [...items].sort((a, b) => a.price - b.price);
    } else if (sort === 'price-desc') {
      items = [...items].sort((a, b) => b.price - a.price);
    } else {
      // Default order: in stock first, then bestsellers, then by rating. An
      // out-of-stock dish at the top of a category is the fastest way to make
      // a menu feel unmaintained.
      items = [...items].sort((a, b) => {
        if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
        const aFlag = a.isSpecial || a.isPopular ? 1 : 0;
        const bFlag = b.isSpecial || b.isPopular ? 1 : 0;
        if (aFlag !== bFlag) return bFlag - aFlag;
        return (b.rating ?? 0) - (a.rating ?? 0);
      });
    }

    return items;
  }, [menuItems, activeCategory, vegFilter, bestsellerOnly, topRatedOnly, searchQuery, sort]);

  /* ── Actions ────────────────────────────────────────────────────── */

  // Plain functions, not useCallback: the React Compiler memoizes them, and a
  // hand-written dependency array here disagreed with the one it inferred,
  // which makes it bail out of optimizing the whole component.
  const pushParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(window.location.search);
    mutate(params);
    const query = params.toString();
    router.push(query ? `/menu?${query}` : '/menu', { scroll: false });
  };

  const selectCategory = (id: string) => {
    setActiveCategory(id);
    pushParams((p) => (id === ALL ? p.delete('category') : p.set('category', id)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleVeg = (value: VegStatus) => {
    const next = vegFilter === value ? ALL : value;
    setVegFilter(next);
    pushParams((p) => (next === ALL ? p.delete('veg') : p.set('veg', next)));
  };

  const toggleSort = (mode: Exclude<SortMode, 'default'>) => {
    setSort((current) => (current === mode ? 'default' : mode));
  };

  const activeFilterCount =
    (vegFilter !== ALL ? 1 : 0) +
    (bestsellerOnly ? 1 : 0) +
    (topRatedOnly ? 1 : 0) +
    (sort !== 'default' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  /**
   * When nothing narrows the list, show it grouped under its category headings
   * rather than as one 200-row wall. Once anything *is* filtering the list —
   * a chip, a rating floor, a search term, a sort — the grouping stops
   * helping (the customer already told us what they want) and it collapses
   * to a flat, ranked list. `activeFilterCount` already accounts for every
   * one of those except the category itself, which is checked separately
   * since picking a category from the sidebar isn't a "filter chip".
   */
  const groupedSections = useMemo(() => {
    if (activeCategory !== ALL || activeFilterCount > 0) return null;

    const order = railCategories.filter((c) => c.id !== ALL).map((c) => c.id);
    const buckets = new Map<string, MenuItem[]>();
    filteredItems.forEach((item) => {
      const bucket = buckets.get(item.category);
      if (bucket) bucket.push(item);
      else buckets.set(item.category, [item]);
    });

    const sections = order
      .filter((id) => buckets.has(id))
      .map((id) => ({ id, label: categoryLabels[id] ?? id, items: buckets.get(id)! }));

    // Dishes whose category was deleted or deactivated still have to appear —
    // silently dropping them from the menu is worse than an "Others" heading.
    const orphans = filteredItems.filter((item) => !order.includes(item.category));
    if (orphans.length > 0) sections.push({ id: '__other', label: 'More dishes', items: orphans });

    return sections;
  }, [activeCategory, activeFilterCount, filteredItems, railCategories, categoryLabels]);

  const resetAll = () => {
    setSearchQuery('');
    setVegFilter(ALL);
    setBestsellerOnly(false);
    setTopRatedOnly(false);
    setSort('default');
    setActiveCategory(ALL);
    router.push('/menu', { scroll: false });
  };

  /* ── Render ─────────────────────────────────────────────────────── */

  return (
    <div className="bg-store flex min-h-screen flex-col">
      <Navbar />

      {/* ── Restaurant strip ─────────────────────────────────────────
          The context a diner wants before they start ordering: is this the
          right place, is it any good, and when does it close. */}
      <section className="border-hair-2 border-b bg-white">
        <Container className="max-w-[1600px] py-5 sm:py-6">
          <h1 className="text-ink-1 font-display text-[24px] leading-tight font-black tracking-tight sm:text-[30px]">
            {restaurantInfo.name}
          </h1>
          <p className="text-ink-3 mt-1 text-[13px] font-medium sm:text-[14px]">
            {restaurantInfo.tagline}
            <span className="text-ink-4 px-1.5">·</span>
            Telangana, Andhra &amp; Hyderabadi
          </p>

          <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
            {houseRating && (
              <span className="text-rating inline-flex items-center gap-1.5 font-bold">
                <span className="bg-rating grid size-[18px] place-items-center rounded-full">
                  <Star className="size-[10px] fill-white text-white" />
                </span>
                {houseRating.average.toFixed(1)}
                {houseRating.reviews > 0 && (
                  <span className="text-ink-3 font-semibold">
                    ({houseRating.reviews.toLocaleString('en-IN')} ratings)
                  </span>
                )}
              </span>
            )}
            <span className="text-ink-2 inline-flex items-center gap-1.5 font-semibold">
              <Clock className="text-ink-4 size-4" />
              {restaurantInfo.openingDisplay}
            </span>
            <span className="text-ink-2 inline-flex items-center gap-1.5 font-semibold">
              <MapPin className="text-ink-4 size-4" />
              {restaurantInfo.addressLine}
            </span>
          </div>
        </Container>
      </section>

      {/* ── Sticky search + filters ──────────────────────────────────
          Height is pinned to --store-filters-h so the sidebar below can
          compute its own sticky offset instead of guessing at a number that
          goes stale the next time a chip is added. */}
      <div
        className="border-hair-1 bg-store/92 sticky z-30 border-b backdrop-blur-md"
        style={{ top: 'var(--store-header-h)' }}
      >
        <Container className="max-w-[1600px] py-2.5 md:py-3.5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
            {/* Search */}
            <div className="relative h-11 w-full md:max-w-[340px]">
              <Search className="text-ink-4 pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a dish…"
                aria-label="Search dishes"
                className={cn(
                  'border-hair-1 text-ink-1 placeholder:text-ink-4 h-11 w-full rounded-full border bg-white pr-10 pl-11 text-[14px] font-medium',
                  'transition-colors outline-none focus:border-brand-300 focus:ring-[3px] focus:ring-brand/15',
                  // Safari draws its own clear button on type=search and it
                  // collides with ours.
                  '[&::-webkit-search-cancel-button]:appearance-none'
                )}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="text-ink-4 hover:text-ink-1 absolute top-1/2 right-3 grid size-7 -translate-y-1/2 place-items-center rounded-full transition-colors"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Filter chips */}
            <div className="scrollbar-none -mx-4 flex h-10 items-center gap-2 overflow-x-auto px-4 md:mx-0 md:min-w-0 md:flex-1 md:px-0">
              <FilterPill
                active={vegFilter === 'veg'}
                onClick={() => toggleVeg('veg')}
                leading={<VegMark status="veg" size={13} />}
              >
                Veg
              </FilterPill>
              <FilterPill
                active={vegFilter === 'non-veg'}
                onClick={() => toggleVeg('non-veg')}
                leading={<VegMark status="non-veg" size={13} />}
              >
                Non-veg
              </FilterPill>
              {hasEggDishes && (
                <FilterPill
                  active={vegFilter === 'egg'}
                  onClick={() => toggleVeg('egg')}
                  leading={<VegMark status="egg" size={13} />}
                >
                  Egg
                </FilterPill>
              )}
              <FilterPill active={bestsellerOnly} onClick={() => setBestsellerOnly((v) => !v)}>
                Bestsellers
              </FilterPill>
              <FilterPill active={topRatedOnly} onClick={() => setTopRatedOnly((v) => !v)}>
                Rated 4.0+
              </FilterPill>
              <FilterPill
                active={sort === 'price-asc'}
                onClick={() => toggleSort('price-asc')}
                leading={<ArrowUpNarrowWide className="size-3.5" />}
              >
                Price: low first
              </FilterPill>
              <FilterPill
                active={sort === 'price-desc'}
                onClick={() => toggleSort('price-desc')}
                leading={<ArrowDownWideNarrow className="size-3.5" />}
              >
                Price: high first
              </FilterPill>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={resetAll}
                  className="text-brand-700 hover:bg-brand-50 shrink-0 rounded-full px-3 py-2 text-[13px] font-bold whitespace-nowrap transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        </Container>
      </div>

      <main className="flex-1">
        <Container className="max-w-[1600px] py-6 sm:py-8">
          <CouponTeaser className="mb-6" />

          {/* ── Category rail ──────────────────────────────────────── */}
          {!isLoadingDB && railCategories.length > 1 && (
            <section aria-label="Browse by category" className="mb-8">
              <SectionHeading title="What are you in the mood for?" className="mb-4" />
              <CategoryRail
                categories={railCategories}
                activeId={activeCategory}
                onSelect={selectCategory}
              />
            </section>
          )}

          <div className="flex items-start gap-10 xl:gap-14">
            {/* ── Desktop category sidebar ─────────────────────────── */}
            {railCategories.length > 1 && (
              <aside
                className="scrollbar-none hidden w-[212px] shrink-0 self-start overflow-y-auto lg:block xl:w-[240px]"
                style={{
                  position: 'sticky',
                  top: 'calc(var(--store-header-h) + var(--store-filters-h) + 1.5rem)',
                  maxHeight: 'calc(100dvh - var(--store-header-h) - var(--store-filters-h) - 3rem)',
                }}
              >
                <p className="text-ink-4 mb-2 px-3 text-[11px] font-bold tracking-wider uppercase">
                  Sections
                </p>
                <nav className="space-y-0.5">
                  {railCategories.map((cat) => {
                    const active = cat.id === activeCategory;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => selectCategory(cat.id)}
                        aria-current={active ? 'true' : undefined}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors outline-none',
                          active ? 'bg-brand-50' : 'hover:bg-white'
                        )}
                      >
                        <span
                          className={cn(
                            'truncate text-[14px]',
                            active ? 'text-brand-700 font-extrabold' : 'text-ink-2 font-semibold'
                          )}
                        >
                          {cat.label}
                        </span>
                        <span
                          className={cn(
                            'shrink-0 text-[12px] font-bold tabular-nums',
                            active ? 'text-brand-600' : 'text-ink-4'
                          )}
                        >
                          {cat.count}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </aside>
            )}

            {/* ── Dishes ───────────────────────────────────────────── */}
            <div className="min-w-0 flex-1">
              {/* Result header. When the list is grouped, its own section
                  headings already name everything, so this collapses to a
                  plain count rather than repeating "All dishes" directly above
                  the first real heading. */}
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  {groupedSections ? (
                    <p className="text-ink-2 text-[14px] font-bold tabular-nums">
                      {isLoadingDB ? 'Loading the menu…' : `${filteredItems.length} dishes`}
                    </p>
                  ) : (
                    <SectionHeading
                      title={categoryLabels[activeCategory] ?? activeCategory}
                      count={isLoadingDB ? undefined : filteredItems.length}
                    />
                  )}
                  {activeFilterCount > 0 && !isLoadingDB && (
                    <p className="text-ink-4 mt-0.5 text-[12px] font-semibold">
                      {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} applied
                    </p>
                  )}
                </div>

                <div className="border-hair-1 flex shrink-0 items-center gap-0.5 rounded-full border bg-white p-1">
                  <LayoutToggle
                    active={layout === 'list'}
                    onClick={() => setLayout('list')}
                    icon={Rows3}
                    label="List view"
                  />
                  <LayoutToggle
                    active={layout === 'grid'}
                    onClick={() => setLayout('grid')}
                    icon={LayoutGrid}
                    label="Grid view"
                  />
                </div>
              </div>

              {isLoadingDB ? (
                <DishSkeletons layout={layout} />
              ) : filteredItems.length === 0 ? (
                <EmptyResult onReset={resetAll} hasFilters={activeFilterCount > 0} />
              ) : groupedSections ? (
                <div className="space-y-10">
                  {groupedSections.map((section) => (
                    <section key={section.id}>
                      <SectionHeading
                        title={section.label}
                        count={section.items.length}
                        className="mb-1"
                      />
                      <DishCollection items={section.items} layout={layout} />
                    </section>
                  ))}
                </div>
              ) : (
                <DishCollection items={filteredItems} layout={layout} />
              )}
            </div>
          </div>
        </Container>
      </main>

      <MenuNavSheet
        categories={railCategories}
        activeId={activeCategory}
        onSelect={selectCategory}
        raised={cartTotals.totalItems > 0}
      />

      <StoreCartBar itemCount={cartTotals.totalItems} total={cartTotals.grandTotal} />

      {/* Space for the two fixed bars, so the last dish is never trapped
          underneath them. */}
      <div
        aria-hidden="true"
        style={{ height: cartTotals.totalItems > 0 ? '9rem' : '4.5rem' }}
        className="lg:hidden"
      />

      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pieces                                                             */
/* ------------------------------------------------------------------ */

function DishCollection({ items, layout }: { items: MenuItem[]; layout: 'list' | 'grid' }) {
  if (layout === 'grid') {
    return (
      <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 2xl:grid-cols-5">
        {items.map((item) => (
          <MenuCard key={item.id} item={item} />
        ))}
      </div>
    );
  }

  return (
    <div>
      {items.map((item, index) => (
        <DishListItem key={item.id} item={item} divider={index < items.length - 1} />
      ))}
    </div>
  );
}

function LayoutToggle({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'grid size-8 place-items-center rounded-full transition-colors outline-none',
        active ? 'bg-brand text-white' : 'text-ink-4 hover:text-ink-2'
      )}
    >
      <Icon className="size-[17px]" />
    </button>
  );
}

function DishSkeletons({ layout }: { layout: 'list' | 'grid' }) {
  if (layout === 'grid') {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 2xl:grid-cols-5" aria-busy="true">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div aria-busy="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rule-dash flex items-start gap-4 py-5 sm:gap-8">
          <div className="min-w-0 flex-1 space-y-2.5">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-2/3 rounded" />
            <Skeleton className="h-3.5 w-20 rounded" />
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-4/5 rounded" />
          </div>
          <Skeleton className="h-[104px] w-[118px] shrink-0 rounded-2xl sm:w-[130px]" />
        </div>
      ))}
    </div>
  );
}

function EmptyResult({ onReset, hasFilters }: { onReset: () => void; hasFilters: boolean }) {
  return (
    <div className="border-hair-1 grid place-items-center rounded-2xl border border-dashed bg-white px-6 py-16 text-center">
      <span className="bg-brand-50 text-brand-600 mb-4 grid size-14 place-items-center rounded-full">
        <UtensilsCrossed className="size-7" />
      </span>
      <h3 className="text-ink-1 text-[17px] font-extrabold">No dishes match that</h3>
      <p className="text-ink-3 mt-1.5 max-w-sm text-[13.5px] leading-relaxed">
        {hasFilters
          ? 'Try removing a filter, or search for something else.'
          : 'This section is empty right now. Have a look at the rest of the menu.'}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="bg-brand hover:bg-brand-600 mt-5 h-11 rounded-xl px-6 text-[14px] font-extrabold text-white transition-colors"
      >
        Show the full menu
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-store grid min-h-screen place-items-center">
          <div className="border-brand/25 border-t-brand size-9 animate-spin rounded-full border-[3px]" />
        </div>
      }
    >
      <MenuBrowser />
    </Suspense>
  );
}
