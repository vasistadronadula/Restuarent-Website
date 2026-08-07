'use client';

import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { PageHeader, StatCard, SectionCard } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { TrendingUp, ShoppingBag, Users, DollarSign, PieChart as PieIcon, BarChart3, Download } from 'lucide-react';
import { toast } from 'sonner';

const COLORS = ['#D97706', '#DC2626', '#059669', '#2563EB', '#7C3AED', '#EA580C', '#0891B2'];

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
      <div className="space-y-4 w-full max-w-full">
        <PageHeader
          title="Sales Analytics & Revenue Reports"
          subtitle="Real-time reporting powered by Recharts data visualization"
          action={
            <Button
              onClick={handleExportCSV}
              className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-lg h-8 px-3 text-xs shadow-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export CSV Report
            </Button>
          }
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={<DollarSign className="w-5 h-5" />}
            label="Total Gross Sales"
            value={`₹${totalRevenue.toLocaleString('en-IN')}`}
            sub="All-time cumulative total"
            accent="#D97706"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Avg Daily Sales"
            value={`₹${avgDailyRevenue.toLocaleString('en-IN')}`}
            sub="Per day average"
            accent="#059669"
          />
          <StatCard
            icon={<ShoppingBag className="w-5 h-5" />}
            label="Total Orders"
            value={totalOrderCount}
            sub="Completed transactions"
            accent="#2563EB"
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Avg Order Value"
            value={`₹${avgOrderValue.toLocaleString('en-IN')}`}
            sub="Per ticket size"
            accent="#7C3AED"
          />
        </div>

        <SectionCard>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 border-b border-stone-200/40 dark:border-[#2C2C2E]/60 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                Revenue & Sales Breakdown
              </h3>
            </div>

            <div className="flex gap-1 bg-stone-100 dark:bg-stone-850 p-1 rounded-xl max-w-full overflow-x-auto scrollbar-none">
              {(['daily', 'weekly', 'monthly', 'categories'] as const).map((t) => (
                <Button
                  key={t}
                  variant={tab === t ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTab(t)}
                  className={`h-7 px-2.5 text-[11px] font-bold capitalize rounded-lg whitespace-nowrap flex-shrink-0 ${
                    tab === t ? 'bg-amber-600 text-white hover:bg-amber-700' : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
                  }`}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
              <BarChart3 className="w-8 h-8 text-stone-300 dark:text-stone-600" />
              <p className="text-sm font-bold text-stone-500 dark:text-stone-400">No sales data yet</p>
              <p className="text-xs text-stone-400 dark:text-stone-500 font-medium">Start taking orders to see revenue breakdowns here.</p>
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
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${(Number(percent || 0) * 100).toFixed(0)}%`}
                  >
                    {categoryRevenue.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1C1917', border: 'none', borderRadius: '12px', color: '#FFF' }}
                    formatter={(val: any) => [`₹${Number(val || 0).toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Legend />
                </PieChart>
              ) : tab === 'weekly' ? (
                <BarChart data={dailySales}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E5E4" opacity={0.15} />
                  <XAxis dataKey="date" stroke="#A8A29E" fontSize={11} />
                  <YAxis stroke="#A8A29E" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1C1917', border: 'none', borderRadius: '12px', color: '#FFF' }}
                    formatter={(val: any) => [`₹${Number(val || 0).toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#D97706" radius={[6, 6, 0, 0]} />
                </BarChart>
              ) : (
                <AreaChart data={dailySales}>
                  <defs>
                    <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D97706" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E5E4" opacity={0.15} />
                  <XAxis dataKey="date" stroke="#A8A29E" fontSize={11} />
                  <YAxis stroke="#A8A29E" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1C1917', border: 'none', borderRadius: '12px', color: '#FFF' }}
                    formatter={(val: any) => [`₹${Number(val || 0).toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#D97706" strokeWidth={2.5} fill="url(#areaColor)" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
          )}
        </SectionCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <SectionCard>
            <div className="flex items-center gap-2 mb-3.5">
              <PieIcon className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                Top Performing Categories
              </h3>
            </div>
            <div className="space-y-2">
              {categoryRevenue.length === 0 ? (
                <p className="text-xs text-stone-400 dark:text-stone-500 font-medium py-3 text-center">No category data yet.</p>
              ) : (
                categoryRevenue.map((cat, idx) => (
                <div key={cat.name} className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-stone-50/50 dark:bg-stone-900/40 border border-stone-200/30 dark:border-[#2C2C2E]/40">
                  <div className="flex items-center gap-2 font-bold text-stone-850 dark:text-stone-200">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    {cat.name}
                  </div>
                  <div className="font-black text-amber-700 dark:text-amber-500">
                    ₹{cat.value.toLocaleString('en-IN')}
                  </div>
                </div>
              ))
              )}
            </div>
          </SectionCard>

          <SectionCard>
            <div className="flex items-center gap-2 mb-3.5">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                Recent Daily Summaries
              </h3>
            </div>
            <div className="space-y-2">
              {dailySales.length === 0 ? (
                <p className="text-xs text-stone-400 dark:text-stone-500 font-medium py-3 text-center">No daily sales recorded yet.</p>
              ) : (
                dailySales.slice(0, 5).map((d) => (
                <div key={d.date} className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-stone-50/50 dark:bg-stone-900/40 border border-stone-200/30 dark:border-[#2C2C2E]/40">
                  <div>
                    <div className="font-bold text-stone-850 dark:text-stone-100">{d.date}</div>
                    <div className="text-[10px] text-stone-400 font-semibold">{d.orders} orders processed</div>
                  </div>
                  <div className="font-black text-emerald-600 dark:text-emerald-400">
                    ₹{d.revenue.toLocaleString('en-IN')}
                  </div>
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
