'use client';

import React, { useState, useMemo } from 'react';
import {
  Box, Paper, Typography, Grid, Chip, Tabs, Tab, Alert,
} from '@mui/material';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { PageHeader, StatCard, adminColors } from '@/components/admin/ui';

const COLORS = ['#C62828', '#FF9800', '#2E7D32', '#1565C0', '#7B1FA2', '#F57C00', '#00838F'];

export default function ReportsPage() {
  const { orders, customers } = useAdmin();
  const [tab, setTab] = useState(0);

  // Dynamic Aggregations from Real Database Orders
  const {
    totalRevenue,
    avgDailyRevenue,
    totalOrderCount,
    avgOrderValue,
    dailySales,
    weeklyData,
    monthlyData,
    categoryRevenue,
    topCustomersData,
  } = useMemo(() => {
    let revSum = 0;
    const dateMap: Record<string, { date: string; revenue: number; orders: number; customers: Set<string> }> = {};
    const weekMap: Record<string, { week: string; revenue: number; orders: number }> = {};
    const monthMap: Record<string, { month: string; revenue: number }> = {};
    const catMap: Record<string, number> = {};

    orders.forEach((o) => {
      const grandTotal = o.grandTotal || o.subtotal || 0;
      revSum += grandTotal;

      // Date breakdown
      const dateStr = o.orderDate || 'Today';
      if (!dateMap[dateStr]) {
        dateMap[dateStr] = { date: dateStr, revenue: 0, orders: 0, customers: new Set() };
      }
      dateMap[dateStr].revenue += grandTotal;
      dateMap[dateStr].orders += 1;
      dateMap[dateStr].customers.add(o.customerPhone || o.customerId || 'GUEST');

      // Month breakdown
      const dateObj = new Date(o.orderDate || new Date().toISOString().split('T')[0]);
      const monthStr = dateObj.toLocaleString('en-US', { month: 'short' });
      if (!monthMap[monthStr]) {
        monthMap[monthStr] = { month: monthStr, revenue: 0 };
      }
      monthMap[monthStr].revenue += grandTotal;

      // Week breakdown (rough grouping by day ranges)
      const dayOfMonth = dateObj.getDate();
      const weekLabel = `W${Math.ceil(dayOfMonth / 7)} ${monthStr}`;
      if (!weekMap[weekLabel]) {
        weekMap[weekLabel] = { week: weekLabel, revenue: 0, orders: 0 };
      }
      weekMap[weekLabel].revenue += grandTotal;
      weekMap[weekLabel].orders += 1;

      // Category breakdown
      (o.items || []).forEach((item) => {
        const cat = item.vegStatus === 'veg' ? 'Veg Specialties' : 'Non-Veg Specialties';
        catMap[cat] = (catMap[cat] || 0) + (item.price || 0) * (item.quantity || 1);
      });
    });

    const datesCount = Object.keys(dateMap).length || 1;
    const avgDaily = Math.round(revSum / datesCount);
    const avgVal = orders.length > 0 ? Math.round(revSum / orders.length) : 0;

    const dailyList = Object.values(dateMap).map((d) => ({
      date: d.date,
      revenue: d.revenue,
      orders: d.orders,
      customers: d.customers.size,
    })).sort((a, b) => a.date.localeCompare(b.date));

    const weeklyList = Object.values(weekMap);
    const monthlyList = Object.values(monthMap);

    const totalCatRev = Object.values(catMap).reduce((a, b) => a + b, 0);
    const catList = Object.keys(catMap).map((name) => ({
      name,
      value: totalCatRev > 0 ? Math.round((catMap[name] / totalCatRev) * 100) : 0,
    })).filter((c) => c.value > 0);

    const topCustList = customers.slice(0, 5).map((c) => ({
      name: c.name,
      spent: c.totalSpent,
      orders: c.totalOrders,
    }));

    return {
      totalRevenue: revSum,
      avgDailyRevenue: avgDaily,
      totalOrderCount: orders.length,
      avgOrderValue: avgVal,
      dailySales: dailyList,
      weeklyData: weeklyList,
      monthlyData: monthlyList,
      categoryRevenue: catList.length > 0 ? catList : [{ name: 'Orders', value: 100 }],
      topCustomersData: topCustList,
    };
  }, [orders, customers]);

  const summaryStats = [
    { label: 'Total Sales Revenue', value: `₹${totalRevenue.toLocaleString()}`, emoji: '💰', accent: adminColors.accentOrange },
    { label: 'Avg. Daily Revenue', value: `₹${avgDailyRevenue.toLocaleString()}`, emoji: '📈', accent: adminColors.info },
    { label: 'Total Orders Placed', value: `${totalOrderCount}`, emoji: '🧾', accent: adminColors.accentRed },
    { label: 'Avg. Order Value', value: `₹${avgOrderValue.toLocaleString()}`, emoji: '🎯', accent: adminColors.success },
  ];

  return (
    <AdminLayout title="Reports & Real-Time Analytics">
      <PageHeader title="Reports & Analytics" subtitle="Live revenue, order volume, and customer trends across the whole operation." />

      {orders.length === 0 && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: '14px', fontWeight: 600 }}>
          📊 Connected live to system operations stream. Place orders via Customer Menu or Invoice POS to view real-time revenue analytics.
        </Alert>
      )}

      {/* Summary Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {summaryStats.map((s) => (
          <Grid key={s.label} size={{ xs: 6, md: 3 }}>
            <StatCard icon={s.emoji} label={s.label} value={s.value} accent={s.accent} trend={{ label: 'Live', up: true }} />
          </Grid>
        ))}
      </Grid>

      {/* Tab Views */}
      <Paper sx={{ borderRadius: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden', mb: 3 }}>
        <Box sx={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="primary" indicatorColor="primary" sx={{ px: 2 }}>
            <Tab label="Daily Sales" />
            <Tab label="Weekly Breakup" />
            <Tab label="Monthly Aggregate" />
          </Tabs>
        </Box>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            {['Daily Revenue (Database Stream)', 'Weekly Revenue Breakup', 'Monthly Revenue Summary'][tab]}
          </Typography>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={[dailySales, weeklyData, monthlyData][tab] as unknown as Array<Record<string, unknown>>}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey={tab === 0 ? 'date' : tab === 1 ? 'week' : 'month'} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${Number(v).toLocaleString()}`} />
              <Tooltip
                formatter={(v) => [`₹${Number(Array.isArray(v) ? v[0] : v ?? 0).toLocaleString()}`, 'Revenue']}
                contentStyle={{ borderRadius: '12px' }}
              />
              <Bar dataKey="revenue" fill="#C62828" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Orders vs Customers */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper sx={{ p: 3, borderRadius: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Orders & Customers Volume</Typography>
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
                <Area type="monotone" dataKey="customers" name="Unique Customers" stroke="#2E7D32" strokeWidth={2} fill="url(#custGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Category Pie */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper sx={{ p: 3, borderRadius: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Revenue Share (Veg / Non-Veg)</Typography>
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
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Top Customers by Real Spend</Typography>
            {topCustomersData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topCustomersData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${Number(v).toLocaleString()}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={120} />
                  <Tooltip
                    formatter={(v) => [`₹${Number(Array.isArray(v) ? v[0] : v ?? 0).toLocaleString()}`, 'Total Spent']}
                    contentStyle={{ borderRadius: '12px' }}
                  />
                  <Bar dataKey="spent" fill="#C62828" radius={[0, 6, 6, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                No customer orders recorded yet in database.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </AdminLayout>
  );
}
