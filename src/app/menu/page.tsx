'use client';

import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Search, UtensilsCrossed, X, ShoppingBag, BookOpen, LayoutGrid, List } from 'lucide-react';

import { cn, formatCurrency } from '@/lib/utils';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import { Container } from '@/components/customer/Container';
import MenuCard from '@/components/customer/MenuCard';
import DishListItem from '@/components/customer/DishListItem';
import { useAdmin } from '@/context/AdminContext';
import { VegStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

import {
  useCartStore,
  getCartTotalItems,
  getCartSubtotal,
  getCartDiscountAmount,
  getCartTaxableAmount,
  getCartCgst,
  getCartSgst,
  getCartGrandTotal,
} from '@/store/useCartStore';

/* ------------------------------------------------------------------ */
/*  Static filters                                                     */
/* ------------------------------------------------------------------ */

const VEG_FILTERS: { value: VegStatus | 'all'; label: string; dot: string }[] = [
  { value: 'all', label: 'All', dot: 'bg-stone-500' },
  { value: 'veg', label: 'Veg Only', dot: 'bg-emerald-600' },
  { value: 'non-veg', label: 'Non-Veg', dot: 'bg-rose-600' },
  { value: 'egg', label: 'Egg', dot: 'bg-amber-500' },
];

const isVegStatus = (value: string | null): value is VegStatus =>
  value !== null && ['veg', 'non-veg', 'egg'].includes(value);


/* ------------------------------------------------------------------ */
/*  Menu Browser — Single Screen Billing POS Layout                   */
/* ------------------------------------------------------------------ */

function MenuBrowser() {
  const { menuItems: liveMenuItems, isLoadingDB, categories } = useAdmin();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Build dynamic category items from DB
  const CATEGORY_ITEMS = useMemo(() => {
    const items: { id: string; label: string; image: string }[] = [
      { id: 'all', label: 'All Items', image: '' },
    ];
    categories
      .filter((c) => c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((c) => {
        items.push({ id: c.slug, label: c.name, image: c.image || '' });
      });
    return items;
  }, [categories]);

  // Build dynamic label map
  const categoryLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((c) => { map[c.slug] = c.name; });
    return map;
  }, [categories]);

  const isValidCategory = useCallback((value: string | null): boolean => {
    return value !== null && value !== 'all' && CATEGORY_ITEMS.some((c) => c.id === value);
  }, [CATEGORY_ITEMS]);

  const categoryParam = searchParams.get('category');
  const queryParam = searchParams.get('q');
  const vegParam = searchParams.get('veg');

  const [searchQuery, setSearchQuery] = useState(queryParam ?? '');
  const [activeCategory, setActiveCategory] = useState<string>(
    categoryParam && categoryParam !== 'all' ? categoryParam : 'all'
  );
  const [vegFilter, setVegFilter] = useState<VegStatus | 'all'>(
    isVegStatus(vegParam) ? vegParam : 'all'
  );
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');

  // Sync state with URL params
  const [syncedParams, setSyncedParams] = useState(() => ({ categoryParam, queryParam, vegParam }));
  if (
    syncedParams.categoryParam !== categoryParam ||
    syncedParams.queryParam !== queryParam ||
    syncedParams.vegParam !== vegParam
  ) {
    setSyncedParams({ categoryParam, queryParam, vegParam });
    setActiveCategory(categoryParam && categoryParam !== 'all' ? categoryParam : 'all');
    setSearchQuery(queryParam ?? '');
    setVegFilter(isVegStatus(vegParam) ? vegParam : 'all');
  }

  // Cart Store Hooks
  const cartItems = useCartStore((s) => s.items);
  const couponDiscount = useCartStore((s) => s.couponDiscount);
  const couponMaxDiscount = useCartStore((s) => s.couponMaxDiscount);

  const increaseQty = useCartStore((s) => s.increaseQty);
  const decreaseQty = useCartStore((s) => s.decreaseQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);

  const cartTotals = useMemo(() => {
    const subtotal = getCartSubtotal(cartItems);
    const discountAmount = getCartDiscountAmount(subtotal, couponDiscount, couponMaxDiscount);
    const taxable = getCartTaxableAmount(subtotal, discountAmount);
    const cgst = getCartCgst(taxable);
    const sgst = getCartSgst(taxable);
    const totalItems = getCartTotalItems(cartItems);
    const grandTotal = getCartGrandTotal(taxable, cgst, sgst);
    return { subtotal, discountAmount, cgst, sgst, totalItems, grandTotal };
  }, [cartItems, couponDiscount, couponMaxDiscount]);

  const handleCategorySelect = (catId: string) => {
    setActiveCategory(catId);
    const params = new URLSearchParams(window.location.search);
    if (catId === 'all') {
      params.delete('category');
    } else {
      params.set('category', catId);
    }
    router.push(`/menu?${params.toString()}`, { scroll: false });
  };

  const handleVegFilterSelect = (val: VegStatus | 'all') => {
    setVegFilter(val);
    const params = new URLSearchParams(window.location.search);
    if (val === 'all') {
      params.delete('veg');
    } else {
      params.set('veg', val);
    }
    router.push(`/menu?${params.toString()}`, { scroll: false });
  };

  // Main filter logic
  const filteredItems = useMemo(() => {
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
    items.sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0));
    return items;
  }, [liveMenuItems, searchQuery, activeCategory, vegFilter]);

  const countByCategory = useMemo(() => {
    const counts: Record<string, number> = { all: liveMenuItems.length };
    liveMenuItems.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [liveMenuItems]);

  const resetFilters = () => {
    setSearchQuery('');
    setActiveCategory('all');
    setVegFilter('all');
    router.push('/menu');
  };

  const hasActiveFilters = searchQuery.trim() || activeCategory !== 'all' || vegFilter !== 'all';

  return (
    <div className="flex flex-col min-h-screen bg-stone-100/40">
      <Navbar />

      {/* ── Sub-header / Filters Panel ── */}
      <div className="bg-white border-b border-stone-200 sticky top-[56px] z-20 shadow-3xs py-3.5">
        <Container className="max-w-[1600px]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search dish..."
                className="h-10 pl-10 pr-9 text-xs rounded-xl border-stone-200 bg-stone-50/70 focus-visible:ring-amber-500/20 focus-visible:border-amber-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 size-6 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-250/50"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Veg / Non-Veg Chips & Layout Toggle */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {VEG_FILTERS.map((chip) => {
                  const active = vegFilter === chip.value;
                  return (
                    <button
                      key={chip.value}
                      type="button"
                      onClick={() => handleVegFilterSelect(chip.value)}
                      className={cn(
                        'px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 active:scale-95',
                        active
                          ? 'border-amber-500 bg-amber-500 text-stone-950 font-extrabold shadow-3xs'
                          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                      )}
                    >
                      <span className={cn('size-2 rounded-full', chip.dot)} />
                      {chip.label}
                    </button>
                  );
                })}

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    onClick={resetFilters}
                    className="h-8 px-3.5 text-xs text-stone-500 hover:text-stone-800 rounded-lg"
                  >
                    Reset View
                  </Button>
                )}
              </div>

              {/* Layout Mode Toggle */}
              <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-xl border border-stone-200">
                <button
                  type="button"
                  onClick={() => setLayoutMode('grid')}
                  className={cn(
                    'p-1.5 rounded-lg transition-all',
                    layoutMode === 'grid'
                      ? 'bg-white text-amber-600 shadow-3xs font-bold'
                      : 'text-stone-400 hover:text-stone-600'
                  )}
                  title="Grid View"
                >
                  <LayoutGrid className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode('list')}
                  className={cn(
                    'p-1.5 rounded-lg transition-all',
                    layoutMode === 'list'
                      ? 'bg-white text-amber-600 shadow-3xs font-bold'
                      : 'text-stone-400 hover:text-stone-600'
                  )}
                  title="List View"
                >
                  <List className="size-4" />
                </button>
              </div>
            </div>

          </div>
        </Container>
      </div>

      <main className="flex-1 flex flex-col">
        
        {/* ── Mobile Horizontal Category Bar ── */}
        <div className="lg:hidden bg-white border-b border-stone-200 py-3.5 px-4 overflow-x-auto scrollbar-none flex gap-4 sticky top-[120px] z-10 shadow-3xs">
          {CATEGORY_ITEMS.map((cat) => {
            const active = activeCategory === cat.id;
            const count = countByCategory[cat.id] || 0;
            if (cat.id !== 'all' && count === 0) return null;

            return (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className="flex flex-col items-center gap-1 shrink-0 select-none outline-none group"
              >
                <div className={cn(
                  'relative size-12 rounded-full overflow-hidden border-2 transition-all p-0.5',
                  active ? 'border-amber-500 ring-2 ring-amber-500/20 scale-105' : 'border-stone-200 group-hover:border-stone-300'
                )}>
                  <div className="relative w-full h-full rounded-full overflow-hidden">
                    {cat.image ? (
                      <Image
                        src={cat.image}
                        alt={cat.label}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-amber-50 text-amber-700 font-bold text-sm">
                        {(cat.label || 'C')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <span className={cn(
                  'text-[10px] font-black leading-none text-center max-w-[64px] truncate',
                  active ? 'text-amber-800' : 'text-stone-600'
                )}>
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 flex items-stretch">

          {/* ── 1. Desktop Light Category Sidebar with circular images ── */}
          <aside className="hidden lg:flex w-64 shrink-0 bg-white border-r border-stone-200 flex-col justify-between py-6 min-h-[calc(100vh-120px)] sticky top-[120px] max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-none shadow-3xs">
            <div className="space-y-1 px-3">
              {CATEGORY_ITEMS.map((cat) => {
                const active = activeCategory === cat.id;
                const count = countByCategory[cat.id] || 0;
                if (cat.id !== 'all' && count === 0) return null;

                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-2.5 transition-all text-left outline-none rounded-xl text-xs sm:text-sm font-bold group',
                      active
                        ? 'bg-amber-500/10 text-amber-950 font-extrabold shadow-3xs border-l-4 border-amber-500 pl-3'
                        : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Circular Thumbnail Image */}
                      <div className={cn(
                        'relative size-8 rounded-full overflow-hidden border-2 transition-all p-0.5 shrink-0',
                        active ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-stone-200'
                      )}>
                        <div className="relative w-full h-full rounded-full overflow-hidden">
                          {cat.image ? (
                            <Image
                              src={cat.image}
                              alt={cat.label}
                              fill
                              sizes="32px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-amber-50 text-amber-700 font-bold text-xs">
                              {(cat.label || 'C')[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="group-hover:translate-x-0.5 transition-transform duration-200">{cat.label}</span>
                    </div>
                    <span className={cn(
                      'font-mono text-[9px] font-black px-1.5 py-0.5 rounded-md tabular-nums border leading-none',
                      active ? 'bg-amber-500 text-stone-950 border-amber-500' : 'bg-stone-100 text-stone-500 border-stone-200'
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Icon */}
            <div className="px-6 pt-6 border-t border-stone-100 text-stone-400 flex items-center gap-2">
              <BookOpen className="size-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">PPR Digital POS</span>
            </div>
          </aside>

          {/* ── 2. Middle Dish Grid area ── */}
          <div className="flex-1 p-6 overflow-y-auto max-w-[1600px] mx-auto min-w-0 pb-24">
            {isLoadingDB ? (
              <div className="grid gap-4.5 grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" aria-busy="true">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-2xl" />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
               <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-3xs max-w-lg mx-auto mt-12">
                 <EmptyState
                   icon={UtensilsCrossed}
                   title="No matching dishes found"
                   description="Try checking another category or resetting the filters."
                   action={
                     <Button variant="brand" onClick={resetFilters}>Reset View</Button>
                   }
                 />
               </div>
             ) : (
               <div className="space-y-6">
                 <div>
                   <h2 className="text-lg font-black text-stone-900 leading-none">
                     {activeCategory === 'all' ? 'All Items' : (categoryLabelMap[activeCategory] || activeCategory)}
                   </h2>
                   <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mt-1">
                     Showing {filteredItems.length} dishes
                   </p>
                 </div>
 
                 {layoutMode === 'grid' ? (
                   <div className="grid gap-4.5 grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                     {filteredItems.map((item) => (
                       <MenuCard key={item.id} item={item} />
                     ))}
                   </div>
                 ) : (
                   <div className="bg-white px-5 py-2 rounded-2xl border border-stone-200/80 shadow-3xs divide-y-0">
                     {filteredItems.map((item, idx) => (
                       <DishListItem
                         key={item.id}
                         item={item}
                         divider={idx < filteredItems.length - 1}
                       />
                     ))}
                   </div>
                 )}
               </div>
             )}
          </div>

        </div>
      </main>

      {/* Floating Cart Bar / Button (Responsive) */}
      {cartItems.length > 0 && (
        <>
          {/* Mobile Sticky Bottom Cart Bar */}
          <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-stone-200 p-4 shadow-[0_-4px_25px_rgba(0,0,0,0.08)] z-30 flex items-center justify-between animate-slide-up">
            <div className="flex flex-col">
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">{cartTotals.totalItems} Items Added</span>
              <span className="text-base font-black text-stone-900 leading-none mt-1">{formatCurrency(cartTotals.grandTotal)}</span>
            </div>
            <button
              onClick={() => router.push('/cart')}
              className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-stone-950 font-black px-6 py-3 rounded-xl text-xs flex items-center gap-1.5 shadow-md border border-amber-400 transition-all"
            >
              View Cart & Checkout
            </button>
          </div>

          {/* Desktop Floating Cart Button */}
          <button
            onClick={() => router.push('/cart')}
            className="hidden lg:flex fixed bottom-8 right-8 z-30 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-6 py-4 rounded-full shadow-2xl border border-emerald-500/20 items-center gap-4 transition-all hover:shadow-emerald-600/10 cursor-pointer"
          >
            <div className="relative">
              <ShoppingBag className="size-5" />
              <span className="absolute -top-2 -right-2.5 bg-amber-500 text-stone-950 text-[9px] font-black rounded-full min-w-4.5 h-4.5 flex items-center justify-center border border-white">
                {cartTotals.totalItems}
              </span>
            </div>
            <div className="h-4 w-px bg-white/20" />
            <div className="flex flex-col items-start leading-none text-left">
              <span className="text-[9px] opacity-75 uppercase tracking-wider font-semibold">Your Order</span>
              <span className="text-sm font-black mt-0.5">{formatCurrency(cartTotals.subtotal)}</span>
            </div>
            <div className="h-4 w-px bg-white/20" />
            <span className="text-xs font-black uppercase tracking-wider font-extrabold">View Cart &rarr;</span>
          </button>
        </>
      )}

      {/* Renders Footer responsively */}
      <div className="lg:hidden">
        <Footer />
      </div>
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#FDFBF7]">
          <Skeleton className="size-10 rounded-full animate-spin" />
        </div>
      }
    >
      <MenuBrowser />
    </Suspense>
  );
}
