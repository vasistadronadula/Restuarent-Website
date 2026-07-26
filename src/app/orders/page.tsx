'use client';

import React, { useState, useMemo } from 'react';
import {
  Container, Box, Typography, Paper, Grid, Chip, Button, TextField,
  InputAdornment, Divider, Stack, CircularProgress,
} from '@mui/material';
import {
  Search, ShoppingBag, ReceiptLong, AccessTime,
  Replay, LocalDining, Phone, Person, Payment, LocalAtm,
} from '@mui/icons-material';
import Link from 'next/link';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import type { OrderItem } from '@/types';

export default function OrderHistoryPage() {
  const { orders, isLoadingDB } = useAdmin();
  const { user } = useAuth();
  const { addItem } = useCart();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [phoneFilter, setPhoneFilter] = useState('');

  // Filter orders for logged-in user or search.
  // RLS already restricts what `orders` can even contain here (a signed-in
  // customer's query only returns their own rows; admins get everything) —
  // this ownership check additionally keeps an admin who opens this
  // customer-facing page from seeing every order mixed together.
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const userMatch = !user || order.userId === user.id;

      // Search match by orderId, customerName, or item name
      const searchLower = search.trim().toLowerCase();
      const matchesSearch = !searchLower || (
        order.id.toLowerCase().includes(searchLower) ||
        order.customerName.toLowerCase().includes(searchLower) ||
        order.customerPhone.includes(searchLower) ||
        order.items.some((item) => item.name.toLowerCase().includes(searchLower))
      );

      // Phone query search for guest users
      const matchesPhone = !phoneFilter.trim() || order.customerPhone.includes(phoneFilter.trim());

      // Status filter
      const matchesStatus = filterStatus === 'all' || order.status === filterStatus;

      return userMatch && matchesSearch && matchesPhone && matchesStatus;
    });
  }, [orders, user, search, phoneFilter, filterStatus]);

  const handleReorder = (items: OrderItem[]) => {
    let addedCount = 0;
    items.forEach((item) => {
      addItem({
        id: item.menuItemId,
        name: item.name,
        category: 'starters',
        price: item.price,
        image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80',
        vegStatus: item.vegStatus || 'non-veg',
        rating: 4.8,
        reviewCount: 50,
        isPopular: true,
        isSpecial: false,
        isAvailable: true,
        description: item.name,
        prepTime: 20,
        tags: [],
      });
      addedCount += item.quantity || 1;
    });
    toast.success(`Re-ordered ${addedCount} items to your cart! 🛒`);
    router.push('/checkout');
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'completed':
        return <Chip label="Delivered / Completed" color="success" size="small" sx={{ fontWeight: 800 }} />;
      case 'preparing':
        return <Chip label="Preparing in Kitchen 🔥" color="warning" size="small" sx={{ fontWeight: 800 }} />;
      case 'ready':
        return <Chip label="Ready for Serve / Pick" color="info" size="small" sx={{ fontWeight: 800 }} />;
      case 'cancelled':
        return <Chip label="Cancelled" color="error" size="small" sx={{ fontWeight: 800 }} />;
      default:
        return <Chip label="Pending Confirmation ⏳" color="secondary" size="small" sx={{ fontWeight: 800 }} />;
    }
  };

  return (
    <>
      <Navbar />
      <Box sx={{ bgcolor: '#FFF8F2', minHeight: '100vh', py: { xs: 4, md: 6 } }}>
        <Container maxWidth="lg">
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" color="#C62828" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <ReceiptLong sx={{ fontSize: 36 }} /> My Order History
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Track your live food orders and view past dining receipts from Pala Pitta Ruchulu
              </Typography>
            </Box>
            <Link href="/menu" style={{ textDecoration: 'none' }}>
              <Button variant="contained" color="primary" startIcon={<LocalDining />} sx={{ borderRadius: '12px', fontWeight: 700 }}>
                Order Fresh Food
              </Button>
            </Link>
          </Box>

          {/* Filters Bar */}
          <Paper sx={{ p: 2.5, mb: 4, borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, md: 5 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search by Order ID or Dish name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search sx={{ color: '#9E9E9E' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Filter by Mobile Number..."
                  value={phoneFilter}
                  onChange={(e) => setPhoneFilter(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone sx={{ color: '#9E9E9E', fontSize: 18 }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', py: 0.5 }}>
                  {['all', 'pending', 'preparing', 'completed'].map((st) => (
                    <Chip
                      key={st}
                      label={st.toUpperCase()}
                      clickable
                      color={filterStatus === st ? 'primary' : 'default'}
                      onClick={() => setFilterStatus(st)}
                      sx={{ fontWeight: 700, fontSize: '11px' }}
                    />
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </Paper>

          {/* Orders List */}
          {isLoadingDB ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <CircularProgress color="primary" />
              <Typography sx={{ mt: 2, fontWeight: 600, color: 'text.secondary' }}>Loading your orders...</Typography>
            </Box>
          ) : filteredOrders.length === 0 ? (
            <Paper sx={{ p: 6, borderRadius: '24px', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
              <ShoppingBag sx={{ fontSize: 64, color: '#CCCCCC', mb: 2 }} />
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#424242', mb: 1 }}>
                No Orders Found
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                {search || phoneFilter ? 'No orders match your search filter.' : 'You haven’t placed any orders yet.'}
              </Typography>
              <Link href="/menu" style={{ textDecoration: 'none' }}>
                <Button variant="contained" color="primary" size="large" sx={{ borderRadius: '12px', fontWeight: 700 }}>
                  Explore Menu
                </Button>
              </Link>
            </Paper>
          ) : (
            <Stack spacing={3}>
              {filteredOrders.map((order) => (
                <Paper
                  key={order.id}
                  sx={{
                    p: { xs: 2.5, md: 3.5 },
                    borderRadius: '20px',
                    boxShadow: '0 6px 24px rgba(0,0,0,0.06)',
                    border: '1px solid rgba(198,40,40,0.12)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: '0 12px 36px rgba(198,40,40,0.15)',
                    },
                  }}
                >
                  {/* Card Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#C62828' }}>
                          #{order.id}
                        </Typography>
                        {getStatusChip(order.status)}
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <AccessTime sx={{ fontSize: 14 }} /> Placed on {order.orderDate} at {order.orderTime}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                      <Typography variant="h6" sx={{ fontWeight: 900, color: '#2E7D32' }}>
                        ₹{order.grandTotal.toLocaleString()}
                      </Typography>
                      <Chip
                        icon={order.paymentMode === 'cod' ? <LocalAtm sx={{ fontSize: '14px !important' }} /> : <Payment sx={{ fontSize: '14px !important' }} />}
                        label={order.paymentMode === 'cod' ? 'CASH ON DELIVERY' : 'ONLINE PAID'}
                        size="small"
                        color={order.paymentStatus === 'paid' ? 'success' : 'warning'}
                        variant="outlined"
                        sx={{ fontWeight: 800, fontSize: '10px', mt: 0.5 }}
                      />
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Customer Info */}
                  <Box sx={{ display: 'flex', gap: 3, mb: 2, flexWrap: 'wrap' }}>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
                      <Person sx={{ fontSize: 16, color: '#616161' }} /> Customer: {order.customerName}
                    </Typography>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                      <Phone sx={{ fontSize: 16 }} /> {order.customerPhone}
                    </Typography>
                  </Box>

                  {/* Items List */}
                  <Box sx={{ bgcolor: '#FAF5EF', p: 2, borderRadius: '14px', mb: 2.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#616161', display: 'block', mb: 1, letterSpacing: 0.5 }}>
                      ORDERED DISHES ({order.items.reduce((s, i) => s + i.quantity, 0)} ITEMS)
                    </Typography>
                    <Grid container spacing={1.5}>
                      {order.items.map((item, idx) => (
                        <Grid size={{ xs: 12, sm: 6 }} key={idx}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#FFFFFF', p: 1.2, px: 2, borderRadius: '10px' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box className={item.vegStatus === 'veg' ? 'veg-indicator' : 'non-veg-indicator'} />
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {item.name} × {item.quantity}
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#C62828' }}>
                              ₹{item.price * item.quantity}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>

                  {/* Actions Footer */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Table / Counter: {order.customerAddress}
                    </Typography>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      startIcon={<Replay />}
                      onClick={() => handleReorder(order.items)}
                      sx={{ borderRadius: '10px', fontWeight: 700 }}
                    >
                      Re-Order Dishes
                    </Button>
                  </Box>
                </Paper>
              ))}
            </Stack>
          )}
        </Container>
      </Box>
      <Footer />
    </>
  );
}
