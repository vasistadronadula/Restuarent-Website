'use client';
import React from 'react';
import { Box, Paper, Typography, Grid, Chip, Alert } from '@mui/material';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';

const statusColors: Record<string, string> = {
  pending: '#9E9E9E',
  preparing: '#FF9800',
  ready: '#2E7D32',
  delivered: '#1565C0',
  cancelled: '#C62828',
};


export default function KitchenPage() {
  const { orders, updateOrderStatus } = useAdmin();

  // Filter Active Kitchen Orders (Pending, Preparing, Ready)
  const activeOrders = orders.filter((o) => o.status !== 'cancelled');

  const pendingCount = activeOrders.filter((o) => o.status === 'pending').length;
  const preparingCount = activeOrders.filter((o) => o.status === 'preparing').length;
  const readyCount = activeOrders.filter((o) => o.status === 'ready').length;
  const deliveredCount = activeOrders.filter((o) => o.status === 'delivered').length;

  return (
    <AdminLayout title="Kitchen Display System (KDS)">
      {/* Header Stats */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { label: 'In Queue', value: pendingCount, color: '#9E9E9E', emoji: '⏳' },
          { label: 'Cooking Now', value: preparingCount, color: '#FF9800', emoji: '🔥' },
          { label: 'Ready for Pickup', value: readyCount, color: '#2E7D32', emoji: '🛎️' },
          { label: 'Delivered Today', value: deliveredCount, color: '#1565C0', emoji: '✅' },
        ].map((stat) => (
          <Grid key={stat.label} size={{ xs: 6, md: 3 }}>
            <Paper sx={{ p: 2.5, borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography sx={{ fontSize: '2rem' }}>{stat.emoji}</Typography>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: stat.color }}>{stat.value}</Typography>
                <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {activeOrders.length === 0 ? (
        <Alert severity="info" sx={{ p: 4, borderRadius: '16px', textAlign: 'center', fontWeight: 600 }}>
          👨‍🍳 Kitchen tickets queue is currently empty. New live customer orders from website & POS will appear here instantly!
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {activeOrders.map((order) => (
            <Grid key={order.id} size={{ xs: 12, md: 6 }}>
              <Paper
                sx={{
                  borderRadius: '20px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                  border: `2px solid ${order.status === 'preparing' ? '#FF9800' : 'transparent'}`,
                }}
              >
                {/* Ticket Header */}
                <Box
                  sx={{
                    p: 2,
                    bgcolor: order.status === 'ready' ? 'rgba(46,125,50,0.08)' : order.status === 'preparing' ? 'rgba(255,152,0,0.08)' : '#FAFAFA',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#C62828' }}>{order.orderId || order.id}</Typography>
                      {order.orderSource === 'swiggy' && (
                        <Chip label="🟠 SWIGGY" size="small" sx={{ bgcolor: '#FFF3E0', color: '#E65100', fontSize: '10px', fontWeight: 800 }} />
                      )}
                      {order.orderSource === 'zomato' && (
                        <Chip label="🔴 ZOMATO" size="small" sx={{ bgcolor: '#FFEBEE', color: '#C62828', fontSize: '10px', fontWeight: 800 }} />
                      )}
                      {order.tableNumber && (
                        <Chip label={`Table #${order.tableNumber}`} size="small" sx={{ bgcolor: '#C62828', color: 'white', fontSize: '10px', fontWeight: 700 }} />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {order.customerName || 'Diner'} • {order.orderTime || 'Live'}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Chip
                      label={(order.status || 'pending').toUpperCase()}
                      size="small"
                      sx={{
                        bgcolor: (statusColors[order.status] || '#9E9E9E') + '22',
                        color: statusColors[order.status] || '#9E9E9E',
                        fontWeight: 700,
                      }}
                    />
                  </Box>
                </Box>

                {/* Items List */}
                <Box sx={{ p: 2 }}>
                  {(order.items || []).map((item, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: 'flex',
                        justify: 'space-between',
                        alignItems: 'center',
                        py: 1,
                        borderBottom: i < order.items.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                      </Box>
                      <Chip label={`×${item.quantity || 1}`} size="small" sx={{ bgcolor: '#F5F5F5', fontSize: '11px', fontWeight: 700 }} />
                    </Box>
                  ))}

                  {/* Real-time Status Actions */}
                  <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'flex-end' }}>
                    {order.status === 'pending' && (
                      <Chip
                        label="🔥 Start Cooking"
                        onClick={() => updateOrderStatus(order.id, 'preparing')}
                        sx={{ bgcolor: '#FF9800', color: 'white', fontWeight: 700, cursor: 'pointer', '&:hover': { bgcolor: '#E65100' } }}
                      />
                    )}
                    {order.status === 'preparing' && (
                      <Chip
                        label="🛎️ Mark Ready"
                        onClick={() => updateOrderStatus(order.id, 'ready')}
                        sx={{ bgcolor: '#2E7D32', color: 'white', fontWeight: 700, cursor: 'pointer', '&:hover': { bgcolor: '#1B5E20' } }}
                      />
                    )}
                    {order.status === 'ready' && (
                      <Chip
                        label="✅ Mark Delivered"
                        onClick={() => updateOrderStatus(order.id, 'delivered')}
                        sx={{ bgcolor: '#1565C0', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                      />
                    )}
                    {order.status === 'delivered' && (
                      <Chip label="🎉 Completed" sx={{ bgcolor: '#616161', color: 'white', fontWeight: 700 }} />
                    )}
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </AdminLayout>
  );
}
