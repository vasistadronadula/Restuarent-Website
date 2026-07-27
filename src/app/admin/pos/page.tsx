'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Button, Chip, Drawer, IconButton, InputAdornment, Paper,
  TextField, Typography, useMediaQuery, useTheme,
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
 * Three layouts from one set of components, because the same person uses
 * all three: a phone in hand at a busy counter, a tablet on the till, a
 * desktop in the back office.
 *
 *   phone   — dishes fill the screen, the bill is a sheet behind a
 *             persistent total bar (no room to show both at once)
 *   tablet  — dishes + a 340px bill pane
 *   desktop — same, wider pane, plus keyboard shortcuts
 *
 * The bill is never more than one tap away and the pay button is always on
 * screen. Everything money-related routes through lib/billing.ts, and every
 * change to the bill goes through the reducer in usePosCart, so what the
 * cashier sees, what gets saved, and what prints cannot disagree.
 */
export default function CounterBillingPage() {
  const { addOrderLocallyAndDB } = useAdmin();
  const { data: menuItems = [], isLoading: menuLoading } = useGetMenuItemsQuery();
  const { data: tables = [] } = useGetTablesQuery();

  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down('md'));   // < 900px
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));   // ≥ 1200px

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

  // ── Keyboard: the fastest input device on a counter that has one ───────
  // "/" jumps to search, Enter rings up the top match, Esc clears it.
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
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPhone]);

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

  const resetBill = useCallback(() => {
    cart.clear();
    setDiscountPercent(0);
    setCustomerName('');
    setCustomerPhone('');
    setTableNumber('');
    setPaymentMode('cash');
    setOrderType('counter');
  }, [cart]);

  const handlePlaceOrder = async () => {
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
      customerAddress: orderType === 'dine-in' ? `Dine-in · Table ${tableNumber}` : 'Counter sale',
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
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          height: { xs: 'auto', md: 'calc(100vh - 108px)' },
          overflow: { xs: 'visible', md: 'hidden' },
        }}
      >
        {/* ── Dishes ───────────────────────────────────────────────────── */}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <Paper
            elevation={0}
            sx={{
              p: 1.25, borderRadius: '14px', bgcolor: '#FFFFFF',
              border: `1px solid ${adminColors.border}`,
              position: { xs: 'sticky', md: 'static' }, top: 0, zIndex: 3,
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
                      fontWeight: 800, fontSize: 11.5, cursor: 'pointer', height: 32,
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
                '&::-webkit-scrollbar': { height: 4 },
                '&::-webkit-scrollbar-thumb': { background: adminColors.border, borderRadius: 4 },
              }}
            >
              {CATEGORIES.map((c) => (
                <Chip
                  key={c.value}
                  label={c.label}
                  size="small"
                  onClick={() => setCategory(c.value)}
                  sx={{
                    flexShrink: 0, cursor: 'pointer', height: 28,
                    fontWeight: category === c.value ? 800 : 600, fontSize: 12,
                    bgcolor: category === c.value ? adminColors.brand : adminColors.bgSubtle,
                    color: category === c.value ? '#FFFFFF' : adminColors.textSecondary,
                    border: `1px solid ${category === c.value ? adminColors.brand : adminColors.border}`,
                  }}
                />
              ))}
            </Box>
          </Paper>

          <Box
            sx={{
              flex: 1, minHeight: 0,
              overflowY: { xs: 'visible', md: 'auto' },
              pr: { md: 0.5 },
              // Clearance for the phone's total bar and the admin bottom nav.
              pb: { xs: '150px', md: 0 },
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
                  gridTemplateColumns: {
                    xs: 'repeat(2, minmax(0, 1fr))',
                    sm: 'repeat(3, minmax(0, 1fr))',
                    md: 'repeat(auto-fill, minmax(150px, 1fr))',
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
                  />
                ))}
              </Box>
            )}
          </Box>
        </Box>

        {/* ── Bill pane: tablet and desktop ─────────────────────────────── */}
        {!isPhone && (
          <Paper
            elevation={0}
            sx={{
              width: isDesktop ? 396 : 340,
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

      {/* ── Bill: phone ─────────────────────────────────────────────────── */}
      {isPhone && (
        <>
          <Box
            sx={{
              position: 'fixed', left: 12, right: 12,
              bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
              zIndex: 1240,
            }}
          >
            <Button
              fullWidth
              variant="contained"
              onClick={() => setSheetOpen(true)}
              startIcon={<ReceiptLong />}
              sx={{
                minHeight: 52, borderRadius: '14px', textTransform: 'none',
                fontSize: 15, fontWeight: 900,
                display: 'flex', justifyContent: 'space-between', px: 2.25,
                background: cart.totalUnits > 0
                  ? `linear-gradient(135deg, ${adminColors.brand}, ${adminColors.accent})`
                  : `linear-gradient(135deg, #57534E, #44403C)`,
                boxShadow: '0 10px 26px rgba(0,0,0,0.28)',
              }}
            >
              <Box component="span" sx={{ flex: 1, textAlign: 'left', ml: 1 }}>
                {cart.totalUnits > 0 ? `View bill · ${cart.totalUnits} item${cart.totalUnits === 1 ? '' : 's'}` : 'Bill empty'}
              </Box>
              <Box component="span">{rupees(totals.grandTotal)}</Box>
            </Button>
          </Box>

          <Drawer
            anchor="bottom"
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            // dvh, not vh: mobile browsers measure vh against the viewport
            // *without* the address bar, which pushes a tall sheet's footer —
            // and the pay button with it — below the visible area.
            slotProps={{
              paper: {
                sx: {
                  height: '88vh',
                  maxHeight: '88dvh',
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  overflow: 'hidden',
                },
              },
            }}
          >
            {billPanel(() => setSheetOpen(false))}
          </Drawer>
        </>
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
