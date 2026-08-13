'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { PageHeader, StatCard, SectionCard } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { TrendingUp, ShoppingBag, Users, DollarSign, Download } from 'lucide-react';
import { toast } from 'sonner';

const COLORS = ['#059669', '#10B981', '#2563EB', '#D97706', '#7C3AED', '#EA580C', '#0891B2'];

export default function ReportsPage() {
  const { orders } = useAdmin();
  const [tab, setTab] = useState<'daily' | 'weekly' | 'monthly' | 'categories'>('daily');

  const {
    totalRevenue,
    avgDailyRevenue,
    totalOrderCount,
    avgOrderValue,
    dailySales,
    categoryRevenue,
  } = useMemo(() => {
    let revSum = 0;
    const dateMap: Record<string, { date: string; revenue: number; orders: number }> = {};
    const catMap: Record<string, number> = {};

    orders.forEach((o) => {
      const grandTotal = o.grandTotal || o.subtotal || 0;
      revSum += grandTotal;

      const dateStr = o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Today';
      if (!dateMap[dateStr]) {
        dateMap[dateStr] = { date: dateStr, revenue: 0, orders: 0 };
      }
      dateMap[dateStr].revenue += grandTotal;
      dateMap[dateStr].orders += 1;

      if (o.items) {
        o.items.forEach((item) => {
          const cat = item.category || 'General';
          catMap[cat] = (catMap[cat] || 0) + (item.price * item.quantity);
        });
      }
    });

    const dailySalesArr = Object.values(dateMap).reverse();
    const daysCount = Math.max(1, dailySalesArr.length);
    const orderCount = orders.length;

    const categoryRevenueArr = Object.entries(catMap).map(([name, value]) => ({
      name: name.toUpperCase(),
      value,
    }));

    return {
      totalRevenue: revSum,
      avgDailyRevenue: Math.round(revSum / daysCount),
      totalOrderCount: orderCount,
      avgOrderValue: orderCount > 0 ? Math.round(revSum / orderCount) : 0,
      dailySales: dailySalesArr,
      categoryRevenue: categoryRevenueArr,
    };
  }, [orders]);

  const handleExportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' +
      'Date,Revenue,Orders\n' +
      dailySales.map((e) => `${e.date},${e.revenue},${e.orders}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `palapitta_sales_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report downloaded as CSV!');
  };

  return (
    <AdminLayout title="Analytics & Reports">
      <div className="space-y-6 w-full max-w-full font-sans">
        {/* Header */}
        <PageHeader
          title="Sales Analytics"
          subtitle="Overview of store metrics, performance, and daily sales"
          action={
            <Button
              onClick={handleExportCSV}
              className="h-9.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold px-4 rounded-xl shadow-xs transition-all active:scale-[0.98]"
            >
              <Download className="w-4 h-4 mr-1.5" /> Export CSV
            </Button>
          }
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <StatCard
            icon={<DollarSign className="w-4 h-4" />}
            label="Total Gross Sales"
            value={`₹${totalRevenue.toLocaleString('en-IN')}`}
            accent="#059669"
          />
          <StatCard
            icon={<TrendingUp className="w-4 h-4" />}
            label="Avg Daily Sales"
            value={`₹${avgDailyRevenue.toLocaleString('en-IN')}`}
            accent="#10B981"
          />
          <StatCard
            icon={<ShoppingBag className="w-4 h-4" />}
            label="Total Orders"
            value={totalOrderCount}
            accent="#2563EB"
          />
          <StatCard
            icon={<Users className="w-4 h-4" />}
            label="Avg Order Value"
            value={`₹${avgOrderValue.toLocaleString('en-IN')}`}
            accent="#7C3AED"
          />
        </div>

        {/* Chart Box */}
        <SectionCard>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Revenue & Sales Breakdown</h3>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {(['daily', 'weekly', 'monthly', 'categories'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                    tab === t ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="py-14 text-center text-xs font-semibold text-slate-400">
              No sales data recorded yet
            </div>
          ) : (
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                {tab === 'categories' ? (
                  <PieChart>
                    <Pie
                      data={categoryRevenue}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${(Number(percent || 0) * 100).toFixed(0)}%`}
                    >
                      {categoryRevenue.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => [`₹${Number(val || 0).toLocaleString('en-IN')}`, 'Revenue']} />
                    <Legend />
                  </PieChart>
                ) : tab === 'weekly' ? (
                  <BarChart data={dailySales}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.7} />
                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} />
                    <YAxis stroke="#94A3B8" fontSize={11} />
                    <Tooltip formatter={(val: any) => [`₹${Number(val || 0).toLocaleString('en-IN')}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#059669" radius={[6, 6, 0, 0]} />
                  </BarChart>
                ) : (
                  <AreaChart data={dailySales}>
                    <defs>
                      <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.7} />
                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} />
                    <YAxis stroke="#94A3B8" fontSize={11} />
                    <Tooltip formatter={(val: any) => [`₹${Number(val || 0).toLocaleString('en-IN')}`, 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2.5} fill="url(#areaColor)" />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        {/* Side breakdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SectionCard>
            <h3 className="text-sm font-bold text-slate-900 mb-3">Top Performing Categories</h3>
            <div className="space-y-2">
              {categoryRevenue.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No category data yet.</p>
              ) : (
                categoryRevenue.map((cat, idx) => (
                  <div key={cat.name} className="flex justify-between items-center text-xs p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <span className="size-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      {cat.name}
                    </div>
                    <div className="font-bold text-slate-900 font-mono">₹{cat.value.toLocaleString('en-IN')}</div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard>
            <h3 className="text-sm font-bold text-slate-900 mb-3">Recent Daily Summaries</h3>
            <div className="space-y-2">
              {dailySales.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No daily sales recorded.</p>
              ) : (
                dailySales.slice(0, 5).map((d) => (
                  <div key={d.date} className="flex justify-between items-center text-xs p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div>
                      <div className="font-bold text-slate-900">{d.date}</div>
                      <div className="text-[11px] text-slate-400 font-medium">{d.orders} orders processed</div>
                    </div>
                    <div className="font-bold text-emerald-700 font-mono">₹{d.revenue.toLocaleString('en-IN')}</div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </AdminLayout>
  );
}
