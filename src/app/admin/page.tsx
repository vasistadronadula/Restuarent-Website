'use client';
import React from 'react';
import {
  Box, Grid, Typography, Paper, Avatar, Chip, LinearProgress,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton,
  Divider, Button, Tooltip,
} from '@mui/material';
import {
  TrendingUp, TrendingDown, AttachMoney, Receipt, BookOnline,
  People, Pending, ArrowUpward, ArrowDownward, MoreVert, Visibility,
  Restaurant, LocalFireDepartment,
} from '@mui/icons-material';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip,
  CartesianGrid, Legend,
} from 'recharts';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { dailySales, categoryRevenue } from '@/data/mockData';
import Link from 'next/link';

const COLORS = ['#C62828', '#FF9800', '#2E7D32', '#1565C0', '#7B1FA2', '#F57C00', '#00838F'];

const statCards = [
  {
    title: "Today's Revenue",
    value: '₹48,650',
    change: '+12.5%',
    up: true,
    icon: <AttachMoney />,
    color: '#C62828',
    bg: 'rgba(198,40,40,0.1)',
    sub: 'vs ₹43,250 yesterday',
  },
  {
    title: "Today's Orders",
    value: '126',
    change: '+8.3%',
    up: true,
    icon: <Receipt />,
    color: '#FF9800',
    bg: 'rgba(255,152,0,0.1)',
    sub: '23 pending • 41 preparing',
  },
  {
    title: 'Reservations',
    value: '24',
    change: '+3',
    up: true,
    icon: <BookOnline />,
    color: '#2E7D32',
    bg: 'rgba(46,125,50,0.1)',
    sub: '8 confirmed • 3 pending',
  },
  {
    title: 'Total Customers',
    value: '842',
    change: '+5.1%',
    up: true,
    icon: <People />,
    color: '#1565C0',
    bg: 'rgba(21,101,192,0.1)',
    sub: '12 new today',
  },
];

const recentOrders = [
  { id: 'ORD-2026-0001', customer: 'Rahul Sharma', items: 4, amount: 1405, status: 'delivered', time: '13:45' },
  { id: 'ORD-2026-0002', customer: 'Priya Reddy', items: 3, amount: 680, status: 'preparing', time: '14:02' },
  { id: 'ORD-2026-0003', customer: 'Arjun Kumar', items: 3, amount: 1391, status: 'pending', time: '14:15' },
  { id: 'ORD-2026-0004', customer: 'Ayesha Khan', items: 3, amount: 1009, status: 'ready', time: '14:20' },
  { id: 'ORD-2026-0005', customer: 'Rohit Verma', items: 3, amount: 754, status: 'delivered', time: '12:30' },
];

const statusConfig = {
  pending:   { label: 'Pending',   color: '#FF9800', bg: 'rgba(255,152,0,0.1)' },
  preparing: { label: 'Preparing', color: '#1565C0', bg: 'rgba(21,101,192,0.1)' },
  ready:     { label: 'Ready',     color: '#2E7D32', bg: 'rgba(46,125,50,0.1)' },
  delivered: { label: 'Delivered', color: '#616161', bg: 'rgba(97,97,97,0.1)' },
  cancelled: { label: 'Cancelled', color: '#C62828', bg: 'rgba(198,40,40,0.1)' },
};

const topItems = [
  { name: 'Chicken Dum Biryani', orders: 48, revenue: '₹15,360', pct: 92 },
  { name: 'Butter Chicken',       orders: 35, revenue: '₹11,900', pct: 78 },
  { name: 'Paneer Butter Masala', orders: 29, revenue: '₹8,120', pct: 68 },
  { name: 'Mutton Dum Biryani',   orders: 22, revenue: '₹9,240', pct: 55 },
  { name: 'Mango Lassi',          orders: 18, revenue: '₹1,800', pct: 42 },
];

const activities = [
  { icon: '🆕', text: 'New order from Arjun Kumar', time: '2 min ago' },
  { icon: '✅', text: 'Order ORD-2026-0001 delivered', time: '8 min ago' },
  { icon: '📅', text: 'Reservation confirmed for Priya Reddy', time: '15 min ago' },
  { icon: '⚠️', text: 'Low stock: Chicken (18 kg)', time: '28 min ago' },
  { icon: '💰', text: 'Bill generated: ₹1,405 — Rahul Sharma', time: '45 min ago' },
  { icon: '👤', text: 'New customer registered: Vikram Singh', time: '1 hr ago' },
];

export default function AdminDashboard() {
  return (
    <AdminLayout title="Dashboard">
      {/* Stat Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {statCards.map((card) => (
          <Grid key={card.title} size={{ xs: 12, sm: 6, xl: 3 }}>
            <Paper sx={{ p: 3, borderRadius: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{fontWeight: 600, letterSpacing: 0.5}}>
                    {card.title.toUpperCase()}
                  </Typography>
                  <Typography variant="h4" sx={{fontWeight: 800, my: 0.5, color: '#212121'}}>
                    {card.value}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {card.up
                      ? <TrendingUp sx={{ fontSize: 16, color: '#2E7D32' }} />
                      : <TrendingDown sx={{ fontSize: 16, color: '#C62828' }} />}
                    <Typography variant="caption" sx={{ color: card.up ? '#2E7D32' : '#C62828', fontWeight: 700 }}>
                      {card.change}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>{card.sub}</Typography>
                  </Box>
                </Box>
                <Box sx={{
                  width: 52, height: 52, borderRadius: '14px',
                  bgcolor: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: card.color, fontSize: 24,
                }}>
                  {card.icon}
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Revenue Chart */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: 3, borderRadius: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h6" sx={{fontWeight: 700}}>Revenue Overview</Typography>
                <Typography variant="caption" color="text.secondary">Last 14 days</Typography>
              </Box>
              <Chip label="This Month" size="small" sx={{ bgcolor: 'rgba(198,40,40,0.1)', color: '#C62828', fontWeight: 600 }} />
            </Box>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailySales}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#C62828" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#C62828" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <RechartsTooltip
                  formatter={(v: any) => [`₹${Number(v || 0).toLocaleString()}`, 'Revenue']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#C62828" strokeWidth={2.5} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Category Pie */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ p: 3, borderRadius: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', height: '100%' }}>
            <Typography variant="h6" sx={{fontWeight: 700, mb: 0.5}}>Sales by Category</Typography>
            <Typography variant="caption" color="text.secondary" sx={{display: 'block', mb: 2}}>Revenue distribution</Typography>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={categoryRevenue} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, value }) => `${value}%`} labelLine={false}>
                  {categoryRevenue.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <RechartsTooltip formatter={(v) => [`${v}%`, 'Share']} contentStyle={{ borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {categoryRevenue.map((cat, i) => (
                <Box key={cat.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: COLORS[i % COLORS.length] }} />
                  <Typography variant="caption" color="text.secondary">{cat.name}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        {/* Recent Orders */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ borderRadius: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Recent Orders</Typography>
              <Link href="/admin/orders" style={{ textDecoration: 'none' }}>
                <Button size="small" color="primary" endIcon={<Visibility />}>View All</Button>
              </Link>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 600 }}>
                <TableHead sx={{ bgcolor: '#FAFAFA' }}>
                  <TableRow>
                    {['Order ID', 'Customer', 'Items', 'Amount', 'Status', 'Time'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: '12px', color: '#616161', py: 1.5, whiteSpace: 'nowrap' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentOrders.map((order) => {
                    const sc = statusConfig[order.status as keyof typeof statusConfig];
                    return (
                      <TableRow key={order.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: '#C62828' }}>{order.id}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 30, height: 30, bgcolor: '#C62828', fontSize: '11px', fontWeight: 700 }}>
                              {order.customer.split(' ').map(n => n[0]).join('')}
                            </Avatar>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{order.customer}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell><Typography variant="body2" color="text.secondary">{order.items} items</Typography></TableCell>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>₹{order.amount.toLocaleString()}</Typography></TableCell>
                        <TableCell>
                          <Chip label={sc.label} size="small" sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 600, fontSize: '11px' }} />
                        </TableCell>
                        <TableCell><Typography variant="caption" color="text.secondary">{order.time}</Typography></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        </Grid>

        {/* Right Column */}
        <Grid size={{ xs: 12, lg: 4 }}>
          {/* Top Items */}
          <Paper sx={{ p: 3, borderRadius: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', mb: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <LocalFireDepartment sx={{ color: '#C62828' }} />
              <Typography variant="h6" sx={{fontWeight: 700}}>Top Selling Items</Typography>
            </Box>
            {topItems.map((item, i) => (
              <Box key={item.name} sx={{ mb: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ width: 20, height: 20, borderRadius: '6px', bgcolor: i === 0 ? '#C62828' : '#F5F5F5', color: i === 0 ? 'white' : '#616161', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                      {i + 1}
                    </Typography>
                    <Typography variant="body2" sx={{fontWeight: 600, maxWidth: 140}}>{item.name}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" sx={{fontWeight: 700}}>{item.orders} orders</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{display: 'block'}}>{item.revenue}</Typography>
                  </Box>
                </Box>
                <LinearProgress variant="determinate" value={item.pct}
                  sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(0,0,0,0.06)',
                    '& .MuiLinearProgress-bar': { bgcolor: i === 0 ? '#C62828' : i === 1 ? '#FF9800' : '#1565C0', borderRadius: 3 } }} />
              </Box>
            ))}
          </Paper>

          {/* Activity Feed */}
          <Paper sx={{ p: 3, borderRadius: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            <Typography variant="h6" sx={{fontWeight: 700, mb: 2.5}}>Latest Activity</Typography>
            {activities.map((a, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 2, '&:last-child': { mb: 0 } }}>
                <Typography sx={{ fontSize: '1.2rem', flexShrink: 0 }}>{a.icon}</Typography>
                <Box>
                  <Typography variant="body2" sx={{fontWeight: 500}}>{a.text}</Typography>
                  <Typography variant="caption" color="text.secondary">{a.time}</Typography>
                </Box>
              </Box>
            ))}
          </Paper>
        </Grid>
      </Grid>
    </AdminLayout>
  );
}
