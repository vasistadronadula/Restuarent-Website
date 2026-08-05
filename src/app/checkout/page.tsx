'use client';

import React, { useState } from 'react';
import {
  Box, Container, Grid, Typography, Button, TextField, Paper, Divider, Chip,
  CircularProgress, Stack, Alert, InputAdornment, Radio,
} from '@mui/material';
import {
  Person, Phone, ShoppingCart, CheckCircle,
  ContentCopy, WhatsApp, ArrowForward, Payment, ShoppingBag, Lock, Login,
  LocalOffer, ConfirmationNumber, Storefront, CreditCard, AccountBalanceWallet,
} from '@mui/icons-material';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useGetCouponsQuery } from '@/store/supabaseApi';
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
  const { data: coupons = [] } = useGetCouponsQuery();
  const { state, subtotal, cgst, sgst, discountAmount, clearCart, applyCoupon, removeCoupon } = useCart();
  const { user, openAuthModal } = useAuth();
  const { addOrderLocallyAndDB } = useAdmin();

  const [inputCoupon, setInputCoupon] = useState('');
  const [form, setForm] = useState({ name: '', phone: '' });
  const [paymentChoice, setPaymentChoice] = useState<'online' | 'counter'>('online');
  const [placed, setPlaced] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

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
      customerAddress: 'Takeaway — Collect from Madhapur Restaurant',
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

    try {
      await addOrderLocallyAndDB(newOrderObj);
    } catch {
      toast.error('We could not save your order. Please try again or contact us.');
      setLoading(false);
      return;
    }

    triggerNewOrderPush(id);
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

    if (paymentChoice === 'counter') {
      await finalizeOrder(activeOrderId, 'cash', 'unpaid');
      return;
    }

    // Online Payment mode
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
        toast.error('Online payment service is momentarily busy. You can pay at counter or retry.');
        setLoading(false);
        return;
      }
    } catch {
      toast.error('Online payment service is momentarily busy. You can pay at counter or retry.');
      setLoading(false);
      return;
    }

    const scriptLoaded = await loadRazorpayScript();
    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

    if (!scriptLoaded || !razorpayKey) {
      toast.error('Payment window could not be loaded. Please try paying at counter.');
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
        toast.loading('Confirming your payment...', { id: 'verify-toast' });
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
            toast.success('Payment Received Successfully! ✅', { id: 'verify-toast' });
            await finalizeOrder(activeOrderId, 'razorpay', 'paid', razorpayIds);
          } else {
            toast.error('Payment status pending verification. Show receipt at counter.', { id: 'verify-toast', duration: 6000 });
            await finalizeOrder(activeOrderId, 'razorpay', 'unpaid', razorpayIds);
          }
        } catch {
          toast.error('Payment status pending verification. Show receipt at counter.', { id: 'verify-toast', duration: 6000 });
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
      toast.error('Payment window could not be loaded. Try paying at counter.');
      setLoading(false);
      return;
    }
    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  // Empty cart state
  if (state.items.length === 0 && !placed) {
    return (
      <>
        <Navbar />
        <Container maxWidth="sm" sx={{ py: 12, textAlign: 'center' }}>
          <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: 'rgba(198,40,40,0.08)', mx: 'auto', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingCart sx={{ fontSize: 44, color: '#C62828' }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Your checkout cart is empty</Typography>
          <Typography color="text.secondary" sx={{ mb: 3.5 }}>Add items from our authentic Telugu menu to proceed.</Typography>
          <Link href="/menu" style={{ textDecoration: 'none' }}>
            <Button variant="contained" color="primary" size="large" sx={{ borderRadius: '12px', px: 4, py: 1.5, fontWeight: 700 }}>
              Browse Dishes
            </Button>
          </Link>
        </Container>
        <Footer />
      </>
    );
  }

  // Order confirmation view
  if (placed && completedOrder) {
    return (
      <>
        <Navbar />
        <Container maxWidth="sm" sx={{ py: { xs: 4, md: 8 } }}>
          <Paper sx={{ p: { xs: 3, sm: 4.5 }, borderRadius: '24px', textAlign: 'center', boxShadow: '0 12px 48px rgba(0,0,0,0.08)' }}>
            <Box sx={{ width: 72, height: 72, bgcolor: 'rgba(46,125,50,0.1)', borderRadius: '50%', mx: 'auto', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle sx={{ fontSize: 44, color: '#2E7D32' }} />
            </Box>
            <Chip label="🥡 TAKEAWAY CONFIRMED" sx={{ bgcolor: '#2E7D32', color: 'white', fontWeight: 800, mb: 1.5, fontSize: '12px' }} />
            <Typography variant="h5" color="#1B5E20" sx={{ fontWeight: 900, mb: 0.5 }}>Order Placed Successfully!</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Thank you, <strong>{completedOrder.customerName}</strong>! Your food is being prepared at Pala Pitta Ruchulu.
            </Typography>

            <Box sx={{ bgcolor: '#FFF8F2', borderRadius: '16px', p: 2.5, mb: 3, border: '1px solid #FFCCBC' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, letterSpacing: 0.5 }}>ORDER TOKEN ID</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 0.5 }}>
                <Typography variant="h4" color="#C62828" sx={{ fontWeight: 900 }}>{completedOrder.orderId}</Typography>
                <ContentCopy
                  sx={{ fontSize: 20, color: '#616161', cursor: 'pointer' }}
                  onClick={() => { navigator.clipboard.writeText(completedOrder.orderId); toast.success('Order ID copied!'); }}
                />
              </Box>
            </Box>

            <Stack spacing={1.5} sx={{ mb: 3, textAlign: 'left', bgcolor: '#FAFAF9', p: 2, borderRadius: '14px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Total Amount</Typography>
                <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 900 }}>₹{completedOrder.grandTotal.toLocaleString()}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">Payment Method</Typography>
                <Chip
                  label={completedOrder.paymentStatus === 'paid' ? '✅ Paid Online' : '⏳ Pay at Counter'}
                  size="small"
                  color={completedOrder.paymentStatus === 'paid' ? 'success' : 'warning'}
                  sx={{ fontWeight: 800, fontSize: '11px' }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">Pickup Location</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>Madhapur, Hyderabad</Typography>
              </Box>
            </Stack>

            <Button
              fullWidth variant="contained"
              href={`https://wa.me/917032682089?text=Hello Pala Pitta Ruchulu! My takeaway order ${completedOrder.orderId} (₹${completedOrder.grandTotal}) is placed. Please confirm preparation!`}
              target="_blank"
              startIcon={<WhatsApp />}
              sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#128C7E' }, borderRadius: '12px', py: 1.4, fontWeight: 700, mb: 1.5 }}
            >
              Contact Kitchen on WhatsApp
            </Button>
            <PrintBillButton
              order={completedOrder}
              label="Print / Download Receipt"
              fullWidth
              variant="outlined"
              color="inherit"
              sx={{ borderRadius: '12px', py: 1.4, fontWeight: 700, mb: 1.5, color: '#424242', borderColor: '#D6D6D6' }}
            />
            <Link href="/" style={{ textDecoration: 'none' }}>
              <Button fullWidth variant="text" color="primary" sx={{ fontWeight: 700 }}>
                Return to Home
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
      <Box sx={{ bgcolor: '#FFF8F2', minHeight: '90vh', pt: { xs: 2.5, md: 4 }, pb: { xs: 12, md: 6 } }}>
        <Container maxWidth="lg">

          {/* Top minimal breadcrumb */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <Link href="/cart" style={{ textDecoration: 'none' }}>
              <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 700 }}>← Back to Cart</Typography>
            </Link>
            <Typography variant="body2" color="text.secondary">•</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>Checkout</Typography>
          </Box>

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
                  sx={{ fontWeight: 800, bgcolor: 'rgba(198,40,40,0.1)' }}
                >
                  Log In
                </Button>
              }
              sx={{ mb: 3, borderRadius: '14px', border: '1px solid #FFCC80', bgcolor: '#FFF3E0' }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#C62828' }}>
                Account login recommended
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Log in to automatically save order history and earn points.
              </Typography>
            </Alert>
          )}

          <Grid container spacing={3.5}>
            {/* Left Side: Order Details & Payment Selection */}
            <Grid size={{ xs: 12, md: 7 }}>

              {/* 1. Pickup & Contact Info */}
              <Paper sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: '20px', mb: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                    <Box sx={{ width: 34, height: 34, bgcolor: 'rgba(198,40,40,0.08)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Storefront sx={{ color: '#C62828', fontSize: 18 }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '17px' }}>Takeaway Pickup</Typography>
                  </Box>
                  <Chip label="30 MIN PREPARATION" size="small" sx={{ bgcolor: '#FFF3E0', color: '#E65100', fontWeight: 800, fontSize: '10.5px' }} />
                </Box>

                <Box sx={{ p: 2, bgcolor: '#FFF8F2', borderRadius: '14px', border: '1px solid #FFE0B2', mb: 2.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#E65100' }}>📍 Pala Pitta Ruchulu Restaurant</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
                    Main Road, Madhapur, Hyderabad, TS – 500081 (Near Metro Pillar 1735)
                  </Typography>
                </Box>

                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: 'text.primary' }}>
                  Contact Information for Order Updates
                </Typography>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth size="small" label="Full Name *"
                      value={effectiveName} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      error={!!errors.name} helperText={errors.name}
                      placeholder="e.g. Rahul Sharma"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth size="small" label="Mobile Phone *"
                      value={effectivePhone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      error={!!errors.phone} helperText={errors.phone}
                      placeholder="10-digit mobile number"
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <Typography sx={{ fontWeight: 700, color: '#616161', fontSize: '13px' }}>+91</Typography>
                            </InputAdornment>
                          ),
                        },
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* 2. Payment Method Selector */}
              <Paper sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2.5 }}>
                  <Box sx={{ width: 34, height: 34, bgcolor: 'rgba(198,40,40,0.08)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Payment sx={{ color: '#C62828', fontSize: 18 }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '17px' }}>Payment Mode</Typography>
                </Box>

                <Stack spacing={1.5}>
                  {/* Option 1: Instant Online Payment */}
                  <Paper
                    elevation={0}
                    onClick={() => setPaymentChoice('online')}
                    sx={{
                      p: 2, borderRadius: '14px', cursor: 'pointer',
                      border: '2px solid',
                      borderColor: paymentChoice === 'online' ? '#C62828' : 'rgba(0,0,0,0.08)',
                      bgcolor: paymentChoice === 'online' ? 'rgba(198,40,40,0.03)' : '#FFFFFF',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      transition: 'all .2s ease',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Radio checked={paymentChoice === 'online'} color="primary" size="small" />
                      <Box sx={{ width: 38, height: 38, borderRadius: '10px', bgcolor: 'rgba(25,118,210,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <AccountBalanceWallet sx={{ color: '#1976D2', fontSize: 20 }} />
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '14px' }}>
                          Instant Online Payment (UPI / Cards)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Pay securely via Google Pay, PhonePe, Paytm, Cards or NetBanking
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>

                  {/* Option 2: Pay at Counter */}
                  <Paper
                    elevation={0}
                    onClick={() => setPaymentChoice('counter')}
                    sx={{
                      p: 2, borderRadius: '14px', cursor: 'pointer',
                      border: '2px solid',
                      borderColor: paymentChoice === 'counter' ? '#C62828' : 'rgba(0,0,0,0.08)',
                      bgcolor: paymentChoice === 'counter' ? 'rgba(198,40,40,0.03)' : '#FFFFFF',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      transition: 'all .2s ease',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Radio checked={paymentChoice === 'counter'} color="primary" size="small" />
                      <Box sx={{ width: 38, height: 38, borderRadius: '10px', bgcolor: 'rgba(46,125,50,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Storefront sx={{ color: '#2E7D32', fontSize: 20 }} />
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '14px' }}>
                          Pay at Counter upon Pickup
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Pay cash or tap card when collecting your takeaway order at restaurant
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Stack>
              </Paper>
            </Grid>

            {/* Right Side: Order Items Summary & Price Breakdown */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', position: { md: 'sticky' }, top: 80 }}>
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 2, fontSize: '17px' }}>
                  Order Summary
                </Typography>

                {/* Items List */}
                <Stack spacing={1.5} sx={{ maxH: 220, overflowY: 'auto', pr: 0.5, mb: 2 }}>
                  {state.items.map((item) => (
                    <Box key={`${item.id}-${item.selectedPortion}`} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                        <Box className={item.vegStatus === 'veg' ? 'veg-indicator' : 'non-veg-indicator'} />
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '13.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
                          {item.name} <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>× {item.quantity}</Box>
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '13.5px' }}>
                        ₹{((item.selectedPrice ?? item.price) * item.quantity).toLocaleString()}
                      </Typography>
                    </Box>
                  ))}
                </Stack>

                {/* Promo Code Box */}
                <Box sx={{ p: 1.5, bgcolor: '#FFF8F2', borderRadius: '12px', border: '1px dashed #FFB74D', mb: 2.5 }}>
                  {state.couponCode ? (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#15803D' }}>
                        🎉 Coupon '{state.couponCode}' Applied! (-₹{discountAmount.toFixed(0)})
                      </Typography>
                      <Button size="small" onClick={removeCoupon} sx={{ color: '#C62828', fontSize: '11px', fontWeight: 800, minWidth: 0, p: 0 }}>
                        Remove
                      </Button>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        size="small" fullWidth placeholder="Coupon code"
                        value={inputCoupon} onChange={(e) => setInputCoupon(e.target.value.toUpperCase())}
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: '8px', fontSize: '12.5px' } }}
                      />
                      <Button
                        size="small" variant="contained" color="primary"
                        onClick={() => {
                          const code = inputCoupon.trim().toUpperCase();
                          const match = coupons.find((c) => c.code.toUpperCase() === code && c.isActive);
                          if (match) {
                            if (subtotal < (match.minOrder || 0)) {
                              toast.error(`Min order ₹${match.minOrder} required`);
                              return;
                            }
                            applyCoupon(match.code, match.discount, match.maxDiscount);
                            toast.success(`Coupon ${match.code} applied!`);
                            setInputCoupon('');
                          } else {
                            toast.error('Invalid coupon code');
                          }
                        }}
                        sx={{ borderRadius: '8px', px: 2, fontWeight: 800 }}
                      >
                        Apply
                      </Button>
                    </Box>
                  )}
                </Box>

                {/* Bill Breakdown */}
                <Stack spacing={1.2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Item Subtotal</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{subtotal.toLocaleString()}</Typography>
                  </Box>

                  {discountAmount > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="success.main">Discount</Typography>
                      <Typography variant="body2" color="success.main" sx={{ fontWeight: 700 }}>-₹{discountAmount.toFixed(0)}</Typography>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Taxes (GST 5%)</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{(cgst + sgst).toFixed(2)}</Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="success.main">Takeaway Service</Typography>
                    <Typography variant="body2" color="success.main" sx={{ fontWeight: 700 }}>FREE</Typography>
                  </Box>

                  <Divider sx={{ my: 1 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>To Pay</Typography>
                    <Typography variant="h5" color="primary" sx={{ fontWeight: 900 }}>
                      ₹{grandTotal.toLocaleString()}
                    </Typography>
                  </Box>
                </Stack>

                {/* Main Action Desktop Button */}
                <Button
                  fullWidth variant="contained" size="large"
                  onClick={handleProceedToPayment}
                  disabled={loading}
                  endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ArrowForward />}
                  sx={{
                    mt: 3, py: 1.6, borderRadius: '14px', fontSize: '15.5px', fontWeight: 800,
                    background: 'linear-gradient(135deg, #C62828, #EF5350)',
                    display: { xs: 'none', md: 'inline-flex' },
                  }}
                >
                  {loading ? 'Processing Order...' : paymentChoice === 'online' ? `Pay ₹${grandTotal.toLocaleString()} Online →` : `Confirm Order ₹${grandTotal.toLocaleString()} →`}
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </Container>

        {/* Sticky Bottom Bar for Phones */}
        <Box
          sx={{
            position: 'fixed',
            bottom: 0, left: 0, right: 0,
            bgcolor: 'white',
            borderTop: '1px solid rgba(0,0,0,0.1)',
            p: 1.75, px: 2.5,
            zIndex: 1200,
            display: { xs: 'flex', md: 'none' },
            alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
            pb: 'calc(14px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1, fontWeight: 700 }}>
              TOTAL TO PAY
            </Typography>
            <Typography variant="h6" color="primary" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
              ₹{grandTotal.toLocaleString()}
            </Typography>
          </Box>

          <Button
            variant="contained" color="primary" size="medium"
            onClick={handleProceedToPayment}
            disabled={loading}
            endIcon={loading ? <CircularProgress size={18} color="inherit" /> : <ArrowForward fontSize="small" />}
            sx={{
              borderRadius: '12px', px: 3, py: 1.1, fontWeight: 800, fontSize: '14px',
              background: 'linear-gradient(135deg, #C62828, #EF5350)',
            }}
          >
            {loading ? 'Placing...' : paymentChoice === 'online' ? 'Pay Online' : 'Place Order'}
          </Button>
        </Box>
      </Box>

      <Footer />
    </>
  );
}
