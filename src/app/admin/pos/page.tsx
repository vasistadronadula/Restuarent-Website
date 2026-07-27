'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Button, Chip, Drawer, IconButton, InputAdornment, Paper,
  TextField, Typography, useMediaQuery,
} from '@mui/material';
import { Clear, Fastfood, Search, ShoppingCart } from '@mui/icons-material';
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
 * Counter billing — dark-themed POS.
 *
 * Three layouts:
 *   phone   (< 768px)      3-column dish grid, floating cart bar, bottom sheet
 *   tablet  (768–1199px)    dish grid + 320px bill pane
 *   laptop  (≥ 1200px)     dish grid + 396px bill pane, keyboard shortcuts
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
      {/* Dark POS container — overrides admin cream background */}
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          height: 'var(--admin-content-h)',
          minHeight: 420,
          overflow: 'hidden',
          bgcolor: pos.bg,
          mx: { xs: -1.75, sm: -2.5 },
          mt: { xs: -1.75, sm: -2.5 },
          mb: { xs: -1.75, sm: -2.5 },
          px: { xs: 1, sm: 1.5 },
          pt: { xs: 1, sm: 1.25 },
          pb: { xs: 0.5, sm: 1.25 },
          borderRadius: 0,
        }}
      >
        {/* ── Dishes Panel ──────────────────────────────────────── */}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {/* Search + filters bar */}
          <Paper
            elevation={0}
            sx={{
              flexShrink: 0, p: 1, borderRadius: '12px',
              bgcolor: pos.surface, border: `1px solid ${pos.border}`,
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
                placeholder={isPhone ? 'Search…' : 'Search dishes…  ( / to focus )'}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: pos.bg, color: pos.text, borderRadius: '10px',
                    '& fieldset': { borderColor: pos.border },
                    '&:hover fieldset': { borderColor: pos.surfaceHover },
                    '&.Mui-focused fieldset': { borderColor: pos.borderFocus },
                  },
                  '& .MuiOutlinedInput-input::placeholder': { color: pos.textFaint, opacity: 1 },
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ fontSize: 18, color: pos.textFaint }} />
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
                      height: { xs: 30, sm: 32 },
                      bgcolor: vegFilter === v.value ? v.color : pos.bg,
                      color: vegFilter === v.value ? '#FFFFFF' : pos.textMuted,
                      border: `1px solid ${vegFilter === v.value ? v.color : pos.border}`,
                      '& .MuiChip-label': { px: { xs: 0.5, sm: 1 } },
                      '&:hover': { opacity: 0.9 },
                    }}
                  />
                ))}
              </Box>
            </Box>

            {/* Category strip */}
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
                            bgcolor: active ? 'rgba(255,255,255,0.25)' : pos.surfaceHover,
                            color: active ? '#FFFFFF' : pos.textFaint,
                            borderRadius: '6px', px: 0.5, py: 0.05,
                            ml: 0.2,
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
                      bgcolor: active ? pos.categoryActive : pos.bg,
                      color: active ? '#FFFFFF' : pos.textMuted,
                      border: `1px solid ${active ? pos.categoryActive : pos.border}`,
                      '& .MuiChip-label': { px: 0.75 },
                      '&:hover': {
                        bgcolor: active ? pos.categoryActive : pos.surfaceHover,
                      },
                    }}
                  />
                );
              })}
            </Box>
          </Paper>

          {/* Dish grid — the only scrolling region */}
          <Box
            sx={{
              flex: 1, minHeight: 0,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              pr: 0.25,
              /* Custom scrollbar for dark theme */
              scrollbarWidth: 'thin',
              scrollbarColor: `${pos.surfaceHover} transparent`,
              '&::-webkit-scrollbar': { width: 5 },
              '&::-webkit-scrollbar-track': { background: 'transparent' },
              '&::-webkit-scrollbar-thumb': {
                background: pos.surfaceHover, borderRadius: 4,
              },
            }}
          >
            {menuLoading ? (
              <Box sx={{ textAlign: 'center', py: 8, color: pos.textMuted }}>Loading menu…</Box>
            ) : dishes.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8, color: pos.textFaint }}>
                <Fastfood sx={{ fontSize: 44, opacity: 0.35, mb: 1 }} />
                <Typography sx={{ fontWeight: 700, color: pos.textMuted }}>No dishes match</Typography>
                <Typography sx={{ fontSize: 12.5, color: pos.textFaint }}>
                  Try another category or clear the search
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(3, minmax(0, 1fr))',
                    sm: 'repeat(auto-fill, minmax(130px, 1fr))',
                    md: 'repeat(auto-fill, minmax(140px, 1fr))',
                    lg: 'repeat(auto-fill, minmax(150px, 1fr))',
                  },
                  gap: { xs: 0.75, sm: 1 },
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

          {/* ── Phone: floating cart bar ──────────────────────────── */}
          {isPhone && (
            <Box
              sx={{
                flexShrink: 0,
                pt: 0.5,
                pb: 'calc(4px + env(safe-area-inset-bottom, 0px))',
              }}
            >
              <Button
                fullWidth
                variant="contained"
                onClick={() => setSheetOpen(true)}
                startIcon={<ShoppingCart />}
                sx={{
                  minHeight: 48, borderRadius: '12px', textTransform: 'none',
                  fontSize: 14, fontWeight: 900,
                  display: 'flex', justifyContent: 'space-between', px: 2,
                  bgcolor: cart.totalUnits > 0 ? pos.charge : pos.surfaceActive,
                  color: '#FFFFFF',
                  boxShadow: cart.totalUnits > 0
                    ? '0 6px 24px rgba(16,185,129,0.4)'
                    : 'none',
                  '&:hover': {
                    bgcolor: cart.totalUnits > 0 ? pos.chargeDark : pos.surfaceActive,
                  },
                }}
              >
                <Box component="span" sx={{ flex: 1, textAlign: 'left', ml: 0.5 }}>
                  {cart.totalUnits > 0
                    ? `View Cart · ${cart.totalUnits} item${cart.totalUnits === 1 ? '' : 's'}`
                    : 'Cart Empty'}
                </Box>
                <Box component="span" sx={{ fontSize: 15 }}>{rupees(totals.grandTotal)}</Box>
              </Button>
            </Box>
          )}
        </Box>

        {/* ── Bill pane: tablet and laptop ────────────────────────── */}
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

      {/* ── Bill sheet: phone ─────────────────────────────────────── */}
      {isPhone && (
        <Drawer
          anchor="bottom"
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          slotProps={{
            paper: {
              sx: {
                height: '92dvh',
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
          if (!isPhone) searchRef.current?.focus();
        }}
      />
    </AdminLayout>
  );
}
