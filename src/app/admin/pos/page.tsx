'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import DishCard from '@/components/pos/DishCard';
import DishListRow from '@/components/pos/DishListRow';
import BillPanel, { type PosOrderType, type PosPaymentMode } from '@/components/pos/BillPanel';
import OrderPlacedDialog from '@/components/pos/OrderPlacedDialog';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { useCategories, useMenuItems, useTables } from '@/lib/queries';
import { usePosCart, type Portion } from '@/hooks/usePosCart';
import { computeBillTotals } from '@/lib/billing';
import { generateInvoiceNo, generateOrderId } from '@/lib/idGenerator';
import { triggerNewOrderPush, triggerWhatsAppOrderConfirmation } from '@/lib/triggerPush';
import { markPosOrderPrinted } from '@/lib/posOrderTracker';
import { isPrinterConnected } from '@/lib/thermalPrinter';
import PrinterSettingsPanel from '@/components/admin/PrinterSettingsPanel';
import type { Category, MenuItem, Order } from '@/types';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  Search, X, ShoppingBag, LayoutGrid, List, Printer,
  Utensils, Coffee, Flame, Cake, Soup, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Category Icons                                                      */
/* ------------------------------------------------------------------ */

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  all: LayoutGrid,
  starters: Utensils,
  biryani: Flame,
  'south-indian': Utensils,
  'north-indian': Utensils,
  chinese: Soup,
  combos: Sparkles,
  desserts: Cake,
  beverages: Coffee,
};

/* ------------------------------------------------------------------ */
/*  POS Page                                                            */
/* ------------------------------------------------------------------ */

export default function PosPage() {
  const { user } = useAuth();
  const { addOrderLocallyAndDB: createOrderContext, categories: dbCategories } = useAdmin();
  const { data: queryCategories = [] } = useCategories();
  const { data: menuItems = [] } = useMenuItems();
  const { data: tables = [] } = useTables();

  const [specialInstructions, setSpecialInstructions] = useState('');

  /* Categories */
  const activeCategories = useMemo(() => {
    return dbCategories.length > 0 ? dbCategories : queryCategories;
  }, [dbCategories, queryCategories]);

  const categoriesList = useMemo(() => {
    const list: { name: string; slug: string; icon: React.ComponentType<{ className?: string }> }[] = [
      { name: 'All', slug: 'all', icon: LayoutGrid },
    ];
    activeCategories
      .filter((c) => c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((c) => {
        list.push({ name: c.name, slug: c.slug, icon: CATEGORY_ICONS[c.slug] || Utensils });
      });
    return list;
  }, [activeCategories]);

  /* Filters */
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [vegFilter, setVegFilter] = useState<'all' | 'veg' | 'non-veg' | 'egg'>('all');
  const [search, setSearch] = useState('');
  const [layoutMode, setLayoutMode] = useState<'cards' | 'rows'>('cards');
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* Order config */
  const [orderType, setOrderType] = useState<PosOrderType>('dine-in');
  const [tableNumber, setTableNumber] = useState<number | ''>('');
  const [paymentMode, setPaymentMode] = useState<PosPaymentMode>('cash');

  /* Cart */
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

  /* Keyboard shortcut "/" → focus search */
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

  /* Printer */
  const [printerSettingsOpen, setPrinterSettingsOpen] = useState(false);
  const printerConnected = isPrinterConnected();

  /* Order placing */
  const [placing, setPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [placedInvoiceNo, setPlacedInvoiceNo] = useState<string | undefined>(undefined);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [mobileBillOpen, setMobileBillOpen] = useState(false);

  const totals = useMemo(() => computeBillTotals(subtotal), [subtotal]);

  /* Filtered dish list */
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

  const handlePlaceOrder = async () => {
    if (lines.length === 0) {
      toast.error('Cart is empty! Add items before placing order.');
      return;
    }
    if (orderType === 'dine-in' && tableNumber === '') {
      toast.error('⚠️ Select a table for Dine-In order!');
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
      setTableNumber('');
      setMobileBillOpen(false);
      toast.success('Order charged & printed! ⚡');
    } catch {
      toast.error('Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Bill panel props (shared between desktop panel & mobile sheet)   */
  /* ---------------------------------------------------------------- */
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
    onIncrement: incrementLine,
    onDecrement: decrementLine,
    onSetQuantity: setLineQuantity,
    onRemove: removeLine,
    onClear: clearCart,
    onPlace: handlePlaceOrder,
    isPlacing: placing,
  };

  /* ---------------------------------------------------------------- */
  /*  Veg filter pills                                                  */
  /* ---------------------------------------------------------------- */
  const VEG_FILTERS: { value: typeof vegFilter; label: string; dot?: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'veg', label: 'Veg', dot: 'bg-emerald-500' },
    { value: 'non-veg', label: 'Non-Veg', dot: 'bg-rose-500' },
    { value: 'egg', label: 'Egg', dot: 'bg-amber-500' },
  ];

  return (
    <AdminLayout title="Cashier POS">
      <div className="flex h-[var(--admin-content-h)] w-full max-w-full overflow-hidden bg-[#F8FAFC]">

        {/* ═══════════════════════════════════════════════════════════ */}
        {/*  LEFT: Menu Area                                           */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

          {/* ── Top search + controls bar ── */}
          <div className="bg-white border-b border-stone-100 px-3 sm:px-4 py-3 space-y-2.5 shrink-0">

            {/* Row 1: Search + printer */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search dishes… (press /)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-9 h-10 bg-stone-50 border-stone-200 rounded-xl text-sm font-medium focus-visible:ring-orange-400/30 focus-visible:border-orange-400"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {/* Layout toggle */}
              <div className="flex bg-stone-100 rounded-xl p-1 gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setLayoutMode('cards')}
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                    layoutMode === 'cards' ? 'bg-white shadow-sm text-orange-600' : 'text-stone-400 hover:text-stone-600'
                  )}
                >
                  <LayoutGrid className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode('rows')}
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                    layoutMode === 'rows' ? 'bg-white shadow-sm text-orange-600' : 'text-stone-400 hover:text-stone-600'
                  )}
                >
                  <List className="size-4" />
                </button>
              </div>

              {/* Printer */}
              <button
                type="button"
                onClick={() => setPrinterSettingsOpen(true)}
                title={printerConnected ? 'Printer connected' : 'No printer'}
                className="h-10 px-3 rounded-xl border border-stone-200 bg-white text-stone-500 hover:border-stone-300 flex items-center gap-1.5 transition-all shrink-0"
              >
                <span className={cn('size-2 rounded-full', printerConnected ? 'bg-emerald-500' : 'bg-stone-300')} />
                <Printer className="size-4" />
              </button>
            </div>

            {/* Row 2: Veg filter + item count */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                {VEG_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setVegFilter(f.value)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-bold shrink-0 transition-all border',
                      vegFilter === f.value
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                    )}
                  >
                    {f.dot && (
                      <span className={cn('size-2 rounded-full shrink-0', f.dot)} />
                    )}
                    {f.label}
                  </button>
                ))}
              </div>
              <span className="text-xs font-bold text-stone-400 shrink-0 tabular-nums">
                {filteredDishes.length} items
              </span>
            </div>
          </div>

          {/* ── Category Scroll Bar (always visible) ── */}
          <div className="bg-white border-b border-stone-100 px-3 sm:px-4 py-2 shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              {categoriesList.map((cat) => {
                const isSelected = selectedCategory === cat.slug;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={cn(
                      'flex items-center gap-1.5 px-3.5 h-9 rounded-full text-xs font-bold shrink-0 transition-all whitespace-nowrap border',
                      isSelected
                        ? 'bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-200'
                        : 'bg-white text-stone-600 border-stone-200 hover:border-orange-300 hover:bg-orange-50'
                    )}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Dishes Grid / List ── */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
            {filteredDishes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-stone-400">
                <div className="text-5xl mb-3">🍽️</div>
                <h4 className="font-bold text-stone-600 text-sm">No items found</h4>
                <p className="text-xs mt-1 text-stone-400">Try clearing the search or switching category</p>
              </div>
            ) : layoutMode === 'rows' ? (
              <div className="rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-sm divide-y divide-stone-100">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
        {/*  RIGHT: Bill Panel (desktop ≥ md)                          */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="hidden md:flex w-[340px] lg:w-[380px] shrink-0 flex-col border-l border-stone-200 bg-white">
          {/* Special instructions */}
          <div className="px-4 pt-4 pb-2 border-b border-stone-100 shrink-0">
            <div className="text-[10px] font-black tracking-wider text-stone-400 uppercase mb-1.5">Kitchen Notes</div>
            <textarea
              placeholder="e.g. No onion, less spicy…"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-xl text-xs bg-stone-50 border border-stone-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 placeholder:text-stone-400"
            />
          </div>
          <div className="flex-1 min-h-0">
            <BillPanel {...billPanelProps} />
          </div>
        </div>

        {/* ── Mobile: Bill Bottom Sheet ── */}
        <Sheet open={mobileBillOpen} onOpenChange={setMobileBillOpen}>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="p-0 h-[min(92dvh,740px)] rounded-t-3xl border-none bg-white"
          >
            {/* Kitchen notes inside sheet */}
            <div className="px-4 pt-4 pb-2 border-b border-stone-100 shrink-0">
              <div className="text-[10px] font-black tracking-wider text-stone-400 uppercase mb-1.5">Kitchen Notes</div>
              <textarea
                placeholder="e.g. No onion, less spicy…"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-xl text-xs bg-stone-50 border border-stone-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 placeholder:text-stone-400"
              />
            </div>
            <BillPanel
              {...billPanelProps}
              compact={true}
              onClose={() => setMobileBillOpen(false)}
            />
          </SheetContent>
        </Sheet>

        {/* ── Mobile: Floating Cart Button ── */}
        {lines.length > 0 && (
          <div className="md:hidden fixed left-3 right-3 z-30 bottom-[max(1rem,env(safe-area-inset-bottom,0px))]">
            <button
              type="button"
              onClick={() => setMobileBillOpen(true)}
              className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-extrabold rounded-2xl shadow-2xl shadow-orange-400/40 flex items-center justify-between px-5 text-sm active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="bg-white/20 rounded-xl px-2.5 py-1 flex items-center gap-1.5">
                  <ShoppingBag className="size-4" />
                  <span className="font-black tabular-nums">{totalUnits}</span>
                </div>
                <span>View Cart</span>
              </div>
              <span className="font-black tabular-nums">₹{totals.grandTotal.toFixed(2)}</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Dialogs ── */}
      <OrderPlacedDialog
        order={placedOrder}
        invoiceNo={placedInvoiceNo}
        open={confirmOpen}
        onNewOrder={() => {
          setConfirmOpen(false);
          setPlacedOrder(null);
        }}
      />

      <PrinterSettingsPanel
        open={printerSettingsOpen}
        onClose={() => setPrinterSettingsOpen(false)}
      />
    </AdminLayout>
  );
}
