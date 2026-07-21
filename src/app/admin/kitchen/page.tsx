'use client';
import React, { useState } from 'react';
import { Box, Paper, Typography, Grid, Chip, LinearProgress, Avatar, Divider, IconButton, Tooltip } from '@mui/material';
import { Kitchen as KitchenIcon, Timer, LocalFireDepartment, CheckCircle, PlayArrow, Refresh } from '@mui/icons-material';
import AdminLayout from '@/components/admin/AdminLayout';

const kitchenOrders = [
  {
    orderId: 'ORD-2026-0003', table: 8, customer: 'Arjun Kumar',
    items: [{ name: 'Mutton Dum Biryani', qty: 2, status: 'cooking' }, { name: 'Seekh Kebab', qty: 1, status: 'queued' }, { name: 'Garlic Naan', qty: 3, status: 'ready' }],
    status: 'cooking', priority: 'high', elapsed: 12, total: 50,
  },
  {
    orderId: 'ORD-2026-0002', table: 0, customer: 'Priya Reddy',
    items: [{ name: 'Paneer Butter Masala', qty: 1, status: 'ready' }, { name: 'Masala Dosa', qty: 2, status: 'cooking' }, { name: 'Gulab Jamun', qty: 1, status: 'queued' }],
    status: 'cooking', priority: 'normal', elapsed: 8, total: 20,
  },
  {
    orderId: 'ORD-2026-0004', table: 0, customer: 'Ayesha Khan',
    items: [{ name: 'Mutton Dum Biryani', qty: 1, status: 'ready' }, { name: 'Mutton Rogan Josh', qty: 1, status: 'cooking' }, { name: 'Butter Naan', qty: 4, status: 'ready' }],
    status: 'ready', priority: 'normal', elapsed: 22, total: 25,
  },
  {
    orderId: 'ORD-2026-0007', table: 0, customer: 'Vikram Singh',
    items: [{ name: 'Butter Chicken', qty: 1, status: 'queued' }, { name: 'Garlic Naan', qty: 3, status: 'queued' }, { name: 'Mango Lassi', qty: 1, status: 'queued' }],
    status: 'queued', priority: 'normal', elapsed: 0, total: 30,
  },
];

const statusColors = { queued: '#9E9E9E', cooking: '#FF9800', ready: '#2E7D32' };
const statusIcons = {
  queued: <Timer sx={{ fontSize: 14 }} />,
  cooking: <LocalFireDepartment sx={{ fontSize: 14 }} />,
  ready: <CheckCircle sx={{ fontSize: 14 }} />,
};

export default function KitchenPage() {
  const [orders, setOrders] = useState(kitchenOrders);

  const updateOrderStatus = (orderId: string, status: string) => {
    setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status } : o));
  };

  return (
    <AdminLayout title="Kitchen Status">
      {/* Header Stats */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { label: 'In Queue', value: orders.filter(o => o.status === 'queued').length, color: '#9E9E9E', emoji: '⏳' },
          { label: 'Cooking', value: orders.filter(o => o.status === 'cooking').length, color: '#FF9800', emoji: '🔥' },
          { label: 'Ready', value: orders.filter(o => o.status === 'ready').length, color: '#2E7D32', emoji: '✅' },
          { label: 'High Priority', value: orders.filter(o => o.priority === 'high').length, color: '#C62828', emoji: '🚨' },
        ].map((stat) => (
          <Grid key={stat.label} size={{ xs: 6, md: 3 }}>
            <Paper sx={{ p: 2.5, borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography sx={{ fontSize: '2rem' }}>{stat.emoji}</Typography>
              <Box>
                <Typography variant="h4" sx={{fontWeight: 800, color: stat.color}}>{stat.value}</Typography>
                <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Kitchen Orders */}
      <Grid container spacing={3}>
        {orders.map((order) => (
          <Grid key={order.orderId} size={{ xs: 12, md: 6 }}>
            <Paper
              sx={{
                borderRadius: '20px', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                border: `2px solid ${order.priority === 'high' ? '#C62828' : 'transparent'}`,
              }}
            >
              {/* Order Header */}
              <Box sx={{
                p: 2, bgcolor: order.status === 'ready' ? 'rgba(46,125,50,0.08)' : order.status === 'cooking' ? 'rgba(255,152,0,0.08)' : '#FAFAFA',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" sx={{fontWeight: 700}}>{order.orderId}</Typography>
                    {order.priority === 'high' && <Chip label="HIGH PRIORITY" size="small" sx={{ bgcolor: '#C62828', color: 'white', fontSize: '10px', fontWeight: 700 }} />}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {order.table ? `Table ${order.table}` : 'Delivery'} • {order.customer}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Chip
                    label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    size="small"
                    sx={{ bgcolor: statusColors[order.status as keyof typeof statusColors] + '22', color: statusColors[order.status as keyof typeof statusColors], fontWeight: 700 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{display: 'block', mt: 0.5}}>
                    {order.elapsed}/{order.total} min
                  </Typography>
                </Box>
              </Box>

              {/* Progress */}
              <LinearProgress
                variant="determinate"
                value={order.total > 0 ? (order.elapsed / order.total) * 100 : 0}
                sx={{
                  height: 6,
                  '& .MuiLinearProgress-bar': {
                    bgcolor: order.status === 'ready' ? '#2E7D32' : order.status === 'cooking' ? '#FF9800' : '#9E9E9E',
                  },
                }}
              />

              {/* Items */}
              <Box sx={{ p: 2 }}>
                {order.items.map((item, i) => (
                  <Box key={i} sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    py: 1, borderBottom: i < order.items.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ color: statusColors[item.status as keyof typeof statusColors] }}>
                        {statusIcons[item.status as keyof typeof statusIcons]}
                      </Box>
                      <Typography variant="body2">{item.name}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label={`×${item.qty}`} size="small" sx={{ bgcolor: '#F5F5F5', fontSize: '11px', fontWeight: 600 }} />
                      <Chip
                        label={item.status}
                        size="small"
                        sx={{ bgcolor: statusColors[item.status as keyof typeof statusColors] + '22', color: statusColors[item.status as keyof typeof statusColors], fontSize: '10px', fontWeight: 600 }}
                      />
                    </Box>
                  </Box>
                ))}

                {/* Actions */}
                <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'flex-end' }}>
                  {order.status === 'queued' && (
                    <Chip label="🔥 Start Cooking" onClick={() => updateOrderStatus(order.orderId, 'cooking')}
                      sx={{ bgcolor: '#FF9800', color: 'white', fontWeight: 700, cursor: 'pointer', '&:hover': { bgcolor: '#E65100' } }} />
                  )}
                  {order.status === 'cooking' && (
                    <Chip label="✅ Mark Ready" onClick={() => updateOrderStatus(order.orderId, 'ready')}
                      sx={{ bgcolor: '#2E7D32', color: 'white', fontWeight: 700, cursor: 'pointer', '&:hover': { bgcolor: '#1B5E20' } }} />
                  )}
                  {order.status === 'ready' && (
                    <Chip label="🚀 Served!" sx={{ bgcolor: '#1565C0', color: 'white', fontWeight: 700 }} />
                  )}
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </AdminLayout>
  );
}
