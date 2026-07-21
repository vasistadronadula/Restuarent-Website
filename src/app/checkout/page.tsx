'use client';
import React, { useState } from 'react';
import {
  Box, Container, Grid, Typography, Button, TextField, Radio, RadioGroup,
  FormControlLabel, FormControl, FormLabel, Paper, Divider, Chip,
  Alert, CircularProgress, Stack,
} from '@mui/material';
import {
  Person, Phone, Home, Payment, ShoppingCart, CheckCircle,
  ContentCopy, WhatsApp,
} from '@mui/icons-material';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import toast from 'react-hot-toast';

const generateOrderId = () => `ORD-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;

export default function CheckoutPage() {
  const { state, subtotal, cgst, sgst, discountAmount, deliveryCharge, grandTotal, clearCart } = useCart();
  const [form, setForm] = useState({ name: '', phone: '', address: '', city: 'Hyderabad', notes: '' });
  const [paymentMode, setPaymentMode] = useState('upi');
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [placed, setPlaced] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.phone.trim() || !/^[6-9]\d{9}$/.test(form.phone.replace(/\s/g, ''))) e.phone = 'Enter valid 10-digit mobile number';
    if (!form.address.trim() || form.address.length < 10) e.address = 'Enter complete delivery address';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePlaceOrder = async () => {
    if (!validate()) return;
    if (state.items.length === 0) { toast.error('Your cart is empty!'); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1800));
    const id = generateOrderId();
    setOrderId(id);
    setPlaced(true);
    clearCart();
    setLoading(false);
    toast.success('Order placed successfully! 🎉');
  };

  if (state.items.length === 0 && !placed) {
    return (
      <>
        <Navbar />
        <Container maxWidth="sm" sx={{ py: 12, textAlign: 'center' }}>
          <Typography variant="h2" sx={{ fontSize: '4rem', mb: 2 }}>🛒</Typography>
          <Typography variant="h5" sx={{fontWeight: 700, mb: 1}}>Your cart is empty</Typography>
          <Typography color="text.secondary" sx={{mb: 3}}>Add some delicious items before checkout</Typography>
          <Link href="/menu" style={{ textDecoration: 'none' }}>
            <Button variant="contained" color="primary" size="large">Go to Menu</Button>
          </Link>
        </Container>
        <Footer />
      </>
    );
  }

  if (placed) {
    return (
      <>
        <Navbar />
        <Container maxWidth="sm" sx={{ py: 10 }}>
          <Paper sx={{ p: 5, borderRadius: '24px', textAlign: 'center', boxShadow: '0 8px 48px rgba(0,0,0,0.12)' }}>
            <Box sx={{ width: 80, height: 80, bgcolor: 'rgba(46,125,50,0.1)', borderRadius: '50%', mx: 'auto', mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle sx={{ fontSize: 48, color: '#2E7D32' }} />
            </Box>
            <Typography variant="h4" color="#2E7D32" sx={{fontWeight: 800, mb: 1}}>Order Placed!</Typography>
            <Typography color="text.secondary" sx={{mb: 3}}>
              Thank you, {form.name}! Your order has been received and is being prepared.
            </Typography>
            <Box sx={{ bgcolor: '#FFF8F2', borderRadius: '14px', p: 3, mb: 3 }}>
              <Typography variant="caption" color="text.secondary" sx={{display: 'block'}}>ORDER ID</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <Typography variant="h5" color="#C62828" sx={{fontWeight: 800}}>{orderId}</Typography>
                <ContentCopy
                  sx={{ fontSize: 18, color: '#616161', cursor: 'pointer' }}
                  onClick={() => { navigator.clipboard.writeText(orderId); toast.success('Copied!'); }}
                />
              </Box>
            </Box>
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                <Typography variant="body2" color="text.secondary">Grand Total</Typography>
                <Typography variant="body1" color="primary" sx={{fontWeight: 700}}>₹{grandTotal}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                <Typography variant="body2" color="text.secondary">Payment</Typography>
                <Chip label={paymentMode.toUpperCase()} size="small" color="primary" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                <Typography variant="body2" color="text.secondary">Est. Delivery</Typography>
                <Typography variant="body2" sx={{fontWeight: 600}}>30–45 minutes</Typography>
              </Box>
            </Stack>
            <Button
              fullWidth variant="contained"
              href={`https://wa.me/919876543210?text=Hello Pala Pitta Ruchulu! My order ${orderId} has been placed. Thank you!`}
              target="_blank"
              startIcon={<WhatsApp />}
              sx={{ mt: 3, bgcolor: '#25D366', '&:hover': { bgcolor: '#128C7E' }, borderRadius: '14px', py: 1.5 }}
            >
              Track on WhatsApp
            </Button>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <Button fullWidth variant="outlined" color="primary" sx={{ mt: 1.5, borderRadius: '14px', py: 1.5 }}>
                Back to Home
              </Button>
            </Link>
          </Paper>
        </Container>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <Box sx={{ bgcolor: '#FFF8F2', minHeight: '100vh', py: { xs: 4, md: 6 } }}>
        <Container maxWidth="lg">
          <Typography variant="h4" color="#C62828" sx={{fontWeight: 800, mb: 4}}>
            🛒 Checkout
          </Typography>

          <Grid container spacing={4}>
            {/* Left – Form */}
            <Grid size={{ xs: 12, md: 7 }}>
              {/* Customer Details */}
              <Paper sx={{ p: 3.5, borderRadius: '20px', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Box sx={{ width: 36, height: 36, bgcolor: 'rgba(198,40,40,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Person sx={{ color: '#C62828', fontSize: 20 }} />
                  </Box>
                  <Typography variant="h6" sx={{fontWeight: 700}}>Customer Details</Typography>
                </Box>
                <Grid container spacing={2.5}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth label="Full Name *"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      error={!!errors.name} helperText={errors.name}
                      placeholder="e.g. Rahul Sharma"
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth label="Mobile Number *"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      error={!!errors.phone} helperText={errors.phone}
                      placeholder="10-digit mobile number"
                      slotProps={{ input: { startAdornment: <Box sx={{ mr: 1, color: '#616161' }}>+91</Box> } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth label="Delivery Address *" multiline rows={3}
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      error={!!errors.address} helperText={errors.address}
                      placeholder="House/Flat No., Street, Landmark, Area"
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth label="Special Instructions (Optional)"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="e.g. Extra spicy, no onions..."
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Payment */}
              <Paper sx={{ p: 3.5, borderRadius: '20px' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Box sx={{ width: 36, height: 36, bgcolor: 'rgba(198,40,40,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Payment sx={{ color: '#C62828', fontSize: 20 }} />
                  </Box>
                  <Typography variant="h6" sx={{fontWeight: 700}}>Payment Method</Typography>
                </Box>
                <FormControl component="fieldset">
                  <RadioGroup value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                    {[
                      { value: 'upi', label: '📱 UPI Payment', desc: 'Pay via UPI ID: palapittaruchulu@upi' },
                      { value: 'card', label: '💳 Credit / Debit Card', desc: 'Visa, Mastercard, RuPay accepted' },
                      { value: 'cash', label: '💵 Cash on Delivery', desc: 'Pay when your order arrives' },
                      { value: 'cod', label: '🚚 Cash on Delivery (COD)', desc: 'Available for orders up to ₹2000' },
                    ].map((opt) => (
                      <Box
                        key={opt.value}
                        sx={{
                          mb: 1.5, p: 2, borderRadius: '12px', cursor: 'pointer',
                          border: `2px solid ${paymentMode === opt.value ? '#C62828' : 'rgba(0,0,0,0.1)'}`,
                          bgcolor: paymentMode === opt.value ? 'rgba(198,40,40,0.04)' : 'transparent',
                          transition: 'all 0.2s',
                        }}
                        onClick={() => setPaymentMode(opt.value)}
                      >
                        <FormControlLabel
                          value={opt.value}
                          control={<Radio color="primary" />}
                          label={
                            <Box>
                              <Typography variant="body1" sx={{fontWeight: 600}}>{opt.label}</Typography>
                              <Typography variant="caption" color="text.secondary">{opt.desc}</Typography>
                            </Box>
                          }
                        />
                      </Box>
                    ))}
                  </RadioGroup>
                </FormControl>
              </Paper>
            </Grid>

            {/* Right – Order Summary */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper sx={{ p: 3.5, borderRadius: '20px', position: 'sticky', top: 90 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Box sx={{ width: 36, height: 36, bgcolor: 'rgba(198,40,40,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShoppingCart sx={{ color: '#C62828', fontSize: 20 }} />
                  </Box>
                  <Typography variant="h6" sx={{fontWeight: 700}}>Order Summary</Typography>
                </Box>

                {state.items.map((item) => (
                  <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box className={item.vegStatus === 'veg' ? 'veg-indicator' : 'non-veg-indicator'} />
                      <Typography variant="body2" sx={{ maxWidth: 180 }}>
                        {item.name} × {item.quantity}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{fontWeight: 600}}>₹{(item.price * item.quantity).toLocaleString()}</Typography>
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
                    <Typography variant="body2" color="text.secondary">Delivery</Typography>
                    <Typography variant="body2" color={deliveryCharge === 0 ? 'success.main' : 'text.primary'}>
                      {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6" sx={{fontWeight: 800}}>Grand Total</Typography>
                    <Typography variant="h6" color="primary" sx={{fontWeight: 800}}>₹{grandTotal.toLocaleString()}</Typography>
                  </Box>
                </Stack>

                <Button
                  fullWidth variant="contained" color="primary" size="large"
                  onClick={handlePlaceOrder}
                  disabled={loading}
                  sx={{ mt: 3, py: 1.8, borderRadius: '14px', fontSize: '16px', fontWeight: 700,
                    background: 'linear-gradient(135deg, #C62828, #EF5350)' }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : '🎉 Place Order'}
                </Button>

                <Alert severity="info" sx={{ mt: 2, borderRadius: '12px', fontSize: '12px' }}>
                  By placing order, you agree to our Terms & Conditions
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
