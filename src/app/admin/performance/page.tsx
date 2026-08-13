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
import { PageHeader, StatCard, SectionCard, EmptyState } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingBag, Calendar, Package, TrendingUp, ArrowLeft
} from 'lucide-react';

const dayKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

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
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link href="/admin">
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Dashboard
              </Link>
            </Button>
          }
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={<TrendingUp className="w-4 h-4" />}
            label="Today's Revenue"
            value={money(stats.todayRevenue)}
            sub={`${stats.todayOrders} orders today`}
            accent="#c62828"
          />
          <StatCard
            icon={<ShoppingBag className="w-4 h-4" />}
            label="Active Orders"
            value={stats.pendingOrders}
            sub="In kitchen or preparing"
            accent="#d97706"
          />
          <StatCard
            icon={<Calendar className="w-4 h-4" />}
            label="Today's Bookings"
            value={stats.todayBookings}
            sub="Confirmed bookings"
            accent="#10b981"
          />
          <StatCard
            icon={<Package className="w-4 h-4" />}
            label="Low Stock Items"
            value={stats.lowStock}
            sub="Below threshold"
            accent="#f59e0b"
          />
        </div>

        {/* Breakdown split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart */}
          <div className="lg:col-span-2">
            <SectionCard className="h-full">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 pb-2 border-b border-stone-100">
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">Sales Trend</h3>
                  <p className="text-xs text-stone-400 mt-0.5">Last 7 days performance metrics</p>
                </div>
                <div className="flex gap-1 bg-stone-100 p-1 rounded-lg">
                  <button
                    onClick={() => setChartMetric('revenue')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      chartMetric === 'revenue' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    Revenue
                  </button>
                  <button
                    onClick={() => setChartMetric('orders')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      chartMetric === 'orders' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                    }`}
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
                        <stop offset="5%" stopColor="#D97706" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E5E4" opacity={0.5} />
                    <XAxis dataKey="label" stroke="#A8A29E" fontSize={11} tickLine={false} />
                    <YAxis stroke="#A8A29E" fontSize={11} tickLine={false} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#1c1917',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
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
                      stroke="#D97706"
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
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-stone-100">
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">Recent Orders</h3>
                  <p className="text-xs text-stone-400 mt-0.5">Real-time incoming monitor</p>
                </div>
                <Button asChild variant="outline" size="sm" className="h-7 text-xs px-2.5">
                  <Link href="/admin/orders">View All</Link>
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                {recentOrders.length === 0 ? (
                  <EmptyState emoji="📦" title="No orders received yet today" />
                ) : (
                  recentOrders.map((o) => (
                    <Link 
                      key={o.id} 
                      href="/admin/orders" 
                      className="flex items-center justify-between p-2.5 rounded-lg border border-stone-100 hover:bg-stone-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-stone-800 truncate">
                          {o.customerName || 'Walk-in'}
                        </div>
                        <div className="text-xs text-stone-400 mt-0.5 flex items-center gap-1">
                          <span className="uppercase">{o.orderType}</span>
                          <span>·</span>
                          <span>{o.items?.length || 0} items</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <div className="text-xs font-semibold text-stone-900">
                          {money(o.grandTotal)}
                        </div>
                        <div className="text-xs text-stone-400 mt-0.5">
                          {o.createdAt ? new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
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
