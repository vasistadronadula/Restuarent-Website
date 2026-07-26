'use client';
import React, { useState, useMemo } from 'react';
import {
  Box, Paper, Typography, Chip, IconButton, Button, TextField,
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

const statusConfig: Record<OrderStatus, { label: string; color: string; bg: string; icon: React.ReactElement }> = {
  pending:   { label: 'Pending',   color: '#FF9800', bg: 'rgba(255,152,0,0.1)',     icon: <HourglassEmpty sx={{ fontSize: 14 }} /> },
  preparing: { label: 'Preparing', color: '#1565C0', bg: 'rgba(21,101,192,0.1)',   icon: <Restaurant sx={{ fontSize: 14 }} /> },
  ready:     { label: 'Ready',     color: '#2E7D32', bg: 'rgba(46,125,50,0.1)',    icon: <CheckCircle sx={{ fontSize: 14 }} /> },
  delivered: { label: 'Delivered', color: '#616161', bg: 'rgba(97,97,97,0.1)',     icon: <LocalShipping sx={{ fontSize: 14 }} /> },
  cancelled: { label: 'Cancelled', color: '#C62828', bg: 'rgba(198,40,40,0.1)',    icon: <Cancel sx={{ fontSize: 14 }} /> },
};

const nextStatus: Record<OrderStatus, OrderStatus | null> = {
  pending: 'preparing', preparing: 'ready', ready: 'delivered', delivered: null, cancelled: null,
};

export default function OrdersPage() {
  const { orders, updateOrderStatus } = useAdmin();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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

  return (
    <AdminLayout title="Orders Management">
      {/* Status Filter Chips */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        {(['all', 'pending', 'preparing', 'ready', 'delivered', 'cancelled'] as const).map((s) => (
          <Chip
            key={s}
            label={`${s === 'all' ? 'All' : statusConfig[s as OrderStatus]?.label} (${statusCounts[s] || 0})`}
            onClick={() => setFilterStatus(s)}
            sx={{
              fontWeight: filterStatus === s ? 700 : 500,
              bgcolor: filterStatus === s ? (s === 'all' ? '#C62828' : statusConfig[s as OrderStatus]?.color) : 'white',
              color: filterStatus === s ? 'white' : '#424242',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          />
        ))}
      </Box>

      <Paper sx={{ borderRadius: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {/* Table Header */}
        <Box sx={{ p: 2.5, display: 'flex', gap: 2, alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <TextField
            size="small" placeholder="Search orders or customers..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1 }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ color: '#9E9E9E', fontSize: 18 }} /></InputAdornment> } }}
          />
          <Typography variant="body2" color="text.secondary">{filtered.length} orders</Typography>
        </Box>

        <Box sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead sx={{ bgcolor: '#FAFAFA' }}>
              <TableRow>
                {['Order ID', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Time', 'Actions'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: '12px', color: '#616161', py: 1.5, whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((order) => {
                const sc = statusConfig[order.status] || statusConfig.pending;
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
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#C62828', fontSize: '11px', fontWeight: 700 }}>
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
                      <Chip icon={sc.icon} label={sc.label} size="small"
                        sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 600, fontSize: '11px' }} />
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
                          <Tooltip title={`Mark as ${statusConfig[next].label}`}>
                            <Button
                              size="small" variant="contained"
                              onClick={() => updateOrderStatus(order.id, next)}
                              sx={{
                                fontSize: '10px', py: 0.3, px: 1, minWidth: 'unset',
                                bgcolor: statusConfig[next].color, borderRadius: '8px',
                                '&:hover': { opacity: 0.85 },
                              }}
                            >
                              {statusConfig[next].label}
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

        {filtered.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h2" sx={{ fontSize: '2.5rem', mb: 1 }}>📦</Typography>
            <Typography color="text.secondary">No orders found</Typography>
          </Box>
        )}
      </Paper>

      {/* Order Detail Dialog */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onClose={() => setSelectedOrder(null)} maxWidth="sm" fullWidth fullScreen={isMobile}>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, gap: 1 }}>
            <Box sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Order Details – {selectedOrder.orderId}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
              <Chip
                label={statusConfig[selectedOrder.status].label}
                size="small"
                sx={{ bgcolor: statusConfig[selectedOrder.status].bg, color: statusConfig[selectedOrder.status].color, fontWeight: 700 }}
              />
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
                sx={{ borderRadius: '10px', bgcolor: statusConfig[nextStatus[selectedOrder.status]!].color }}
              >
                Mark as {statusConfig[nextStatus[selectedOrder.status]!].label}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      )}
    </AdminLayout>
  );
}
