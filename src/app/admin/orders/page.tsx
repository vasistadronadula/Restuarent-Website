'use client';
import React, { useState, useMemo } from 'react';
import {
  Box, Grid, Typography, Chip, IconButton, Button, TextField,
  Table, TableBody, TableCell, TableHead, TableRow, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  InputAdornment, Tooltip, Stack, useMediaQuery, useTheme,
} from '@mui/material';
import {
  Search, Visibility, CheckCircle, Close,
  LocalShipping, Cancel, HourglassEmpty, Restaurant,
} from '@mui/icons-material';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { Order, OrderStatus } from '@/types';
import { PageHeader, StatCard, SectionCard, StatusChip, EmptyState, adminColors, orderStatusColors } from '@/components/admin/ui';

const statusIcons: Record<OrderStatus, React.ReactElement> = {
  pending: <HourglassEmpty sx={{ fontSize: 14 }} />,
  preparing: <Restaurant sx={{ fontSize: 14 }} />,
  ready: <CheckCircle sx={{ fontSize: 14 }} />,
  delivered: <LocalShipping sx={{ fontSize: 14 }} />,
  cancelled: <Cancel sx={{ fontSize: 14 }} />,
};

const nextStatus: Record<OrderStatus, OrderStatus | null> = {
  pending: 'preparing', preparing: 'ready', ready: 'delivered', delivered: null, cancelled: null,
};

export default function OrdersPage() {
  const { orders, updateOrderStatus } = useAdmin();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch = !search || o.customerName.toLowerCase().includes(search.toLowerCase()) || o.orderId.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || o.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [orders, search, filterStatus]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return counts;
  }, [orders]);

  const quickStats = [
    { key: 'pending', label: 'Pending', emoji: '⏳', accent: orderStatusColors.pending.color },
    { key: 'preparing', label: 'Preparing', emoji: '👨‍🍳', accent: orderStatusColors.preparing.color },
    { key: 'ready', label: 'Ready', emoji: '🛎️', accent: orderStatusColors.ready.color },
    { key: 'delivered', label: 'Delivered', emoji: '✅', accent: orderStatusColors.delivered.color },
  ];

  return (
    <AdminLayout title="Orders Management">
      <PageHeader title="Orders" subtitle={`${filtered.length} of ${orders.length} orders`} />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {quickStats.map((s) => (
          <Grid key={s.key} size={{ xs: 6, md: 3 }}>
            <StatCard icon={s.emoji} label={s.label} value={statusCounts[s.key] || 0} accent={s.accent} />
          </Grid>
        ))}
      </Grid>

      {/* Status Filter Chips */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        {(['all', 'pending', 'preparing', 'ready', 'delivered', 'cancelled'] as const).map((s) => (
          <Chip
            key={s}
            label={`${s === 'all' ? 'All' : orderStatusColors[s]?.label} (${statusCounts[s] || 0})`}
            onClick={() => setFilterStatus(s)}
            sx={{
              fontWeight: filterStatus === s ? 700 : 500,
              bgcolor: filterStatus === s ? (s === 'all' ? adminColors.accentRed : orderStatusColors[s]?.color) : adminColors.bgPanel,
              color: filterStatus === s ? 'white' : '#424242',
              boxShadow: adminColors.shadowSm,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          />
        ))}
      </Box>

      <SectionCard noPadding>
        {/* Table Header */}
        <Box sx={{ p: 2.5, display: 'flex', gap: 2, alignItems: 'center', borderBottom: `1px solid ${adminColors.divider}` }}>
          <TextField
            size="small" placeholder="Search orders or customers..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1 }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ color: '#9E9E9E', fontSize: 18 }} /></InputAdornment> } }}
          />
        </Box>

        {filtered.length === 0 ? (
          <EmptyState emoji="📦" title="No orders found" subtitle="Try a different search or filter." />
        ) : isTablet ? (
          /* ── Mobile / tablet: card list ─────────────────────────────── */
          <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Stack spacing={1.5}>
              {filtered.map((order) => {
                const next = nextStatus[order.status];
                return (
                  <Box
                    key={order.id}
                    sx={{ p: 1.75, borderRadius: adminColors.radiusMd, border: `1px solid ${adminColors.borderSubtle}`, bgcolor: adminColors.bgSubtle }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', minWidth: 0 }}>
                        <Avatar sx={{ width: 34, height: 34, bgcolor: adminColors.accentRed, fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                          {order.customerName.split(' ').map(n => n[0]).join('')}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{order.customerName}</Typography>
                          <Typography variant="caption" color="primary" sx={{ fontWeight: 700 }}>{order.orderId}</Typography>
                        </Box>
                      </Box>
                      <Typography sx={{ fontWeight: 800, color: adminColors.textPrimary, flexShrink: 0 }}>
                        ₹{order.grandTotal.toLocaleString()}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.25, gap: 1 }}>
                      <StatusChip status={order.status} palette={orderStatusColors} />
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton size="small" onClick={() => setSelectedOrder(order)} sx={{ bgcolor: 'white', border: `1px solid ${adminColors.border}` }}>
                          <Visibility fontSize="small" sx={{ color: '#616161' }} />
                        </IconButton>
                        {next && (
                          <Button
                            size="small" variant="contained"
                            onClick={() => updateOrderStatus(order.id, next)}
                            sx={{ fontSize: '11px', bgcolor: orderStatusColors[next].color, borderRadius: adminColors.radiusSm, fontWeight: 700 }}
                          >
                            {orderStatusColors[next].label}
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        ) : (
          /* ── Desktop: table ──────────────────────────────────────────── */
          <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 800 }}>
              <TableHead sx={{ bgcolor: adminColors.bgSubtle }}>
                <TableRow>
                  {['Order ID', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Time', 'Actions'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '12px', color: '#616161', py: 1.5, whiteSpace: 'nowrap' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((order) => {
                  const next = nextStatus[order.status];
                  return (
                    <TableRow key={order.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell>
                        <Typography variant="body2" color="primary" sx={{ fontWeight: 700 }}>{order.orderId}</Typography>
                        {order.orderSource === 'swiggy' && (
                          <Chip label="🟠 SWIGGY" size="small" sx={{ bgcolor: '#FFF3E0', color: '#E65100', fontSize: '9px', fontWeight: 800, height: 18 }} />
                        )}
                        {order.orderSource === 'zomato' && (
                          <Chip label="🔴 ZOMATO" size="small" sx={{ bgcolor: '#FFEBEE', color: '#C62828', fontSize: '9px', fontWeight: 800, height: 18 }} />
                        )}
                        {order.tableNumber && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Table {order.tableNumber}</Typography>}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: adminColors.accentRed, fontSize: '11px', fontWeight: 700 }}>
                            {order.customerName.split(' ').map(n => n[0]).join('')}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{order.customerName}</Typography>
                            <Typography variant="caption" color="text.secondary">{order.customerPhone}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{order.items.length} items</Typography>
                        <Typography variant="caption" color="text.secondary">{order.items.map(i => i.name).slice(0, 2).join(', ')}{order.items.length > 2 ? '...' : ''}</Typography>
                      </TableCell>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>₹{order.grandTotal.toLocaleString()}</Typography></TableCell>
                      <TableCell>
                        <Chip label={order.paymentMode.toUpperCase()} size="small"
                          sx={{ bgcolor: 'rgba(0,0,0,0.06)', fontWeight: 600, fontSize: '10px' }} />
                        <Typography variant="caption" color={order.paymentStatus === 'paid' ? 'success.main' : 'warning.main'} sx={{ display: 'block', fontWeight: 600 }}>
                          {order.paymentStatus}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip icon={statusIcons[order.status]} label={orderStatusColors[order.status]?.label} size="small"
                          sx={{ bgcolor: orderStatusColors[order.status]?.bg, color: orderStatusColors[order.status]?.color, fontWeight: 600, fontSize: '11px' }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">{order.orderDate}</Typography>
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>{order.orderTime}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => setSelectedOrder(order)}>
                              <Visibility fontSize="small" sx={{ color: '#616161' }} />
                            </IconButton>
                          </Tooltip>
                          {next && (
                            <Tooltip title={`Mark as ${orderStatusColors[next].label}`}>
                              <Button
                                size="small" variant="contained"
                                onClick={() => updateOrderStatus(order.id, next)}
                                sx={{
                                  fontSize: '10px', py: 0.3, px: 1, minWidth: 'unset',
                                  bgcolor: orderStatusColors[next].color, borderRadius: '8px',
                                  '&:hover': { opacity: 0.85 },
                                }}
                              >
                                {orderStatusColors[next].label}
                              </Button>
                            </Tooltip>
                          )}
                          {order.status !== 'cancelled' && order.status !== 'delivered' && (
                            <Tooltip title="Cancel Order">
                              <IconButton size="small" onClick={() => updateOrderStatus(order.id, 'cancelled')}>
                                <Cancel fontSize="small" sx={{ color: '#C62828' }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </SectionCard>

      {/* Order Detail Dialog */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onClose={() => setSelectedOrder(null)} maxWidth="sm" fullWidth fullScreen={isMobile}>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, gap: 1 }}>
            <Box sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Order Details – {selectedOrder.orderId}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
              <StatusChip status={selectedOrder.status} palette={orderStatusColors} />
              {isMobile && (
                <IconButton size="small" onClick={() => setSelectedOrder(null)} aria-label="Close">
                  <Close fontSize="small" />
                </IconButton>
              )}
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="subtitle2" color="text.secondary" sx={{fontWeight: 700, mb: 1}}>CUSTOMER</Typography>
            <Typography sx={{fontWeight: 600}}>{selectedOrder.customerName}</Typography>
            <Typography variant="body2" color="text.secondary">{selectedOrder.customerPhone}</Typography>
            <Typography variant="body2" color="text.secondary">{selectedOrder.customerAddress}</Typography>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="text.secondary" sx={{fontWeight: 700, mb: 1.5}}>ITEMS</Typography>
            {selectedOrder.items.map((item, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box className={item.vegStatus === 'veg' ? 'veg-indicator' : 'non-veg-indicator'} />
                  <Typography variant="body2">{item.name} × {item.quantity}</Typography>
                </Box>
                <Typography variant="body2" sx={{fontWeight: 600}}>₹{(item.price * item.quantity).toLocaleString()}</Typography>
              </Box>
            ))}

            <Divider sx={{ my: 2 }} />
            <Stack spacing={0.8}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                <Typography variant="body2">₹{selectedOrder.subtotal.toLocaleString()}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">CGST (2.5%)</Typography>
                <Typography variant="body2">₹{selectedOrder.cgst.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">SGST (2.5%)</Typography>
                <Typography variant="body2">₹{selectedOrder.sgst.toFixed(2)}</Typography>
              </Box>
              {selectedOrder.discount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="success.main">Discount</Typography>
                  <Typography variant="body2" color="success.main">-₹{selectedOrder.discount}</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                <Typography variant="subtitle1" sx={{fontWeight: 800}}>Grand Total</Typography>
                <Typography variant="subtitle1" color="primary" sx={{fontWeight: 800}}>₹{selectedOrder.grandTotal.toLocaleString()}</Typography>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pb: isMobile ? 'max(20px, env(safe-area-inset-bottom, 0px))' : 2.5, gap: 1 }}>
            <Button onClick={() => setSelectedOrder(null)} variant="outlined" sx={{ borderRadius: '10px' }}>Close</Button>
            {nextStatus[selectedOrder.status] && (
              <Button
                variant="contained"
                onClick={() => { updateOrderStatus(selectedOrder.id, nextStatus[selectedOrder.status]!); setSelectedOrder(null); }}
                sx={{ borderRadius: '10px', bgcolor: orderStatusColors[nextStatus[selectedOrder.status]!].color }}
              >
                Mark as {orderStatusColors[nextStatus[selectedOrder.status]!].label}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      )}
    </AdminLayout>
  );
}
