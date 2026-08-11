'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import DishCard from '@/components/pos/DishCard';
import DishListRow from '@/components/pos/DishListRow';
import BillPanel, { type PosOrderType, type PosPaymentMode } from '@/components/pos/BillPanel';
import OrderPlacedDialog from '@/components/pos/OrderPlacedDialog';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { useMenuItems, useTables } from '@/lib/queries';
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
import {
  Search, X, ShoppingBag, LayoutGrid, List, Printer,
} from 'lucide-react';

const CATEGORIES: { label: string; value: Category | 'all'; icon: string }[] = [
  { label: 'All', value: 'all', icon: '🍱' },
  { label: 'Combos', value: 'combos', icon: '🎁' },
  { label: 'Starters', value: 'starters', icon: '🍗' },
  { label: 'Tandoori', value: 'tandoori', icon: '🔥' },
  { label: 'Biryani', value: 'biryani', icon: '🍚' },
  { label: 'South Indian', value: 'south-indian', icon: '🥘' },
  { label: 'North Indian', value: 'north-indian', icon: '🍛' },
  { label: 'Chinese', value: 'chinese', icon: '🥡' },
  { label: 'Rice', value: 'rice', icon: '🍙' },
  { label: 'Breads', value: 'breads', icon: '🫓' },
  { label: 'Desserts', value: 'desserts', icon: '🍮' },
  { label: 'Beverages', value: 'beverages', icon: '🥤' },
];

export default function PosPage() {
  const { user } = useAuth();
  const { addOrderLocallyAndDB: createOrderContext, categories: dbCategories } = useAdmin();
  const { data: menuItems = [] } = useMenuItems();
  const { data: tables = [] } = useTables();

  // Dynamic category options built from DB
  const dynamicCategories = useMemo(() => {
    const list: { label: string; value: string }[] = [{ label: 'All Bestsellers', value: 'all' }];
    dbCategories
      .filter((c) => c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((c) => {
        list.push({ label: c.name, value: c.slug });
      });
    return list;
  }, [dbCategories]);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [vegFilter, setVegFilter] = useState<'all' | 'veg' | 'non-veg' | 'egg'>('all');
  const [search, setSearch] = useState('');
  const [layoutMode, setLayoutMode] = useState<'cards' | 'rows'>('cards');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [orderType, setOrderType] = useState<PosOrderType>('counter');
  const [tableNumber, setTableNumber] = useState<number | ''>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
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

  // "/" jumps to search, "Enter" or "Ctrl+Enter" triggers place order if cart not empty
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
    return menuItems.filter((item) => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q || item.name.toLowerCase().includes(q) || (item.category && item.category.toLowerCase().includes(q));
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchVeg = vegFilter === 'all' || item.vegStatus === vegFilter;
      return matchSearch && matchCategory && matchVeg && item.isAvailable !== false;
    });
  }, [menuItems, search, selectedCategory, vegFilter]);

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
    if (lines.length === 0) return;

    setPlacing(true);
    try {
      const orderId = generateOrderId();
      const invoiceNo = generateInvoiceNo();

      const newOrder: Order = {
        id: orderId,
        orderId,
        customerName: customerName.trim() || 'Walk-in Customer',
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
      setCustomerName('');
      setCustomerPhone('');
      setTableNumber('');
      setMobileBillOpen(false);
      toast.success('Order charged & printed successfully! ⚡');
    } catch {
      toast.error('Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <AdminLayout title="POS Cashier Terminal">
      <div className="flex h-[var(--admin-content-h)] w-full max-w-full overflow-hidden text-stone-900 dark:text-stone-100">
        {/* Left Catalog Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-stone-100/60 dark:bg-stone-950 p-2.5 sm:p-3.5 gap-2.5 overflow-hidden">
          {/* Top Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 bg-white dark:bg-stone-900 p-2.5 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
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
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              {(['all', 'veg', 'non-veg', 'egg'] as const).map((v) => (
                <Button
                  key={v}
                  type="button"
                  variant={vegFilter === v ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVegFilter(v)}
                  className={`rounded-xl text-xs font-bold capitalize px-3 h-9 ${
                    vegFilter === v ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''
                  }`}
                >
                  {v}
                </Button>
              ))}

              <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl ml-auto sm:ml-0">
                <Button
                  variant={layoutMode === 'rows' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setLayoutMode('rows')}
                  className="h-7 w-7 rounded-lg"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={layoutMode === 'cards' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setLayoutMode('cards')}
                  className="h-7 w-7 rounded-lg"
                >
                  <LayoutGrid className="w-4 h-4" />
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
                <span className={`w-1.5 h-1.5 rounded-full ${printerConnected ? 'bg-emerald-500' : 'bg-stone-300 dark:bg-stone-600'}`} />
                <Printer className="w-4 h-4" />
                <span className="hidden lg:inline">Printer</span>
              </Button>
            </div>
          </div>

          {/* Categories Pill Bar */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none flex-shrink-0">
            {dynamicCategories.map((cat) => {
              const isSelected = selectedCategory === cat.value;
              return (
                <Button
                  key={cat.value}
                  type="button"
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`rounded-full px-4 text-xs font-bold whitespace-nowrap h-9 ${
                    isSelected ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md' : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800'
                  }`}
                >
                  {cat.label}
                </Button>
              );
            })}
          </div>

          {/* Catalog Dishes Grid/List */}
          <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 p-2 sm:p-3">
            {filteredDishes.length === 0 ? (
              <div className="text-center py-16 text-stone-400">
                <div className="text-4xl mb-2">🍽️</div>
                <h4 className="font-extrabold text-sm text-stone-700 dark:text-stone-300">
                  No dishes match your filter
                </h4>
                <p className="text-xs text-stone-400 mt-0.5">
                  Try clearing your search or switching categories
                </p>
              </div>
            ) : layoutMode === 'rows' ? (
              <div className="divide-y divide-stone-200/60 dark:divide-stone-800 bg-white dark:bg-stone-900 rounded-xl overflow-hidden shadow-xs">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
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

        {/* Desktop Bill Panel Sidebar */}
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
            customerName={customerName}
            onCustomerName={setCustomerName}
            customerPhone={customerPhone}
            onCustomerPhone={setCustomerPhone}
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
              customerName={customerName}
              onCustomerName={setCustomerName}
              customerPhone={customerPhone}
              onCustomerPhone={setCustomerPhone}
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
              className="w-full h-14 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-2xl shadow-2xl flex justify-between px-5 text-base"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                <span>{totalUnits} items</span>
              </div>
              <span>View Bill · {rupees(totals.grandTotal)}</span>
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
