'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Flame, LayoutGrid, Rows3, Search, Star, UtensilsCrossed, X,
} from 'lucide-react';
import { motion, MotionConfig } from 'motion/react';

import { cn } from '@/lib/utils';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import { Container } from '@/components/customer/Container';
import MenuCard from '@/components/customer/MenuCard';
import DishListItem from '@/components/customer/DishListItem';
import CategoryRail, { type RailCategory } from '@/components/customer/CategoryRail';
import MenuNavSheet from '@/components/customer/MenuNavSheet';
import StoreCartBar from '@/components/customer/StoreCartBar';
import RestaurantHero from '@/components/customer/RestaurantHero';
import { SectionHeading, VegMark } from '@/components/customer/store-ui';
import { useAdmin } from '@/context/AdminContext';
import { useMenuItems } from '@/lib/queries/menu';
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
  const menuQuery = useMenuItems();
  const searchParams = useSearchParams();

  /* ── URL-backed state ───────────────────────────────────────────── */

  const categoryParam = searchParams.get('category');
  const queryParam = searchParams.get('q');
  const vegParam = searchParams.get('veg');
  const bestsellerParam = searchParams.get('bestseller');
  const topRatedParam = searchParams.get('topRated');
  const sortParam = searchParams.get('sort');

  const searchQuery = queryParam ?? '';
  const activeCategory = categoryParam && categoryParam !== ALL ? categoryParam : ALL;
  const vegFilter = isVegStatus(vegParam) ? vegParam : ALL;
  const bestsellerOnly = bestsellerParam === 'true';
  const topRatedOnly = topRatedParam === 'true';
  const sort: SortMode =
    sortParam === 'price-asc' || sortParam === 'price-desc' ? sortParam : 'default';
  const [layout, setLayout] = useState<'list' | 'grid'>('grid');

  /* ── Search docking ───────────────────────────────────────────────
     The search stays in a stable slot and fades into the navbar without a layout flight
     once it scrolls out of view, and flies back when it returns. Docking is
     driven by the pill's own position rather than a scroll offset, so the
     handoff happens exactly as the pill disappears under the bar.

     Two thresholds, not one: docking grows the navbar on phones (a second
     row), which pushes the page down — a single threshold would flap as the
     bar grows and shrinks around it. */
  const heroSearchRef = useRef<HTMLDivElement>(null);
  const [searchDocked, setSearchDocked] = useState(false);

  useEffect(() => {
    let frame = 0;
    let docked = false;
    const sync = () => {
      frame = 0;
      const el = heroSearchRef.current;
      if (!el) return;
      const bottom = el.getBoundingClientRect().bottom;
      const next = docked ? bottom <= 150 : bottom < 76;
      if (next !== docked) {
        docked = next;
        setSearchDocked(next);
      }
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(sync);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true });
    sync();
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

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
  const pushParams = (mutate: (params: URLSearchParams) => void, replace = false) => {
    const params = new URLSearchParams(window.location.search);
    mutate(params);
    const query = params.toString();
    const target = `${window.location.pathname}${query ? `?${query}` : ''}`;
    // Client-only catalogue filters don't need a server navigation.
    window.history[replace ? 'replaceState' : 'pushState'](null, '', target);
  };

  const selectCategory = (id: string) => {
    pushParams((p) => (id === ALL ? p.delete('category') : p.set('category', id)));
    document.getElementById('menu-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    window.history.pushState(null, '', window.location.pathname);
  };

  /* ── Render ─────────────────────────────────────────────────────── */

  return (
    <MotionConfig reducedMotion="user">
      <div className="bg-store flex min-h-screen flex-col">
        <Navbar searchDocked={searchDocked} />
        {/* Spacer for fixed top navbar — tracks its live height (published by
            Navbar as --ppr-nav-h) so the docked search row never covers page
            content when it slides in on scroll. */}
        <div className="w-full shrink-0" style={{ height: 'var(--ppr-nav-h, 68px)' }} aria-hidden="true" />
        <RestaurantHero rating={houseRating} />

      <section id="menu-section" className="relative border-b border-hair-1 bg-store-surface scroll-mt-16">
        <Container className="relative max-w-[1600px] py-4 sm:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div ref={heroSearchRef} className="relative max-w-[560px] flex-1">
              {!searchDocked ? (
                <motion.div
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="relative"
                >
                  <Search className="text-ink-4 pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => pushParams((p) => {
                      const val = e.target.value;
                      if (val) p.set('q', val); else p.delete('q');
                    }, true)}
                    placeholder="Search dishes, biryani, starters, desserts…"
                    aria-label="Search dishes in menu"
                    className="text-ink-1 placeholder:text-ink-4 focus:border-brand focus:ring-brand/20 h-11 w-full rounded-full border border-hair-1 bg-white pr-9 pl-10 text-[13px] font-medium shadow-xs transition-all outline-none focus:ring-2"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => pushParams((p) => p.delete('q'))}
                      aria-label="Clear search"
                      className="text-ink-4 hover:text-ink-1 absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </motion.div>
              ) : (
                // Keeps the hero's height while the pill is docked in the
                // navbar, so docking never shifts the page underneath it.
                <div
                  aria-hidden
                  className="border-hair-1 bg-hair-2/60 flex h-11 w-full items-center justify-center rounded-full border"
                >
                  <Search className="text-ink-4/50 size-4" />
                </div>
              )}
            </div>

            {/* Quick dietary & sorting pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
              <button
                type="button"
                aria-pressed={vegFilter === 'veg'}
                onClick={() => pushParams((p) => {
                  if (vegFilter === 'veg') p.delete('veg'); else p.set('veg', 'veg');
                })}
                className={cn(
                  'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-1.5 font-bold transition-colors duration-150',
                  vegFilter === 'veg'
                    ? 'border-brand bg-brand text-white shadow-xs'
                    : 'border-hair-1 bg-white text-ink-2 hover:border-hair-2 hover:bg-hair-2/50'
                )}
              >
                <VegMark status="veg" size={13} />
                Veg
              </button>
              <button
                type="button"
                aria-pressed={vegFilter === 'non-veg'}
                onClick={() => pushParams((p) => {
                  if (vegFilter === 'non-veg') p.delete('veg'); else p.set('veg', 'non-veg');
                })}
                className={cn(
                  'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-1.5 font-bold transition-colors duration-150',
                  vegFilter === 'non-veg'
                    ? 'border-brand bg-brand text-white shadow-xs'
                    : 'border-hair-1 bg-white text-ink-2 hover:border-hair-2 hover:bg-hair-2/50'
                )}
              >
                <VegMark status="non-veg" size={13} />
                Non-veg
              </button>
              <button
                type="button"
                aria-pressed={bestsellerOnly}
                onClick={() => pushParams((p) => {
                  if (bestsellerOnly) p.delete('bestseller'); else p.set('bestseller', 'true');
                })}
                className={cn(
                  'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-1.5 font-bold transition-colors duration-150',
                  bestsellerOnly
                    ? 'border-brand bg-brand text-white shadow-xs'
                    : 'border-hair-1 bg-white text-ink-2 hover:border-hair-2 hover:bg-hair-2/50'
                )}
              >
                <Flame className="size-3.5 text-amber-500" />
                Bestsellers
              </button>
              <button
                type="button"
                aria-pressed={topRatedOnly}
                onClick={() => pushParams((p) => {
                  if (topRatedOnly) p.delete('topRated'); else p.set('topRated', 'true');
                })}
                className={cn(
                  'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-1.5 font-bold transition-colors duration-150',
                  topRatedOnly
                    ? 'border-brand bg-brand text-white shadow-xs'
                    : 'border-hair-1 bg-white text-ink-2 hover:border-hair-2 hover:bg-hair-2/50'
                )}
              >
                <Star className="size-3.5 fill-amber-400 text-amber-400" />
                4.0+ Stars
              </button>
            </div>
          </div>
        </Container>
      </section>

      <main className="flex-1">
        <Container className="max-w-[1600px] py-6 sm:py-8">
          {menuQuery.isError && (
            <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-nonveg/30 bg-white p-4 text-sm text-ink-2">
              <p>{menuItems.length ? 'The menu could not be refreshed. Showing the last loaded dishes.' : 'We could not load the menu. Please try again.'}</p>
              <button type="button" disabled={menuQuery.isFetching} onClick={() => void menuQuery.refetch()}
                className="rounded-lg bg-brand px-4 py-2 font-bold text-white disabled:opacity-60">
                {menuQuery.isFetching ? 'Retrying…' : 'Retry menu'}
              </button>
            </div>
          )}
          {/* ── Category rail (100% Full Width) ────────────────────── */}
          {!isLoadingDB && railCategories.length > 1 && (
            <section aria-label="Browse by category" className="mb-8 w-full">
              <SectionHeading title="What are you in the mood for?" className="mb-4" />
              <CategoryRail
                categories={railCategories}
                activeId={activeCategory}
                onSelect={selectCategory}
                className="w-full"
              />
            </section>
          )}

          {/* ── Mobile sticky categories strip — sticks under fixed navbar ── */}
          {railCategories.length > 1 && (
            <div
              className="border-hair-2 bg-white/95 sticky z-30 -mx-4 mb-4 border-b px-4 py-2 shadow-xs backdrop-blur-md md:hidden"
              // Parks under the live navbar height instead of a magic number:
              // with a fixed bar, a stale offset slides the strip underneath
              // it the moment the search row docks in and the bar grows.
              style={{ top: 'var(--ppr-nav-h, 72px)' }}
            >
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                {railCategories.map((cat) => {
                  const active = cat.id === activeCategory;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => selectCategory(cat.id)}
                      className={cn(
                        'shrink-0 rounded-full px-3.5 py-1 text-[12px] font-bold transition-all whitespace-nowrap',
                        active
                          ? 'bg-brand text-white shadow-xs'
                          : 'bg-hair-2 text-ink-2 hover:bg-hair-1'
                      )}
                    >
                      {cat.label} ({cat.count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-start gap-6 lg:gap-10 xl:gap-12">
            {/* ── Desktop category sidebar (sticks when scroll) ────── */}
            {railCategories.length > 1 && (
              <aside
                className="scrollbar-none hidden w-[200px] shrink-0 self-start overflow-y-auto md:block lg:w-[230px] xl:w-[250px]"
                style={{
                  position: 'sticky',
                  // Same live-navbar parking as the mobile strip above.
                  top: 'calc(var(--ppr-nav-h, 76px) + 12px)',
                  maxHeight: 'calc(100dvh - var(--ppr-nav-h, 76px) - 28px)',
                }}
              >
                <div className="rounded-2xl border border-hair-1 bg-white p-3.5 shadow-xs">
                  <div className="mb-2.5 flex items-center justify-between px-2">
                    <p className="text-ink-4 text-[11px] font-extrabold tracking-wider uppercase">
                      Categories
                    </p>
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-black text-brand-700">
                      {railCategories.length - 1}
                    </span>
                  </div>
                  <nav className="space-y-1">
                    {railCategories.map((cat) => {
                      const active = cat.id === activeCategory;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => selectCategory(cat.id)}
                          aria-current={active ? 'true' : undefined}
                          className={cn(
                            'group flex w-full items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all outline-none',
                            active
                              ? 'bg-brand text-white shadow-sm ring-1 ring-brand-600 font-bold'
                              : 'text-ink-2 hover:bg-hair-2 hover:text-ink-1'
                          )}
                        >
                          <span
                            className={cn(
                              'truncate text-[13px]',
                              active ? 'font-extrabold text-white' : 'font-semibold'
                            )}
                          >
                            {cat.label}
                          </span>
                          <span
                            className={cn(
                              'shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums transition-colors',
                              active
                                ? 'bg-white text-brand-700 font-extrabold'
                                : 'bg-hair-2 text-ink-4 group-hover:bg-hair-1'
                            )}
                          >
                            {cat.count}
                          </span>
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </aside>
            )}

            {/* ── Dishes ───────────────────────────────────────────── */}
            <div id="menu-results" className="min-w-0 flex-1 scroll-mt-40">
              {/* Result header */}
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
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-ink-4 text-[11px] font-bold tracking-tight">Active:</span>
                      {searchQuery && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                          &ldquo;{searchQuery}&rdquo;
                          <button
                            type="button"
                            onClick={() => pushParams((p) => p.delete('q'))}
                            aria-label="Remove search filter"
                            className="hover:text-ink-1"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      )}
                      {vegFilter !== ALL && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                          {vegFilter}
                          <button
                            type="button"
                            onClick={() => pushParams((p) => p.delete('veg'))}
                            aria-label="Remove veg filter"
                            className="hover:text-ink-1"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      )}
                      {bestsellerOnly && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                          Bestsellers
                          <button
                            type="button"
                            onClick={() => pushParams((p) => p.delete('bestseller'))}
                            aria-label="Remove bestseller filter"
                            className="hover:text-ink-1"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      )}
                      {topRatedOnly && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                          Rated 4.0+
                          <button
                            type="button"
                            onClick={() => pushParams((p) => p.delete('topRated'))}
                            aria-label="Remove top rated filter"
                            className="hover:text-ink-1"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      )}
                      {sort !== 'default' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                          {sort === 'price-asc' ? 'Price: Low first' : 'Price: High first'}
                          <button
                            type="button"
                            onClick={() => pushParams((p) => p.delete('sort'))}
                            aria-label="Remove sort"
                            className="hover:text-ink-1"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={resetAll}
                        className="text-brand-700 hover:text-brand-800 ml-1 text-[11px] font-bold underline underline-offset-2"
                      >
                        Clear all
                      </button>
                    </div>
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
              ) : menuQuery.isError && menuItems.length === 0 ? null : filteredItems.length === 0 ? (
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

      <Footer mobileClearance={cartTotals.totalItems > 0 ? 144 : 72} desktopClearance={cartTotals.totalItems > 0 ? 80 : 0} />
      </div>
    </MotionConfig>
  );
}

/* ------------------------------------------------------------------ */
/*  Pieces                                                             */
/* ------------------------------------------------------------------ */

function DishCollection({ items, layout }: { items: MenuItem[]; layout: 'list' | 'grid' }) {
  if (layout === 'grid') {
    return (
      <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
        'grid size-11 sm:size-8 place-items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand',
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" aria-busy="true">
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
