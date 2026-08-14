'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { PageHeader, HairlineGrid, StatCell, SectionCard } from '@/components/admin/ui';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Chart series, in the console's own palette: the accent first, then ink, then
 * alternating tints that separate by lightness as well as hue. Seven unrelated
 * brand colours read as seven unrelated apps on a page whose entire design is
 * one accent over neutrals.
 */
const COLORS = ['#e6543e', '#221c1a', '#ff9683', '#5e5654', '#bd3f2c', '#ddd6d4', '#8a2d1f'];

/* Chart chrome — axes and gridlines sit under the data, never beside it. */
const AXIS = '#9c928f';
const GRID = '#ddd6d4';

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
        {/* Header */}
        <PageHeader
          title="Sales Analytics"
          subtitle="Overview of store metrics, performance and sales"
          action={
            <button type="button" onClick={handleExportCSV} className="ad-btn ad-btn-primary">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          }
        />

        {/* Stats */}
        <HairlineGrid cols="grid-cols-2 lg:grid-cols-4">
          <StatCell label="Gross sales" value={`₹${totalRevenue.toLocaleString('en-IN')}`} />
          <StatCell label="Avg daily sales" value={`₹${avgDailyRevenue.toLocaleString('en-IN')}`} />
          <StatCell label="Total orders" value={totalOrderCount} />
          <StatCell label="Avg order value" value={`₹${avgOrderValue.toLocaleString('en-IN')}`} />
        </HairlineGrid>

        {/* Chart Box */}
        <SectionCard>
          <div className="ad-section-head">
            <h3 className="ad-h text-[17px]">Revenue and sales</h3>
            <div className="flex gap-2 flex-wrap">
              {(['daily', 'weekly', 'monthly', 'categories'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className="ad-tab" data-active={tab === t}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="py-14 text-center text-[13px] ad-muted">No sales data yet</div>
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
                    <CartesianGrid vertical={false} stroke={GRID} />
                    <XAxis dataKey="date" stroke={AXIS} fontSize={11} tickLine={false} />
                    <YAxis stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(val: any) => [`₹${Number(val || 0).toLocaleString('en-IN')}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill={COLORS[0]} />
                  </BarChart>
                ) : (
                  <AreaChart data={dailySales}>
                    <defs>
                      <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.22} />
                        <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={GRID} />
                    <XAxis dataKey="date" stroke={AXIS} fontSize={11} tickLine={false} />
                    <YAxis stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(val: any) => [`₹${Number(val || 0).toLocaleString('en-IN')}`, 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke={COLORS[0]} strokeWidth={2} fill="url(#areaColor)" />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        {/* Side breakdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SectionCard>
            <div className="ad-section-head">
              <h3 className="ad-h text-[17px]">Top categories</h3>
            </div>
            {categoryRevenue.length === 0 ? (
              <p className="text-[13px] ad-muted py-3 text-center m-0">No category data yet.</p>
            ) : (
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <tbody>
                    {categoryRevenue.map((cat, idx) => (
                      <tr key={cat.name}>
                        <td className="w-4">
                          <span className="block w-2.5 h-2.5" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        </td>
                        <td className="min-w-0 max-w-40 truncate">{cat.name}</td>
                        <td className="text-right ad-num text-[14px] whitespace-nowrap">₹{cat.value.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard>
            <div className="ad-section-head">
              <h3 className="ad-h text-[17px]">Recent days</h3>
            </div>
            {dailySales.length === 0 ? (
              <p className="text-[13px] ad-muted py-3 text-center m-0">No daily sales recorded.</p>
            ) : (
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <tbody>
                    {dailySales.slice(0, 5).map((d) => (
                      <tr key={d.date}>
                        <td className="min-w-0">
                          <div className="font-semibold truncate">{d.date}</div>
                          <div className="ad-kicker">{d.orders} orders</div>
                        </td>
                        <td className="text-right ad-num text-[15px] whitespace-nowrap">₹{d.revenue.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </AdminLayout>
  );
}
