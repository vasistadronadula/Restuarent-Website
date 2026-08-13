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

import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { useCategories, useMenuItems, useTables } from '@/lib/queries';
import { usePosCart, type Portion } from '@/hooks/usePosCart';
import { computeBillTotals } from '@/lib/billing';
import { generateInvoiceNo, generateOrderId } from '@/lib/idGenerator';
import { triggerNewOrderPush, triggerWhatsAppOrderConfirmation } from '@/lib/triggerPush';
import { markPosOrderPrinted } from '@/lib/posOrderTracker';
import type { Category, MenuItem, Order } from '@/types';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  Search, X, ShoppingBag, LayoutGrid, List,
  Utensils, Coffee, Flame, Cake, Soup, Sparkles,
  Maximize2, Minimize2, PauseCircle, BarChart3,
  ChevronRight
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
  const [isFullscreen, setIsFullscreen] = useState(false);

  /* Parked / Held Orders List */
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);

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

  /* Refs for keyboard shortcuts */
  const handlePlaceOrderRef = useRef(handlePlaceOrder);
  const handleHoldOrderRef = useRef(handleHoldOrder);
  useEffect(() => {
    handlePlaceOrderRef.current = handlePlaceOrder;
    handleHoldOrderRef.current = handleHoldOrder;
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
      } else if (e.key === 'F4') {
        e.preventDefault();
        handleHoldOrderRef.current();
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
      <div className="flex flex-col w-full h-full bg-[#F8FAFC] text-slate-900 font-sans antialiased overflow-hidden select-none">

        {/* ── 1. CASHIER FAST CONTROL BAR (52px) ── */}
        <div className="h-[52px] bg-white border-b border-slate-200 px-3 sm:px-4 flex items-center justify-between gap-2.5 shrink-0 shadow-2xs z-20">
          {/* Left: Quick Search */}
          <div className="relative w-44 sm:w-60 md:w-72 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <Input
              ref={searchInputRef}
              placeholder="Search dishes… (/)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-7.5 pr-7 text-xs font-bold bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-blue-500/20 focus-visible:border-blue-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
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
                className={cn(
                  'flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-xs font-bold shrink-0 transition-all border',
                  vegFilter === f.value
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                {f.dot && <span className={cn('size-1.5 rounded-full', f.dot)} />}
                <span>{f.label}</span>
              </button>
            ))}
          </div>

          {/* Right: Cashier Action Shortcuts */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Table Floor Map Trigger */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTableMapOpen(true)}
              className={cn(
                'h-8 px-2.5 rounded-xl border-slate-200 text-xs font-bold gap-1 shadow-2xs',
                tableNumber !== '' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-slate-700 hover:bg-slate-50'
              )}
              title="Restaurant Floor & Tables"
            >
              <LayoutGrid className="size-3.5 text-blue-600" />
              <span className="hidden sm:inline">
                {tableNumber !== '' ? `Table #${tableNumber}` : 'Tables'}
              </span>
            </Button>

            {/* Parked / Held Orders Trigger */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setHeldOrdersOpen(true)}
              className="h-8 px-2.5 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold gap-1 shadow-2xs relative"
              title="Parked / Held tickets (F4)"
            >
              <PauseCircle className="size-3.5 text-amber-600" />
              <span className="hidden sm:inline">Parked</span>
              {heldOrders.length > 0 && (
                <span className="size-4.5 rounded-full bg-amber-500 text-white font-mono text-[10px] font-black flex items-center justify-center">
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
              className="h-8 px-2.5 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold gap-1 shadow-2xs"
              title="Till Shift Reconciliation"
            >
              <BarChart3 className="size-3.5 text-purple-600" />
              <span className="hidden lg:inline">Shift</span>
            </Button>

            {/* Grid / List Layout Switcher */}
            <div className="hidden sm:flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setLayoutMode('cards')}
                className={cn(
                  'size-6.5 rounded-md flex items-center justify-center transition-all',
                  layoutMode === 'cards' ? 'bg-white shadow-2xs text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
                )}
                title="Grid view"
              >
                <LayoutGrid className="size-3" />
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('rows')}
                className={cn(
                  'size-6.5 rounded-md flex items-center justify-center transition-all',
                  layoutMode === 'rows' ? 'bg-white shadow-2xs text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
                )}
                title="List view"
              >
                <List className="size-3" />
              </button>
            </div>

            {/* Fullscreen Toggle */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={toggleFullscreen}
              className="size-8 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
              title="Fullscreen POS"
            >
              {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </Button>
          </div>
        </div>

        {/* ── 2. MAIN SPLIT BODY (65% Product Ordering | 35% Checkout) ── */}
        <div className="flex-1 min-h-0 flex w-full overflow-hidden">

          {/* ═══════════════════════════════════════════════════════════ */}
          {/*  LEFT SECTION (65%): Product Ordering Catalog               */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#F8FAFC]">

            {/* Sticky Category Tabs Bar */}
            <div className="bg-white border-b border-slate-200 px-3 sm:px-4 py-2 shrink-0 shadow-2xs">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                {categoriesList.map((cat) => {
                  const isSelected = selectedCategory === cat.slug;
                  return (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => setSelectedCategory(cat.slug)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-bold shrink-0 transition-all whitespace-nowrap border select-none',
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white shadow-xs scale-[1.02]'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      )}
                    >
                      <span className="text-xs">{cat.emoji}</span>
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Table Allocation Fast Strip (Visible when Dine-In is active) */}
            {orderType === 'dine-in' && (
              <div className="bg-blue-50/90 border-b border-blue-200/70 px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
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
                          'px-2.5 py-0.5 rounded-lg text-xs font-black font-mono shrink-0 transition-all border',
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-100/60'
                        )}
                      >
                        T#{t.tableNumber}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setTableMapOpen(true)}
                  className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-0.5 shrink-0 px-2 py-0.5 rounded-lg hover:bg-blue-100"
                >
                  Floor Map <ChevronRight className="size-3" />
                </button>
              </div>
            )}

            {/* Product Catalog Cards / Rows Display */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 scrollbar-none">
              {filteredDishes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                  <Utensils className="size-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-bold text-slate-600">No dishes match your filter</p>
                  <p className="text-xs text-slate-400 mt-0.5">Try clearing search keyword or switching category</p>
                </div>
              ) : layoutMode === 'rows' ? (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-xs divide-y divide-slate-100 overflow-hidden">
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
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 pb-6">
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
          <div className="hidden md:flex w-[350px] lg:w-[390px] xl:w-[420px] shrink-0 flex-col h-full bg-white border-l border-slate-200">
            <BillPanel {...billPanelProps} />
          </div>
        </div>

        {/* ── Mobile: View Cart Bottom Float Button ── */}
        {lines.length > 0 && (
          <div className="md:hidden fixed left-4 right-4 bottom-4 z-30">
            <button
              type="button"
              onClick={() => setMobileBillOpen(true)}
              className="w-full h-13 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-between px-5 shadow-2xl active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-2">
                <span className="size-6.5 rounded-lg bg-white/20 flex items-center justify-center font-mono text-xs">
                  {totalUnits}
                </span>
                <span>View Cart</span>
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

        <HeldOrdersModal
          open={heldOrdersOpen}
          onClose={() => setHeldOrdersOpen(false)}
          heldOrders={heldOrders}
          onRestore={handleRestoreHeldOrder}
          onDelete={(id) => setHeldOrders((prev) => prev.filter((ho) => ho.id !== id))}
        />

        <ShiftSummaryModal
          open={shiftSummaryOpen}
          onClose={() => setShiftSummaryOpen(false)}
          orders={orders}
          cashierName={user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Vasishtha'}
        />
      </div>
    </AdminLayout>
  );
}
