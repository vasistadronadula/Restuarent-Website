'use client';
import React from 'react';
import {
  Drawer, Box, Typography, IconButton, Divider, Button,
  List, ListItem, Avatar, Chip, TextField, Alert,
  Stack,
} from '@mui/material';
import { Close, Add, Remove, Delete, ShoppingCart, LocalOffer } from '@mui/icons-material';
import { useCart } from '@/context/CartContext';
import { coupons } from '@/data/mockData';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function CartDrawer() {
  const {
    state, closeCart, removeItem, increaseQty, decreaseQty,
    subtotal, cgst, sgst, discountAmount, deliveryCharge, grandTotal,
    applyCoupon, removeCoupon,
  } = useCart();
  const [couponInput, setCouponInput] = useState('');

  const handleApplyCoupon = () => {
    const coupon = coupons.find((c) => c.code === couponInput.toUpperCase() && c.isActive);
    if (!coupon) { toast.error('Invalid or expired coupon code'); return; }
    if (subtotal < coupon.minOrder) {
      toast.error(`Min order ₹${coupon.minOrder} required for this coupon`);
      return;
    }
    applyCoupon(coupon.code, coupon.discount);
    toast.success(`Coupon applied! ${coupon.discount}% off`);
  };

  return (
    <Drawer
      anchor="right"
      open={state.isOpen}
      onClose={closeCart}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100vw', sm: 400 },
            display: 'flex', flexDirection: 'column',
            bgcolor: '#FFF8F2',
          },
        },
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2.5, bgcolor: '#C62828', color: 'white' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ShoppingCart />
            <Typography variant="h6" sx={{fontWeight: 700}}>Your Cart</Typography>
          </Box>
          <IconButton onClick={closeCart} sx={{ color: 'white' }}>
            <Close />
          </IconButton>
        </Box>
        {state.items.length > 0 && (
          <Chip
            label={`${state.items.reduce((s, i) => s + i.quantity, 0)} items`}
            size="small"
            sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600 }}
          />
        )}
      </Box>

      {/* Items */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {state.items.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <ShoppingCart sx={{ fontSize: 64, color: '#FFCCBC', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{fontWeight: 600}}>
              Your cart is empty
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Add delicious items from our menu
            </Typography>
            <Link href="/menu" style={{ textDecoration: 'none' }}>
              <Button variant="contained" color="primary" onClick={closeCart}>
                Browse Menu
              </Button>
            </Link>
          </Box>
        ) : (
          <List disablePadding>
            {state.items.map((item) => (
              <ListItem
                key={item.id}
                disablePadding
                sx={{
                  mb: 1.5, bgcolor: 'white', borderRadius: '14px',
                  p: 1.5, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  display: 'flex', gap: 1.5, alignItems: 'flex-start',
                }}
              >
                {/* Image */}
                <Box
                  component="img"
                  src={item.image}
                  alt={item.name}
                  sx={{ width: 60, height: 60, borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
                  onError={(e: any) => { e.target.src = 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=60&q=60'; }}
                />

                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
                    <Box className={item.vegStatus === 'veg' ? 'veg-indicator' : 'non-veg-indicator'} />
                    <Typography variant="body2" sx={{fontWeight: 600, lineHeight: 1.3, fontSize: '13px'}}>
                      {item.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="primary" sx={{fontWeight: 700}}>
                    ₹{(item.price * item.quantity).toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ₹{item.price} × {item.quantity}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                  <IconButton size="small" onClick={() => removeItem(item.id)}
                    sx={{ color: '#C62828', p: 0.3 }}>
                    <Delete fontSize="small" />
                  </IconButton>
                  <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#FFF8F2', borderRadius: '8px', border: '1px solid #FFCCBC' }}>
                    <IconButton size="small" onClick={() => decreaseQty(item.id)} sx={{ p: 0.5 }}>
                      <Remove fontSize="small" sx={{ color: '#C62828' }} />
                    </IconButton>
                    <Typography sx={{ px: 1, fontSize: '14px', fontWeight: 700, minWidth: '24px', textAlign: 'center' }}>
                      {item.quantity}
                    </Typography>
                    <IconButton size="small" onClick={() => increaseQty(item.id)} sx={{ p: 0.5 }}>
                      <Add fontSize="small" sx={{ color: '#C62828' }} />
                    </IconButton>
                  </Box>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Bottom Summary */}
      {state.items.length > 0 && (
        <Box sx={{ bgcolor: 'white', borderTop: '1px solid #FFCCBC' }}>
          {/* Coupon */}
          <Box sx={{ p: 2, pb: 1 }}>
            {state.couponCode ? (
              <Alert
                severity="success" icon={<LocalOffer />}
                action={
                  <IconButton size="small" onClick={removeCoupon}><Close fontSize="small" /></IconButton>
                }
                sx={{ borderRadius: '10px', fontSize: '13px' }}
              >
                <strong>{state.couponCode}</strong> applied — Save ₹{discountAmount.toFixed(0)}!
              </Alert>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small" placeholder="Enter coupon code"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                  sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: '13px' } }}
                  slotProps={{ input: { startAdornment: <LocalOffer sx={{ mr: 0.5, color: '#FF9800', fontSize: 18 }} /> } }}
                />
                <Button variant="outlined" color="secondary" size="small" onClick={handleApplyCoupon}
                  sx={{ borderRadius: '10px', whiteSpace: 'nowrap' }}>
                  Apply
                </Button>
              </Box>
            )}
          </Box>

          {/* Bill Breakup */}
          <Box sx={{ px: 2, pb: 1 }}>
            <Stack spacing={0.5}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>₹{subtotal.toLocaleString()}</Typography>
              </Box>
              {discountAmount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="success.main">Discount</Typography>
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 500 }}>-₹{discountAmount.toFixed(0)}</Typography>
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
              {deliveryCharge > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Delivery</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>₹{deliveryCharge}</Typography>
                </Box>
              )}
              {deliveryCharge === 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="success.main">Delivery</Typography>
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>FREE</Typography>
                </Box>
              )}
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Grand Total</Typography>
                <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 700 }}>
                  ₹{grandTotal.toLocaleString()}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ px: 2, pb: 2 }}>
            <Link href="/checkout" style={{ textDecoration: 'none' }}>
              <Button
                variant="contained" color="primary" fullWidth size="large" onClick={closeCart}
                sx={{
                  py: 1.5, borderRadius: '14px', fontWeight: 700, fontSize: '16px',
                  background: 'linear-gradient(135deg, #C62828, #EF5350)',
                }}
              >
                Proceed to Checkout → ₹{grandTotal.toLocaleString()}
              </Button>
            </Link>
            <Link href="/menu" style={{ textDecoration: 'none' }}>
              <Button variant="text" color="primary" fullWidth size="small" onClick={closeCart} sx={{ mt: 1 }}>
                + Add more items
              </Button>
            </Link>
          </Box>
        </Box>
      )}
    </Drawer>
  );
}
