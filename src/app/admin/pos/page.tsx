'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import DishCard from '@/components/pos/DishCard';
import DishListRow from '@/components/pos/DishListRow';
import BillPanel, { type PosOrderType, type PosPaymentMode } from '@/components/pos/BillPanel';
import OrderPlacedDialog from '@/components/pos/OrderPlacedDialog';
import TableFloorMapModal from '@/components/pos/TableFloorMapModal';
import HeldOrdersModal, { type HeldOrder } from '@/components/pos/HeldOrdersModal';
import ShiftSummaryModal from '@/components/pos/ShiftSummaryModal';
import PrinterSettingsPanel from '@/components/admin/PrinterSettingsPanel';

import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { useCategories, useMenuItems, useTables } from '@/lib/queries';
import { usePosCart, type Portion } from '@/hooks/usePosCart';
import { computeBillTotals } from '@/lib/billing';
import { generateInvoiceNo, generateOrderId } from '@/lib/idGenerator';
import { triggerNewOrderPush, triggerWhatsAppOrderConfirmation } from '@/lib/triggerPush';
import { markPosOrderPrinted } from '@/lib/posOrderTracker';
import { isPrinterConnected } from '@/lib/thermalPrinter';
import type { Category, MenuItem, Order } from '@/types';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  Search, X, ShoppingBag, LayoutGrid, List, Printer,
  Utensils, Coffee, Flame, Cake, Soup, Sparkles,
  Maximize2, Minimize2, PauseCircle, BarChart3,
  Calendar, Clock, Zap, CheckCircle2, User, ChevronRight
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
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  /* Categories */
  const activeCategories = useMemo(() => {
    return dbCategories.length > 0 ? dbCategories : queryCategories;
  }, [dbCategories, queryCategories]);

  const categoriesList = useMemo(() => {
    const list: { name: string; slug: string; emoji: string; icon: React.ComponentType<{ className?: string }> }[] = [
      { name: 'All Items', slug: 'all', emoji: '✨', icon: LayoutGrid },
    ];
    activeCategories
      .filter((c) => c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((c) => {
        const meta = CATEGORY_ICONS[c.slug] || { icon: Utensils, emoji: '🍽️' };
        list.push({ name: c.name, slug: c.slug, emoji: meta.emoji, icon: meta.icon });
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
  const [tableNumber, setTableNumber] = useState<number | ''>('');
  const [paymentMode, setPaymentMode] = useState<PosPaymentMode>('cash');

  /* Modals & Dialogs */
  const [tableMapOpen, setTableMapOpen] = useState(false);
  const [heldOrdersOpen, setHeldOrdersOpen] = useState(false);
  const [shiftSummaryOpen, setShiftSummaryOpen] = useState(false);
  const [printerSettingsOpen, setPrinterSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  /* Parked / Held Orders List */
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);

  /* Live Clock */
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  /* Cart Hook */
  const {
    lines, subtotal, totalUnits, quantityByMenuItem, quantityByPortion,
    increment: incrementLine,
    decrement: decrementLine,
    setQuantity: setLineQuantity,
    remove: removeLine,
    add: addDish,
    clear: clearCart,
  } = usePosCart();

  const quantityInBill = (itemId: string) => quantityByMenuItem[itemId] || 0;

  /* Keyboard Shortcuts */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const active = document.activeElement;
        const isTyping = active instanceof HTMLElement &&
          (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
        if (isTyping) return;
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const printerConnected = isPrinterConnected();

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

  const totals = useMemo(() => computeBillTotals(subtotal), [subtotal]);

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

  /* Hold Active Order */
  const handleHoldOrder = () => {
    if (lines.length === 0) {
      toast.error('Cart is empty, nothing to hold');
      return;
    }
    const newHeld: HeldOrder = {
      id: generateOrderId(),
      heldAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      orderType,
      tableNumber,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      lines: [...lines],
      subtotal: totals.subtotal,
      totalUnits,
    };
    setHeldOrders((prev) => [newHeld, ...prev]);
    clearCart();
    setCustomerName('');
    setCustomerPhone('');
    setTableNumber('');
    toast.success(`Ticket #${newHeld.id.slice(-4)} parked successfully!`);
  };

  /* Restore Held Order */
  const handleRestoreHeldOrder = (held: HeldOrder) => {
    clearCart();
    setOrderType(held.orderType);
    setTableNumber(held.tableNumber);
    setCustomerName(held.customerName || '');
    setCustomerPhone(held.customerPhone || '');
    // re-add lines
    held.lines.forEach((l) => {
      const matchItem = menuItems.find((m) => m.id === l.menuItemId);
      if (matchItem) {
        for (let i = 0; i < l.quantity; i++) {
          addDish(matchItem, l.portion);
        }
      }
    });
    setHeldOrders((prev) => prev.filter((ho) => ho.id !== held.id));
    toast.success(`Restored ticket #${held.id.slice(-4)}`);
  };

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
        })),
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
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
      setTableNumber('');
      setMobileBillOpen(false);
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

  /* Shared BillPanel Props */
  const billPanelProps = {
    lines,
    totals,
    totalUnits,
    orderType,
    onOrderType: setOrderType,
    tables,
    tableNumber,
    onTableNumber: setTableNumber,
    paymentMode,
    onPaymentMode: setPaymentMode,
    customerName,
    onCustomerName: setCustomerName,
    customerPhone,
    onCustomerPhone: setCustomerPhone,
    onIncrement: incrementLine,
    onDecrement: decrementLine,
    onSetQuantity: setLineQuantity,
    onRemove: removeLine,
    onClear: clearCart,
    onPlace: handlePlaceOrder,
    onSendToKitchen: handleSendToKitchen,
    onHoldOrder: handleHoldOrder,
    onOpenTableMap: () => setTableMapOpen(true),
    isPlacing: placing,
  };

  const VEG_FILTERS: { value: typeof vegFilter; label: string; dot?: string }[] = [
    { value: 'all', label: 'All Items' },
    { value: 'veg', label: 'Veg', dot: 'bg-emerald-600' },
    { value: 'non-veg', label: 'Non-Veg', dot: 'bg-rose-600' },
    { value: 'egg', label: 'Egg', dot: 'bg-amber-500' },
  ];

  return (
    <AdminLayout title="Cashier POS System (2026)">
      <div className="flex flex-col w-full h-[calc(100vh-64px)] bg-[#F8FAFC] text-slate-900 font-sans antialiased overflow-hidden select-none">

        {/* ========================================================== */}
        {/*  1. TOP 70px ENTERPRISE HEADER BAR                         */}
        {/* ========================================================== */}
        <header className="h-[70px] bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 shadow-xs z-20">

          {/* Left: Terminal Identity + Clock + Shift */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="size-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Zap className="size-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-slate-950 truncate">
                  Pala Pitta Ruchulu
                </h1>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-black shrink-0 hidden sm:inline-flex">
                  POS Terminal #1
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Shift Open
                </span>
                <span>•</span>
                <span className="font-mono text-slate-900 font-black">{currentTime || '00:00:00'}</span>
              </div>
            </div>
          </div>

          {/* Center: Global Fast Search Input */}
          <div className="relative max-w-md w-full hidden md:block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              ref={searchInputRef}
              placeholder="Quick search dishes or category… (press / to focus)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-9.5 pr-8 text-xs font-bold bg-slate-50 border-slate-200 rounded-2xl focus-visible:ring-blue-500/20 focus-visible:border-blue-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Table Floor Map Trigger */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTableMapOpen(true)}
              className="h-10 px-3 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-black text-xs gap-1.5 shadow-2xs"
            >
              <LayoutGrid className="size-4 text-blue-600" />
              <span className="hidden lg:inline">Table Map</span>
            </Button>

            {/* Parked / Held Orders Trigger */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setHeldOrdersOpen(true)}
              className="h-10 px-3 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-black text-xs gap-1.5 shadow-2xs relative"
            >
              <PauseCircle className="size-4 text-amber-600" />
              <span className="hidden lg:inline">Parked</span>
              {heldOrders.length > 0 && (
                <span className="size-5 rounded-full bg-amber-500 text-white font-mono text-[10px] font-black flex items-center justify-center">
                  {heldOrders.length}
                </span>
              )}
            </Button>

            {/* Till / Shift Summary Trigger */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShiftSummaryOpen(true)}
              className="h-10 px-3 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-black text-xs gap-1.5 shadow-2xs"
            >
              <BarChart3 className="size-4 text-purple-600" />
              <span className="hidden lg:inline">Till Shift</span>
            </Button>

            {/* Thermal Printer Status */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPrinterSettingsOpen(true)}
              className="h-10 px-2.5 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs gap-1.5 shadow-2xs"
              title={printerConnected ? 'Thermal printer connected' : 'No printer connected'}
            >
              <span className={cn('size-2 rounded-full', printerConnected ? 'bg-emerald-500' : 'bg-slate-300')} />
              <Printer className="size-4" />
            </Button>

            {/* Fullscreen Toggle */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={toggleFullscreen}
              className="size-10 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              title="Fullscreen POS"
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
          </div>
        </header>

        {/* ========================================================== */}
        {/*  2. MAIN SPLIT BODY (65% Product Ordering | 35% Checkout)   */}
        {/* ========================================================== */}
        <div className="flex-1 min-h-0 flex w-full overflow-hidden">

          {/* ═══════════════════════════════════════════════════════════ */}
          {/*  LEFT SECTION (65%): Product Ordering Catalog               */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#F8FAFC]">

            {/* Table Allocation Fast Strip (Visible when Dine-In is active) */}
            {orderType === 'dine-in' && (
              <div className="bg-blue-50/80 border-b border-blue-100 px-4 py-2 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-900 shrink-0">
                    Tables:
                  </span>
                  {tables.map((t) => {
                    const isSelected = tableNumber === t.tableNumber;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTableNumber(t.tableNumber)}
                        className={cn(
                          'px-3 py-1 rounded-xl text-xs font-black font-mono shrink-0 transition-all border',
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-100/60'
                        )}
                      >
                        T#{t.tableNumber}
                      </button>
                    );
                  })}
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setTableMapOpen(true)}
                  className="text-xs font-black text-blue-700 hover:bg-blue-100 rounded-xl h-7 px-2 shrink-0"
                >
                  View Floor Map <ChevronRight className="size-3 ml-0.5" />
                </Button>
              </div>
            )}

            {/* Horizontal Sticky Category Navigation Bar */}
            <div className="bg-white border-b border-slate-200/90 px-4 py-2.5 shrink-0 shadow-2xs">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                {categoriesList.map((cat) => {
                  const isSelected = selectedCategory === cat.slug;
                  return (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => setSelectedCategory(cat.slug)}
                      className={cn(
                        'flex items-center gap-2 px-3.5 h-10 rounded-2xl text-xs font-black shrink-0 transition-all whitespace-nowrap border-2 select-none',
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20 scale-[1.02]'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      )}
                    >
                      <span className="text-sm">{cat.emoji}</span>
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Veg Filter + View Toggle Sub-Bar */}
            <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                {VEG_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setVegFilter(f.value)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 h-7.5 rounded-xl text-xs font-bold shrink-0 transition-all border',
                      vegFilter === f.value
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    )}
                  >
                    {f.dot && <span className={cn('size-2 rounded-full', f.dot)} />}
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-slate-400 font-mono">
                  {filteredDishes.length} dishes
                </span>

                {/* Grid / List Layout Switcher */}
                <div className="flex bg-slate-200 p-0.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setLayoutMode('cards')}
                    className={cn(
                      'size-7 rounded-lg flex items-center justify-center transition-all',
                      layoutMode === 'cards' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-500'
                    )}
                  >
                    <LayoutGrid className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayoutMode('rows')}
                    className={cn(
                      'size-7 rounded-lg flex items-center justify-center transition-all',
                      layoutMode === 'rows' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-500'
                    )}
                  >
                    <List className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Product Catalog Cards / Rows Display */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 scrollbar-none">
              {filteredDishes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                  <Utensils className="size-14 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-bold text-slate-600">No dishes match your filter</p>
                  <p className="text-xs text-slate-400 mt-1">Try clearing your search keyword or switching category</p>
                </div>
              ) : layoutMode === 'rows' ? (
                <div className="rounded-3xl border border-slate-200 bg-white shadow-xs divide-y divide-slate-100 overflow-hidden">
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
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5 pb-6">
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

          {/* ═══════════════════════════════════════════════════════════ */}
          {/*  RIGHT SECTION (35%): Sticky Cart & Checkout Panel          */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="hidden md:flex w-[360px] lg:w-[410px] shrink-0 flex-col h-full bg-white border-l border-slate-200">
            <BillPanel {...billPanelProps} />
          </div>
        </div>

        {/* ── Mobile: View Cart Bottom Float Button ── */}
        {lines.length > 0 && (
          <div className="md:hidden fixed left-4 right-4 bottom-4 z-30">
            <button
              type="button"
              onClick={() => setMobileBillOpen(true)}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-between px-5 shadow-2xl active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-2">
                <span className="size-7 rounded-lg bg-white/20 flex items-center justify-center font-mono text-xs">
                  {totalUnits}
                </span>
                <span>View Till Cart</span>
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
        {/* 1. Order Placed Confirmation & Thermal Print */}
        <OrderPlacedDialog
          order={placedOrder}
          invoiceNo={placedInvoiceNo}
          open={confirmOpen}
          onNewOrder={() => {
            setConfirmOpen(false);
            setPlacedOrder(null);
          }}
        />

        {/* 2. Restaurant Floor Table Map */}
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

        {/* 3. Parked & Held Orders */}
        <HeldOrdersModal
          open={heldOrdersOpen}
          onClose={() => setHeldOrdersOpen(false)}
          heldOrders={heldOrders}
          onRestore={handleRestoreHeldOrder}
          onDelete={(id) => setHeldOrders((prev) => prev.filter((ho) => ho.id !== id))}
        />

        {/* 4. Shift Reconciliation & Till Summary */}
        <ShiftSummaryModal
          open={shiftSummaryOpen}
          onClose={() => setShiftSummaryOpen(false)}
          orders={orders}
          cashierName={user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Vasishtha'}
        />

        {/* 5. Thermal Bluetooth Printer Settings */}
        <PrinterSettingsPanel
          open={printerSettingsOpen}
          onClose={() => setPrinterSettingsOpen(false)}
        />
      </div>
    </AdminLayout>
  );
}
