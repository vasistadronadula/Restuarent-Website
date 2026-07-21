'use client';
import React from 'react';
import {
  Box, Container, Grid, Typography, Button, Divider, Chip, Paper, Stack,
} from '@mui/material';
import { ShoppingCart, Add, Remove, Delete, LocalOffer, ArrowForward } from '@mui/icons-material';
import Link from 'next/link';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import { useCart } from '@/context/CartContext';
import { coupons } from '@/data/mockData';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { TextField } from '@mui/material';

export default function CartPage() {
  const {
    state, removeItem, increaseQty, decreaseQty,
    subtotal, cgst, sgst, discountAmount, deliveryCharge, grandTotal,
    applyCoupon, removeCoupon,
  } = useCart();
  const [couponInput, setCouponInput] = useState('');

  const handleApplyCoupon = () => {
    const coupon = coupons.find((c) => c.code === couponInput.toUpperCase() && c.isActive);
    if (!coupon) { toast.error('Invalid or expired coupon code'); return; }
    if (subtotal < coupon.minOrder) {
      toast.error(`Min order ₹${coupon.minOrder} required`);
      return;
    }
    applyCoupon(coupon.code, coupon.discount);
    toast.success(`Coupon applied! ${coupon.discount}% off 🎉`);
    setCouponInput('');
  };

  if (state.items.length === 0) {
    return (
      <>
        <Navbar />
        <Container maxWidth="sm" sx={{ py: 12, textAlign: 'center' }}>
          <ShoppingCart sx={{ fontSize: 80, color: '#FFCCBC', mb: 2 }} />
          <Typography variant="h4" color="#C62828" sx={{fontWeight: 800, mb: 1}}>Your cart is empty</Typography>
          <Typography color="text.secondary" sx={{mb: 4}}>Add some delicious items to get started!</Typography>
          <Link href="/menu" style={{ textDecoration: 'none' }}>
            <Button variant="contained" color="primary" size="large" endIcon={<ArrowForward />}
              sx={{ borderRadius: '14px', px: 4, py: 1.8, background: 'linear-gradient(135deg, #C62828, #EF5350)' }}>
              Browse Menu
            </Button>
          </Link>
          <Box sx={{ mt: 4 }}>
            <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>Try these coupon codes:</Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
              {coupons.filter(c => c.isActive).map(c => (
                <Chip key={c.code} label={`${c.code} – ${c.description}`} size="small"
                  sx={{ bgcolor: 'rgba(198,40,40,0.08)', color: '#C62828', fontWeight: 600 }} />
              ))}
            </Box>
          </Box>
        </Container>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <Box sx={{ bgcolor: '#FFF8F2', minHeight: '80vh', py: { xs: 4, md: 6 } }}>
        <Container maxWidth="lg">
          <Typography variant="h4" color="#C62828" sx={{fontWeight: 800, mb: 4}}>
            🛒 Your Cart ({state.items.reduce((s, i) => s + i.quantity, 0)} items)
          </Typography>

          <Grid container spacing={4}>
            {/* Cart Items */}
            <Grid size={{ xs: 12, md: 8 }}>
              {state.items.map((item) => (
                <Paper key={item.id} sx={{ p: 2.5, borderRadius: '16px', mb: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Box
                      component="img"
                      src={item.image}
                      alt={item.name}
                      sx={{ width: 80, height: 80, borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }}
                      onError={(e: any) => { e.target.src = 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=80&q=60'; }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.5 }}>
                        <Box className={item.vegStatus === 'veg' ? 'veg-indicator' : 'non-veg-indicator'} />
                        <Typography variant="subtitle1" sx={{fontWeight: 700}}>{item.name}</Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{display: 'block', mb: 1}}>
                        {item.description.substring(0, 60)}...
                      </Typography>
                      <Typography variant="h6" color="primary" sx={{fontWeight: 800}}>₹{(item.price * item.quantity).toLocaleString()}</Typography>
                      <Typography variant="caption" color="text.secondary">₹{item.price} each</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <Button
                        size="small" variant="text" color="error" startIcon={<Delete />}
                        onClick={() => { removeItem(item.id); toast.success('Item removed'); }}
                        sx={{ fontSize: '12px' }}
                      >
                        Remove
                      </Button>
                      <Box sx={{ display: 'flex', alignItems: 'center', border: '1.5px solid #C62828', borderRadius: '10px', overflow: 'hidden' }}>
                        <Button size="small" onClick={() => decreaseQty(item.id)} sx={{ minWidth: 36, color: '#C62828', borderRadius: 0 }}>
                          <Remove fontSize="small" />
                        </Button>
                        <Typography sx={{ px: 2, fontWeight: 800, fontSize: '16px', color: '#C62828', minWidth: 32, textAlign: 'center' }}>
                          {item.quantity}
                        </Typography>
                        <Button size="small" onClick={() => increaseQty(item.id)} sx={{ minWidth: 36, color: '#C62828', borderRadius: 0 }}>
                          <Add fontSize="small" />
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                </Paper>
              ))}

              {/* Coupon Section */}
              <Paper sx={{ p: 3, borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <LocalOffer sx={{ color: '#FF9800' }} />
                  <Typography variant="subtitle1" sx={{fontWeight: 700}}>Apply Coupon</Typography>
                </Box>
                {state.couponCode ? (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: 'rgba(46,125,50,0.08)', borderRadius: '12px', border: '1px solid rgba(46,125,50,0.2)' }}>
                    <Typography color="success.main" sx={{fontWeight: 700}}>✅ {state.couponCode} applied — Save ₹{discountAmount.toFixed(0)}!</Typography>
                    <Button size="small" color="error" onClick={removeCoupon}>Remove</Button>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <TextField
                      size="small" placeholder="Enter coupon code (try ROYAL10)"
                      value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                      sx={{ flex: 1 }}
                    />
                    <Button variant="outlined" color="secondary" onClick={handleApplyCoupon} sx={{ borderRadius: '10px' }}>
                      Apply
                    </Button>
                  </Box>
                )}
                <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                  {coupons.filter(c => c.isActive).map(c => (
                    <Chip key={c.code} label={c.code} size="small" onClick={() => setCouponInput(c.code)}
                      sx={{ cursor: 'pointer', bgcolor: 'rgba(255,152,0,0.1)', color: '#FF9800', fontWeight: 700, '&:hover': { bgcolor: 'rgba(255,152,0,0.2)' } }} />
                  ))}
                </Box>
              </Paper>
            </Grid>

            {/* Order Summary */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 3, borderRadius: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', position: 'sticky', top: 90 }}>
                <Typography variant="h6" sx={{fontWeight: 800, mb: 2.5}}>Order Summary</Typography>
                <Stack spacing={1.2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                    <Typography variant="body2" sx={{fontWeight: 500}}>₹{subtotal.toLocaleString()}</Typography>
                  </Box>
                  {discountAmount > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="success.main">Discount ({state.couponCode})</Typography>
                      <Typography variant="body2" color="success.main" sx={{fontWeight: 600}}>-₹{discountAmount.toFixed(0)}</Typography>
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
                    <Typography variant="body2" color={deliveryCharge === 0 ? 'success.main' : 'text.secondary'}>Delivery</Typography>
                    <Typography variant="body2" color={deliveryCharge === 0 ? 'success.main' : 'text.primary'} sx={{fontWeight: 600}}>
                      {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}
                    </Typography>
                  </Box>
                  {deliveryCharge === 0 && (
                    <Typography variant="caption" color="success.main" sx={{fontWeight: 600}}>✅ Free delivery above ₹500!</Typography>
                  )}
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6" sx={{fontWeight: 800}}>Grand Total</Typography>
                    <Typography variant="h6" color="primary" sx={{fontWeight: 800}}>₹{grandTotal.toLocaleString()}</Typography>
                  </Box>
                </Stack>

                <Link href="/checkout" style={{ textDecoration: 'none' }}>
                  <Button
                    fullWidth variant="contained" color="primary" size="large" endIcon={<ArrowForward />}
                    sx={{ mt: 3, py: 1.8, borderRadius: '14px', fontWeight: 700, fontSize: '16px',
                      background: 'linear-gradient(135deg, #C62828, #EF5350)' }}
                  >
                    Checkout — ₹{grandTotal.toLocaleString()}
                  </Button>
                </Link>
                <Link href="/menu" style={{ textDecoration: 'none' }}>
                  <Button fullWidth variant="text" color="primary" sx={{ mt: 1 }}>← Continue Shopping</Button>
                </Link>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
      <Footer />
    </>
  );
}
