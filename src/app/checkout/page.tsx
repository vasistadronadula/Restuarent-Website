'use client';

import React, { useState } from 'react';
import {
  Box, Container, Grid, Typography, Button, TextField, Paper, Divider, Chip,
  CircularProgress, Stack, Alert, InputAdornment,
} from '@mui/material';
import {
  Person, Phone, ShoppingCart, CheckCircle,
  ContentCopy, WhatsApp, ArrowForward, Payment, ShoppingBag, Lock, Login,
} from '@mui/icons-material';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAdmin } from '@/context/AdminContext';
import { generateOrderId } from '@/lib/idGenerator';
import { triggerNewOrderPush } from '@/lib/triggerPush';
import PrintBillButton from '@/components/bill/PrintBillButton';
import type { Order, PaymentMode, PaymentStatus } from '@/types';

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
interface RazorpayOptions {
  key: string;
  amount?: number;
  currency: string;
  name: string;
  description: string;
  image: string;
  order_id?: string;
  prefill: { name: string; contact: string };
  theme: { color: string };
  handler: (response: RazorpayResponse) => void | Promise<void>;
  modal: { ondismiss: () => void };
}
interface RazorpayInstance {
  open: () => void;
}
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};


export default function CheckoutPage() {
  const { state, subtotal, cgst, sgst, discountAmount, clearCart } = useCart();
  const { user, openAuthModal } = useAuth();
  const { addOrderLocallyAndDB } = useAdmin();

  const [form, setForm] = useState({ name: '', phone: '' });
  const [placed, setPlaced] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Auto-fill from the logged-in user's profile, derived at render time
  // rather than synced into state via an effect — `form` only ever holds
  // what the customer has actually typed, so there's nothing to keep in
  // sync and nothing to reset if they edit the pre-filled value.
  const autofillName = user?.user_metadata?.full_name || user?.user_metadata?.name || (user?.email ? user.email.split('@')[0] : '') || '';
  const autofillPhone = user?.user_metadata?.phone || user?.phone || '';
  const effectiveName = form.name || autofillName;
  const effectivePhone = form.phone || autofillPhone;

  const grandTotal = subtotal + cgst + sgst - discountAmount;

  const validateDetails = () => {
    const e: Record<string, string> = {};
    if (!effectiveName.trim()) e.name = 'Full name required';
    if (!effectivePhone.trim()) {
      e.phone = 'Mobile number required';
    } else if (effectivePhone.trim().replace(/\D/g, '').length < 10) {
      e.phone = 'Enter valid 10-digit mobile number';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const finalizeOrder = async (
    id: string,
    mode: PaymentMode,
    status: PaymentStatus,
    razorpayIds?: { razorpayOrderId?: string; razorpayPaymentId?: string }
  ) => {
    const orderItemPayload = state.items.map((i) => ({
      menuItemId: i.id,
      name: i.name,
      price: i.selectedPrice ?? i.price,
      quantity: i.quantity,
      vegStatus: i.vegStatus,
      selectedPortion: i.selectedPortion,
    }));

    const newOrderObj: Order = {
      id,
      orderId: id,
      orderType: 'takeaway',
      customerId: user?.email || effectivePhone || 'GUEST',
      customerName: effectiveName,
      customerPhone: effectivePhone,
      customerAddress: 'Takeaway — Collect from Restaurant',
      items: orderItemPayload,
      subtotal,
      cgst,
      sgst,
      discount: discountAmount,
      deliveryCharge: 0,
      grandTotal,
      status: 'pending' as const,
      paymentMode: mode,
      paymentStatus: status,
      orderDate: new Date().toISOString().split('T')[0],
      orderTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      couponCode: state.couponCode,
      userId: user?.id || null,
      razorpayOrderId: razorpayIds?.razorpayOrderId,
      razorpayPaymentId: razorpayIds?.razorpayPaymentId,
    };

    // Single write path (RTK Query) — previously this also called
    // lib/db.ts's createOrderInDB directly, inserting the same order twice
    // and relying on a silent primary-key-conflict failure to avoid duplicates.
    try {
      await addOrderLocallyAndDB(newOrderObj);
    } catch {
      toast.error('We could not save your order. Please try again, or message us on WhatsApp.');
      setLoading(false);
      return;
    }

    triggerNewOrderPush(id);

    // Keep the whole order, not a summary of it — the confirmation screen
    // offers the customer the same 80mm bill the counter prints, and that
    // needs the line items.
    setCompletedOrder(newOrderObj);

    setPlaced(true);
    clearCart();
    setLoading(false);
  };

  const handleProceedToPayment = async () => {
    if (!user) {
      toast.error('🔒 Please log in to complete your checkout');
      openAuthModal('login');
      return;
    }

    if (!validateDetails()) return;
    setLoading(true);

    const activeOrderId = generateOrderId();

    // Online payment via Razorpay
    let orderData: { id?: string; amount?: number; currency?: string } | undefined;
    try {
      const res = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: grandTotal,
          currency: 'INR',
          receipt: activeOrderId,
          notes: { customerName: effectiveName, customerPhone: effectivePhone },
        }),
      });
      orderData = await res.json();
      if (!res.ok || !orderData?.id) {
        toast.error('Online payment is currently unavailable. Please try again later.');
        setLoading(false);
        return;
      }
    } catch {
      toast.error('Online payment is currently unavailable. Please try again later.');
      setLoading(false);
      return;
    }

    const scriptLoaded = await loadRazorpayScript();
    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

    if (!scriptLoaded || !razorpayKey) {
      toast.error('Payment gateway could not be loaded. Please try again.');
      setLoading(false);
      return;
    }

    const options: RazorpayOptions = {
      key: razorpayKey,
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      name: 'Pala Pitta Ruchulu',
      description: `Takeaway Order #${activeOrderId}`,
      image: '/logo.png',
      order_id: orderData.id,
      prefill: { name: effectiveName, contact: effectivePhone },
      theme: { color: '#C62828' },
      handler: async function (response) {
        toast.loading('Verifying payment...', { id: 'verify-toast' });
        const razorpayIds = {
          razorpayOrderId: response.razorpay_order_id as string,
          razorpayPaymentId: response.razorpay_payment_id as string,
        };
        try {
          const verifyRes = await fetch('/api/razorpay/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json();

          if (verifyRes.ok && verifyData.success) {
            toast.success('Payment Verified! ✅', { id: 'verify-toast' });
            await finalizeOrder(activeOrderId, 'razorpay', 'paid', razorpayIds);
          } else {
            // The charge may have gone through on Razorpay's side, but we
            // could not confirm it server-side — never mark this "paid".
            // The Razorpay payment ID is still recorded for manual
            // reconciliation by an admin.
            toast.error(
              'We could not verify your payment automatically. Please show your payment confirmation at the counter.',
              { id: 'verify-toast', duration: 7000 }
            );
            await finalizeOrder(activeOrderId, 'razorpay', 'unpaid', razorpayIds);
          }
        } catch {
          toast.error(
            'We could not verify your payment automatically. Please show your payment confirmation at the counter.',
            { id: 'verify-toast', duration: 7000 }
          );
          await finalizeOrder(activeOrderId, 'razorpay', 'unpaid', razorpayIds);
        }
      },
      modal: {
        ondismiss: function () {
          toast.error('Payment cancelled.');
          setLoading(false);
        },
      },
    };

    if (!window.Razorpay) {
      toast.error('Payment gateway could not be loaded. Please try again.');
      setLoading(false);
      return;
    }
    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  // Empty cart
  if (state.items.length === 0 && !placed) {
    return (
      <>
        <Navbar />
        <Container maxWidth="sm" sx={{ py: 12, textAlign: 'center' }}>
          <Typography variant="h2" sx={{ fontSize: '4rem', mb: 2 }}>🛒</Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Your cart is empty</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>Add some delicious items before checkout</Typography>
          <Link href="/menu" style={{ textDecoration: 'none' }}>
            <Button variant="contained" color="primary" size="large">Go to Menu</Button>
          </Link>
        </Container>
        <Footer />
      </>
    );
  }

  // Order success
  if (placed && completedOrder) {
    return (
      <>
        <Navbar />
        <Container maxWidth="sm" sx={{ py: 10 }}>
          <Paper sx={{ p: 5, borderRadius: '24px', textAlign: 'center', boxShadow: '0 12px 48px rgba(0,0,0,0.08)' }}>
            <Box sx={{ width: 80, height: 80, bgcolor: 'rgba(46,125,50,0.08)', borderRadius: '50%', mx: 'auto', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle sx={{ fontSize: 48, color: '#2E7D32' }} />
            </Box>
            <Chip label="🥡 TAKEAWAY ORDER CONFIRMED" sx={{ bgcolor: '#C62828', color: 'white', fontWeight: 800, mb: 2, fontSize: '13px' }} />
            <Typography variant="h4" color="#2E7D32" sx={{ fontWeight: 800, mb: 1 }}>Order Placed!</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Thank you, <strong>{completedOrder.customerName}</strong>! Your takeaway order is being prepared. Show your Order ID at the counter.
            </Typography>

            <Box sx={{ bgcolor: '#FFF8F2', borderRadius: '14px', p: 3, mb: 3 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>ORDER ID</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 0.5 }}>
                <Typography variant="h5" color="#C62828" sx={{ fontWeight: 800 }}>{completedOrder.orderId}</Typography>
                <ContentCopy
                  sx={{ fontSize: 18, color: '#616161', cursor: 'pointer' }}
                  onClick={() => { navigator.clipboard.writeText(completedOrder.orderId); toast.success('Copied!'); }}
                />
              </Box>
            </Box>

            <Stack spacing={1.5} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                <Typography variant="body2" color="text.secondary">Grand Total</Typography>
                <Typography variant="h6" color="primary" sx={{ fontWeight: 800 }}>₹{completedOrder.grandTotal.toLocaleString()}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                <Typography variant="body2" color="text.secondary">Payment</Typography>
                <Chip
                  label={completedOrder.paymentStatus === 'paid' ? '✅ PAID ONLINE' : '⏳ PAYMENT PENDING'}
                  size="small"
                  color={completedOrder.paymentStatus === 'paid' ? 'success' : 'warning'}
                  sx={{ fontWeight: 800 }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                <Typography variant="body2" color="text.secondary">Order Type</Typography>
                <Chip label="🥡 TAKEAWAY" size="small" sx={{ bgcolor: '#FFF3E0', color: '#E65100', fontWeight: 700 }} />
              </Box>
            </Stack>

            <Alert severity="info" sx={{ mb: 3, borderRadius: '12px', textAlign: 'left' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Collect your order at Pala Pitta Ruchulu</Typography>
              <Typography variant="caption">📍 Madhapur, Hyderabad | 📞 +91 70326 82089</Typography>
            </Alert>

            <Button
              fullWidth variant="contained"
              href={`https://wa.me/917032682089?text=Hello Pala Pitta Ruchulu! My takeaway order ${completedOrder.orderId} (₹${completedOrder.grandTotal}) is placed. Please confirm readiness!`}
              target="_blank"
              startIcon={<WhatsApp />}
              sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#128C7E' }, borderRadius: '14px', py: 1.5, fontWeight: 700, mb: 1.5 }}
            >
              Confirm on WhatsApp
            </Button>
            {/* The real 80mm bill — printed, or saved as a receipt-sized PDF. */}
            <PrintBillButton
              order={completedOrder}
              label="Print / save bill"
              fullWidth
              variant="outlined"
              color="inherit"
              sx={{ borderRadius: '14px', py: 1.5, fontWeight: 700, mb: 1.5, color: '#616161', borderColor: '#E0E0E0' }}
            />
            <Link href="/" style={{ textDecoration: 'none' }}>
              <Button fullWidth variant="outlined" color="primary" sx={{ borderRadius: '14px', py: 1.5, fontWeight: 700 }}>
                Back to Home
              </Button>
            </Link>
          </Paper>
        </Container>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <Box sx={{ bgcolor: '#FFF8F2', minHeight: '100vh', py: { xs: 3, md: 5 } }}>
        <Container maxWidth="lg">

          {/* Login Alert Banner if not logged in */}
          {!user && (
            <Alert
              severity="warning"
              icon={<Lock sx={{ color: '#C62828' }} />}
              action={
                <Button
                  color="inherit"
                  size="small"
                  startIcon={<Login />}
                  onClick={() => openAuthModal('login')}
                  sx={{ fontWeight: 700, bgcolor: 'rgba(198,40,40,0.1)', '&:hover': { bgcolor: 'rgba(198,40,40,0.2)' } }}
                >
                  Log In / Sign Up
                </Button>
              }
              sx={{ mb: 3, borderRadius: '16px', border: '1.5px solid #FFB74D', bgcolor: '#FFF3E0' }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#C62828' }}>
                Account Required for Checkout
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Please log in or create an account to complete your takeaway order and track status.
              </Typography>
            </Alert>
          )}

          {/* Takeaway Banner */}
          <Box sx={{
            bgcolor: '#FFF3E0', border: '2px solid #FF9800', borderRadius: '16px',
            p: 2, mb: 4, display: 'flex', alignItems: 'center', gap: 2,
          }}>
            <ShoppingBag sx={{ color: '#E65100', fontSize: 32, flexShrink: 0 }} />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#E65100' }}>
                🥡 Takeaway Only
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Order online → pay securely via Razorpay → collect from <strong>Pala Pitta Ruchulu, Madhapur</strong>. No delivery available.
              </Typography>
            </Box>
          </Box>

          <Typography variant="h4" color="#C62828" sx={{ fontWeight: 800, mb: 4 }}>
            🛒 Checkout
          </Typography>

          <Grid container spacing={4}>
            {/* Left – Customer Details & Payment */}
            <Grid size={{ xs: 12, md: 7 }}>
              {/* Customer Details */}
              <Paper sx={{ p: 3.5, borderRadius: '20px', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 36, height: 36, bgcolor: 'rgba(198,40,40,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Person sx={{ color: '#C62828', fontSize: 20 }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Your Details</Typography>
                  </Box>

                  {user ? (
                    <Chip
                      icon={<CheckCircle sx={{ fontSize: '16px !important' }} />}
                      label={`Logged in: ${user.email || 'Customer'}`}
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      startIcon={<Login />}
                      onClick={() => openAuthModal('login')}
                      sx={{ borderRadius: '8px', fontWeight: 700 }}
                    >
                      Log In
                    </Button>
                  )}
                </Box>

                <Grid container spacing={2.5}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth label="Full Name *"
                      value={effectiveName} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      error={!!errors.name} helperText={errors.name}
                      placeholder="e.g. Vasishta Dronadula"
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth label="Mobile Number *"
                      value={effectivePhone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      error={!!errors.phone} helperText={errors.phone}
                      placeholder="10-digit mobile number"
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <Phone sx={{ color: '#616161', fontSize: 18 }} />
                              <Typography sx={{ fontWeight: 600, color: '#616161', fontSize: '14px', ml: 0.5 }}>+91</Typography>
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Payment Method — Online Only */}
              <Paper sx={{ p: 3.5, borderRadius: '20px' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                  <Box sx={{ width: 36, height: 36, bgcolor: 'rgba(198,40,40,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Payment sx={{ color: '#C62828', fontSize: 20 }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Payment Method</Typography>
                </Box>

                <Box
                  sx={{
                    p: 2.5, borderRadius: '14px',
                    border: '2px solid #C62828',
                    bgcolor: 'rgba(198,40,40,0.04)',
                    display: 'flex', alignItems: 'center', gap: 1.5,
                  }}
                >
                  <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: 'rgba(25,118,210,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Payment sx={{ color: '#1976D2', fontSize: 22 }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>💳 Pay Online (Razorpay)</Typography>
                    <Typography variant="caption" color="text.secondary">UPI, Cards, GPay, PhonePe, NetBanking — Pay now, collect from restaurant</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            {/* Right – Order Summary */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper sx={{ p: 3.5, borderRadius: '20px', position: 'sticky', top: 90 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Box sx={{ width: 36, height: 36, bgcolor: 'rgba(198,40,40,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShoppingCart sx={{ color: '#C62828', fontSize: 20 }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Order Summary</Typography>
                </Box>

                {state.items.map((item) => (
                  <Box key={`${item.id}-${item.selectedPortion}`} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box className={item.vegStatus === 'veg' ? 'veg-indicator' : 'non-veg-indicator'} />
                      <Typography variant="body2" sx={{ maxWidth: 180 }}>
                        {item.name} × {item.quantity}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{((item.selectedPrice ?? item.price) * item.quantity).toLocaleString()}</Typography>
                  </Box>
                ))}

                <Divider sx={{ my: 2 }} />

                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                    <Typography variant="body2">₹{subtotal.toLocaleString()}</Typography>
                  </Box>
                  {discountAmount > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="success.main">Discount ({state.couponCode})</Typography>
                      <Typography variant="body2" color="success.main">-₹{discountAmount.toFixed(0)}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">CGST (2.5%)</Typography>
                    <Typography variant="body2">₹{cgst.toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">SGST (2.5%)</Typography>
                    <Typography variant="body2">₹{sgst.toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="success.main">Takeaway</Typography>
                    <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>FREE</Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>Grand Total</Typography>
                    <Typography variant="h6" color="primary" sx={{ fontWeight: 800 }}>₹{grandTotal.toLocaleString()}</Typography>
                  </Box>
                </Stack>

                {!user ? (
                  <Button
                    fullWidth variant="contained" size="large"
                    onClick={() => {
                      toast.error('🔒 Please log in to complete your order');
                      openAuthModal('login');
                    }}
                    startIcon={<Lock />}
                    sx={{
                      mt: 3, py: 1.8, borderRadius: '14px', fontSize: '16px', fontWeight: 700,
                      background: 'linear-gradient(135deg, #1E88E5, #1565C0)',
                      boxShadow: '0 4px 16px rgba(25,118,210,0.3)',
                      '&:hover': { background: 'linear-gradient(135deg, #1565C0, #0D47A1)' },
                    }}
                  >
                    🔑 Log In / Register to Checkout
                  </Button>
                ) : (
                  <Button
                    fullWidth variant="contained" color="primary" size="large"
                    onClick={handleProceedToPayment}
                    disabled={loading}
                    endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ArrowForward />}
                    sx={{
                      mt: 3, py: 1.8, borderRadius: '14px', fontSize: '16px', fontWeight: 700,
                      background: 'linear-gradient(135deg, #C62828, #EF5350)',
                    }}
                  >
                    {loading ? 'Processing...' : '💳 Pay & Place Takeaway Order'}
                  </Button>
                )}

                <Alert severity="success" sx={{ mt: 2, borderRadius: '12px', fontSize: '12px' }}>
                  🥡 <strong>Takeaway:</strong> Collect your order at our Madhapur restaurant.
                </Alert>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
      <Footer />
    </>
  );
}
