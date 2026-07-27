'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Box, Grid, Typography, Button, Chip, Avatar } from '@mui/material';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis,
  Tooltip as RechartsTooltip, CartesianGrid,
} from 'recharts';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import {
  PageHeader, StatCard, SectionCard, SectionHeading, AlertTile,
  StatusChip, EmptyState, adminColors, orderStatusColors, roleColors,
} from '@/components/admin/ui';
import { ROLE_LABELS } from '@/lib/roleAccess';

const dayKey = (d: Date) => {
  // Local calendar date, not UTC — toISOString() would roll over at the wrong
  // moment for IST and mislabel late-evening orders as "tomorrow".
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const money = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const greetingFor = (hour: number) => {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

// Billing lives with the cashier, so the dashboard's shortcuts stay on what
// an admin actually opens from here.
const QUICK_ACTIONS = [
  { label: 'Orders', href: '/admin/orders', icon: '📋', primary: true },
  { label: 'Kitchen', href: '/admin/kitchen', icon: '🔥' },
  { label: 'Reservations', href: '/admin/reservations', icon: '📅' },
  { label: 'Menu', href: '/admin/menu-management', icon: '🍽️' },
];

export default function AdminDashboard() {
  const { orders, reservations, inventory, employees } = useAdmin();
  const { user } = useAuth();
  const [chartMetric, setChartMetric] = useState<'revenue' | 'orders'>('revenue');

  // Reading the clock during render is impure (React 19 flags it), so the
  // timestamp lives in state. Re-ticking every minute also means a screen left
  // open on the counter overnight rolls over to the new day on its own instead
  // of silently reporting yesterday's totals as "today".
  const [nowTs, setNowTs] = useState(0);
  useEffect(() => {
    const tick = () => setNowTs(Date.now());
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, []);

  const firstName = (user?.user_metadata?.full_name || user?.user_metadata?.name || '')
    .toString().split(' ')[0] || 'there';

  const m = useMemo(() => {
    const today = dayKey(new Date(nowTs));
    const yesterday = dayKey(new Date(nowTs - 86_400_000));

    const sum = (list: typeof orders) => list.reduce((s, o) => s + (o.grandTotal || o.subtotal || 0), 0);
    const billable = orders.filter((o) => o.status !== 'cancelled');

    const todayOrders = billable.filter((o) => o.orderDate === today);
    const yesterdayOrders = billable.filter((o) => o.orderDate === yesterday);

    const todayRevenue = sum(todayOrders);
    const yesterdayRevenue = sum(yesterdayOrders);

    // Null when there's no prior-day baseline — the card then renders no trend
    // chip at all rather than inventing a percentage.
    const pctChange = (curr: number, prev: number) =>
      prev > 0 ? Math.round(((curr - prev) / prev) * 100) : null;

    const pending = orders.filter((o) => o.status === 'pending');
    const preparing = orders.filter((o) => o.status === 'preparing');
    const ready = orders.filter((o) => o.status === 'ready');
    const pendingReservations = reservations.filter((r) => r.status === 'pending');
    const lowStock = inventory.filter((i) => i.quantity <= i.minQuantity);
    const activeReservations = reservations.filter((r) => r.status === 'confirmed');

    // Revenue trend — last 7 calendar days, zero-filled so the chart shows a
    // continuous week instead of only the days that happen to have orders.
    const series: { date: string; label: string; revenue: number; orders: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(nowTs - i * 86_400_000);
      const key = dayKey(d);
      const dayOrders = billable.filter((o) => o.orderDate === key);
      series.push({
        date: key,
        label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        revenue: sum(dayOrders),
        orders: dayOrders.length,
      });
    }
    const hasSeriesData = series.some((s) => s.orders > 0);

    // Top dishes
    const dishMap: Record<string, number> = {};
    billable.forEach((o) => (o.items || []).forEach((it) => {
      const n = it.name || 'Dish';
      dishMap[n] = (dishMap[n] || 0) + (it.quantity || 1);
    }));
    const topDishes = Object.entries(dishMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const maxDish = topDishes[0]?.count || 1;

    const activeStaff = employees.filter((e) => e.isActive);
    const staffByRole = (['admin', 'manager', 'chef', 'cashier', 'waiter'] as const)
      .map((role) => ({ role, count: activeStaff.filter((e) => e.role === role).length }))
      .filter((r) => r.count > 0);

    return {
      todayRevenue, yesterdayRevenue,
      revenueDelta: pctChange(todayRevenue, yesterdayRevenue),
      todayOrderCount: todayOrders.length,
      orderDelta: pctChange(todayOrders.length, yesterdayOrders.length),
      avgOrderValue: todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0,
      pending, preparing, ready, pendingReservations, lowStock, activeReservations,
      series, hasSeriesData, topDishes, maxDish, activeStaff, staffByRole,
      recentOrders: [...orders].slice(0, 6),
    };
  }, [orders, reservations, inventory, employees, nowTs]);

  const trendChip = (delta: number | null) =>
    delta === null ? null : { label: `${delta >= 0 ? '+' : ''}${delta}% vs yesterday`, up: delta >= 0 };

  const attentionItems = [
    m.pending.length > 0 && {
      key: 'pending', icon: '⏳', label: 'Orders awaiting acceptance', tone: 'warning' as const,
      detail: m.pending.map((o) => o.customerName).filter(Boolean).slice(0, 3).join(', '),
      count: m.pending.length, href: '/admin/orders',
    },
    m.ready.length > 0 && {
      key: 'ready', icon: '🛎️', label: 'Ready for pickup / serving', tone: 'info' as const,
      detail: 'Waiting to be handed over', count: m.ready.length, href: '/admin/kitchen',
    },
    m.pendingReservations.length > 0 && {
      key: 'res', icon: '📅', label: 'Reservations to confirm', tone: 'warning' as const,
      detail: m.pendingReservations.map((r) => `${r.customerName} · ${r.time}`).slice(0, 2).join(', '),
      count: m.pendingReservations.length, href: '/admin/reservations',
    },
    m.lowStock.length > 0 && {
      key: 'stock', icon: '📦', label: 'Items below safety stock', tone: 'danger' as const,
      detail: m.lowStock.map((i) => i.name).slice(0, 3).join(', '),
      count: m.lowStock.length, href: '/admin/inventory',
    },
  ].filter(Boolean) as Array<{
    key: string; icon: string; label: string; detail: string;
    count: number; tone: 'warning' | 'danger' | 'info'; href: string;
  }>;

  return (
    <AdminLayout title="Dashboard">
      <PageHeader
        title={nowTs ? `${greetingFor(new Date(nowTs).getHours())}, ${firstName}` : `Welcome, ${firstName}`}
        subtitle={nowTs
          ? new Date(nowTs).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
          : undefined}
        action={
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {QUICK_ACTIONS.map((a) => (
              <Button
                key={a.href}
                component={Link}
                href={a.href}
                variant={a.primary ? 'contained' : 'outlined'}
                size="small"
                sx={{
                  borderRadius: adminColors.radiusMd,
                  fontWeight: 700, fontSize: 12.5, textTransform: 'none', px: 1.75,
                  ...(a.primary
                    ? { bgcolor: adminColors.brand, boxShadow: 'none', '&:hover': { bgcolor: adminColors.brandDark, boxShadow: 'none' } }
                    : { color: adminColors.textSecondary, borderColor: adminColors.border, bgcolor: adminColors.bgPanel, '&:hover': { borderColor: adminColors.brand, color: adminColors.brand, bgcolor: adminColors.bgPanel } }),
                }}
              >
                <Box component="span" sx={{ mr: 0.6 }}>{a.icon}</Box>{a.label}
              </Button>
            ))}
          </Box>
        }
      />

      {/* ── Today's numbers ─────────────────────────────────────── */}
      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid size={{ xs: 6, lg: 3 }}>
          <StatCard
            icon="💰" label="Revenue today" value={money(m.todayRevenue)}
            sub={m.yesterdayRevenue > 0 ? `Yesterday ${money(m.yesterdayRevenue)}` : 'No sales yesterday'}
            accent={adminColors.success} trend={trendChip(m.revenueDelta)}
          />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <StatCard
            icon="📋" label="Orders today" value={m.todayOrderCount}
            sub={`${m.pending.length + m.preparing.length} still open`}
            accent={adminColors.info} trend={trendChip(m.orderDelta)} href="/admin/orders"
          />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <StatCard
            icon="🎯" label="Avg order value" value={m.todayOrderCount > 0 ? money(m.avgOrderValue) : '—'}
            sub={m.todayOrderCount > 0 ? `Across ${m.todayOrderCount} orders` : 'No orders yet today'}
            accent={adminColors.accent}
          />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <StatCard
            icon="📅" label="Upcoming bookings" value={m.activeReservations.length}
            sub={m.pendingReservations.length > 0 ? `${m.pendingReservations.length} need confirming` : 'All confirmed'}
            accent={adminColors.brand} href="/admin/reservations"
          />
        </Grid>
      </Grid>

      {/* ── Needs attention + revenue trend ─────────────────────── */}
      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <SectionCard sx={{ height: '100%' }}>
            <SectionHeading
              title="Needs attention"
              subtitle={attentionItems.length > 0 ? 'Tap any item to jump straight to it' : undefined}
            />
            {attentionItems.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography sx={{ fontSize: '2rem', mb: 0.5 }}>✅</Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 14, color: adminColors.textPrimary }}>
                  Everything&apos;s handled
                </Typography>
                <Typography sx={{ fontSize: 12, color: adminColors.textMuted, mt: 0.3 }}>
                  No pending orders, bookings, or stock alerts.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {attentionItems.map((a) => (
                  <AlertTile
                    key={a.key} icon={a.icon} label={a.label} detail={a.detail}
                    count={a.count} tone={a.tone} href={a.href}
                  />
                ))}
              </Box>
            )}
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <SectionCard sx={{ height: '100%' }}>
            <SectionHeading
              title="Last 7 days"
              subtitle={chartMetric === 'revenue' ? 'Daily revenue' : 'Daily order count'}
              action={
                <Box sx={{ display: 'flex', bgcolor: adminColors.bgSubtle, borderRadius: adminColors.radiusSm, p: '3px', gap: '2px' }}>
                  {(['revenue', 'orders'] as const).map((k) => (
                    <Box
                      key={k}
                      component="button"
                      onClick={() => setChartMetric(k)}
                      sx={{
                        border: 'none', cursor: 'pointer', px: 1.5, py: 0.5,
                        borderRadius: '6px', fontSize: 11.5, fontWeight: 700,
                        textTransform: 'capitalize', fontFamily: 'inherit',
                        bgcolor: chartMetric === k ? adminColors.bgPanel : 'transparent',
                        color: chartMetric === k ? adminColors.brand : adminColors.textMuted,
                        boxShadow: chartMetric === k ? adminColors.shadowSm : 'none',
                      }}
                    >
                      {k}
                    </Box>
                  ))}
                </Box>
              }
            />
            {!m.hasSeriesData ? (
              <EmptyState emoji="📊" title="No sales in the last 7 days" subtitle="The chart fills in as orders come through." />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={m.series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={adminColors.brand} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={adminColors.brand} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={adminColors.borderSubtle} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: adminColors.textMuted }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: adminColors.textMuted }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => (chartMetric === 'revenue' ? `₹${v >= 1000 ? `${Math.round(v / 1000)}k` : v}` : `${v}`)}
                  />
                  <RechartsTooltip
                    cursor={{ stroke: adminColors.border }}
                    formatter={(v: unknown) => [
                      chartMetric === 'revenue' ? money(Number(v) || 0) : `${v} orders`,
                      chartMetric === 'revenue' ? 'Revenue' : 'Orders',
                    ]}
                    contentStyle={{
                      borderRadius: 12, background: adminColors.bgPanel,
                      border: `1px solid ${adminColors.border}`, color: adminColors.textPrimary,
                      boxShadow: adminColors.shadowLg, fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone" dataKey={chartMetric}
                    stroke={adminColors.brand} strokeWidth={2.5} fill="url(#dashArea)"
                    activeDot={{ r: 5, stroke: adminColors.bgPanel, strokeWidth: 2, fill: adminColors.brand }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      {/* ── Recent orders + side panels ─────────────────────────── */}
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <SectionCard noPadding sx={{ height: '100%' }}>
            <Box sx={{ p: { xs: 1.75, sm: 2 }, pb: 1.25 }}>
              <SectionHeading
                title="Recent orders"
                subtitle="Newest first"
                action={
                  <Link href="/admin/orders" style={{ textDecoration: 'none' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: adminColors.brand }}>View all →</Typography>
                  </Link>
                }
              />
            </Box>
            {m.recentOrders.length === 0 ? (
              <EmptyState emoji="🧾" title="No orders yet" subtitle="Orders from the website, POS, and delivery apps land here." />
            ) : (
              <Box>
                {m.recentOrders.map((o, i) => (
                  <Box
                    key={o.id}
                    component={Link}
                    href="/admin/orders"
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5,
                      px: { xs: 1.75, sm: 2 }, py: 1.25, textDecoration: 'none',
                      borderTop: i === 0 ? `1px solid ${adminColors.borderSubtle}` : 'none',
                      borderBottom: `1px solid ${adminColors.borderSubtle}`,
                      '&:last-of-type': { borderBottom: 'none' },
                      '&:hover': { bgcolor: adminColors.bgSubtle },
                    }}
                  >
                    <Avatar sx={{
                      width: 36, height: 36, flexShrink: 0, fontSize: 13, fontWeight: 700,
                      bgcolor: adminColors.brandSoft, color: adminColors.brand,
                    }}>
                      {(o.customerName || 'W').charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: adminColors.textPrimary }} noWrap>
                        {o.customerName || 'Walk-in'}
                      </Typography>
                      <Typography sx={{ fontSize: 11.5, color: adminColors.textMuted }} noWrap>
                        {o.orderId || o.id} · {(o.items || []).length} items · {o.orderTime || '—'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 800, color: adminColors.textPrimary }}>
                        {money(o.grandTotal || o.subtotal || 0)}
                      </Typography>
                      <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                        <StatusChip status={o.status} palette={orderStatusColors} />
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%' }}>
            {/* Top dishes */}
            <SectionCard>
              <SectionHeading title="🔥 Top dishes" subtitle="By quantity sold" />
              {m.topDishes.length === 0 ? (
                <Typography sx={{ fontSize: 12.5, color: adminColors.textMuted, textAlign: 'center', py: 2.5 }}>
                  No dish data yet.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {m.topDishes.map((d, i) => (
                    <Box key={d.name}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.6, gap: 1 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: adminColors.textSecondary, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {i + 1}. {d.name}
                        </Typography>
                        <Typography sx={{ fontSize: 12, fontWeight: 800, color: adminColors.textPrimary, flexShrink: 0 }}>
                          {d.count}×
                        </Typography>
                      </Box>
                      <Box sx={{ height: 5, borderRadius: 3, bgcolor: adminColors.bgSubtle, overflow: 'hidden' }}>
                        <Box sx={{
                          height: '100%', borderRadius: 3,
                          width: `${Math.max(6, (d.count / m.maxDish) * 100)}%`,
                          bgcolor: i === 0 ? adminColors.brand : i === 1 ? adminColors.accent : adminColors.info,
                        }} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </SectionCard>

            {/* Team */}
            <SectionCard sx={{ flex: 1 }}>
              <SectionHeading
                title="👥 Team on the system"
                subtitle={`${m.activeStaff.length} active ${m.activeStaff.length === 1 ? 'account' : 'accounts'}`}
                action={
                  <Link href="/admin/employees" style={{ textDecoration: 'none' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: adminColors.brand }}>Manage →</Typography>
                  </Link>
                }
              />
              {m.staffByRole.length === 0 ? (
                <Typography sx={{ fontSize: 12.5, color: adminColors.textMuted, textAlign: 'center', py: 2.5 }}>
                  No staff accounts yet — add one from Team.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {m.staffByRole.map(({ role, count }) => (
                    <Chip
                      key={role}
                      label={`${ROLE_LABELS[role]} · ${count}`}
                      size="small"
                      sx={{
                        bgcolor: roleColors[role].bg, color: roleColors[role].color,
                        fontWeight: 700, fontSize: 11.5,
                      }}
                    />
                  ))}
                </Box>
              )}
            </SectionCard>
          </Box>
        </Grid>
      </Grid>
    </AdminLayout>
  );
}
