'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Button, Chip, Drawer, IconButton, InputAdornment, Paper,
  TextField, Typography, useMediaQuery,
} from '@mui/material';
import { Clear, Fastfood, ReceiptLong, Search } from '@mui/icons-material';
import AdminLayout from '@/components/admin/AdminLayout';
import DishCard from '@/components/pos/DishCard';
import BillPanel, { type PosOrderType, type PosPaymentMode } from '@/components/pos/BillPanel';
import OrderPlacedDialog from '@/components/pos/OrderPlacedDialog';
import { useAdmin } from '@/context/AdminContext';
import { useGetMenuItemsQuery, useGetTablesQuery } from '@/store/supabaseApi';
import { usePosCart, type Portion } from '@/hooks/usePosCart';
import { computeBillTotals, rupees } from '@/lib/billing';
import { generateInvoiceNo, generateOrderId } from '@/lib/idGenerator';
import { triggerNewOrderPush } from '@/lib/triggerPush';
import { adminColors } from '@/theme/adminColors';
import type { Category, MenuItem, Order } from '@/types';
import toast from 'react-hot-toast';

const CATEGORIES: { label: string; value: Category | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Combos', value: 'combos' },
  { label: 'Starters', value: 'starters' },
  { label: 'Tandoori', value: 'tandoori' },
  { label: 'Biryani', value: 'biryani' },
  { label: 'South Indian', value: 'south-indian' },
  { label: 'North Indian', value: 'north-indian' },
  { label: 'Chinese', value: 'chinese' },
  { label: 'Rice', value: 'rice' },
  { label: 'Breads', value: 'breads' },
  { label: 'Desserts', value: 'desserts' },
  { label: 'Beverages', value: 'beverages' },
];

const VEG_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'veg', label: '🟢 Veg' },
  { value: 'non-veg', label: '🔴 Non-veg' },
] as const;

type VegFilter = (typeof VEG_FILTERS)[number]['value'];

/**
 * Counter billing.
 *
 * Three layouts from one set of components, because the same person uses all
 * three: a phone in hand at a busy counter, a tablet on the till, a laptop in
 * the back office.
 *
 *   phone   (< 768px)      dishes fill the screen, the bill is a sheet behind
 *                          a persistent total bar — no room to show both
 *   tablet  (768–1199px)   dishes + a 320px bill pane, always visible
 *   laptop  (≥ 1200px)     same, wider pane, plus keyboard shortcuts
 *
 * The breakpoints are explicit pixel queries rather than the MUI theme's,
 * because the theme's `md` is 900px — which put every 768–899px tablet
 * (iPad portrait, most Android tablets) into the *phone* layout and hid the
 * bill behind a sheet on a screen with room to show it.
 *
 * Layout rule: the page is exactly one viewport tall (--admin-content-h) and
 * every region inside it is a flex child. Nothing is absolutely positioned
 * against a hand-measured offset, so the pay button and the running total
 * cannot end up under the bottom nav or below the fold on any device.
 */
export default function CounterBillingPage() {
  const { addOrderLocallyAndDB } = useAdmin();
  const { data: menuItems = [], isLoading: menuLoading } = useGetMenuItemsQuery();
  const { data: tables = [] } = useGetTablesQuery();

  const isPhone = useMediaQuery('(max-width:767.95px)');
  const isDesktop = useMediaQuery('(min-width:1200px)');

  const cart = usePosCart();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [vegFilter, setVegFilter] = useState<VegFilter>('all');

  const [orderType, setOrderType] = useState<PosOrderType>('counter');
  const [tableNumber, setTableNumber] = useState<number | ''>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState<PosPaymentMode>('cash');
  const [discountPercent, setDiscountPercent] = useState(0);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [placedInvoiceNo, setPlacedInvoiceNo] = useState('');

  const searchRef = useRef<HTMLInputElement>(null);

  const activeTables = useMemo(() => tables.filter((t) => t.isActive), [tables]);
  const totals = useMemo(
    () => computeBillTotals(cart.subtotal, discountPercent),
    [cart.subtotal, discountPercent]
  );

  const dishes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menuItems.filter((item) => {
      if (!item.isAvailable) return false;
      if (category !== 'all' && item.category !== category) return false;
      if (vegFilter !== 'all' && item.vegStatus !== vegFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [menuItems, search, category, vegFilter]);

  const handleAdd = useCallback(
    (item: MenuItem, portion?: Portion) => {
      const result = cart.add(item, portion);
      if (!result.ok && result.reason) toast.error(result.reason);
    },
    [cart]
  );

  const handleDecrement = useCallback(
    (item: MenuItem) => {
      cart.decrement(item.id);
    },
    [cart]
  );

  const resetBill = useCallback(() => {
    cart.clear();
    setDiscountPercent(0);
    setCustomerName('');
    setCustomerPhone('');
    setTableNumber('');
    setPaymentMode('cash');
    setOrderType('counter');
  }, [cart]);

  const handlePlaceOrder = useCallback(async () => {
    if (isPlacing) return;
    if (cart.lines.length === 0) {
      toast.error('Add at least one item to the bill.');
      return;
    }
    if (orderType === 'dine-in' && !tableNumber) {
      toast.error('Pick the table for this dine-in order.');
      setSheetOpen(true);
      return;
    }

    setIsPlacing(true);
    const orderId = generateOrderId();
    const invoiceNo = generateInvoiceNo(orderId);
    const now = new Date();

    const order: Order = {
      id: orderId,
      orderId,
      customerId: customerPhone.trim() || 'WALK-IN',
      customerName: customerName.trim() || 'Walk-in Customer',
      customerPhone: customerPhone.trim(),
      customerAddress: orderType === 'dine-in' ? `Dine-in · Table ${tableNumber}` : orderType === 'takeaway' ? 'Takeaway (Parcel)' : 'Counter sale',
      orderType,
      items: cart.lines.map((l) => ({
        id: l.key,
        menuItemId: l.menuItemId,
        name: l.name,
        price: l.unitPrice,
        quantity: l.quantity,
        vegStatus: l.vegStatus,
        selectedPortion: l.portion,
      })),
      subtotal: totals.subtotal,
      cgst: totals.cgst,
      sgst: totals.sgst,
      discount: totals.discountAmount,
      deliveryCharge: 0,
      grandTotal: totals.grandTotal,
      status: 'pending',
      paymentMode,
      paymentStatus: 'paid',
      orderDate: now.toISOString().split('T')[0],
      orderTime: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      tableNumber: orderType === 'dine-in' ? Number(tableNumber) : undefined,
    };

    try {
      await addOrderLocallyAndDB(order);
      triggerNewOrderPush(orderId);

      // Bill first, housekeeping second: the cashier sees the receipt (and
      // the printer fires) before the screen resets for the next customer.
      setPlacedOrder(order);
      setPlacedInvoiceNo(invoiceNo);
      setSheetOpen(false);
      resetBill();
    } catch (err) {
      toast.error((err as Error).message || 'Could not save the order — nothing was billed.');
    } finally {
      setIsPlacing(false);
    }
  }, [
    isPlacing, cart.lines, orderType, tableNumber, customerPhone, customerName,
    totals.subtotal, totals.cgst, totals.sgst, totals.discountAmount, totals.grandTotal,
    paymentMode, addOrderLocallyAndDB, resetBill,
  ]);

  // ── Keyboard: the fastest input device on a counter that has one ───────
  // "/" jumps to search, Enter rings up top match, Esc clears it, F2 places order.
  useEffect(() => {
    if (isPhone) return;
    const onKey = (e: KeyboardEvent) => {
      const typingElsewhere =
        e.target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);

      if (e.key === '/' && !typingElsewhere) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        setSearch('');
        searchRef.current?.blur();
      }
      if (e.key === 'F2') {
        e.preventDefault();
        void handlePlaceOrder();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPhone, handlePlaceOrder]);

  const handleSearchEnter = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const [first] = dishes;
    if (!first) return;
    // A dish with portions needs a deliberate choice — ringing up the wrong
    // size is worse than one extra tap.
    if (first.portionPrices) {
      toast(`${first.name} — pick a portion`, { icon: '👆' });
      return;
    }
    handleAdd(first);
    setSearch('');
  };

  const billPanel = (onClose?: () => void) => (
    <BillPanel
      lines={cart.lines}
      totals={totals}
      totalUnits={cart.totalUnits}
      orderType={orderType}
      onOrderType={setOrderType}
      tables={activeTables}
      tableNumber={tableNumber}
      onTableNumber={setTableNumber}
      customerName={customerName}
      onCustomerName={setCustomerName}
      customerPhone={customerPhone}
      onCustomerPhone={setCustomerPhone}
      paymentMode={paymentMode}
      onPaymentMode={setPaymentMode}
      discountPercent={discountPercent}
      onDiscountPercent={setDiscountPercent}
      onIncrement={cart.increment}
      onDecrement={cart.decrement}
      onSetQuantity={cart.setQuantity}
      onRemove={cart.remove}
      onClear={cart.clear}
      onPlace={handlePlaceOrder}
      isPlacing={isPlacing}
      onClose={onClose}
    />
  );

  return (
    <AdminLayout title="Counter Billing">
      {/* Exactly one viewport tall. Everything below is a flex child of this
          box, which is what keeps the running total and the pay button on
          screen without a single fixed-position offset. */}
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          height: 'var(--admin-content-h)',
          minHeight: 420,
          overflow: 'hidden',
        }}
      >
        {/* ── Dishes ───────────────────────────────────────────────────── */}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <Paper
            elevation={0}
            sx={{
              flexShrink: 0,
              p: 1.25, borderRadius: '14px', bgcolor: '#FFFFFF',
              border: `1px solid ${adminColors.border}`,
            }}
          >
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                inputRef={searchRef}
                fullWidth
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchEnter}
                placeholder={isPhone ? 'Search dishes…' : 'Search dishes…  ( / to focus, Enter to add )'}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ fontSize: 20, color: adminColors.textFaint }} />
                      </InputAdornment>
                    ),
                    endAdornment: search ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearch('')} aria-label="Clear search">
                          <Clear fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  },
                }}
              />
              <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                {VEG_FILTERS.map((v) => (
                  <Chip
                    key={v.value}
                    label={v.label}
                    onClick={() => setVegFilter(v.value)}
                    sx={{
                      fontWeight: 800, fontSize: 11.5, cursor: 'pointer', height: 34,
                      bgcolor: vegFilter === v.value
                        ? v.value === 'veg' ? adminColors.success
                          : v.value === 'non-veg' ? adminColors.brand
                            : adminColors.textPrimary
                        : adminColors.neutralBg,
                      color: vegFilter === v.value ? '#FFFFFF' : adminColors.textMuted,
                      '&:hover': { opacity: 0.9 },
                    }}
                  />
                ))}
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex', gap: 0.75, mt: 1, pb: 0.5,
                overflowX: 'auto',
                // A category strip is dragged with a thumb far more often
                // than it is clicked with a scrollbar.
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'thin',
                '&::-webkit-scrollbar': { height: 4 },
                '&::-webkit-scrollbar-thumb': { background: adminColors.border, borderRadius: 4 },
              }}
            >
              {CATEGORIES.map((c) => (
                <Chip
                  key={c.value}
                  label={c.label}
                  onClick={() => setCategory(c.value)}
                  sx={{
                    flexShrink: 0, cursor: 'pointer', height: 32,
                    fontWeight: category === c.value ? 800 : 600, fontSize: 12.5,
                    bgcolor: category === c.value ? adminColors.brand : adminColors.bgSubtle,
                    color: category === c.value ? '#FFFFFF' : adminColors.textSecondary,
                    border: `1px solid ${category === c.value ? adminColors.brand : adminColors.border}`,
                  }}
                />
              ))}
            </Box>
          </Paper>

          {/* The only scrolling region on the dish side. */}
          <Box
            sx={{
              flex: 1, minHeight: 0,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              pr: 0.5,
              pb: 0.5,
            }}
          >
            {menuLoading ? (
              <Box sx={{ textAlign: 'center', py: 8, color: adminColors.textMuted }}>Loading menu…</Box>
            ) : dishes.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8, color: adminColors.textFaint }}>
                <Fastfood sx={{ fontSize: 44, opacity: 0.35, mb: 1 }} />
                <Typography sx={{ fontWeight: 700, color: adminColors.textMuted }}>No dishes match</Typography>
                <Typography sx={{ fontSize: 12.5 }}>Try another category or clear the search</Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  // Tile width is what decides how fast a dish can be hit.
                  // Phones get two columns so the target stays thumb-sized;
                  // everything above fills the row with ~150-170px tiles.
                  gridTemplateColumns: {
                    xs: 'repeat(2, minmax(0, 1fr))',
                    sm: 'repeat(auto-fill, minmax(150px, 1fr))',
                    lg: 'repeat(auto-fill, minmax(165px, 1fr))',
                  },
                  gap: 1.25,
                  alignItems: 'stretch',
                }}
              >
                {dishes.map((item) => (
                  <DishCard
                    key={item.id}
                    item={item}
                    inBill={cart.quantityByMenuItem[item.id] || 0}
                    dense={isPhone}
                    onAdd={handleAdd}
                    onDecrement={handleDecrement}
                  />
                ))}
              </Box>
            )}
          </Box>

          {/* ── Phone: running total, opens the bill sheet ──────────────
              A flex child, not a fixed bar: it sits directly above the
              bottom nav by construction on every phone, notch or not. */}
          {isPhone && (
            <Button
              fullWidth
              variant="contained"
              onClick={() => setSheetOpen(true)}
              startIcon={<ReceiptLong />}
              sx={{
                flexShrink: 0,
                minHeight: 54, borderRadius: '14px', textTransform: 'none',
                fontSize: 15, fontWeight: 900,
                display: 'flex', justifyContent: 'space-between', px: 2.25,
                background: cart.totalUnits > 0
                  ? `linear-gradient(135deg, ${adminColors.brand}, ${adminColors.accent})`
                  : `linear-gradient(135deg, #57534E, #44403C)`,
                boxShadow: '0 8px 22px rgba(0,0,0,0.22)',
              }}
            >
              <Box component="span" sx={{ flex: 1, textAlign: 'left', ml: 1 }}>
                {cart.totalUnits > 0
                  ? `View bill · ${cart.totalUnits} item${cart.totalUnits === 1 ? '' : 's'}`
                  : 'Bill empty'}
              </Box>
              <Box component="span">{rupees(totals.grandTotal)}</Box>
            </Button>
          )}
        </Box>

        {/* ── Bill pane: tablet and laptop ──────────────────────────────── */}
        {!isPhone && (
          <Paper
            elevation={0}
            sx={{
              width: isDesktop ? 396 : 320,
              flexShrink: 0,
              height: '100%',
              borderRadius: '16px',
              border: `1px solid ${adminColors.border}`,
              overflow: 'hidden',
              boxShadow: adminColors.shadowMd,
            }}
          >
            {billPanel()}
          </Paper>
        )}
      </Box>

      {/* ── Bill sheet: phone ───────────────────────────────────────────── */}
      {isPhone && (
        <Drawer
          anchor="bottom"
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          slotProps={{
            paper: {
              sx: {
                // dvh for the same reason as --admin-content-h: vh would put
                // the sheet's footer, and the pay button in it, under the
                // browser's address bar.
                height: '92dvh',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                overflow: 'hidden',
              },
            },
          }}
        >
          {billPanel(() => setSheetOpen(false))}
        </Drawer>
      )}

      <OrderPlacedDialog
        order={placedOrder}
        invoiceNo={placedInvoiceNo}
        open={!!placedOrder}
        onNewOrder={() => {
          setPlacedOrder(null);
          setPlacedInvoiceNo('');
          if (!isPhone) searchRef.current?.focus();
        }}
      />
    </AdminLayout>
  );
}
