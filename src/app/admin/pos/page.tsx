'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import DishCard from '@/components/pos/DishCard';
import DishListRow from '@/components/pos/DishListRow';
import BillPanel, { type PosOrderType, type PosPaymentMode } from '@/components/pos/BillPanel';
import OrderPlacedDialog from '@/components/pos/OrderPlacedDialog';
import TableFloorMapModal from '@/components/pos/TableFloorMapModal';

import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { useCategories, useMenuItems, useTables } from '@/lib/queries';
import { usePosCart, type Portion } from '@/hooks/usePosCart';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { computeBillTotals } from '@/lib/billing';
import { generateInvoiceNo, generateOrderId } from '@/lib/idGenerator';
import { triggerNewOrderPush, triggerWhatsAppOrderConfirmation } from '@/lib/triggerPush';
import { markPosOrderPrinted } from '@/lib/posOrderTracker';
import type { MenuItem, Order } from '@/types';
import { toast } from 'sonner';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  Search, X, LayoutGrid, List,
  Utensils, Coffee, Flame, Cake, Soup, Sparkles,
  Maximize2, Minimize2, ChevronRight, ShoppingBag,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Category Icons & Emoji Map                                         */
/* ------------------------------------------------------------------ */

const CATEGORY_ICONS: Record<string, { icon: React.ComponentType<{ className?: string }>; emoji: string }> = {
  all: { icon: LayoutGrid, emoji: '✨' },
  starters: { icon: Utensils, emoji: '🍗' },
  biryani: { icon: Flame, emoji: '🍚' },
  'south-indian': { icon: Utensils, emoji: '🍛' },
  'north-indian': { icon: Utensils, emoji: '🥘' },
  chinese: { icon: Soup, emoji: '🍜' },
  combos: { icon: Sparkles, emoji: '🍱' },
  desserts: { icon: Cake, emoji: '🍰' },
  beverages: { icon: Coffee, emoji: '🥤' },
};

/* ------------------------------------------------------------------ */
/*  Main Cashier POS Page (2026 Enterprise Edition)                   */
/* ------------------------------------------------------------------ */

export default function PosPage() {
  const { user } = useAuth();
  const { addOrderLocallyAndDB: createOrderContext, categories: dbCategories, orders } = useAdmin();
  const { data: queryCategories = [] } = useCategories();
  const { data: menuItems = [] } = useMenuItems();
  const { data: tables = [] } = useTables();

  /* State */
  const [specialInstructions, setSpecialInstructions] = useState('');
  // Takeaway is the default and it carries its own packaging charge, so the
  // two start in sync rather than needing a first click on Takeaway to earn it.
  const [packagingCharge, setPackagingCharge] = useState<number>(20);

  /* Live Clock State */
  const [timeStr, setTimeStr] = useState('');
  useEffect(() => {
    const updateTime = () => {
      setTimeStr(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  /* Cashier Display Name */
  const cashierName = useMemo(() => {
    return (
      user?.user_metadata?.name ||
      user?.user_metadata?.full_name ||
      user?.email?.split('@')[0] ||
      'Cashier'
    );
  }, [user]);

  /* Categories */
  const activeCategories = useMemo(() => {
    return dbCategories.length > 0 ? dbCategories : queryCategories;
  }, [dbCategories, queryCategories]);

  const categoriesList = useMemo(() => {
    return activeCategories
      .filter((c) => c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => {
        const meta = CATEGORY_ICONS[c.slug] || { icon: Utensils, emoji: '🍽️' };
        return { name: c.name, slug: c.slug, emoji: meta.emoji, icon: meta.icon };
      });
  }, [activeCategories]);

  /* Filters */
  // Categories load asynchronously, so an explicit pick is layered over a
  // derived fallback to the first category — no effect needed to "catch up"
  // once the list arrives.
  const [pickedCategory, setSelectedCategory] = useState<string>('');
  const selectedCategory = pickedCategory || categoriesList[0]?.slug || '';
  const [vegFilter, setVegFilter] = useState<'all' | 'veg' | 'non-veg' | 'egg'>('all');
  const [search, setSearch] = useState('');
  const [layoutMode, setLayoutMode] = useState<'cards' | 'rows'>('cards');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Below `md` the catalog always renders as text rows — no photos to load
  // or scroll past on a phone screen and a slow connection — regardless of
  // the grid/list toggle, which is desktop-only chrome anyway (hidden below
  // `sm`).
  const isMobile = useMediaQuery('(max-width: 767px)');
  const effectiveLayoutMode = isMobile ? 'rows' : layoutMode;

  /* Order Configuration */
  const [orderType, setOrderType] = useState<PosOrderType>('counter');
  const [tableNumber, setTableNumber] = useState<number | ''>('');
  const [paymentMode, setPaymentMode] = useState<PosPaymentMode>('cash');

  /* Handle Order Type Change */
  const handleOrderTypeChange = (type: PosOrderType) => {
    setOrderType(type);
    if (type === 'counter' && packagingCharge === 0) {
      setPackagingCharge(20);
    } else if (type === 'dine-in') {
      setPackagingCharge(0);
    }
  };

  /* Modals & Dialogs */
  const [tableMapOpen, setTableMapOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  /* Cart Hook */
  const {
    lines, subtotal, totalUnits, quantityByMenuItem, quantityByPortion,
    increment: incrementLine,
    decrement: decrementLine,
    setQuantity: setLineQuantity,
    setNotes: setLineNotes,
    remove: removeLine,
    add: addDish,
    clear: clearCart,
  } = usePosCart();

  const quantityInBill = (itemId: string) => quantityByMenuItem[itemId] || 0;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  /* Order Placing State */
  const [placing, setPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [placedInvoiceNo, setPlacedInvoiceNo] = useState<string | undefined>(undefined);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const totals = useMemo(
    () => computeBillTotals(subtotal, 0, packagingCharge),
    [subtotal, packagingCharge]
  );

  /* Active Occupied Tables */
  const occupiedTableNumbers = useMemo(() => {
    const set = new Set<number>();
    orders.forEach((o) => {
      if (
        (o.status === 'pending' || o.status === 'preparing' || o.status === 'ready') &&
        typeof o.tableNumber === 'number'
      ) {
        set.add(o.tableNumber);
      }
    });
    return set;
  }, [orders]);

  /* Filtered Dishes */
  const filteredDishes = useMemo(() => {
    const selectedCatObj = activeCategories.find((c) => c.slug === selectedCategory);
    return menuItems.filter((item) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q));

      // An empty search falls back to every dish for the category — that's
      // how a cashier searches across categories without losing their place.
      const matchCategory =
        !!q ||
        item.category === selectedCategory ||
        (selectedCatObj && item.category === selectedCatObj.name) ||
        (item.category && item.category.toLowerCase() === selectedCategory.toLowerCase());

      const matchVeg = vegFilter === 'all' || item.vegStatus === vegFilter;
      return matchSearch && matchCategory && matchVeg && item.isAvailable !== false;
    });
  }, [menuItems, search, selectedCategory, vegFilter, activeCategories]);

  const handleAddDish = useCallback((item: MenuItem, portion?: Portion) => {
    addDish(item, portion);
  }, [addDish]);

  const handleDecrementDish = useCallback((item: MenuItem, portion?: Portion) => {
    const key = portion ? `${item.id}::${portion}` : item.id;
    const line = lines.find((l) => l.key === key) ?? lines.find((l) => l.menuItemId === item.id);
    if (line) decrementLine(line.key);
  }, [lines, decrementLine]);

  /* Complete Checkout & Place Order */
  const handlePlaceOrder = async () => {
    if (lines.length === 0) {
      toast.error('Cart is empty! Add items before checkout.');
      return;
    }
    if (orderType === 'dine-in' && tableNumber === '') {
      toast.error('⚠️ Please assign a table for Dine-In order!');
      setTableMapOpen(true);
      return;
    }

    setPlacing(true);
    try {
      const orderId = generateOrderId();
      const invoiceNo = generateInvoiceNo();

      const newOrder: Order = {
        id: orderId,
        orderId,
        customerName: 'Counter Customer',
        tableNumber: orderType === 'dine-in' && tableNumber !== '' ? Number(tableNumber) : undefined,
        orderType,
        paymentMode,
        paymentStatus: 'paid',
        status: 'pending',
        orderStatus: 'pending',
        items: lines.map((l) => ({
          id: l.menuItemId,
          name: l.name,
          price: l.unitPrice,
          quantity: l.quantity,
          portion: l.portion,
          notes: l.notes,
        })),
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        deliveryCharge: totals.packagingCharge,
        cgst: totals.cgst,
        sgst: totals.sgst,
        grandTotal: totals.grandTotal,
        notes: specialInstructions.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      markPosOrderPrinted(newOrder.id);
      await createOrderContext(newOrder);
      triggerNewOrderPush(newOrder.id);
      triggerWhatsAppOrderConfirmation(newOrder.id);

      setPlacedOrder(newOrder);
      setPlacedInvoiceNo(invoiceNo);
      setConfirmOpen(true);

      clearCart();
      setSpecialInstructions('');
      setPackagingCharge(0);
      setTableNumber('');
      setCartOpen(false);
      toast.success('Order settled & printed in sub-10s! ⚡');
    } catch {
      toast.error('Failed to complete order');
    } finally {
      setPlacing(false);
    }
  };

  /* Send to Kitchen KOT Only */
  const handleSendToKitchen = async () => {
    await handlePlaceOrder();
  };

  /* Refs for keyboard shortcuts */
  const handlePlaceOrderRef = useRef(handlePlaceOrder);
  useEffect(() => {
    handlePlaceOrderRef.current = handlePlaceOrder;
  });

  /* Keyboard Shortcuts */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isTyping = active instanceof HTMLElement &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);

      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F2' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        handlePlaceOrderRef.current();
      } else if (e.key === 'Escape' && isTyping) {
        (active as HTMLElement).blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /* Shared BillPanel Props */
  const billPanelProps = {
    lines,
    totals,
    totalUnits,
    orderType,
    onOrderType: handleOrderTypeChange,
    tables,
    tableNumber,
    onTableNumber: setTableNumber,
    paymentMode,
    onPaymentMode: setPaymentMode,
    packagingCharge,
    onPackagingCharge: setPackagingCharge,
    onIncrement: incrementLine,
    onDecrement: decrementLine,
    onSetQuantity: setLineQuantity,
    onSetLineNotes: setLineNotes,
    onRemove: removeLine,
    onClear: clearCart,
    onPlace: handlePlaceOrder,
    onSendToKitchen: handleSendToKitchen,
    onOpenTableMap: () => setTableMapOpen(true),
    isPlacing: placing,
  };

  const VEG_FILTERS: { value: typeof vegFilter; label: string; shortLabel?: string; dot?: string }[] = [
    { value: 'all', label: 'All Items', shortLabel: 'All' },
    { value: 'veg', label: 'Veg', shortLabel: 'Veg', dot: 'bg-ad-ok' },
    { value: 'non-veg', label: 'Non-veg', shortLabel: 'Non-Veg', dot: 'bg-ad-accent' },
    { value: 'egg', label: 'Egg', shortLabel: 'Egg', dot: 'bg-ad-warn' },
  ];

  const resetAllFilters = useCallback(() => {
    setSearch('');
    setVegFilter('all');
    setSelectedCategory('all');
  }, []);
  const hasActiveFilters = search.trim() !== '' || vegFilter !== 'all' || selectedCategory !== 'all';

  return (
    <AdminLayout title="Cashier POS System (2026)">
      <div className="flex flex-col w-full h-full bg-ad-bg text-ad-ink overflow-hidden select-none">

        {/* ── 1. CASHIER FAST CONTROL BAR (Desktop / Tablet md+) ── */}
        <div className="hidden md:flex h-[56px] bg-ad-bg border-b-2 border-ad-line px-3 sm:px-4 items-center justify-between gap-3 shrink-0 z-20">
          {/* Left: Quick Search */}
          <div className="relative w-60 md:w-72 lg:w-80 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-ad-muted pointer-events-none" />
            <input
              ref={searchInputRef}
              className="ad-input h-9 !pl-8 !pr-7"
              placeholder="Search dishes… (/)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ad-muted hover:text-ad-ink"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Center: Veg Filter Badges */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
            {VEG_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setVegFilter(f.value)}
                className="ad-tab flex items-center gap-1.5 shrink-0"
                data-active={vegFilter === f.value}
              >
                {f.dot && <span className={cn('size-1.5 rounded-full', f.dot)} />}
                <span>{f.label}</span>
              </button>
            ))}
          </div>

          {/* Right: Cashier Info & Action Shortcuts */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Live clock + cashier name */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 h-9 border border-ad-line bg-ad-surface shrink-0">
              <span className="size-1.5 bg-ad-accent animate-pulse shrink-0" />
              <span className="ad-num text-[12px]">{timeStr}</span>
              <span className="ad-muted text-[11px] truncate max-w-25">· {cashierName}</span>
            </div>

            {/* Table Floor Map Trigger */}
            <button
              type="button"
              onClick={() => setTableMapOpen(true)}
              className="ad-tab flex items-center gap-1.5"
              data-active={tableNumber !== ''}
              title="Floor plan and tables"
            >
              <LayoutGrid className="size-3.5" />
              <span className="hidden sm:inline">
                {tableNumber !== '' ? `Table ${tableNumber}` : 'Tables'}
              </span>
            </button>

            {/* Grid / List Layout Switcher */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setLayoutMode('cards')}
                className="ad-tab px-2.5"
                data-active={layoutMode === 'cards'}
                title="Grid view"
              >
                <LayoutGrid className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('rows')}
                className="ad-tab px-2.5"
                data-active={layoutMode === 'rows'}
                title="List view"
              >
                <List className="size-3.5" />
              </button>
            </div>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="ad-btn ad-btn-secondary ad-btn-icon"
              title="Fullscreen POS"
            >
              {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </button>
          </div>
        </div>

        {/* ── 1. MOBILE RESPONSIVE CONTROL BAR (< md) ── */}
        <div className="md:hidden flex flex-col bg-ad-bg border-b-2 border-ad-line shrink-0 z-20">
          {/* Top Row: Full-width Search + Quick Actions */}
          <div className="p-2.5 flex items-center gap-2 border-b border-ad-hairline">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-ad-muted pointer-events-none" />
              <input
                className="ad-input h-9.5 text-[13px] !pl-8 !pr-7 w-full bg-ad-surface"
                placeholder="Search dishes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ad-muted hover:text-ad-ink p-1"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Table Selector Quick Badge */}
            <button
              type="button"
              onClick={() => setTableMapOpen(true)}
              className={cn(
                'h-9.5 px-2.5 rounded-[var(--ad-radius)] border flex items-center gap-1.5 text-xs font-bold shrink-0 transition-colors',
                tableNumber !== ''
                  ? 'bg-ad-accent text-white border-ad-accent'
                  : 'bg-ad-surface text-ad-ink border-ad-divider hover:bg-ad-n200'
              )}
              title="Table Floor Map"
            >
              <LayoutGrid className="size-3.5" />
              <span>{tableNumber !== '' ? `T${tableNumber}` : 'Tables'}</span>
            </button>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="h-9.5 w-9.5 grid place-items-center rounded-[var(--ad-radius)] border border-ad-divider bg-ad-surface text-ad-ink hover:bg-ad-n200 shrink-0"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </button>
          </div>

          {/* Middle Row: Segmented Veg / Dietary Filter Bar */}
          <div className="px-2.5 py-1.5 bg-ad-surface border-b border-ad-hairline">
            <div className="grid grid-cols-4 gap-1 p-0.5 bg-ad-n200 rounded-[var(--ad-radius)] border border-ad-hairline">
              {VEG_FILTERS.map((f) => {
                const isActive = vegFilter === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setVegFilter(f.value)}
                    className={cn(
                      'h-7.5 px-1 rounded-[calc(var(--ad-radius)-2px)] text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all',
                      isActive
                        ? 'bg-ad-ink text-white shadow-xs'
                        : 'text-ad-ink/70 hover:text-ad-ink hover:bg-white/60'
                    )}
                  >
                    {f.dot && (
                      <span
                        className={cn(
                          'size-1.5 rounded-full shrink-0',
                          f.dot,
                          isActive && f.value === 'non-veg' ? 'ring-1 ring-white' : ''
                        )}
                      />
                    )}
                    <span className="truncate">{f.shortLabel || f.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Row: Mobile Category Strip */}
          <div className="px-2.5 py-1.5 overflow-x-auto scrollbar-none flex items-center gap-1.5">
            {categoriesList.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.slug;
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => setSelectedCategory(cat.slug)}
                  data-active={isActive}
                  className={cn(
                    'ad-tab shrink-0 flex items-center gap-1.5 py-1 px-2.5 text-[11px] h-7.5',
                    isActive && 'bg-ad-accent text-white border-ad-accent'
                  )}
                >
                  <Icon className="size-3 shrink-0" />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* Active Filter Indicator / Clear All Bar */}
          {hasActiveFilters && (
            <div className="px-3 py-1 bg-ad-a100 border-t border-ad-a200 flex items-center justify-between text-[11px] font-semibold text-ad-a800">
              <span className="truncate">
                {filteredDishes.length} dish{filteredDishes.length === 1 ? '' : 'es'} match
                {vegFilter !== 'all' ? ` · ${vegFilter}` : ''}
                {selectedCategory !== 'all' ? ` · ${categoriesList.find((c) => c.slug === selectedCategory)?.name || selectedCategory}` : ''}
              </span>
              <button
                type="button"
                onClick={resetAllFilters}
                className="text-ad-accent hover:underline font-bold flex items-center gap-1 shrink-0 ml-2"
              >
                Reset <X className="size-3" />
              </button>
            </div>
          )}
        </div>

        {/* ── 2. MAIN BODY: Category Rail | Product Catalog ──
            The admin nav rail doesn't render on this page at all (see
            AdminLayout). The cart no longer docks a column here on any size
            — it floats as a bottom bar + sheet everywhere — so the catalog
            runs full width with no reserved edge padding. */}
        <div className="flex-1 min-h-0 flex w-full overflow-hidden">

          {/* Category rail — desktop/tablet only (`md` up). Below that the
              same list runs as a horizontal strip in the mobile control bar. */}
          <div className="hidden md:block w-44 lg:w-52 shrink-0 h-full overflow-y-auto scrollbar-none border-r-2 border-ad-line bg-ad-accent">
            {categoriesList.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => setSelectedCategory(cat.slug)}
                  data-active={selectedCategory === cat.slug}
                  title={cat.name}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] font-semibold leading-tight text-white/75 data-[active=true]:text-ad-accent data-[active=true]:bg-white rounded-[var(--ad-radius)] transition-colors"
                >
                  <Icon className="size-4.5 shrink-0" />
                  <span className="truncate">{cat.name}</span>
                </button>
              );
            })}
          </div>

          <div className="relative flex-1 min-w-0 flex flex-col overflow-hidden bg-ad-bg">

            {/* Table Allocation Fast Strip (Visible when Dine-In is active) */}
            {orderType === 'dine-in' && (
              <div className="bg-ad-surface border-b border-ad-hairline px-3 sm:px-4 py-2 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                  <span className="ad-kicker shrink-0">Tables</span>
                  {tables.map((t) => {
                    const isOccupied = occupiedTableNumbers.has(t.tableNumber);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTableNumber(t.tableNumber)}
                        className="ad-tab shrink-0 flex items-center gap-1.5 px-2.5 py-1"
                        data-active={tableNumber === t.tableNumber}
                        title={isOccupied ? `Table ${t.tableNumber} — dining` : `Table ${t.tableNumber} — free`}
                      >
                        {/* Occupied tables carry the accent dot; free ones nothing. */}
                        {isOccupied && <span className="size-1.5 bg-ad-accent" />}
                        <span>T{t.tableNumber}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setTableMapOpen(true)}
                  className="ad-btn ad-btn-ghost ad-btn-sm shrink-0"
                >
                  Floor map <ChevronRight className="size-3" />
                </button>
              </div>
            )}

            {/* Product Catalog Cards / Rows Display */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 scrollbar-none pb-28">
              {filteredDishes.length === 0 ? (
                <div className="py-24 text-center">
                  <p className="ad-h text-[16px]">No dishes match</p>
                  <p className="text-[13px] ad-muted mt-1.5">Clear the search or switch category.</p>
                </div>
              ) : effectiveLayoutMode === 'rows' ? (
                <div className="border-2 border-ad-line divide-y divide-ad-hairline mb-8">
                  {filteredDishes.map((item) => (
                    <DishListRow
                      key={item.id}
                      item={item}
                      inBill={quantityInBill(item.id)}
                      quantityByPortion={quantityByPortion}
                      onAdd={handleAddDish}
                      onDecrement={handleDecrementDish}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-3.5 mb-8">
                  {filteredDishes.map((item) => (
                    <DishCard
                      key={item.id}
                      item={item}
                      inBill={quantityInBill(item.id)}
                      quantityByPortion={quantityByPortion}
                      onAdd={handleAddDish}
                      onDecrement={handleDecrementDish}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── Cart Floating Overlay: Pinned to bottom-right of the screen ── */}
        {lines.length > 0 && (
          <div className="fixed right-3.5 sm:right-6 bottom-4 sm:bottom-6 z-40 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="ad-btn ad-btn-primary h-13 sm:h-14 px-4 sm:px-5 gap-3 text-[14px] shadow-2xl shadow-ad-accent/40 hover:brightness-105 active:scale-[0.98] transition-all rounded-[var(--ad-radius)] border-2 border-white/25 flex items-center justify-between min-w-[200px] sm:min-w-[250px]"
            >
              <div className="flex items-center gap-2.5">
                <span className="size-7 grid place-items-center bg-white text-ad-accent ad-num text-[12.5px] font-black rounded-[calc(var(--ad-radius)-2px)] shrink-0 shadow-xs">
                  {totalUnits}
                </span>
                <span className="font-bold tracking-wide">View Cart</span>
              </div>
              <div className="flex items-center gap-1.5 pl-2.5 border-l border-white/30">
                <span className="ad-num text-[16px] sm:text-[17px] font-black text-white">
                  ₹{totals.grandTotal.toFixed(2)}
                </span>
                <ChevronRight className="size-4 opacity-80" />
              </div>
            </button>
          </div>
        )}

        <Sheet open={cartOpen} onOpenChange={setCartOpen}>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="p-0 h-[min(95dvh,800px)] md:max-w-4xl lg:max-w-5xl md:mx-auto bg-ad-surface overflow-hidden rounded-t-xl"
          >
            <BillPanel
              {...billPanelProps}
              compact={true}
              onClose={() => setCartOpen(false)}
            />
          </SheetContent>
        </Sheet>

        {/* ========================================================== */}
        {/*  MODALS & DIALOGS                                          */}
        {/* ========================================================== */}
        <OrderPlacedDialog
          order={placedOrder}
          invoiceNo={placedInvoiceNo}
          open={confirmOpen}
          onNewOrder={() => {
            setConfirmOpen(false);
            setPlacedOrder(null);
          }}
        />

        <TableFloorMapModal
          open={tableMapOpen}
          onClose={() => setTableMapOpen(false)}
          tables={tables}
          activeOrders={orders}
          selectedTable={tableNumber}
          onSelectTable={(tNum) => {
            setTableNumber(tNum);
            setOrderType('dine-in');
          }}
        />
      </div>
    </AdminLayout>
  );
}
