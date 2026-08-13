'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import DishCard from '@/components/pos/DishCard';
import DishListRow from '@/components/pos/DishListRow';
import BillPanel, { type PosOrderType, type PosPaymentMode } from '@/components/pos/BillPanel';
import OrderPlacedDialog from '@/components/pos/OrderPlacedDialog';
import TableFloorMapModal from '@/components/pos/TableFloorMapModal';

import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { useCategories, useMenuItems, useTables } from '@/lib/queries';
import { usePosCart, type Portion } from '@/hooks/usePosCart';
import { computeBillTotals, type DiscountOption } from '@/lib/billing';
import { generateInvoiceNo, generateOrderId } from '@/lib/idGenerator';
import { triggerNewOrderPush, triggerWhatsAppOrderConfirmation } from '@/lib/triggerPush';
import { markPosOrderPrinted } from '@/lib/posOrderTracker';
import type { Category, MenuItem, Order } from '@/types';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  Search, X, ShoppingBag, LayoutGrid, List,
  Utensils, Coffee, Flame, Cake, Soup, Sparkles,
  Maximize2, Minimize2, ChevronRight, Clock, UserCheck,
  Zap, Bell, Settings, HelpCircle, User, LogOut, SlidersHorizontal,
  Table as TableIcon, GlassWater, Star, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/* ------------------------------------------------------------------ */
/*  Category Icon Map (Clean Outline Icons)                           */
/* ------------------------------------------------------------------ */

const CATEGORY_META: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  all: { icon: LayoutGrid, label: 'All Items' },
  starters: { icon: Utensils, label: 'Appetizers' },
  biryani: { icon: Flame, label: 'Main Course' },
  'south-indian': { icon: Utensils, label: 'South Indian' },
  'north-indian': { icon: Utensils, label: 'North Indian' },
  chinese: { icon: Soup, label: 'Chinese' },
  combos: { icon: Sparkles, label: 'Combos' },
  desserts: { icon: Cake, label: 'Desserts' },
  beverages: { icon: GlassWater, label: 'Drinks' },
};

/* ------------------------------------------------------------------ */
/*  Main Cashier POS Page (RestoFlow Clean Architecture)              */
/* ------------------------------------------------------------------ */

export default function PosPage() {
  const { user, signOutUser } = useAuth();
  const { addOrderLocallyAndDB: createOrderContext, categories: dbCategories, orders } = useAdmin();
  const { data: queryCategories = [] } = useCategories();
  const { data: menuItems = [] } = useMenuItems();
  const { data: tables = [] } = useTables();

  /* State */
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState<DiscountOption>(0);
  const [packagingCharge, setPackagingCharge] = useState<number>(0);

  /* Cashier Display Name */
  const serverName = useMemo(() => {
    const full =
      user?.user_metadata?.name ||
      user?.user_metadata?.full_name ||
      user?.email?.split('@')[0] ||
      'Alex M.';
    return full.split(' ')[0] + ' ' + (full.split(' ')[1]?.[0] ? full.split(' ')[1][0] + '.' : 'M.');
  }, [user]);

  /* Categories */
  const activeCategories = useMemo(() => {
    return dbCategories.length > 0 ? dbCategories : queryCategories;
  }, [dbCategories, queryCategories]);

  const categoriesList = useMemo(() => {
    const list: { name: string; slug: string; icon: React.ComponentType<{ className?: string }> }[] = [
      { name: 'All Items', slug: 'all', icon: LayoutGrid },
    ];
    activeCategories
      .filter((c) => c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((c) => {
        const meta = CATEGORY_META[c.slug] || { icon: Utensils, label: c.name };
        list.push({ name: meta.label || c.name, slug: c.slug, icon: meta.icon });
      });
    return list;
  }, [activeCategories]);

  /* Filters */
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [vegFilter, setVegFilter] = useState<'all' | 'veg' | 'non-veg' | 'egg'>('all');
  const [search, setSearch] = useState('');
  const [layoutMode, setLayoutMode] = useState<'cards' | 'rows'>('cards');
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* Order Configuration */
  const [orderType, setOrderType] = useState<PosOrderType>('dine-in');
  const [tableNumber, setTableNumber] = useState<number | ''>(12);
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
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
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
  const [mobileBillOpen, setMobileBillOpen] = useState(false);

  const totals = useMemo(
    () => computeBillTotals(subtotal, discount, packagingCharge),
    [subtotal, discount, packagingCharge]
  );

  /* Filtered Dishes */
  const filteredDishes = useMemo(() => {
    const selectedCatObj = activeCategories.find((c) => c.slug === selectedCategory);
    return menuItems.filter((item) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q));

      const matchCategory =
        selectedCategory === 'all' ||
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

  const handleDecrementDish = useCallback((item: MenuItem) => {
    const line = lines.find((l) => l.menuItemId === item.id);
    if (line) decrementLine(line.key);
  }, [lines, decrementLine]);

  /* Complete Checkout & Place Order */
  const handlePlaceOrder = async () => {
    if (lines.length === 0) {
      toast.error('Cart is empty! Select items to add.');
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
        customerName: customerName.trim() || 'Counter Customer',
        customerPhone: customerPhone.trim() || undefined,
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
      setCustomerName('');
      setCustomerPhone('');
      setDiscount(0);
      setPackagingCharge(0);
      setMobileBillOpen(false);
      toast.success('Order placed successfully! ⚡');
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
    customerName,
    onCustomerName: setCustomerName,
    customerPhone,
    onCustomerPhone: setCustomerPhone,
    discount,
    onDiscount: setDiscount,
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

  return (
    <div className="flex flex-col w-screen h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased overflow-hidden select-none">

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  TOP NAVIGATION BAR (Exact match to reference design)       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <header className="h-14 bg-white border-b border-slate-200 px-5 flex items-center justify-between shrink-0 z-30">
        {/* Left: Brand + Table Selector + Server Badge */}
        <div className="flex items-center gap-6">
          {/* Logo Brand */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-black tracking-tight text-[#059669]">
              PalaPitta POS
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-xs font-semibold text-slate-700">
            {/* Table Badge / Picker */}
            <button
              type="button"
              onClick={() => setTableMapOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              <TableIcon className="size-3.5 text-slate-500" />
              <span>{tableNumber ? `Table ${tableNumber}` : 'Select Table'}</span>
            </button>

            {/* Server Badge */}
            <div className="flex items-center gap-1.5 text-slate-600">
              <User className="size-3.5 text-slate-400" />
              <span>Server: {serverName}</span>
            </div>
          </div>
        </div>

        {/* Right: Notifications, Settings, Help, Avatar */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="size-8.5 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
            title="Notifications"
          >
            <Bell className="size-4" />
          </button>

          <button
            type="button"
            className="size-8.5 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
            title="Settings"
          >
            <Settings className="size-4" />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="size-8.5 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
            title="Fullscreen / Help"
          >
            <HelpCircle className="size-4" />
          </button>

          {/* User Profile Avatar */}
          <div className="size-8 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shadow-xs">
            {serverName.charAt(0)}
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  MAIN 3-COLUMN LAYOUT                                       */}
      {/*  [1. Left Nav (190px)] | [2. Catalog (Flex)] | [3. Order (360px)] */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 min-h-0 flex w-full overflow-hidden">

        {/* ── 1. LEFT SIDEBAR (Category Navigation & Actions) ── */}
        <aside className="w-48 lg:w-52 shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between p-3.5 overflow-y-auto">
          {/* Top Categories Group */}
          <div className="space-y-3">
            {/* Quick Actions Button */}
            <button
              type="button"
              onClick={() => setTableMapOpen(true)}
              className="w-full h-9.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 text-blue-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            >
              <Zap className="size-3.5 text-blue-600" />
              <span>Quick Actions</span>
            </button>

            {/* Vertical Category Items */}
            <nav className="space-y-1 pt-1">
              {categoriesList.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.slug;

                return (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={cn(
                      'w-full h-10 px-3 rounded-xl font-semibold text-xs flex items-center gap-2.5 transition-all text-left',
                      isSelected
                        ? 'bg-[#059669] text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    )}
                  >
                    <Icon className={cn('size-4 shrink-0', isSelected ? 'text-white' : 'text-slate-500')} />
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Actions (Shift End / Logout) */}
          <div className="pt-3 border-t border-slate-200 space-y-1">
            <button
              type="button"
              onClick={() => setTableMapOpen(true)}
              className="w-full h-9 px-3 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 flex items-center gap-2.5 transition-colors"
            >
              <Clock className="size-3.5 text-slate-500" />
              <span>Shift End</span>
            </button>

            <button
              type="button"
              onClick={signOutUser}
              className="w-full h-9 px-3 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors"
            >
              <LogOut className="size-3.5 text-rose-500" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* ── 2. MIDDLE SECTION (Search, Status, & Product Catalog Grid) ── */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#F8FAFC]">

          {/* Top Search & Filter Bar */}
          <div className="p-4 bg-transparent flex items-center gap-3 shrink-0">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search menu items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-9.5 pr-8 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Occupied / Table Status Pill */}
            <div className="px-3.5 h-10 rounded-full bg-[#059669] text-white font-bold text-xs flex items-center justify-center shadow-2xs shrink-0">
              Occupied
            </div>

            {/* Filter Button */}
            <DropdownMenu open={filterMenuOpen} onOpenChange={setFilterMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="px-3.5 h-10 rounded-xl bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200 text-blue-900 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
                >
                  <SlidersHorizontal className="size-3.5 text-blue-700" />
                  <span>Filter</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-white rounded-xl p-1.5 shadow-md">
                <DropdownMenuItem
                  onClick={() => setVegFilter('all')}
                  className="text-xs font-semibold cursor-pointer rounded-lg"
                >
                  All Items
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setVegFilter('veg')}
                  className="text-xs font-semibold text-emerald-700 cursor-pointer rounded-lg"
                >
                  🌱 Veg Only
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setVegFilter('non-veg')}
                  className="text-xs font-semibold text-rose-700 cursor-pointer rounded-lg"
                >
                  🍗 Non-Veg Only
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setVegFilter('egg')}
                  className="text-xs font-semibold text-amber-700 cursor-pointer rounded-lg"
                >
                  🥚 Egg Only
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Product Cards Grid */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6 scrollbar-none">
            {filteredDishes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Utensils className="size-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-bold text-slate-600">No dishes match your filter</p>
                <p className="text-xs text-slate-400 mt-0.5">Try searching another keyword or clearing filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
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
        </main>

        {/* ── 3. RIGHT SIDEBAR ("Current Order" Checkout Panel) ── */}
        <section className="hidden md:flex w-[340px] lg:w-[370px] xl:w-[390px] shrink-0 flex-col h-full bg-white border-l border-slate-200">
          <BillPanel {...billPanelProps} />
        </section>
      </div>

      {/* ── Mobile: View Cart Bottom Float Button ── */}
      {lines.length > 0 && (
        <div className="md:hidden fixed left-4 right-4 bottom-4 z-30">
          <button
            type="button"
            onClick={() => setMobileBillOpen(true)}
            className="w-full h-12 rounded-xl bg-[#047857] text-white font-bold text-sm flex items-center justify-between px-5 shadow-lg active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="size-6 rounded-md bg-white/20 flex items-center justify-center font-mono text-xs">
                {totalUnits}
              </span>
              <span>View Order</span>
            </div>
            <span className="font-mono text-base font-black">
              ₹{totals.grandTotal.toFixed(2)}
            </span>
          </button>
        </div>
      )}

      {/* ── Mobile: Full Checkout Bottom Sheet ── */}
      <Sheet open={mobileBillOpen} onOpenChange={setMobileBillOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="p-0 h-[min(94dvh,780px)] rounded-t-3xl border-none bg-white overflow-hidden"
        >
          <BillPanel
            {...billPanelProps}
            compact={true}
            onClose={() => setMobileBillOpen(false)}
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
  );
}
