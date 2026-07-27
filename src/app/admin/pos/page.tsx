'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Box, Paper, Typography, Button, TextField, Divider, Chip,
  IconButton, InputAdornment, Badge, Drawer, useMediaQuery, useTheme,
  Stack, FormControl, InputLabel, Select, MenuItem as MuiMenuItem,
} from '@mui/material';
import {
  Search, Add, Remove, Print, Fastfood, Clear, Receipt, Close, ShoppingCartCheckout,
} from '@mui/icons-material';
import AdminLayout from '@/components/admin/AdminLayout';
import ThermalReceiptModal from '@/components/admin/ThermalReceiptModal';
import { useAdmin } from '@/context/AdminContext';
import { useGetMenuItemsQuery, useGetTablesQuery } from '@/store/supabaseApi';
import { MenuItem, Category, VegStatus, Order, PortionPrices } from '@/types';
import { generateOrderId, generateInvoiceNo } from '@/lib/idGenerator';
import { triggerNewOrderPush } from '@/lib/triggerPush';
import toast from 'react-hot-toast';

type Portion = 'single' | 'full' | 'large';

/**
 * Order types the counter can ring up. Takeaway is deliberately absent: on
 * this POS it meant the same thing as a counter sale (pay now, carry out),
 * so the cashier was picking between two labels for one operation. Online
 * takeaway orders still exist — they come from the customer site, which is
 * takeaway-only, and arrive through the Orders screen.
 */
type POSOrderType = 'dine-in' | 'counter';

const ORDER_TYPES: { type: POSOrderType; label: string }[] = [
  { type: 'counter', label: '⚡ Counter sale' },
  { type: 'dine-in', label: '🍽️ Dine-in' },
];

interface POSCartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  vegStatus: VegStatus;
  selectedPortion?: Portion;
  image?: string;
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80';

// 'single' is a half plate in this menu; the bill has to say the same word
// the cashier tapped, so the label is defined once and used in both places.
const PORTION_LABEL: Record<Portion, string> = {
  single: 'Half',
  full: 'Full',
  large: 'Large',
};

const CATEGORIES: { label: string; value: Category | 'all' }[] = [
  { label: 'All Items', value: 'all' },
  { label: 'Combos', value: 'combos' },
  { label: 'Starters', value: 'starters' },
  { label: 'Tandoori', value: 'tandoori' },
  { label: 'Biryani & Pulao', value: 'biryani' },
  { label: 'South Indian', value: 'south-indian' },
  { label: 'North Indian', value: 'north-indian' },
  { label: 'Chinese', value: 'chinese' },
  { label: 'Rice', value: 'rice' },
  { label: 'Breads', value: 'breads' },
  { label: 'Desserts', value: 'desserts' },
  { label: 'Beverages', value: 'beverages' },
];

/**
 * The portions this dish is actually sold in, with real prices.
 *
 * The card used to hard-code a "Full" chip priced from `item.price` whenever
 * any portion data existed — so a dish sold only as Half/Large offered a
 * third portion that doesn't exist on the menu, and the plain Add button
 * quietly booked that phantom "full" too. Anything with no portion data is
 * a single-price dish and gets one button.
 */
function sellablePortions(item: MenuItem): { portion: Portion; price: number }[] {
  const prices = item.portionPrices as PortionPrices | undefined;
  if (!prices) return [];
  return (['single', 'full', 'large'] as Portion[])
    .filter((p) => typeof prices[p] === 'number' && (prices[p] as number) > 0)
    .map((p) => ({ portion: p, price: prices[p] as number }));
}

// ─── Menu card ───────────────────────────────────────────────────────────────

function MenuItemCard({
  item, inCart, compact, onAdd,
}: {
  item: MenuItem;
  inCart: number;
  compact: boolean;
  onAdd: (item: MenuItem, portion?: Portion) => void;
}) {
  const isVeg = item.vegStatus === 'veg';
  const portions = sellablePortions(item);

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '14px',
        border: inCart > 0 ? '1.5px solid #C62828' : '1px solid #E7E5E4',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'white',
        transition: 'border-color .15s, box-shadow .15s',
        '&:hover': { boxShadow: '0 6px 16px rgba(0,0,0,0.08)' },
      }}
    >
      <Box sx={{ position: 'relative', width: '100%', height: compact ? 84 : 116, bgcolor: '#F1EFED' }}>
        <Image
          src={item.image || FALLBACK_IMAGE}
          alt={item.name}
          fill
          sizes="(max-width: 900px) 45vw, 220px"
          style={{ objectFit: 'cover' }}
        />
        <Box
          sx={{
            position: 'absolute', top: 6, left: 6,
            width: 15, height: 15, borderRadius: '3px', bgcolor: 'white',
            border: `2px solid ${isVeg ? '#15803D' : '#C62828'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: isVeg ? '#15803D' : '#C62828' }} />
        </Box>
        {inCart > 0 && (
          <Chip
            label={`${inCart} in bill`}
            size="small"
            sx={{
              position: 'absolute', top: 6, right: 6, height: 20,
              fontSize: 10, fontWeight: 800, bgcolor: '#C62828', color: 'white',
            }}
          />
        )}
      </Box>

      <Box sx={{ p: 1.25, display: 'flex', flexDirection: 'column', gap: 0.75, flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0.75 }}>
          <Typography
            sx={{
              fontSize: compact ? 12.5 : 13.5, fontWeight: 800, color: '#1C1917', lineHeight: 1.25,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}
          >
            {item.name}
          </Typography>
          {portions.length === 0 && (
            <Typography sx={{ fontSize: compact ? 12.5 : 14, fontWeight: 900, color: '#C62828', whiteSpace: 'nowrap' }}>
              ₹{item.price}
            </Typography>
          )}
        </Box>

        <Box sx={{ mt: 'auto', display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {portions.length > 0 ? (
            portions.map(({ portion, price }) => (
              <Button
                key={portion}
                size="small"
                variant={portion === 'full' ? 'contained' : 'outlined'}
                onClick={() => onAdd(item, portion)}
                sx={{
                  flex: '1 1 auto', minWidth: 0, px: 0.75, py: 0.35,
                  borderRadius: '9px', textTransform: 'none', fontWeight: 800, fontSize: 11,
                  ...(portion === 'full'
                    ? { bgcolor: '#C62828', boxShadow: 'none', '&:hover': { bgcolor: '#9B1C1C' } }
                    : { color: '#C62828', borderColor: '#F1D5D5' }),
                }}
              >
                {PORTION_LABEL[portion]} ₹{price}
              </Button>
            ))
          ) : (
            <Button
              fullWidth size="small" variant="contained" startIcon={<Add sx={{ fontSize: 16 }} />}
              onClick={() => onAdd(item)}
              sx={{
                borderRadius: '9px', textTransform: 'none', fontWeight: 800, fontSize: 12,
                bgcolor: '#C62828', boxShadow: 'none', py: 0.4,
                '&:hover': { bgcolor: '#9B1C1C' },
              }}
            >
              Add
            </Button>
          )}
        </Box>
      </Box>
    </Paper>
  );
}

// ─── Bill panel (desktop side pane and mobile sheet share this) ──────────────

interface CartPanelProps {
  posCart: POSCartItem[];
  orderType: POSOrderType;
  setOrderType: (t: POSOrderType) => void;
  tables: { id: string; tableNumber: number; capacity: number; description?: string }[];
  selectedTableNumber: number | '';
  setSelectedTableNumber: (n: number | '') => void;
  customerName: string;
  setCustomerName: (v: string) => void;
  customerPhone: string;
  setCustomerPhone: (v: string) => void;
  paymentMode: 'cash' | 'upi' | 'card';
  setPaymentMode: (m: 'cash' | 'upi' | 'card') => void;
  discountPercent: number;
  setDiscountPercent: (d: number) => void;
  totals: { subtotal: number; discountAmount: number; cgst: number; sgst: number; grandTotal: number };
  onQty: (id: string, delta: number) => void;
  onClear: () => void;
  onPlace: () => void;
  isSubmitting: boolean;
  onCloseSheet?: () => void;
}

function CartPanel({
  posCart, orderType, setOrderType, tables, selectedTableNumber, setSelectedTableNumber,
  customerName, setCustomerName, customerPhone, setCustomerPhone,
  paymentMode, setPaymentMode, discountPercent, setDiscountPercent,
  totals, onQty, onClear, onPlace, isSubmitting, onCloseSheet,
}: CartPanelProps) {
  const { subtotal, discountAmount, cgst, sgst, grandTotal } = totals;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, bgcolor: 'white' }}>
      {/* Header */}
      <Box sx={{ p: 1.75, bgcolor: '#1C1917', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Receipt sx={{ color: '#EA580C', fontSize: 20 }} />
          <Typography sx={{ fontWeight: 800, fontSize: 15 }}>Current bill</Typography>
          {posCart.length > 0 && (
            <Chip
              label={posCart.reduce((n, i) => n + i.quantity, 0)}
              size="small"
              sx={{ height: 19, fontSize: 10.5, fontWeight: 800, bgcolor: '#EA580C', color: 'white' }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {posCart.length > 0 && (
            <Button size="small" onClick={onClear} sx={{ color: '#F87171', fontWeight: 700, textTransform: 'none', fontSize: 12 }}>
              Clear
            </Button>
          )}
          {onCloseSheet && (
            <IconButton size="small" onClick={onCloseSheet} sx={{ color: '#A8A29E' }} aria-label="Close bill">
              <Close fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      {/*
        One scroll region for everything above the footer. Order type and the
        customer fields used to be pinned like the header, so on a phone —
        especially with the keyboard open — they ate the height the footer
        needed and pushed "Place order" off the bottom of the sheet. Now only
        the header and the footer are fixed; everything else scrolls.
      */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' }}>
        <Box sx={{ p: 1.5, bgcolor: '#FAFAF9', borderBottom: '1px solid #E7E5E4' }}>
          <Box sx={{ display: 'flex', gap: 0.75, mb: 1.25 }}>
            {ORDER_TYPES.map((t) => (
              <Chip
                key={t.type}
                label={t.label}
                onClick={() => setOrderType(t.type)}
                sx={{
                  flex: 1, fontWeight: 800, cursor: 'pointer', fontSize: 11.5, height: 32,
                  bgcolor: orderType === t.type ? '#C62828' : 'white',
                  color: orderType === t.type ? 'white' : '#44403C',
                  border: '1px solid #E7E5E4',
                }}
              />
            ))}
          </Box>

          {orderType === 'dine-in' && (
            <FormControl fullWidth size="small" sx={{ mb: 1.25 }}>
              <InputLabel>Table *</InputLabel>
              <Select
                value={selectedTableNumber}
                label="Table *"
                onChange={(e) => setSelectedTableNumber(Number(e.target.value))}
              >
                {tables.length === 0 && <MuiMenuItem disabled value="">No tables set up yet</MuiMenuItem>}
                {tables.map((t) => (
                  <MuiMenuItem key={t.id} value={t.tableNumber}>
                    Table {t.tableNumber} ({t.capacity} seats){t.description ? ` – ${t.description}` : ''}
                  </MuiMenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth size="small" label="Customer"
              value={customerName} onChange={(e) => setCustomerName(e.target.value)}
            />
            <TextField
              fullWidth size="small" label="Phone" inputMode="numeric"
              value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </Box>
        </Box>

        {/* Items */}
        <Box sx={{ p: 1.5 }}>
        {posCart.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 5, color: '#A8A29E' }}>
            <Fastfood sx={{ fontSize: 44, opacity: 0.35, mb: 1 }} />
            <Typography variant="body2" sx={{ fontWeight: 700 }}>No items yet</Typography>
            <Typography variant="caption">Tap a dish to start the bill</Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            {posCart.map((item) => (
              <Box
                key={item.id}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  p: 1, borderRadius: '11px', bgcolor: '#FAFAF9', border: '1px solid #E7E5E4',
                }}
              >
                <Box sx={{ position: 'relative', width: 38, height: 38, borderRadius: '8px', overflow: 'hidden', flexShrink: 0, bgcolor: '#F1EFED' }}>
                  <Image
                    src={item.image || FALLBACK_IMAGE}
                    alt={item.name}
                    fill
                    sizes="38px"
                    style={{ objectFit: 'cover' }}
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: '#1C1917', lineHeight: 1.25 }} noWrap>
                    {item.name}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#78716C', fontWeight: 600 }}>
                    ₹{item.price} × {item.quantity} = <strong>₹{item.price * item.quantity}</strong>
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
                  <IconButton
                    size="small" onClick={() => onQty(item.id, -1)}
                    sx={{ bgcolor: 'white', border: '1px solid #E7E5E4', width: 28, height: 28 }}
                    aria-label={`Remove one ${item.name}`}
                  >
                    <Remove sx={{ fontSize: 15 }} />
                  </IconButton>
                  <Typography sx={{ fontWeight: 800, minWidth: 20, textAlign: 'center', fontSize: 13 }}>
                    {item.quantity}
                  </Typography>
                  <IconButton
                    size="small" onClick={() => onQty(item.id, 1)}
                    sx={{ bgcolor: 'white', border: '1px solid #E7E5E4', width: 28, height: 28 }}
                    aria-label={`Add one ${item.name}`}
                  >
                    <Add sx={{ fontSize: 15 }} />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
        </Box>
      </Box>

      {/*
        Footer is always mounted — it used to render only when the bill had
        items, so a cashier who opened the sheet first saw no Place-order
        button at all and had no way to tell whether one existed. The button
        is simply disabled until there's something to charge for. The extra
        bottom padding clears the phone's home indicator.
      */}
      <Box
        sx={{
          p: 1.5,
          pb: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          bgcolor: '#FAFAF9',
          borderTop: '1px solid #E7E5E4',
          flexShrink: 0,
        }}
      >
        {posCart.length > 0 && (
          <>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: '#78716C' }}>Discount</Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {[0, 5, 10, 15].map((d) => (
                <Chip
                  key={d} label={`${d}%`} size="small" onClick={() => setDiscountPercent(d)}
                  sx={{
                    fontWeight: 700, cursor: 'pointer', fontSize: 10, height: 22,
                    bgcolor: discountPercent === d ? '#C62828' : 'white',
                    color: discountPercent === d ? 'white' : '#78716C',
                    border: '1px solid #E7E5E4',
                  }}
                />
              ))}
            </Box>
          </Box>

          <Stack spacing={0.35} sx={{ mb: 1.25 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.secondary">Subtotal</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>₹{subtotal.toFixed(2)}</Typography>
            </Box>
            {discountAmount > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: '#15803D' }}>Discount ({discountPercent}%)</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#15803D' }}>-₹{discountAmount.toFixed(2)}</Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.secondary">GST 5% (CGST+SGST)</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>₹{(cgst + sgst).toFixed(2)}</Typography>
            </Box>
            <Divider sx={{ my: 0.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontWeight: 900, fontSize: 15 }}>Grand Total</Typography>
              <Typography sx={{ fontWeight: 900, fontSize: 22, color: '#C62828', lineHeight: 1.1 }}>
                ₹{grandTotal}
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ display: 'flex', gap: 0.75, mb: 1.25 }}>
            {([
              { mode: 'cash', label: '💵 Cash' },
              { mode: 'upi', label: '📱 UPI' },
              { mode: 'card', label: '💳 Card' },
            ] as const).map((p) => (
              <Chip
                key={p.mode} label={p.label} onClick={() => setPaymentMode(p.mode)}
                sx={{
                  flex: 1, fontWeight: 800, cursor: 'pointer', fontSize: 11,
                  bgcolor: paymentMode === p.mode ? '#1C1917' : 'white',
                  color: paymentMode === p.mode ? 'white' : '#44403C',
                  border: '1px solid #E7E5E4',
                }}
              />
            ))}
          </Box>
          </>
        )}

        <Button
          fullWidth variant="contained" size="large" startIcon={<Print />}
          onClick={onPlace} disabled={isSubmitting || posCart.length === 0}
          sx={{
            py: 1.4, borderRadius: '13px', fontSize: 15, fontWeight: 900, textTransform: 'none',
            background: posCart.length === 0
              ? '#D6D3D1'
              : 'linear-gradient(135deg, #C62828, #EA580C)',
            boxShadow: posCart.length === 0 ? 'none' : '0 6px 18px rgba(198,40,40,0.28)',
            '&.Mui-disabled': { color: '#FFFFFF' },
          }}
        >
          {isSubmitting
            ? 'Saving…'
            : posCart.length === 0
              ? 'Add items to place an order'
              : `Place order & print · ₹${grandTotal}`}
        </Button>
      </Box>
    </Box>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CashierPOSPage() {
  const { addOrderLocallyAndDB } = useAdmin();
  const { data: menuItems = [] } = useGetMenuItemsQuery();
  const { data: tables = [] } = useGetTablesQuery();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [vegFilter, setVegFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [posCart, setPosCart] = useState<POSCartItem[]>([]);
  const [orderType, setOrderType] = useState<POSOrderType>('counter');
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | ''>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card'>('cash');
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState<boolean>(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [lastInvoiceNo, setLastInvoiceNo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const activeTables = useMemo(() => tables.filter((t) => t.isActive), [tables]);

  const filteredMenuItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return menuItems.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesVeg = vegFilter === 'all' || item.vegStatus === vegFilter;
      const matchesSearch = !q || item.name.toLowerCase().includes(q) || (item.tags || []).some((t) => t.toLowerCase().includes(q));
      return matchesCategory && matchesVeg && matchesSearch && item.isAvailable;
    });
  }, [menuItems, selectedCategory, vegFilter, searchQuery]);

  // How many of each dish are already on the bill, so the card can show it
  // without the cashier opening the cart to check.
  const qtyByMenuItem = useMemo(() => {
    const map: Record<string, number> = {};
    posCart.forEach((i) => {
      map[i.menuItemId] = (map[i.menuItemId] || 0) + i.quantity;
    });
    return map;
  }, [posCart]);

  const subtotal = useMemo(
    () => posCart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [posCart]
  );
  const discountAmount = useMemo(() => (subtotal * discountPercent) / 100, [subtotal, discountPercent]);
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const cgst = parseFloat((taxableAmount * 0.025).toFixed(2));
  const sgst = parseFloat((taxableAmount * 0.025).toFixed(2));
  const grandTotal = Math.round(taxableAmount + cgst + sgst);
  const totalUnits = posCart.reduce((n, i) => n + i.quantity, 0);

  const addToCart = (item: MenuItem, portion?: Portion) => {
    const portions = sellablePortions(item);
    // No portion asked for: use the dish's own price. Asked for one that
    // isn't sold: refuse rather than silently bill the base price.
    const chosen = portion ? portions.find((p) => p.portion === portion) : undefined;
    if (portion && !chosen) {
      toast.error(`${item.name} isn't sold as ${PORTION_LABEL[portion]}`);
      return;
    }

    const price = chosen ? chosen.price : item.price;
    if (!price || price <= 0) {
      toast.error(`${item.name} has no price set — fix it in Menu Management`);
      return;
    }

    const cartItemId = chosen ? `${item.id}-${chosen.portion}` : item.id;
    const displayName = chosen && portions.length > 1
      ? `${item.name} (${PORTION_LABEL[chosen.portion]})`
      : item.name;

    setPosCart((prev) => {
      const existing = prev.find((i) => i.id === cartItemId);
      if (existing) {
        return prev.map((i) => (i.id === cartItemId ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          id: cartItemId,
          menuItemId: item.id,
          name: displayName,
          price,
          quantity: 1,
          vegStatus: item.vegStatus,
          selectedPortion: chosen?.portion,
          image: item.image,
        },
      ];
    });
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setPosCart((prev) =>
      prev.flatMap((i) => {
        if (i.id !== cartItemId) return [i];
        const newQty = i.quantity + delta;
        return newQty > 0 ? [{ ...i, quantity: newQty }] : [];
      })
    );
  };

  const clearPosCart = () => {
    setPosCart([]);
    setDiscountPercent(0);
    setCustomerName('');
    setCustomerPhone('');
    setSelectedTableNumber('');
  };

  const handlePlaceOrderAndPrint = async () => {
    if (isSubmitting) return;
    if (posCart.length === 0) {
      toast.error('Add at least one item to the bill first.');
      return;
    }
    // A dine-in bill without a table can't be delivered to the right guests,
    // and the printed bill would read "Table Counter".
    if (orderType === 'dine-in' && !selectedTableNumber) {
      toast.error('Pick the table for this dine-in order.');
      setCartSheetOpen(true);
      return;
    }

    setIsSubmitting(true);
    const newOrderId = generateOrderId();
    const invoiceNo = generateInvoiceNo(newOrderId);
    const now = new Date();

    const orderPayload: Order = {
      id: newOrderId,
      orderId: newOrderId,
      customerId: customerPhone.trim() || 'WALK-IN',
      customerName: customerName.trim() || 'Walk-in Customer',
      customerPhone: customerPhone.trim(),
      customerAddress: orderType === 'dine-in'
        ? `Dine-In · Table ${selectedTableNumber}`
        : 'Counter Sale',
      orderType,
      items: posCart.map((i) => ({
        id: i.id,
        menuItemId: i.menuItemId,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        vegStatus: i.vegStatus,
        selectedPortion: i.selectedPortion,
      })),
      subtotal,
      cgst,
      sgst,
      discount: discountAmount,
      deliveryCharge: 0,
      grandTotal,
      status: 'pending' as const,
      paymentMode,
      paymentStatus: 'paid' as const,
      orderDate: now.toISOString().split('T')[0],
      orderTime: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      tableNumber: orderType === 'dine-in' ? Number(selectedTableNumber) : undefined,
    };

    try {
      await addOrderLocallyAndDB(orderPayload);
      toast.success(`Order ${newOrderId} placed`);
      triggerNewOrderPush(newOrderId);

      setLastOrder(orderPayload);
      setLastInvoiceNo(invoiceNo);
      setPrintDialogOpen(true);
      setCartSheetOpen(false);
      clearPosCart();
    } catch (err) {
      console.error('POS Order Error:', err);
      toast.error('Could not save the order — nothing was billed. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cartPanel = (onCloseSheet?: () => void) => (
    <CartPanel
      posCart={posCart}
      orderType={orderType}
      setOrderType={setOrderType}
      tables={activeTables}
      selectedTableNumber={selectedTableNumber}
      setSelectedTableNumber={setSelectedTableNumber}
      customerName={customerName}
      setCustomerName={setCustomerName}
      customerPhone={customerPhone}
      setCustomerPhone={setCustomerPhone}
      paymentMode={paymentMode}
      setPaymentMode={setPaymentMode}
      discountPercent={discountPercent}
      setDiscountPercent={setDiscountPercent}
      totals={{ subtotal, discountAmount, cgst, sgst, grandTotal }}
      onQty={updateQuantity}
      onClear={clearPosCart}
      onPlace={handlePlaceOrderAndPrint}
      isSubmitting={isSubmitting}
      onCloseSheet={onCloseSheet}
    />
  );

  return (
    <AdminLayout title="Counter Billing">
      <Box
        sx={{
          height: { xs: 'auto', md: 'calc(100vh - 108px)' },
          display: 'flex',
          gap: 2,
          // On a phone the bill lives in a sheet behind the floating bar, so
          // the whole screen is dish selection — the old layout stacked the
          // bill under the entire menu, which meant scrolling past 100 dishes
          // to change a quantity.
          flexDirection: 'row',
          overflow: { xs: 'visible', md: 'hidden' },
        }}
      >
        {/* ── Dishes ─────────────────────────────────────────────────────── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1.25 }}>
          <Paper
            elevation={0}
            sx={{
              p: 1.25, borderRadius: '14px', border: '1px solid #E7E5E4', bgcolor: 'white',
              position: { xs: 'sticky', md: 'static' }, top: 0, zIndex: 2,
            }}
          >
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                fullWidth size="small"
                placeholder="Search dishes…"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start"><Search sx={{ color: '#A8A29E', fontSize: 20 }} /></InputAdornment>,
                    endAdornment: searchQuery ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearchQuery('')} aria-label="Clear search">
                          <Clear fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  },
                }}
              />
              <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                {(['all', 'veg', 'non-veg'] as const).map((v) => (
                  <Chip
                    key={v}
                    label={v === 'all' ? 'All' : v === 'veg' ? '🟢' : '🔴'}
                    onClick={() => setVegFilter(v)}
                    sx={{
                      fontWeight: 800, cursor: 'pointer', minWidth: 44,
                      bgcolor: vegFilter === v ? (v === 'veg' ? '#15803D' : v === 'non-veg' ? '#C62828' : '#1C1917') : '#F1EFED',
                      color: vegFilter === v ? 'white' : '#78716C',
                    }}
                  />
                ))}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 0.75, mt: 1, overflowX: 'auto', pb: 0.5, '&::-webkit-scrollbar': { height: 4 } }}>
              {CATEGORIES.map((cat) => (
                <Chip
                  key={cat.value}
                  label={cat.label}
                  size="small"
                  onClick={() => setSelectedCategory(cat.value)}
                  sx={{
                    fontWeight: selectedCategory === cat.value ? 800 : 500,
                    bgcolor: selectedCategory === cat.value ? '#C62828' : '#FAFAF9',
                    color: selectedCategory === cat.value ? 'white' : '#44403C',
                    border: selectedCategory === cat.value ? 'none' : '1px solid #E7E5E4',
                    cursor: 'pointer', flexShrink: 0,
                  }}
                />
              ))}
            </Box>
          </Paper>

          <Box
            sx={{
              flex: 1,
              overflowY: { xs: 'visible', md: 'auto' },
              pr: { md: 0.5 },
              // Room for the floating bill bar and the admin bottom nav.
              pb: { xs: totalUnits > 0 ? '132px' : '76px', md: 0 },
            }}
          >
            {filteredMenuItems.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8, color: '#A8A29E' }}>
                <Fastfood sx={{ fontSize: 44, opacity: 0.35, mb: 1 }} />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>No dishes match</Typography>
                <Typography variant="caption">Try another category or clear the search</Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  // Denser than a card list: a counter needs many dishes per
                  // screen, not big marketing cards.
                  gridTemplateColumns: {
                    xs: 'repeat(2, minmax(0, 1fr))',
                    sm: 'repeat(3, minmax(0, 1fr))',
                    md: 'repeat(auto-fill, minmax(158px, 1fr))',
                  },
                  gap: 1.25,
                }}
              >
                {filteredMenuItems.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    inCart={qtyByMenuItem[item.id] || 0}
                    compact={isMobile}
                    onAdd={addToCart}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Box>

        {/* ── Bill: fixed side pane on desktop ───────────────────────────── */}
        {!isMobile && (
          <Paper
            elevation={0}
            sx={{
              width: 372, flexShrink: 0, height: '100%',
              borderRadius: '18px', border: '1px solid #E7E5E4',
              overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
            }}
          >
            {cartPanel()}
          </Paper>
        )}
      </Box>

      {/* ── Bill: floating bar + sheet on mobile ─────────────────────────── */}
      {isMobile && (
        <>
          <Box
            sx={{
              position: 'fixed',
              left: 12, right: 12,
              // Sits directly above the admin bottom nav rather than under it.
              bottom: 'calc(70px + env(safe-area-inset-bottom, 0px))',
              zIndex: 1240,
            }}
          >
            <Button
              fullWidth
              variant="contained"
              onClick={() => setCartSheetOpen(true)}
              startIcon={
                <Badge badgeContent={totalUnits} color="warning" sx={{ '& .MuiBadge-badge': { fontWeight: 800 } }}>
                  <ShoppingCartCheckout />
                </Badge>
              }
              sx={{
                py: 1.3, borderRadius: '14px', fontWeight: 900, fontSize: 14.5, textTransform: 'none',
                background: totalUnits > 0
                  ? 'linear-gradient(135deg, #C62828, #EA580C)'
                  : 'linear-gradient(135deg, #57534E, #44403C)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                justifyContent: 'space-between',
                px: 2.5,
              }}
            >
              <span>{totalUnits > 0 ? 'View bill' : 'Bill empty'}</span>
              <span>₹{grandTotal}</span>
            </Button>
          </Box>

          <Drawer
            anchor="bottom"
            open={cartSheetOpen}
            onClose={() => setCartSheetOpen(false)}
            // `92vh` is the reason the Place-order button was unreachable on a
            // phone: mobile browsers size vh against the viewport *without*
            // the address bar, so a sheet that tall hangs below the visible
            // area and its footer never comes into view. `dvh` tracks the
            // real, currently-visible height (and shrinks when the keyboard
            // opens); the vh line stays first as the fallback for browsers
            // that don't support it.
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
            {cartPanel(() => setCartSheetOpen(false))}
          </Drawer>
        </>
      )}

      {/* Shared 80mm bill — same component the auto-printer and the
          customer's own copy use, so every bill in the building matches. */}
      <ThermalReceiptModal
        order={lastOrder}
        open={printDialogOpen}
        onClose={() => setPrintDialogOpen(false)}
        invoiceNo={lastInvoiceNo}
      />
    </AdminLayout>
  );
}
