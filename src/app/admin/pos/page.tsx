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
import { pos } from '@/theme/posColors';
import type { Category, MenuItem, Order } from '@/types';
import toast from 'react-hot-toast';

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

const VEG_FILTERS = [
  { value: 'all', label: 'All', color: pos.textMuted },
  { value: 'veg', label: '🟢 Veg', color: pos.veg },
  { value: 'non-veg', label: '🔴 Non-veg', color: pos.nonVeg },
] as const;

type VegFilter = (typeof VEG_FILTERS)[number]['value'];

/**
 * Counter billing — Clean Light Theme POS.
 * Responsive for phone, tablet, and desktop.
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

  const [sheetOpen, setSheetOpen] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [placedInvoiceNo, setPlacedInvoiceNo] = useState('');

  const searchRef = useRef<HTMLInputElement>(null);

  const activeTables = useMemo(() => tables.filter((t) => t.isActive), [tables]);
  const totals = useMemo(
    () => computeBillTotals(cart.subtotal, 0),
    [cart.subtotal]
  );

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { all: 0 };
    menuItems.forEach((item) => {
      if (!item.isAvailable) return;
      map.all = (map.all || 0) + 1;
      map[item.category] = (map[item.category] || 0) + 1;
    });
    return map;
  }, [menuItems]);

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
      discount: 0,
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
      if (typeof window !== 'undefined') {
        const w = window as unknown as { __ppr_seen_pos_orders?: Set<string> };
        w.__ppr_seen_pos_orders = w.__ppr_seen_pos_orders || new Set();
        w.__ppr_seen_pos_orders.add(orderId);
      }
      await addOrderLocallyAndDB(order);
      triggerNewOrderPush(orderId);
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
    totals.subtotal, totals.cgst, totals.sgst, totals.grandTotal,
    paymentMode, addOrderLocallyAndDB, resetBill,
  ]);

  // ── Keyboard shortcuts ───────────────────────────────────────
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
      {/* Light Theme container */}
      <Box
        sx={{
          display: 'flex',
          gap: 1.25,
          height: {
            xs: 'calc(100dvh - var(--admin-header-h) - (var(--admin-main-pad) * 2) - env(safe-area-inset-bottom, 0px))',
            md: 'var(--admin-content-h)',
          },
          minHeight: { xs: 'auto', md: 420 },
          overflow: 'hidden',
          bgcolor: pos.bg,
        }}
      >
        {/* ── Dishes Grid Side ───────────────────────────────────── */}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* Top Filter & Search Card */}
          <Paper
            elevation={0}
            sx={{
              flexShrink: 0, p: 1, borderRadius: '12px',
              bgcolor: pos.surface, border: `1px solid ${pos.border}`,
              boxShadow: pos.shadowSm,
            }}
          >
            {/* Search row */}
            <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mb: 0.75 }}>
              <TextField
                inputRef={searchRef}
                fullWidth
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchEnter}
                placeholder={isPhone ? 'Search dishes…' : 'Search dishes…  ( / to focus, Enter to add )'}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: pos.bg, color: pos.text, borderRadius: '10px',
                    '& fieldset': { borderColor: pos.border },
                    '&:hover fieldset': { borderColor: pos.textMuted },
                    '&.Mui-focused fieldset': { borderColor: pos.brand },
                  },
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ fontSize: 18, color: pos.textMuted }} />
                      </InputAdornment>
                    ),
                    endAdornment: search ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearch('')} aria-label="Clear search">
                          <Clear sx={{ fontSize: 16, color: pos.textMuted }} />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  },
                }}
              />

              {/* Veg filter pills */}
              <Box sx={{ display: 'flex', gap: 0.4, flexShrink: 0 }}>
                {VEG_FILTERS.map((v) => (
                  <Chip
                    key={v.value}
                    label={isPhone ? (v.value === 'all' ? 'All' : v.value === 'veg' ? '🟢' : '🔴') : v.label}
                    onClick={() => setVegFilter(v.value)}
                    sx={{
                      fontWeight: 800, fontSize: 11, cursor: 'pointer',
                      height: { xs: 32, sm: 34 },
                      bgcolor: vegFilter === v.value
                        ? (v.value === 'veg' ? pos.veg : v.value === 'non-veg' ? pos.nonVeg : pos.brand)
                        : pos.bg,
                      color: vegFilter === v.value ? '#FFFFFF' : pos.textMuted,
                      border: `1px solid ${vegFilter === v.value ? 'transparent' : pos.border}`,
                      '&:hover': { opacity: 0.9 },
                    }}
                  />
                ))}
              </Box>
            </Box>

            {/* Horizontal Category Strip */}
            <Box
              sx={{
                display: 'flex', gap: 0.5,
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
              }}
            >
              {CATEGORIES.map((c) => {
                const count = categoryCounts[c.value] || 0;
                const active = category === c.value;
                return (
                  <Chip
                    key={c.value}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                        <span>{c.icon}</span>
                        <span>{c.label}</span>
                        <Box
                          component="span"
                          sx={{
                            fontSize: 9.5, fontWeight: 900,
                            bgcolor: active ? 'rgba(255,255,255,0.25)' : pos.borderSubtle,
                            color: active ? '#FFFFFF' : pos.textMuted,
                            borderRadius: '6px', px: 0.5, py: 0.05, ml: 0.2,
                          }}
                        >
                          {count}
                        </Box>
                      </Box>
                    }
                    onClick={() => setCategory(c.value)}
                    sx={{
                      flexShrink: 0, cursor: 'pointer',
                      height: { xs: 30, sm: 32 },
                      fontWeight: active ? 800 : 600,
                      fontSize: { xs: 11, sm: 12 },
                      bgcolor: active ? pos.brand : pos.bg,
                      color: active ? '#FFFFFF' : pos.textSecondary,
                      border: `1px solid ${active ? pos.brand : pos.border}`,
                      '&:hover': { bgcolor: active ? pos.brandDark : pos.surfaceHover },
                    }}
                  />
                );
              })}
            </Box>
          </Paper>

          {/* Scrolling Grid Region */}
          <Box
            sx={{
              flex: 1, minHeight: 0,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              pr: 0.25,
              scrollbarWidth: 'thin',
              scrollbarColor: `${pos.border} transparent`,
              '&::-webkit-scrollbar': { width: 5 },
              '&::-webkit-scrollbar-thumb': { background: pos.border, borderRadius: 4 },
            }}
          >
            {menuLoading ? (
              <Box sx={{ textAlign: 'center', py: 8, color: pos.textMuted }}>Loading menu…</Box>
            ) : dishes.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8, color: pos.textFaint }}>
                <Fastfood sx={{ fontSize: 44, opacity: 0.35, mb: 1, color: pos.textMuted }} />
                <Typography sx={{ fontWeight: 700, color: pos.textMuted }}>No dishes match</Typography>
                <Typography sx={{ fontSize: 12.5, color: pos.textFaint }}>
                  Try another category or clear search
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(2, minmax(0, 1fr))',
                    sm: 'repeat(auto-fill, minmax(135px, 1fr))',
                    md: 'repeat(auto-fill, minmax(145px, 1fr))',
                    lg: 'repeat(auto-fill, minmax(155px, 1fr))',
                  },
                  gap: { xs: 1, sm: 1.25 },
                  alignItems: 'stretch',
                  pb: 1,
                }}
              >
                {dishes.map((item) => (
                  <DishCard
                    key={item.id}
                    item={item}
                    inBill={cart.quantityByMenuItem[item.id] || 0}
                    onAdd={handleAdd}
                    onDecrement={handleDecrement}
                  />
                ))}
              </Box>
            )}
          </Box>

          {/* ── Mobile: Clean Floating Action Bar ───────────────────── */}
          {isPhone && (
            <Box
              sx={{
                flexShrink: 0,
                pt: 0.5,
                pb: 'calc(6px + env(safe-area-inset-bottom, 0px))',
              }}
            >
              <Button
                fullWidth
                variant="contained"
                onClick={() => setSheetOpen(true)}
                startIcon={<ReceiptLong />}
                sx={{
                  minHeight: 46, borderRadius: '14px', textTransform: 'none',
                  fontSize: 14, fontWeight: 900,
                  display: 'flex', justifyContent: 'space-between', px: 2,
                  bgcolor: cart.totalUnits > 0 ? pos.brand : '#57534E',
                  color: '#FFFFFF',
                  boxShadow: cart.totalUnits > 0 ? '0 4px 14px rgba(198,40,40,0.35)' : 'none',
                  '&:hover': { bgcolor: cart.totalUnits > 0 ? pos.brandDark : '#44403C' },
                }}
              >
                <Box component="span" sx={{ flex: 1, textAlign: 'left', ml: 0.5 }}>
                  {cart.totalUnits > 0
                    ? `View Cart (${cart.totalUnits})`
                    : 'Cart Empty'}
                </Box>
                <Box component="span" sx={{ fontSize: 15, fontWeight: 900 }}>{rupees(totals.grandTotal)}</Box>
              </Button>
            </Box>
          )}
        </Box>

        {/* ── Bill pane: tablet & desktop ─────────────────────────── */}
        {!isPhone && (
          <Paper
            elevation={0}
            sx={{
              width: isDesktop ? 396 : 320,
              flexShrink: 0,
              height: '100%',
              borderRadius: '12px',
              border: `1px solid ${pos.border}`,
              overflow: 'hidden',
              boxShadow: pos.shadowMd,
            }}
          >
            {billPanel()}
          </Paper>
        )}
      </Box>

      {/* ── Bill Sheet: Phone ────────────────────────────────────── */}
      {isPhone && (
        <Drawer
          anchor="bottom"
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          slotProps={{
            paper: {
              sx: {
                height: '90dvh',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                overflow: 'hidden',
                bgcolor: pos.surface,
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
          resetBill();
          setTimeout(() => {
            if (!isPhone && searchRef.current) {
              searchRef.current.focus();
            }
          }, 50);
        }}
      />
    </AdminLayout>
  );
}
