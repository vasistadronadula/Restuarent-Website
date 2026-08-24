'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis,
  Tooltip as RechartsTooltip, CartesianGrid,
} from 'recharts';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { PageHeader, HairlineGrid, StatCell, SectionCard, EmptyState } from '@/components/admin/ui';
import { ArrowLeft } from 'lucide-react';
import { orderDateStamp } from '@/lib/orderTime';

/* Chart chrome, matching the console: one accent line over neutral rules. */
const ACCENT = '#fc8019';
const AXIS = '#9c928f';
const GRID = '#ddd6d4';

// IST-pinned, matching how mapOrder() stamps `orderDate` — see the identical
// fix on admin/page.tsx for why the browser's own timezone can't decide
// "today" here without disagreeing with the day boundary orders were
// actually filed under.
const dayKey = (d: Date) => orderDateStamp(d);

const money = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export default function PerformancePage() {
  const { orders, reservations, inventory } = useAdmin();
  const [chartMetric, setChartMetric] = useState<'revenue' | 'orders'>('revenue');

  const [nowTs, setNowTs] = useState(0);
  useEffect(() => {
    const tick = () => setNowTs(Date.now());
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, []);

  const todayStr = useMemo(() => {
    if (!nowTs) return '';
    return dayKey(new Date(nowTs));
  }, [nowTs]);

  const stats = useMemo(() => {
    if (!todayStr) {
      return {
        todayRevenue: 0, todayOrders: 0, pendingOrders: 0,
        todayBookings: 0, lowStock: 0,
      };
    }

    let todayRevenue = 0;
    let todayOrders = 0;
    let pendingOrders = 0;

    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      const isToday = o.createdAt && dayKey(new Date(o.createdAt)) === todayStr;
      if (isToday) {
        todayOrders++;
        if (o.status !== 'cancelled') todayRevenue += o.grandTotal || 0;
      }
      if (o.status === 'pending' || o.status === 'preparing') {
        pendingOrders++;
      }
    }

    const todayBookings = reservations.filter(
      (r) => r.date === todayStr && r.status !== 'cancelled'
    ).length;
    const lowStock = inventory.filter(
      (i) => i.currentStock <= i.minStockThreshold
    ).length;

    return {
      todayRevenue, todayOrders, pendingOrders,
      todayBookings, lowStock,
    };
  }, [orders, reservations, inventory, todayStr]);

  const chartData = useMemo(() => {
    if (!nowTs) return [];
    const now = new Date(nowTs);
    const days: { key: string; label: string; revenue: number; orders: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const k = dayKey(d);
      const label = d.toLocaleDateString('en-IN', { weekday: 'short' });
      days.push({ key: k, label, revenue: 0, orders: 0 });
    }

    const map = new Map(days.map((d) => [d.key, d]));

    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      if (!o.createdAt) continue;
      const k = dayKey(new Date(o.createdAt));
      const entry = map.get(k);
      if (entry) {
        entry.orders++;
        if (o.status !== 'cancelled') entry.revenue += o.grandTotal || 0;
      }
    }

    return days;
  }, [orders, nowTs]);

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

  return (
    <AdminLayout title="Performance">
      <div className="space-y-4 w-full max-w-full">
        {/* Header */}
        <PageHeader
          title="Performance Analytics"
          subtitle="Real-time sales tracking, active orders monitor, and performance stats"
          action={
            <Link href="/admin" className="ad-btn ad-btn-secondary">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
            </Link>
          }
        />

        {/* Stats */}
        <HairlineGrid cols="grid-cols-2 lg:grid-cols-4">
          <StatCell
            label="Revenue today"
            value={money(stats.todayRevenue)}
            delta={`${stats.todayOrders} orders today`}
          />
          <StatCell
            label="Active orders"
            value={stats.pendingOrders}
            delta="in kitchen or preparing"
            alert={stats.pendingOrders > 0}
          />
          <StatCell label="Bookings today" value={stats.todayBookings} delta="confirmed" />
          <StatCell
            label="Low stock"
            value={stats.lowStock}
            delta="below threshold"
            alert={stats.lowStock > 0}
          />
        </HairlineGrid>

        {/* Breakdown split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart */}
          <div className="lg:col-span-2">
            <SectionCard className="h-full">
              <div className="ad-section-head">
                <h3 className="ad-h text-[17px]">Sales trend</h3>
                <span className="text-[12px] ad-muted">Last 7 days</span>
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={() => setChartMetric('revenue')}
                    className="ad-tab"
                    data-active={chartMetric === 'revenue'}
                  >
                    Revenue
                  </button>
                  <button
                    onClick={() => setChartMetric('orders')}
                    className="ad-tab"
                    data-active={chartMetric === 'orders'}
                  >
                    Orders
                  </button>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={ACCENT} stopOpacity={0.22} />
                        <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={GRID} />
                    <XAxis dataKey="label" stroke={AXIS} fontSize={11} tickLine={false} />
                    <YAxis stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#221c1a',
                        border: 'none',
                        borderRadius: 0,
                        color: '#ffffff',
                        fontSize: '12px',
                      }}
                      formatter={(val: any) => [
                        chartMetric === 'revenue' ? money(Number(val || 0)) : `${val} orders`,
                        chartMetric === 'revenue' ? 'Revenue' : 'Orders',
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey={chartMetric}
                      stroke={ACCENT}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#chartGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>

          {/* Recent Activity */}
          <div>
            <SectionCard className="h-full flex flex-col">
              <div className="ad-section-head">
                <h3 className="ad-h text-[17px]">Recent orders</h3>
                <Link href="/admin/orders" className="ml-auto text-[12px] text-ad-accent font-semibold no-underline">
                  View all
                </Link>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                {recentOrders.length === 0 ? (
                  <EmptyState title="No orders yet" subtitle="Nothing has come in today." />
                ) : (
                  recentOrders.map((o) => (
                    <Link
                      key={o.id}
                      href="/admin/orders"
                      className="flex items-center justify-between gap-3 px-3 py-2.5 bg-ad-surface ad-hover no-underline text-ad-ink"
                    >
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold truncate">
                          {o.customerName || 'Walk-in'}
                        </div>
                        <div className="ad-kicker mt-0.5">
                          {o.orderType} · {o.items?.length || 0} items
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="ad-num text-[15px]">{money(o.grandTotal)}</div>
                        <div className="ad-kicker mt-0.5">
                          {o.createdAt ? new Date(o.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
