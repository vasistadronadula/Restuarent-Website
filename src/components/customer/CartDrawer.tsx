'use client';
import React, { useState } from 'react';
import {
  Drawer, Box, Typography, IconButton, Divider, Button,
  List, ListItem, Chip, TextField, Alert, Stack,
} from '@mui/material';
import { Close, Add, Remove, Delete, ShoppingCart, LocalOffer } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  closeCart, removeItem, increaseQty, decreaseQty,
  applyCoupon, removeCoupon,
  selectCartItems, selectCartIsOpen, selectCouponCode,
  selectSubtotal, selectDiscountAmount, selectCgst, selectSgst, selectGrandTotal,
} from '@/store/cartSlice';
import { useGetCouponsQuery } from '@/store/supabaseApi';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';

export default function CartDrawer() {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const [couponInput, setCouponInput] = useState('');
  const { data: coupons = [] } = useGetCouponsQuery();

  const items = useAppSelector(selectCartItems);
  const isOpen = useAppSelector(selectCartIsOpen);
  const couponCode = useAppSelector(selectCouponCode);
  const subtotal = useAppSelector(selectSubtotal);
  const discountAmount = useAppSelector(selectDiscountAmount);
  const cgst = useAppSelector(selectCgst);
  const sgst = useAppSelector(selectSgst);
  const grandTotal = useAppSelector(selectGrandTotal);

  // Close cart drawer whenever route/tab changes
  React.useEffect(() => {
    if (isOpen) {
      dispatch(closeCart());
    }
  }, [pathname, dispatch]);


  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  const handleApplyCoupon = () => {
    const coupon = coupons.find((c) => c.code === couponInput.toUpperCase() && c.isActive);
    if (!coupon) { toast.error('Invalid or expired coupon code'); return; }
    if (subtotal < coupon.minOrder) {
      toast.error(`Min order ₹${coupon.minOrder} required for this coupon`);
      return;
    }
    dispatch(applyCoupon({ code: coupon.code, discount: coupon.discount, maxDiscount: coupon.maxDiscount }));
    toast.success(`Coupon applied! ${coupon.discount}% off`);
  };

  return (
    <Drawer
      anchor="right" open={isOpen} onClose={() => dispatch(closeCart())}
      slotProps={{ paper: { sx: { width: { xs: '100vw', sm: 400 }, display: 'flex', flexDirection: 'column', bgcolor: '#FFF8F2' } } }}
    >
      {/* Header */}
      <Box sx={{ p: 2.5, bgcolor: '#C62828', color: 'white' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <ShoppingCart sx={{ fontSize: 24 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>Your Cart</Typography>
          </Box>
          <IconButton onClick={() => dispatch(closeCart())} sx={{ color: 'white', p: 0.5 }}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
        {totalItems > 0 && (
          <Chip
            label={`${totalItems} items`} size="small"
            sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600 }}
          />
        )}
      </Box>

      {/* Items */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {items.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <ShoppingCart sx={{ fontSize: 64, color: '#FFCCBC', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>Your cart is empty</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Add delicious items from our menu</Typography>
            <Link href="/menu" style={{ textDecoration: 'none' }}>
              <Button variant="contained" color="primary" onClick={() => dispatch(closeCart())}>Browse Menu</Button>
            </Link>
          </Box>
        ) : (
          <List disablePadding>
            {items.map((item) => (
              <ListItem
                key={`${item.id}-${item.selectedPortion}`}
                disablePadding
                sx={{
                  mb: 1.5, bgcolor: 'white', borderRadius: '14px',
                  p: 1.5, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  display: 'flex', gap: 1.2, alignItems: 'center',
                }}
              >
                <Box
                  component="img" src={item.image} alt={item.name}
                  loading="lazy" decoding="async"
                  sx={{ width: 56, height: 56, borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
                  onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=60&q=60'; }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
                    <Box className={item.vegStatus === 'veg' ? 'veg-indicator' : 'non-veg-indicator'} />
                    <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 800 }}>
                    ₹{((item.selectedPrice ?? item.price) * item.quantity).toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                    ₹{item.selectedPrice ?? item.price} × {item.quantity}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexShrink: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#FFF8F2', borderRadius: '8px', border: '1px solid #FFCCBC' }}>
                    <IconButton size="small" onClick={() => dispatch(decreaseQty(item.id))} sx={{ p: 0.4 }}>
                      <Remove fontSize="small" sx={{ color: '#C62828', fontSize: 16 }} />
                    </IconButton>
                    <Typography sx={{ px: 0.8, fontSize: '13px', fontWeight: 800, color: '#C62828', minWidth: '20px', textAlign: 'center' }}>
                      {item.quantity}
                    </Typography>
                    <IconButton size="small" onClick={() => dispatch(increaseQty(item.id))} sx={{ p: 0.4 }}>
                      <Add fontSize="small" sx={{ color: '#C62828', fontSize: 16 }} />
                    </IconButton>
                  </Box>
                  <IconButton
                    size="small" onClick={() => dispatch(removeItem(item.id))}
                    sx={{ color: '#C62828', p: 0.6, bgcolor: 'rgba(198,40,40,0.06)', borderRadius: '8px', '&:hover': { bgcolor: 'rgba(198,40,40,0.15)' } }}
                  >
                    <Delete fontSize="small" sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Bottom Summary */}
      {items.length > 0 && (
        <Box sx={{ bgcolor: 'white', borderTop: '1px solid #FFCCBC' }}>
          {/* Coupon */}
          <Box sx={{ p: 2, pb: 1 }}>
            {couponCode ? (
              <Alert
                severity="success" icon={<LocalOffer />}
                action={<IconButton size="small" onClick={() => dispatch(removeCoupon())}><Close fontSize="small" /></IconButton>}
                sx={{ borderRadius: '10px', fontSize: '13px' }}
              >
                <strong>{couponCode}</strong> applied — Save ₹{discountAmount.toFixed(0)}!
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
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="success.main">Delivery</Typography>
                <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>FREE</Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Grand Total</Typography>
                <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 700 }}>₹{grandTotal.toLocaleString()}</Typography>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ px: 2, pb: 2 }}>
            <Link href="/checkout" style={{ textDecoration: 'none' }}>
              <Button
                variant="contained" color="primary" fullWidth size="large"
                onClick={() => dispatch(closeCart())}
                sx={{ py: 1.5, borderRadius: '14px', fontWeight: 700, fontSize: '16px', background: 'linear-gradient(135deg, #C62828, #EF5350)' }}
              >
                Proceed to Checkout → ₹{grandTotal.toLocaleString()}
              </Button>
            </Link>
            <Link href="/menu" style={{ textDecoration: 'none' }}>
              <Button variant="text" color="primary" fullWidth size="small"
                onClick={() => dispatch(closeCart())} sx={{ mt: 1 }}>
                + Add more items
              </Button>
            </Link>
          </Box>
        </Box>
      )}
    </Drawer>
  );
}
