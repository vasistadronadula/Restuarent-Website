'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
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
const COLORS = ['#fc8019', '#221c1a', '#ffb877', '#5e5654', '#c25708', '#ddd6d4', '#94430b'];

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
    paymentMix,
    statusMix,
  } = useMemo(() => {
    let revSum = 0;
    const dateMap: Record<string, { key: string; date: string; revenue: number; orders: number }> = {};
    const catMap: Record<string, number> = {};
    const paymentMap: Record<string, number> = {};
    const statusMap: Record<string, number> = {};

    orders.forEach((o) => {
      const grandTotal = o.status === 'cancelled' ? 0 : (o.grandTotal || o.subtotal || 0);
      revSum += grandTotal;

      const date = o.createdAt ? new Date(o.createdAt) : new Date();
      const dateKey = Number.isNaN(date.getTime()) ? 'unknown' : date.toISOString().slice(0, 10);
      const dateStr = Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = { key: dateKey, date: dateStr, revenue: 0, orders: 0 };
      }
      dateMap[dateKey].revenue += grandTotal;
      dateMap[dateKey].orders += 1;
      paymentMap[o.paymentMode || 'unknown'] = (paymentMap[o.paymentMode || 'unknown'] || 0) + 1;
      statusMap[o.status || 'unknown'] = (statusMap[o.status || 'unknown'] || 0) + 1;

      if (o.items) {
        o.items.forEach((item) => {
          const cat = item.category || 'General';
          catMap[cat] = (catMap[cat] || 0) + (item.price * item.quantity);
        });
      }
    });

    const dailySalesArr = Object.values(dateMap).sort((a, b) => a.key.localeCompare(b.key));
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
      categoryRevenue: categoryRevenueArr.sort((a, b) => b.value - a.value),
      paymentMix: Object.entries(paymentMap).map(([name, value]) => ({ name: name.toUpperCase(), value })),
      statusMix: Object.entries(statusMap).map(([name, orders]) => ({ name: name.toUpperCase(), orders })),
    };
  }, [orders]);

  const periodSales = useMemo(() => {
    if (tab === 'daily' || tab === 'categories') return dailySales.slice(-14);
    const buckets = new Map<string, { period: string; revenue: number; orders: number }>();
    for (const order of orders) {
      const date = order.createdAt ? new Date(order.createdAt) : new Date();
      if (Number.isNaN(date.getTime())) continue;
      let key: string;
      let label: string;
      if (tab === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        label = date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      } else {
        const monday = new Date(date);
        const day = (monday.getDay() + 6) % 7;
        monday.setDate(monday.getDate() - day);
        key = monday.toISOString().slice(0, 10);
        label = `Wk ${monday.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;
      }
      const bucket = buckets.get(key) || { period: label, revenue: 0, orders: 0 };
      bucket.orders += 1;
      if (order.status !== 'cancelled') bucket.revenue += order.grandTotal || order.subtotal || 0;
      buckets.set(key, bucket);
    }
    return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([, value]) => value);
  }, [dailySales, orders, tab]);

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
                  <BarChart data={categoryRevenue.slice(0, 10)} layout="vertical" margin={{ left: 18 }}>
                    <CartesianGrid vertical={false} stroke={GRID} />
                    <XAxis type="number" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" width={105} stroke={AXIS} fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(val: any) => [`₹${Number(val || 0).toLocaleString('en-IN')}`, 'Revenue']} />
                    <Bar dataKey="value" name="Revenue" fill={COLORS[0]} radius={[0, 3, 3, 0]} />
                  </BarChart>
                ) : (
                  <BarChart data={periodSales as any[]} margin={{ top: 8, right: 12, left: 4 }}>
                    <CartesianGrid vertical={false} stroke={GRID} />
                    <XAxis dataKey={tab === 'daily' ? 'date' : 'period'} stroke={AXIS} fontSize={11} tickLine={false} />
                    <YAxis yAxisId="money" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="orders" orientation="right" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(val: any, name: any) => [name === 'Revenue' ? `₹${Number(val || 0).toLocaleString('en-IN')}` : val, name || '']} />
                    <Legend />
                    <Bar yAxisId="money" dataKey="revenue" name="Revenue" fill={COLORS[0]} radius={[3, 3, 0, 0]} />
                    <Bar yAxisId="orders" dataKey="orders" name="Orders" fill={COLORS[1]} radius={[3, 3, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionCard>
            <div className="ad-section-head"><h3 className="ad-h text-[17px]">Orders by status</h3></div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusMix} layout="vertical" margin={{ left: 18 }}>
                  <CartesianGrid horizontal={false} stroke={GRID} />
                  <XAxis type="number" allowDecimals={false} stroke={AXIS} fontSize={11} />
                  <YAxis type="category" dataKey="name" width={90} stroke={AXIS} fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="orders" name="Orders" fill={COLORS[1]} radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
          <SectionCard>
            <div className="ad-section-head"><h3 className="ad-h text-[17px]">Payment mix</h3></div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentMix} dataKey="value" nameKey="name" innerRadius={48} outerRadius={82} paddingAngle={3}>
                    {paymentMix.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

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
