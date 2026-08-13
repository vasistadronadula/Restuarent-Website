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
import { computeBillTotals, type DiscountOption } from '@/lib/billing';
import { generateInvoiceNo, generateOrderId } from '@/lib/idGenerator';
import { triggerNewOrderPush, triggerWhatsAppOrderConfirmation } from '@/lib/triggerPush';
import { markPosOrderPrinted } from '@/lib/posOrderTracker';
import type { MenuItem, Order } from '@/types';
import { toast } from 'sonner';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  Search, X, LayoutGrid, List,
  Utensils, Coffee, Flame, Cake, Soup, Sparkles,
  Maximize2, Minimize2, ChevronRight, Zap,
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
  const [discount, setDiscount] = useState<DiscountOption>(0);
  const [packagingCharge, setPackagingCharge] = useState<number>(0);

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
  const [mobileBillOpen, setMobileBillOpen] = useState(false);

  const totals = useMemo(
    () => computeBillTotals(subtotal, discount, packagingCharge),
    [subtotal, discount, packagingCharge]
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

  /* Quick Rush-Hour Best Sellers */
  const quickBestSellers = useMemo(() => {
    const popular = menuItems.filter(
      (m) => (m.isPopular || m.isSpecial || m.rating >= 4.5) && m.isAvailable !== false
    );
    return popular.length >= 4 ? popular.slice(0, 6) : menuItems.slice(0, 6);
  }, [menuItems]);

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

  const VEG_FILTERS: { value: typeof vegFilter; label: string; dot?: string }[] = [
    { value: 'all', label: 'All Items' },
    { value: 'veg', label: 'Veg', dot: 'bg-ad-ok' },
    { value: 'non-veg', label: 'Non-veg', dot: 'bg-ad-accent' },
    { value: 'egg', label: 'Egg', dot: 'bg-ad-warn' },
  ];

  return (
    <AdminLayout title="Cashier POS System (2026)">
      <div className="flex flex-col w-full h-full bg-ad-bg text-ad-ink overflow-hidden select-none">

        {/* ── 1. CASHIER FAST CONTROL BAR ── */}
        <div className="h-[56px] bg-ad-bg border-b-2 border-ad-line px-3 sm:px-4 flex items-center justify-between gap-2.5 shrink-0 z-20">
          {/* Left: Quick Search */}
          <div className="relative w-44 sm:w-60 md:w-72 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-ad-muted" />
            <input
              ref={searchInputRef}
              className="ad-input h-9 pl-7.5 pr-7"
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
            {/* Live Clock & Cashier Badge */}
            <div className="hidden xl:flex items-center gap-2 ad-kicker">
              <span className="size-1.5 bg-ad-accent animate-pulse" />
              <span className="ad-num text-[12px]">{timeStr}</span>
              <span className="truncate max-w-25">{cashierName}</span>
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
            <div className="hidden sm:flex items-center gap-1.5">
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

        {/* ── 2. MAIN SPLIT BODY (65% Product Ordering | 35% Checkout) ── */}
        <div className="flex-1 min-h-0 flex w-full overflow-hidden">

          {/* ═══════════════════════════════════════════════════════════ */}
          {/*  LEFT SECTION (65%): Product Ordering Catalog               */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-ad-bg">

            {/* Sticky Category Tabs Bar */}
            <div className="border-b-2 border-ad-line px-3 sm:px-4 py-2.5 shrink-0">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                {categoriesList.map((cat) => (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => setSelectedCategory(cat.slug)}
                    className="ad-tab shrink-0"
                    data-active={selectedCategory === cat.slug}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* ⚡ Rush-Hour Best Sellers Strip (1-Tap Quick Add) */}
            {quickBestSellers.length > 0 && selectedCategory === 'all' && !search && (
              <div className="bg-ad-surface border-b border-ad-hairline px-3 sm:px-4 py-2 flex items-center gap-3 shrink-0 overflow-x-auto scrollbar-none">
                <span className="ad-kicker flex items-center gap-1 shrink-0">
                  <Zap className="size-3.5" /> Rush hits
                </span>
                <div className="flex items-center gap-2">
                  {quickBestSellers.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleAddDish(item)}
                      className="px-2.5 py-1 bg-ad-bg border border-ad-hairline hover:border-ad-accent text-[13px] font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
                    >
                      <span
                        className="size-1.5 rounded-full"
                        style={{
                          background:
                            item.vegStatus === 'veg' ? 'var(--ad-ok)'
                            : item.vegStatus === 'egg' ? 'var(--ad-warn)'
                            : 'var(--ad-accent)',
                        }}
                      />
                      <span className="truncate max-w-32">{item.name}</span>
                      <span className="ad-num text-[12px]">₹{item.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

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
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 scrollbar-none">
              {filteredDishes.length === 0 ? (
                <div className="py-24 text-center">
                  <p className="ad-h text-[16px]">No dishes match</p>
                  <p className="text-[13px] ad-muted mt-1.5">Clear the search or switch category.</p>
                </div>
              ) : layoutMode === 'rows' ? (
                <div className="border-2 border-ad-line divide-y divide-ad-hairline">
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
                <div className="ad-grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 mb-6">
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
          <div className="hidden md:flex w-[350px] lg:w-[390px] xl:w-[420px] shrink-0 flex-col h-full bg-ad-surface border-l-2 border-ad-line">
            <BillPanel {...billPanelProps} />
          </div>
        </div>

        {/* ── Mobile: View Cart Bottom Float Button ── */}
        {lines.length > 0 && (
          <div className="md:hidden fixed left-4 right-4 bottom-4 z-30">
            <button
              type="button"
              onClick={() => setMobileBillOpen(true)}
              className="ad-btn ad-btn-primary w-full h-13 justify-between px-5 text-[14px]"
            >
              <span className="flex items-center gap-2">
                <span className="size-6.5 grid place-items-center bg-ad-bg text-ad-accent ad-num text-[12px]">
                  {totalUnits}
                </span>
                <span>View cart</span>
              </span>
              <span className="ad-num text-[17px]">₹{totals.grandTotal.toFixed(2)}</span>
            </button>
          </div>
        )}

        {/* ── Mobile: Full Checkout Bottom Sheet ── */}
        <Sheet open={mobileBillOpen} onOpenChange={setMobileBillOpen}>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="p-0 h-[min(94dvh,780px)] bg-ad-surface overflow-hidden"
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
    </AdminLayout>
  );
}
