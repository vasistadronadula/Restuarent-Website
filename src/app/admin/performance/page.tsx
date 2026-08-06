'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis,
  Tooltip as RechartsTooltip, CartesianGrid,
} from 'recharts';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, StatCard, SectionCard, EmptyState } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingBag, Calendar, Package, TrendingUp, Clock, ArrowLeft
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
    <AdminLayout title="Live Performance Analytics">
      <div className="space-y-4 w-full max-w-full">
        <PageHeader
          title="Live Performance Analytics"
          subtitle="Real-time sales tracking, active orders monitor, and performance stats"
          action={
            <Button asChild variant="outline" size="sm" className="h-8 rounded-lg text-xs font-bold">
              <Link href="/admin">
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Dashboard
              </Link>
            </Button>
          }
        />

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Today's Revenue"
            value={money(stats.todayRevenue)}
            sub={`${stats.todayOrders} orders today`}
            accent="#c62828"
          />
          <StatCard
            icon={<ShoppingBag className="w-5 h-5" />}
            label="Active Orders"
            value={stats.pendingOrders}
            sub="Awaiting kitchen or dispatch"
            accent="#d97706"
          />
          <StatCard
            icon={<Calendar className="w-5 h-5" />}
            label="Today's Bookings"
            value={stats.todayBookings}
            sub="Confirmed reservations today"
            accent="#10b981"
          />
          <StatCard
            icon={<Package className="w-5 h-5" />}
            label="Low Stock Items"
            value={stats.lowStock}
            sub="Below minimum threshold"
            accent="#f59e0b"
          />
        </div>

        {/* Performance charts & Recent orders split grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Sales Chart Panel */}
          <div className="lg:col-span-2">
            <SectionCard className="h-full">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                    Sales Performance
                  </h3>
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                    Last 7 Days Sales Trend
                  </p>
                </div>
                <div className="flex gap-1.5 p-1 bg-stone-100 dark:bg-stone-850 rounded-xl">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setChartMetric('revenue')}
                    className={`h-7 px-3 text-[10px] font-extrabold rounded-lg ${
                      chartMetric === 'revenue' 
                        ? 'bg-white dark:bg-stone-900 text-stone-955 dark:text-white shadow-xs' 
                        : 'text-stone-500 hover:text-stone-900 dark:hover:text-white dark:text-stone-400'
                    }`}
                  >
                    Revenue
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setChartMetric('orders')}
                    className={`h-7 px-3 text-[10px] font-extrabold rounded-lg ${
                      chartMetric === 'orders' 
                        ? 'bg-white dark:bg-stone-900 text-stone-955 dark:text-white shadow-xs' 
                        : 'text-stone-500 hover:text-stone-900 dark:hover:text-white dark:text-stone-400'
                    }`}
                  >
                    Orders
                  </Button>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D97706" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E5E4" className="dark:stroke-stone-850" opacity={0.15} />
                    <XAxis dataKey="label" stroke="#A8A29E" fontSize={11} tickLine={false} />
                    <YAxis stroke="#A8A29E" fontSize={11} tickLine={false} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#1C1917',
                        border: 'none',
                        borderRadius: '12px',
                        color: '#FFF',
                        fontSize: '11px',
                        fontWeight: 'bold',
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
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#chartGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>

          {/* Recent Orders Panel */}
          <div>
            <SectionCard className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                    Recent Incoming Orders
                  </h3>
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                    Latest Activity Monitor
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="h-7 px-2.5 text-[10px] font-extrabold rounded-lg">
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
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-850/40 border border-stone-200/30 dark:border-stone-850/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-black text-stone-800 dark:text-stone-200 truncate">
                          {o.customerName || 'Walk-in Customer'}
                        </div>
                        <div className="text-[10px] text-stone-400 mt-0.5 flex items-center gap-1.5 font-semibold">
                          <span className="uppercase">{o.orderType}</span>
                          <span>·</span>
                          <span>{o.items?.length || 0} items</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <div className="text-xs font-black text-amber-700 dark:text-amber-500">
                          {money(o.grandTotal)}
                        </div>
                        <div className="text-[9px] font-black uppercase text-stone-400 mt-0.5">
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
