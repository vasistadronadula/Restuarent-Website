'use client';

import React, { useState, useMemo } from 'react';
import {
  Box, Paper, Typography, Grid, Button, TextField, Divider, Chip,
  IconButton, InputAdornment,
  Card, CardContent, Stack, FormControl, InputLabel, Select, MenuItem as MuiMenuItem,
} from '@mui/material';
import {
  Search, Add, Remove, Print,
  Fastfood, Clear, Receipt,
} from '@mui/icons-material';
import AdminLayout from '@/components/admin/AdminLayout';
import ThermalReceiptModal from '@/components/admin/ThermalReceiptModal';
import { useAdmin } from '@/context/AdminContext';
import { useGetMenuItemsQuery, useGetTablesQuery } from '@/store/supabaseApi';
import { MenuItem, Category, VegStatus, Order } from '@/types';
import { generateOrderId, generateInvoiceNo } from '@/lib/idGenerator';
import { triggerNewOrderPush } from '@/lib/triggerOrderPush';
import toast from 'react-hot-toast';

interface POSCartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  vegStatus: VegStatus;
  selectedPortion?: 'single' | 'full' | 'large';
}

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

export default function CashierPOSPage() {
  const { addOrderLocallyAndDB } = useAdmin();
  const { data: menuItems = [] } = useGetMenuItemsQuery();
  const { data: tables = [] } = useGetTablesQuery();

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [vegFilter, setVegFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // POS Order Details
  const [posCart, setPosCart] = useState<POSCartItem[]>([]);
  const [orderType, setOrderType] = useState<'takeaway' | 'dine-in' | 'counter'>('takeaway');
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | ''>('');
  const [customerName, setCustomerName] = useState<string>('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card'>('cash');
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  const [printDialogOpen, setPrintDialogOpen] = useState<boolean>(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [lastInvoiceNo, setLastInvoiceNo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Active tables list
  const activeTables = useMemo(() => tables.filter((t) => t.isActive), [tables]);

  // Filtered menu items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesVeg = vegFilter === 'all' || item.vegStatus === vegFilter;
      const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesVeg && matchesSearch && item.isAvailable;
    });
  }, [menuItems, selectedCategory, vegFilter, searchQuery]);

  // Cart math
  const subtotal = useMemo(() => {
    return posCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [posCart]);

  const discountAmount = useMemo(() => {
    return (subtotal * discountPercent) / 100;
  }, [subtotal, discountPercent]);

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const cgst = parseFloat((taxableAmount * 0.025).toFixed(2));
  const sgst = parseFloat((taxableAmount * 0.025).toFixed(2));
  const grandTotal = Math.round(taxableAmount + cgst + sgst);

  // Cart operations
  const addToCart = (item: MenuItem, portion: 'single' | 'full' | 'large' = 'full') => {
    const itemPrice = item.portionPrices?.[portion] || item.price;
    const cartItemId = `${item.id}-${portion}`;

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
          name: portion !== 'full' ? `${item.name} (${portion.toUpperCase()})` : item.name,
          price: itemPrice,
          quantity: 1,
          vegStatus: item.vegStatus,
          selectedPortion: portion,
        },
      ];
    });
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setPosCart((prev) => {
      return prev
        .map((i) => {
          if (i.id === cartItemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as POSCartItem[];
    });
  };

  const clearPosCart = () => {
    setPosCart([]);
    setDiscountPercent(0);
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
  };

  // Place order & open thermal bill print
  const handlePlaceOrderAndPrint = async () => {
    if (posCart.length === 0) {
      toast.error('POS Cart is empty. Add food items first.');
      return;
    }

    setIsSubmitting(true);
    const newOrderId = generateOrderId();
    const invoiceNo = generateInvoiceNo(newOrderId);
    const now = new Date();

    const orderPayload = {
      id: newOrderId,
      orderId: newOrderId,
      customerId: customerPhone || 'WALK-IN',
      customerName: customerName.trim() || 'Walk-in Customer',
      customerPhone: customerPhone.trim() || 'Counter Sale',
      customerAddress: orderType === 'dine-in' ? `Dine-In Table ${selectedTableNumber || 'Counter'}` : 'Takeaway — Counter Sale',
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
      tableNumber: selectedTableNumber || undefined,
    };

    try {
      await addOrderLocallyAndDB(orderPayload);
      toast.success(`⚡ Order #${newOrderId} placed successfully!`);
      triggerNewOrderPush(newOrderId);

      setLastOrder(orderPayload);
      setLastInvoiceNo(invoiceNo);
      setPrintDialogOpen(true);
      clearPosCart();
    } catch (err) {
      console.error('POS Order Error:', err);
      toast.error('Failed to save order to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout title="Cashier POS Counter Billing">
      <Box sx={{
        height: { xs: 'auto', md: 'calc(100vh - 120px)' },
        display: 'flex', flexDirection: { xs: 'column', md: 'row' },
        gap: 2.5, overflow: { xs: 'visible', md: 'hidden' },
      }}>

        {/* ── LEFT PANEL: MENU & FOOD SELECTION (65%) ─────────────────────── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1.5, minHeight: { xs: 400, md: 'auto' } }}>

          {/* Search & Filters */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', border: '1px solid #E7E5E4', bgcolor: 'white' }}>
            <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, md: 5 }}>
                <TextField
                  fullWidth size="small"
                  placeholder="Quick search food items..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start"><Search sx={{ color: '#A8A29E' }} /></InputAdornment>,
                      endAdornment: searchQuery ? (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setSearchQuery('')}><Clear fontSize="small" /></IconButton>
                        </InputAdornment>
                      ) : null,
                    },
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 7 }}>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                  {(['all', 'veg', 'non-veg'] as const).map((v) => (
                    <Chip
                      key={v}
                      label={v === 'all' ? 'All Types' : v === 'veg' ? '🟢 Veg Only' : '🔴 Non-Veg'}
                      onClick={() => setVegFilter(v)}
                      sx={{
                        fontWeight: 700, cursor: 'pointer',
                        bgcolor: vegFilter === v ? (v === 'veg' ? '#15803D' : v === 'non-veg' ? '#C62828' : '#1C1917') : '#F1EFED',
                        color: vegFilter === v ? 'white' : '#78716C',
                      }}
                    />
                  ))}
                </Box>
              </Grid>
            </Grid>

            {/* Category Chips */}
            <Box sx={{ display: 'flex', gap: 1, mt: 1.5, overflowX: 'auto', pb: 0.5, '&::-webkit-scrollbar': { height: 4 } }}>
              {CATEGORIES.map((cat) => (
                <Chip
                  key={cat.value}
                  label={cat.label}
                  onClick={() => setSelectedCategory(cat.value)}
                  sx={{
                    fontWeight: selectedCategory === cat.value ? 700 : 500,
                    bgcolor: selectedCategory === cat.value ? '#C62828' : '#FAFAF9',
                    color: selectedCategory === cat.value ? 'white' : '#44403C',
                    border: selectedCategory === cat.value ? 'none' : '1px solid #E7E5E4',
                    cursor: 'pointer', flexShrink: 0,
                  }}
                />
              ))}
            </Box>
          </Paper>

          {/* Menu Items Grid */}
          <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
            <Grid container spacing={2}>
              {filteredMenuItems.map((item) => {
                const isVeg = item.vegStatus === 'veg';

                return (
                  <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Card sx={{
                      borderRadius: '16px', border: '1px solid #E7E5E4',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(0,0,0,0.08)' },
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%',
                    }}>
                      <CardContent sx={{ p: 2, pb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            <Box sx={{
                              width: 14, height: 14, borderRadius: '3px',
                              border: `2px solid ${isVeg ? '#15803D' : '#C62828'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: isVeg ? '#15803D' : '#C62828' }} />
                            </Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1C1917', lineHeight: 1.2 }}>
                              {item.name}
                            </Typography>
                          </Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#C62828' }}>
                            ₹{item.price}
                          </Typography>
                        </Box>
                        {item.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mt: 0.5 }}>
                            {item.description}
                          </Typography>
                        )}
                      </CardContent>

                      <Box sx={{ p: 1.5, pt: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                        {item.portionPrices ? (
                          <Stack direction="row" spacing={0.5}>
                            {item.portionPrices.single && (
                              <Chip
                                label={`Half ₹${item.portionPrices.single}`}
                                size="small" onClick={() => addToCart(item, 'single')}
                                sx={{ bgcolor: 'rgba(198,40,40,0.08)', color: '#C62828', fontWeight: 700, fontSize: '10px', cursor: 'pointer' }}
                              />
                            )}
                            <Chip
                              label={`Full ₹${item.portionPrices.full || item.price}`}
                              size="small" onClick={() => addToCart(item, 'full')}
                              sx={{ bgcolor: '#C62828', color: 'white', fontWeight: 700, fontSize: '10px', cursor: 'pointer' }}
                            />
                          </Stack>
                        ) : (
                          <Box />
                        )}

                        <Button
                          variant="contained" size="small" startIcon={<Add />}
                          onClick={() => addToCart(item, 'full')}
                          sx={{
                            bgcolor: '#C62828', '&:hover': { bgcolor: '#B71C1C' },
                            borderRadius: '10px', fontWeight: 800, textTransform: 'none', px: 2,
                          }}
                        >
                          Add
                        </Button>
                      </Box>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </Box>

        {/* ── RIGHT PANEL: POS CART TERMINAL (35% on desktop, full width on mobile) ── */}
        <Paper elevation={0} sx={{
          width: { xs: '100%', md: 380 }, flexShrink: 0,
          maxHeight: { xs: 'none', md: '100%' },
          borderRadius: '20px', border: '1px solid #E7E5E4',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: 'white',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
        }}>

          {/* Header */}
          <Box sx={{ p: 2, bgcolor: '#1C1917', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Receipt sx={{ color: '#EA580C' }} />
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '16px' }}>Counter Order</Typography>
            </Box>
            {posCart.length > 0 && (
              <Button size="small" onClick={clearPosCart} sx={{ color: '#EF4444', fontWeight: 700, textTransform: 'none' }}>
                Clear Cart
              </Button>
            )}
          </Box>

          {/* Order Type & Customer Details */}
          <Box sx={{ p: 2, bgcolor: '#FAFAF9', borderBottom: '1px solid #E7E5E4' }}>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {[
                    { type: 'takeaway', label: '🥡 Takeaway' },
                    { type: 'dine-in', label: '🍽️ Dine-In' },
                    { type: 'counter', label: '⚡ Quick Counter' },
                  ].map((t) => (
                    <Chip
                      key={t.type} label={t.label}
                      onClick={() => setOrderType(t.type as 'takeaway' | 'dine-in' | 'counter')}
                      sx={{
                        flex: 1, fontWeight: 800, cursor: 'pointer', fontSize: '11px',
                        bgcolor: orderType === t.type ? '#C62828' : 'white',
                        color: orderType === t.type ? 'white' : '#44403C',
                        border: '1px solid #E7E5E4',
                      }}
                    />
                  ))}
                </Box>
              </Grid>

              {orderType === 'dine-in' && (
                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Select Table</InputLabel>
                    <Select value={selectedTableNumber} label="Select Table" onChange={(e) => setSelectedTableNumber(Number(e.target.value))}>
                      {activeTables.map((t) => (
                        <MuiMenuItem key={t.id} value={t.tableNumber}>
                          Table {t.tableNumber} ({t.capacity} seats) {t.description ? `– ${t.description}` : ''}
                        </MuiMenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth size="small" label="Customer Name"
                  value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth size="small" label="Phone (optional)"
                  value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>

          {/* Cart Items List */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
            {posCart.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6, color: '#A8A29E' }}>
                <Fastfood sx={{ fontSize: 48, opacity: 0.4, mb: 1 }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>POS Cart is empty</Typography>
                <Typography variant="caption">Click menu items to add to order</Typography>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {posCart.map((item) => (
                  <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: '12px', bgcolor: '#FAFAF9', border: '1px solid #E7E5E4' }}>
                    <Box sx={{ flex: 1, minWidth: 0, mr: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1C1917', lineHeight: 1.2 }}>
                        {item.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#78716C', fontWeight: 600 }}>
                        ₹{item.price} × {item.quantity} = ₹{item.price * item.quantity}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => updateQuantity(item.id, -1)} sx={{ bgcolor: 'white', border: '1px solid #E7E5E4' }}>
                        <Remove fontSize="small" />
                      </IconButton>
                      <Typography variant="body2" sx={{ fontWeight: 800, px: 1 }}>{item.quantity}</Typography>
                      <IconButton size="small" onClick={() => updateQuantity(item.id, 1)} sx={{ bgcolor: 'white', border: '1px solid #E7E5E4' }}>
                        <Add fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>

          {/* Bill Summary & Payment */}
          {posCart.length > 0 && (
            <Box sx={{ p: 2, bgcolor: '#FAFAF9', borderTop: '1px solid #E7E5E4' }}>

              {/* Discount Selector */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#78716C' }}>Discount</Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {[0, 5, 10, 15].map((d) => (
                    <Chip
                      key={d} label={`${d}%`} size="small" onClick={() => setDiscountPercent(d)}
                      sx={{
                        fontWeight: 700, cursor: 'pointer', fontSize: '10px', height: 22,
                        bgcolor: discountPercent === d ? '#C62828' : 'white',
                        color: discountPercent === d ? 'white' : '#78716C',
                        border: '1px solid #E7E5E4',
                      }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Math */}
              <Stack spacing={0.5} sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">Subtotal</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>₹{subtotal}</Typography>
                </Box>
                {discountAmount > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="success.main">Discount ({discountPercent}%)</Typography>
                    <Typography variant="caption" color="success.main" sx={{ fontWeight: 700 }}>-₹{discountAmount.toFixed(0)}</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">Taxes (GST 5%)</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>₹{(cgst + sgst).toFixed(2)}</Typography>
                </Box>
                <Divider sx={{ my: 0.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>Grand Total</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: '#C62828' }}>₹{grandTotal}</Typography>
                </Box>
              </Stack>

              {/* Payment Mode Selection */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                {[
                  { mode: 'cash', label: '💵 Cash' },
                  { mode: 'upi', label: '📱 UPI' },
                  { mode: 'card', label: '💳 Card' },
                ].map((p) => (
                  <Chip
                    key={p.mode} label={p.label}
                    onClick={() => setPaymentMode(p.mode as 'cash' | 'upi' | 'card')}
                    sx={{
                      flex: 1, fontWeight: 800, cursor: 'pointer', fontSize: '11px',
                      bgcolor: paymentMode === p.mode ? '#1C1917' : 'white',
                      color: paymentMode === p.mode ? 'white' : '#44403C',
                      border: '1px solid #E7E5E4',
                    }}
                  />
                ))}
              </Box>

              {/* Big Action Button */}
              <Button
                fullWidth variant="contained" size="large" startIcon={<Print />}
                onClick={handlePlaceOrderAndPrint} disabled={isSubmitting}
                sx={{
                  py: 1.6, borderRadius: '14px', fontSize: '15px', fontWeight: 900,
                  background: 'linear-gradient(135deg, #C62828, #EF5350)',
                  boxShadow: '0 6px 20px rgba(198,40,40,0.3)',
                }}
              >
                {isSubmitting ? 'Saving...' : '⚡ Place Order & Print Bill'}
              </Button>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Shared thermal receipt — same component used for auto-printed orders,
          so every receipt in the building looks identical regardless of
          whether it came from checkout, the webhook, or here. */}
      <ThermalReceiptModal
        order={lastOrder}
        open={printDialogOpen}
        onClose={() => setPrintDialogOpen(false)}
        invoiceNo={lastInvoiceNo}
      />
    </AdminLayout>
  );
}
