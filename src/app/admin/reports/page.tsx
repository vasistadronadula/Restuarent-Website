'use client';
import React, { useState } from 'react';
import {
  Box, Paper, Typography, Grid, Chip, Button, Tabs, Tab,
} from '@mui/material';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import AdminLayout from '@/components/admin/AdminLayout';
import { dailySales, categoryRevenue } from '@/data/mockData';
import { menuItems } from '@/data/menuData';

const COLORS = ['#C62828', '#FF9800', '#2E7D32', '#1565C0', '#7B1FA2', '#F57C00', '#00838F'];

const weeklyData = [
  { week: 'W1 Jul', revenue: 245000, orders: 648 },
  { week: 'W2 Jul', revenue: 312000, orders: 823 },
  { week: 'W3 Jul', revenue: 289000, orders: 762 },
  { week: 'W4 Jul', revenue: 358000, orders: 941 },
];

const monthlyData = [
  { month: 'Jan', revenue: 980000 },
  { month: 'Feb', revenue: 856000 },
  { month: 'Mar', revenue: 1120000 },
  { month: 'Apr', revenue: 1045000 },
  { month: 'May', revenue: 1289000 },
  { month: 'Jun', revenue: 1156000 },
  { month: 'Jul', revenue: 1348000 },
];

const topCustomersData = [
  { name: 'Ayesha Khan', spent: 15200, orders: 41 },
  { name: 'Arjun Kumar', spent: 12450, orders: 35 },
  { name: 'Rahul Sharma', spent: 8420, orders: 28 },
  { name: 'Rohit Verma', spent: 6780, orders: 22 },
  { name: 'Priya Reddy', spent: 5680, orders: 19 },
];

const summaryStats = [
  { label: 'This Month Revenue', value: '₹13,48,650', change: '+16.5%', up: true },
  { label: 'Avg. Daily Revenue', value: '₹43,505', change: '+8.2%', up: true },
  { label: 'Total Orders (Month)', value: '2,174', change: '+12.1%', up: true },
  { label: 'Avg. Order Value', value: '₹620', change: '+4.8%', up: true },
];

export default function ReportsPage() {
  const [tab, setTab] = useState(0);

  return (
    <AdminLayout title="Reports & Analytics">
      {/* Summary Stats */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {summaryStats.map((s) => (
          <Grid key={s.label} size={{ xs: 6, md: 3 }}>
            <Paper sx={{ p: 2.5, borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{s.label.toUpperCase()}</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>{s.value}</Typography>
              <Chip label={s.change} size="small" sx={{ mt: 0.5, bgcolor: s.up ? 'rgba(46,125,50,0.1)' : 'rgba(198,40,40,0.1)', color: s.up ? '#2E7D32' : '#C62828', fontWeight: 700, fontSize: '11px' }} />
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Tab Views */}
      <Paper sx={{ borderRadius: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden', mb: 3 }}>
        <Box sx={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="primary" indicatorColor="primary" sx={{ px: 2 }}>
            <Tab label="Daily" />
            <Tab label="Weekly" />
            <Tab label="Monthly" />
          </Tabs>
        </Box>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{fontWeight: 700, mb: 2}}>
            {['Daily Revenue (Last 14 Days)', 'Weekly Revenue', 'Monthly Revenue (2026)'][tab]}
          </Typography>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={[dailySales, weeklyData, monthlyData][tab] as any}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey={tab === 0 ? 'date' : tab === 1 ? 'week' : 'month'} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => [`₹${Number(v || 0).toLocaleString()}`, 'Revenue']} contentStyle={{ borderRadius: '12px' }} />
              <Bar dataKey="revenue" fill="#C62828" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Orders vs Customers */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper sx={{ p: 3, borderRadius: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            <Typography variant="h6" sx={{fontWeight: 700, mb: 2}}>Orders & Customers Trend</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailySales}>
                <defs>
                  <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF9800" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FF9800" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="custGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2E7D32" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2E7D32" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '12px' }} />
                <Legend />
                <Area type="monotone" dataKey="orders" name="Orders" stroke="#FF9800" strokeWidth={2} fill="url(#ordersGrad)" />
                <Area type="monotone" dataKey="customers" name="Customers" stroke="#2E7D32" strokeWidth={2} fill="url(#custGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Category Pie */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper sx={{ p: 3, borderRadius: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            <Typography variant="h6" sx={{fontWeight: 700, mb: 2}}>Revenue by Category</Typography>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={categoryRevenue} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`} labelLine={false}>
                  {categoryRevenue.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${v}%`, 'Share']} contentStyle={{ borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {categoryRevenue.map((cat, i) => (
                <Chip key={cat.name} label={`${cat.name} ${cat.value}%`} size="small"
                  sx={{ bgcolor: COLORS[i % COLORS.length] + '22', color: COLORS[i % COLORS.length], fontWeight: 600, fontSize: '10px' }} />
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Top Customers Bar */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3, borderRadius: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            <Typography variant="h6" sx={{fontWeight: 700, mb: 2}}>Top Customers by Revenue</Typography>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topCustomersData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={110} />
                <Tooltip formatter={(v: any) => [`₹${Number(v || 0).toLocaleString()}`, 'Revenue']} contentStyle={{ borderRadius: '12px' }} />
                <Bar dataKey="spent" fill="#C62828" radius={[0, 6, 6, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </AdminLayout>
  );
}
