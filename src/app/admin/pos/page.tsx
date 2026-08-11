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
import { computeBillTotals, rupees } from '@/lib/billing';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Search, X, ShoppingBag, LayoutGrid, List, Printer, Sparkles,
  Utensils, Coffee, Pizza, Flame, Cake, Cookie, Sandwich, IceCream, Soup,
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, any> = {
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

export default function PosPage() {
  const { user } = useAuth();
  const { addOrderLocallyAndDB: createOrderContext, categories: dbCategories } = useAdmin();
  const { data: queryCategories = [] } = useCategories();
  const { data: menuItems = [] } = useMenuItems();
  const { data: tables = [] } = useTables();

  const [specialInstructions, setSpecialInstructions] = useState('');

  // Live categories synced from Menu Management (Context DB or React Query)
  const activeCategories = useMemo(() => {
    return dbCategories.length > 0 ? dbCategories : queryCategories;
  }, [dbCategories, queryCategories]);

  const categoriesList = useMemo(() => {
    const list = [{ name: 'All Items', slug: 'all', icon: LayoutGrid }];
    activeCategories
      .filter((c) => c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((c) => {
        const IconComponent = CATEGORY_ICONS[c.slug] || Utensils;
        list.push({ name: c.name, slug: c.slug, icon: IconComponent });
      });
    return list;
  }, [activeCategories]);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [vegFilter, setVegFilter] = useState<'all' | 'veg' | 'non-veg' | 'egg'>('all');
  const [search, setSearch] = useState('');
  const [layoutMode, setLayoutMode] = useState<'cards' | 'rows'>('cards');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [orderType, setOrderType] = useState<PosOrderType>('dine-in');
  const [tableNumber, setTableNumber] = useState<number | ''>('');
  const [paymentMode, setPaymentMode] = useState<PosPaymentMode>('cash');

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

  // Keyboard shortcut "/" for search
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

  const [printerSettingsOpen, setPrinterSettingsOpen] = useState(false);
  const printerConnected = isPrinterConnected();

  const [placing, setPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [placedInvoiceNo, setPlacedInvoiceNo] = useState<string | undefined>(undefined);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [mobileBillOpen, setMobileBillOpen] = useState(false);

  const totals = useMemo(() => computeBillTotals(subtotal), [subtotal]);

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
    if (line) {
      decrementLine(line.key);
    }
  }, [lines, decrementLine]);

  const handlePlaceOrder = async () => {
    if (lines.length === 0) {
      toast.error('Cart is empty! Please add items before placing order.');
      return;
    }

    if (orderType === 'dine-in' && tableNumber === '') {
      toast.error('⚠️ Please select a Table for Dine-In order!');
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
      toast.success('Order charged & printed successfully! ⚡');
    } catch {
      toast.error('Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  const selectedCategoryLabel = useMemo(() => {
    return categoriesList.find((c) => c.slug === selectedCategory)?.name || 'All Items';
  }, [categoriesList, selectedCategory]);

  return (
    <AdminLayout title="Cashier POS Terminal">
      <div className="flex h-[var(--admin-content-h)] w-full max-w-full overflow-hidden text-stone-900 dark:text-stone-100 bg-stone-50/60 dark:bg-stone-950">
        
        {/* ── 1. LEFT COLUMN: VERTICAL CATEGORIES & EXTRAS ── */}
        <div className="hidden lg:flex flex-col w-56 shrink-0 border-r border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-3 space-y-4 overflow-y-auto scrollbar-none">
          <div>
            <div className="text-[11px] font-extrabold tracking-wider text-stone-400 uppercase mb-2 px-2">
              CATEGORIES
            </div>

            <div className="space-y-1">
              {categoriesList.map((cat) => {
                const isSelected = selectedCategory === cat.slug;
                const IconComponent = cat.icon;
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all text-left ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    <IconComponent className="size-4 shrink-0" />
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-stone-100 dark:border-stone-800" />

          {/* Special Instructions Box */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-bold text-stone-400 px-1">
              Special Instructions
            </div>
            <Textarea
              placeholder="Add order notes (e.g. No onion, Less spicy...)"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="min-h-[80px] rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 resize-none p-2.5"
            />
          </div>
        </div>

        {/* ── 2. MIDDLE COLUMN: DISHES GRID ── */}
        <div className="flex-1 flex flex-col min-w-0 p-3 sm:p-4 gap-3 overflow-hidden">
          
          {/* Top Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-stone-900 p-2.5 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs shrink-0">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
              <Input
                ref={searchInputRef}
                placeholder="Search dish or category... (press /)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9 h-10 bg-stone-50 dark:bg-stone-800 border-none rounded-xl text-xs font-bold"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto shrink-0">
              {(['all', 'veg', 'non-veg', 'egg'] as const).map((v) => (
                <Button
                  key={v}
                  type="button"
                  variant={vegFilter === v ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVegFilter(v)}
                  className={`rounded-xl text-xs font-bold capitalize px-3 h-9 ${
                    vegFilter === v ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''
                  }`}
                >
                  {v}
                </Button>
              ))}

              <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
                <Button
                  variant={layoutMode === 'cards' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setLayoutMode('cards')}
                  className="h-7 w-7 rounded-lg"
                >
                  <LayoutGrid className="size-4" />
                </Button>
                <Button
                  variant={layoutMode === 'rows' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setLayoutMode('rows')}
                  className="h-7 w-7 rounded-lg"
                >
                  <List className="size-4" />
                </Button>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPrinterSettingsOpen(true)}
                className="h-9 rounded-xl text-xs font-bold gap-1.5 border-stone-200 dark:border-stone-800"
                title={printerConnected ? 'Printer connected' : 'No printer connected'}
              >
                <span className={`size-1.5 rounded-full ${printerConnected ? 'bg-emerald-500' : 'bg-stone-300 dark:bg-stone-600'}`} />
                <Printer className="size-4" />
              </Button>
            </div>
          </div>

          {/* Mobile & Tablet Category Horizontal Scroll Bar */}
          <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none shrink-0">
            {categoriesList.map((cat) => {
              const isSelected = selectedCategory === cat.slug;
              const IconComponent = cat.icon;
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-extrabold text-xs shrink-0 transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  <IconComponent className="size-3.5 shrink-0" />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* Grid Title & Count */}
          <div className="flex items-center justify-between px-1 shrink-0">
            <h3 className="font-black text-base text-stone-900 dark:text-stone-100">
              {selectedCategoryLabel}
            </h3>
            <span className="text-xs font-bold text-stone-400">
              {filteredDishes.length} items
            </span>
          </div>

          {/* Catalog Dishes Grid */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none rounded-2xl">
            {filteredDishes.length === 0 ? (
              <div className="text-center py-16 text-stone-400 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80">
                <div className="text-4xl mb-2">🍽️</div>
                <h4 className="font-extrabold text-sm text-stone-700 dark:text-stone-300">
                  No items found
                </h4>
                <p className="text-xs text-stone-400 mt-0.5">
                  Try clearing search or switching category filter
                </p>
              </div>
            ) : layoutMode === 'rows' ? (
              <div className="divide-y divide-stone-200/60 dark:divide-stone-800 bg-white dark:bg-stone-900 rounded-2xl overflow-hidden shadow-xs border border-stone-200/80">
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
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5 pb-4">
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

        {/* ── 3. RIGHT COLUMN: TICKET & CHECKOUT PANEL ── */}
        <div className="hidden md:block w-96 flex-shrink-0 h-full">
          <BillPanel
            lines={lines}
            totals={totals}
            totalUnits={totalUnits}
            orderType={orderType}
            onOrderType={setOrderType}
            tables={tables}
            tableNumber={tableNumber}
            onTableNumber={setTableNumber}
            paymentMode={paymentMode}
            onPaymentMode={setPaymentMode}
            onIncrement={incrementLine}
            onDecrement={decrementLine}
            onSetQuantity={setLineQuantity}
            onRemove={removeLine}
            onClear={clearCart}
            onPlace={handlePlaceOrder}
            isPlacing={placing}
          />
        </div>

        {/* Mobile Bill Bottom Sheet */}
        <Sheet open={mobileBillOpen} onOpenChange={setMobileBillOpen}>
          <SheetContent side="bottom" showCloseButton={false} className="p-0 h-[min(88dvh,720px)] rounded-t-3xl border-none">
            <BillPanel
              lines={lines}
              totals={totals}
              totalUnits={totalUnits}
              orderType={orderType}
              onOrderType={setOrderType}
              tables={tables}
              tableNumber={tableNumber}
              onTableNumber={setTableNumber}
              paymentMode={paymentMode}
              onPaymentMode={setPaymentMode}
              onIncrement={incrementLine}
              onDecrement={decrementLine}
              onSetQuantity={setLineQuantity}
              onRemove={removeLine}
              onClear={clearCart}
              onPlace={handlePlaceOrder}
              isPlacing={placing}
              onClose={() => setMobileBillOpen(false)}
              compact={true}
            />
          </SheetContent>
        </Sheet>

        {/* Floating Cart Button on Phone */}
        {lines.length > 0 && (
          <div className="md:hidden fixed left-4 right-4 z-30 bottom-[max(1rem,env(safe-area-inset-bottom,0px))]">
            <Button
              onClick={() => setMobileBillOpen(true)}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl shadow-2xl flex justify-between px-5 text-base"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="size-5" />
                <span>{totalUnits} items</span>
              </div>
              <span>View Cart · ₹{totals.grandTotal.toFixed(2)}</span>
            </Button>
          </div>
        )}
      </div>

      <OrderPlacedDialog
        order={placedOrder}
        invoiceNo={placedInvoiceNo}
        open={confirmOpen}
        onNewOrder={() => {
          setConfirmOpen(false);
          setPlacedOrder(null);
        }}
      />

      <PrinterSettingsPanel open={printerSettingsOpen} onClose={() => setPrinterSettingsOpen(false)} />
    </AdminLayout>
  );
}
