'use client';

import React, { useState } from 'react';
import {
  Box, Container, Grid, Typography, Button, Divider, Chip, Paper, Stack,
  TextField, IconButton,
} from '@mui/material';
import {
  ShoppingCart, Add, Delete, LocalOffer, ArrowForward,
  CheckCircle, AutoAwesome, Timer,
} from '@mui/icons-material';
import Link from 'next/link';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import { useCart } from '@/context/CartContext';
import { useGetCouponsQuery } from '@/store/supabaseApi';
import { MenuItem } from '@/types';
import toast from 'react-hot-toast';

// Quick Add-on items for cross-selling in cart
const ADD_ONS: MenuItem[] = [
  {
    id: 'des-01',
    name: 'Hyderabadi Apricot Delight',
    price: 149,
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&q=80',
    vegStatus: 'veg',
    category: 'desserts',
    rating: 4.9,
    reviewCount: 310,
    isPopular: true,
    isSpecial: true,
    isAvailable: true,
    description: 'Slow-cooked dried apricots served with thick malai cream.',
    tags: ['Dessert', 'Bestseller'],
  },
  {
    id: 'bev-01',
    name: 'Pala Pitta Special Masala Lassi',
    price: 89,
    image: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=300&q=80',
    vegStatus: 'veg',
    category: 'beverages',
    rating: 4.8,
    reviewCount: 190,
    isPopular: true,
    isSpecial: false,
    isAvailable: true,
    description: 'Refreshing churned sweet curd lassi with cardamom & roasted pistachios.',
    tags: ['Drink', 'Refreshing'],
  },
  {
    id: 'side-01',
    name: 'Mirchi Ka Salan & Raitha Pack',
    price: 49,
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&q=80',
    vegStatus: 'veg',
    category: 'south-indian',
    rating: 4.9,
    reviewCount: 450,
    isPopular: true,
    isSpecial: true,
    isAvailable: true,
    description: 'Traditional Hyderabadi peanut sesame salan with fresh onion curd raitha.',
    tags: ['Side', 'Biryani Pairing'],
  },
];

export default function CartPage() {
  const {
    state, addItem, removeItem, increaseQty, decreaseQty,
    subtotal, cgst, sgst, discountAmount, deliveryCharge, grandTotal,
    applyCoupon, removeCoupon,
  } = useCart();
  const [couponInput, setCouponInput] = useState('');
  const { data: coupons = [] } = useGetCouponsQuery();

  const totalItemsCount = state.items.reduce((sum, i) => sum + i.quantity, 0);

  const handleApplyCoupon = () => {
    const coupon = coupons.find((c) => c.code === couponInput.toUpperCase() && c.isActive);
    if (!coupon) {
      toast.error('Invalid or expired coupon code');
      return;
    }
    if (subtotal < coupon.minOrder) {
      toast.error(`Minimum order ₹${coupon.minOrder} required for ${coupon.code}`);
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
        <Box sx={{ bgcolor: '#FFF8F2', minHeight: '75vh', py: 8, display: 'flex', alignItems: 'center' }}>
          <Container maxWidth="sm" sx={{ textAlign: 'center' }}>
            <Paper sx={{ p: 5, borderRadius: '24px', boxShadow: '0 8px 36px rgba(0,0,0,0.06)' }}>
              <Box
                sx={{
                  width: 90,
                  height: 90,
                  bgcolor: 'rgba(198,40,40,0.08)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2.5,
                  color: '#C62828',
                }}
              >
                <ShoppingCart sx={{ fontSize: 48 }} />
              </Box>
              <Typography variant="h4" color="#C62828" sx={{ fontWeight: 800, mb: 1 }}>
                Your Cart is Empty
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3.5, fontSize: '15px' }}>
                Looks like you haven&apos;t added any delicious dishes yet. Explore our royal Telangana & Andhra menu!
              </Typography>
              <Link href="/menu" style={{ textDecoration: 'none' }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  endIcon={<ArrowForward />}
                  sx={{
                    borderRadius: '14px',
                    px: 4,
                    py: 1.6,
                    fontSize: '16px',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #C62828, #EF5350)',
                    boxShadow: '0 8px 24px rgba(198,40,40,0.35)',
                  }}
                >
                  Browse Menu & Order
                </Button>
              </Link>

              <Divider sx={{ my: 4 }} />

              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 700 }}>
                  🎉 Available Special Coupons:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {coupons.filter((c) => c.isActive).map((c) => (
                    <Chip
                      key={c.code}
                      label={`${c.code} (${c.discount}% OFF)`}
                      size="small"
                      sx={{ bgcolor: 'rgba(255,152,0,0.12)', color: '#D84315', fontWeight: 800, fontSize: '12px' }}
                    />
                  ))}
                </Box>
              </Box>
            </Paper>
          </Container>
        </Box>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <Box sx={{ bgcolor: '#FFF8F2', minHeight: '90vh', py: { xs: 3, md: 5 } }}>
        <Container maxWidth="lg">
          {/* Header Bar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1.5 }}>
            <Box>
              <Typography variant="h4" color="#212121" sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                🛒 Your Cart
                <Chip
                  label={`${totalItemsCount} ${totalItemsCount === 1 ? 'item' : 'items'}`}
                  size="small"
                  sx={{ bgcolor: '#C62828', color: 'white', fontWeight: 800, fontSize: '12px' }}
                />
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Review your items and apply discount coupons before checkout
              </Typography>
            </Box>

            <Link href="/menu" style={{ textDecoration: 'none' }}>
              <Button variant="outlined" color="primary" size="small" sx={{ borderRadius: '10px', fontWeight: 700 }}>
                + Add More Dishes
              </Button>
            </Link>
          </Box>

          <Grid container spacing={3.5}>
            {/* Left Column: Items List & Add-ons */}
            <Grid size={{ xs: 12, md: 7.5 }}>
              {/* Cart Items List */}
              <Box sx={{ mb: 3 }}>
                {state.items.map((item) => (
                  <Paper
                    key={item.id}
                    sx={{
                      p: 2.5,
                      borderRadius: '20px',
                      mb: 2,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                      border: '1px solid rgba(198,40,40,0.08)',
                      transition: 'all 0.2s',
                      '&:hover': { boxShadow: '0 8px 24px rgba(198,40,40,0.1)' },
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                      {/* Image */}
                      <Box
                        component="img"
                        src={item.image}
                        alt={item.name}
                        sx={{
                          width: 86,
                          height: 86,
                          borderRadius: '14px',
                          objectFit: 'cover',
                          flexShrink: 0,
                        }}
                        onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=100&q=80';
                        }}
                      />

                      {/* Details */}
                      <Box sx={{ flex: 1, minWidth: 160 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.3 }}>
                          <Box className={item.vegStatus === 'veg' ? 'veg-indicator' : 'non-veg-indicator'} />
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#212121', lineHeight: 1.2 }}>
                            {item.name}
                          </Typography>
                        </Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', mb: 1, lineHeight: 1.4 }}
                        >
                          {item.description ? item.description.substring(0, 65) + '...' : ''}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                          <Typography variant="h6" color="#C62828" sx={{ fontWeight: 900 }}>
                            ₹{(item.price * item.quantity).toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            (₹{item.price} × {item.quantity})
                          </Typography>
                        </Box>
                      </Box>

                      {/* Quantity Modifier & Remove */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', sm: 'flex-end' }, gap: 1.2 }}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            removeItem(item.id);
                            toast.success(`${item.name} removed from cart`);
                          }}
                          sx={{ color: '#C62828', p: 0.5, opacity: 0.75, '&:hover': { opacity: 1, bgcolor: 'rgba(198,40,40,0.08)' } }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>

                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            bgcolor: 'rgba(198,40,40,0.06)',
                            borderRadius: '10px',
                            border: '1.5px solid #C62828',
                            p: 0.3,
                          }}
                        >
                          <IconButton size="small" onClick={() => decreaseQty(item.id)} sx={{ p: 0.4 }}>
                            <Box sx={{ color: '#C62828', fontWeight: 800, fontSize: 16, lineHeight: 1, px: 0.4 }}>−</Box>
                          </IconButton>
                          <Typography sx={{ px: 1.2, fontWeight: 800, fontSize: '15px', color: '#C62828', minWidth: 24, textAlign: 'center' }}>
                            {item.quantity}
                          </Typography>
                          <IconButton size="small" onClick={() => increaseQty(item.id)} sx={{ p: 0.4 }}>
                            <Add sx={{ color: '#C62828', fontSize: 18 }} />
                          </IconButton>
                        </Box>
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Box>

              {/* Recommended Add-ons Specials */}
              <Paper sx={{ p: 3, borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', mb: 3, bgcolor: '#FFFFFF' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AutoAwesome sx={{ color: '#FF9800' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#212121' }}>
                    Popular Recommended Pairings
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  {ADD_ONS.map((addon) => (
                    <Grid key={addon.id} size={{ xs: 12, sm: 4 }}>
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: '14px',
                          border: '1px solid rgba(0,0,0,0.08)',
                          bgcolor: '#FFF8F2',
                          display: 'flex',
                          flexDirection: 'column',
                          justify: 'space-between',
                          height: '100%',
                        }}
                      >
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                          <Box
                            component="img"
                            src={addon.image}
                            alt={addon.name}
                            sx={{ width: 48, height: 48, borderRadius: '8px', objectFit: 'cover' }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1.2, display: 'block', color: '#212121' }}>
                              {addon.name}
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: '#C62828' }}>
                              ₹{addon.price}
                            </Typography>
                          </Box>
                        </Box>

                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            addItem(addon);
                            toast.success(`${addon.name} added! 🛒`);
                          }}
                          startIcon={<Add fontSize="small" />}
                          sx={{
                            borderRadius: '8px',
                            py: 0.4,
                            fontSize: '11px',
                            fontWeight: 700,
                            borderColor: '#C62828',
                            color: '#C62828',
                            '&:hover': { bgcolor: 'rgba(198,40,40,0.08)' },
                          }}
                        >
                          Add Dish
                        </Button>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>

            {/* Right Column: Coupon & Order Summary */}
            <Grid size={{ xs: 12, md: 4.5 }}>
              {/* Coupon Section */}
              <Paper sx={{ p: 3, borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', mb: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <LocalOffer sx={{ color: '#FF9800' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    Apply Coupon & Discounts
                  </Typography>
                </Box>

                {state.couponCode ? (
                  <Box
                    sx={{
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      p: 2,
                      bgcolor: 'rgba(46,125,50,0.08)',
                      borderRadius: '12px',
                      border: '1px solid rgba(46,125,50,0.25)',
                    }}
                  >
                    <Box>
                      <Typography color="success.main" sx={{ fontWeight: 800, fontSize: '14px' }}>
                        ✅ {state.couponCode} APPLIED
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        You save ₹{discountAmount.toFixed(0)} on this order!
                      </Typography>
                    </Box>
                    <Button size="small" color="error" onClick={removeCoupon} sx={{ fontWeight: 700 }}>
                      Remove
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      size="small"
                      placeholder="Enter promo code (PALAPITTA10)"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                      sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: '13px' } }}
                    />
                    <Button
                      variant="contained"
                      onClick={handleApplyCoupon}
                      sx={{ borderRadius: '10px', fontWeight: 700, bgcolor: '#FF9800', '&:hover': { bgcolor: '#F57C00' } }}
                    >
                      Apply
                    </Button>
                  </Box>
                )}

                {/* Available Coupon Chips */}
                <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                  {coupons.filter((c) => c.isActive).map((c) => (
                    <Chip
                      key={c.code}
                      label={`Use ${c.code} (${c.discount}%)`}
                      size="small"
                      onClick={() => setCouponInput(c.code)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: 'rgba(255,152,0,0.1)',
                        color: '#D84315',
                        fontWeight: 700,
                        fontSize: '11px',
                        '&:hover': { bgcolor: 'rgba(255,152,0,0.2)' },
                      }}
                    />
                  ))}
                </Box>
              </Paper>

              {/* Order Summary & Bill Breakup */}
              <Paper sx={{ p: 3.5, borderRadius: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', position: 'sticky', top: 80 }}>
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
                  Bill Details
                </Typography>

                <Stack spacing={1.2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Item Subtotal</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{subtotal.toLocaleString()}</Typography>
                  </Box>

                  {discountAmount > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="success.main">Coupon Savings ({state.couponCode})</Typography>
                      <Typography variant="body2" color="success.main" sx={{ fontWeight: 700 }}>−₹{discountAmount.toFixed(0)}</Typography>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">CGST (2.5%)</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>₹{cgst.toFixed(2)}</Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">SGST (2.5%)</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>₹{sgst.toFixed(2)}</Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color={deliveryCharge === 0 ? 'success.main' : 'text.secondary'}>
                      Delivery Charge
                    </Typography>
                    <Typography variant="body2" color={deliveryCharge === 0 ? 'success.main' : 'text.primary'} sx={{ fontWeight: 700 }}>
                      {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}
                    </Typography>
                  </Box>

                  {deliveryCharge === 0 && (
                    <Typography variant="caption" color="success.main" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CheckCircle sx={{ fontSize: 13 }} /> Free Delivery Unlocked!
                    </Typography>
                  )}

                  <Divider sx={{ my: 1 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                      Grand Total
                    </Typography>
                    <Typography variant="h5" color="#C62828" sx={{ fontWeight: 900 }}>
                      ₹{grandTotal.toLocaleString()}
                    </Typography>
                  </Box>
                </Stack>

                <Link href="/checkout" style={{ textDecoration: 'none' }}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    endIcon={<ArrowForward />}
                    sx={{
                      mt: 3,
                      py: 1.8,
                      borderRadius: '14px',
                      fontWeight: 800,
                      fontSize: '16px',
                      background: 'linear-gradient(135deg, #C62828, #EF5350)',
                      boxShadow: '0 8px 24px rgba(198,40,40,0.4)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #B71C1C, #C62828)',
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.2s',
                    }}
                  >
                    Proceed to Checkout → ₹{grandTotal.toLocaleString()}
                  </Button>
                </Link>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 2, color: 'text.secondary' }}>
                  <Timer sx={{ fontSize: 16, color: '#FF9800' }} />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    ⚡ Average Delivery Time: 30–45 Mins
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Footer />
    </>
  );
}
