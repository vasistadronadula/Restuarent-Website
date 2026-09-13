'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import AdminLayout from '@/components/admin/AdminLayout';
import { useOrderHistory } from '@/lib/queries';
import { orderDateStamp } from '@/lib/orderTime';
import { PageHeader, HairlineGrid, StatCell, SectionCard } from '@/components/admin/ui';
import { Download, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Pala Pitta Ruchulu Brand Palette for Analytics:
 * - Brand Chilli Red (#df301c)
 * - Pala Pitta Deep Teal (#008391)
 * - Turmeric Gold (#f59e0b)
 * - Curry Leaf Green (#10b981)
 * - Mango Orange (#ff9100)
 * - Vibrant Turquoise (#00b4c5)
 * - Royal Cobalt (#1e40af)
 * - Rich Spice Cocoa (#5d211a)
 */
const COLORS = [
  '#df301c', // Brand Chilli Red (Primary / Revenue)
  '#008391', // Pala Pitta Deep Teal (Orders / Secondary)
  '#f59e0b', // Turmeric Gold
  '#10b981', // Curry Leaf Green
  '#ff9100', // Mango Orange
  '#00b4c5', // Turquoise
  '#1e40af', // Royal Cobalt
  '#5d211a', // Rich Spice Cocoa
];

/* Chart chrome — axes and gridlines in warm brand neutrals */
const AXIS = '#786351';
const GRID = '#ebd9c3';

export default function ReportsPage() {
  const today = orderDateStamp();
  const [dateFrom, setDateFrom] = useState(`${today.slice(0, 8)}01`);
  const [dateTo, setDateTo] = useState(today);
  const { data: orders = [], error, refetch } = useOrderHistory(true, { from: dateFrom, to: dateTo });
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

      const date = o.createdAt ? new Date(o.createdAt) : null;
      const validDate = !!date && !Number.isNaN(date.getTime());
      const dateKey = validDate ? orderDateStamp(date) : (o.orderDate || 'unknown');
      const displayDate = dateKey === 'unknown' ? null : new Date(`${dateKey}T00:00:00+05:30`);
      const dateStr = displayDate ? displayDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' }) : 'Unknown';
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = { key: dateKey, date: dateStr, revenue: 0, orders: 0 };
      }
      dateMap[dateKey].revenue += grandTotal;
      dateMap[dateKey].orders += 1;
      paymentMap[o.paymentMode || 'unknown'] = (paymentMap[o.paymentMode || 'unknown'] || 0) + 1;
      statusMap[o.status || 'unknown'] = (statusMap[o.status || 'unknown'] || 0) + 1;

      if (o.status !== 'cancelled' && o.items) {
        o.items.forEach((item) => {
          const cat = item.category || 'General';
          catMap[cat] = (catMap[cat] || 0) + (item.price * item.quantity);
        });
      }
    });

    const dailySalesArr = Object.values(dateMap).sort((a, b) => a.key.localeCompare(b.key));
    const daysCount = Math.max(1, Math.round((Date.parse(`${dateTo}T00:00:00Z`) - Date.parse(`${dateFrom}T00:00:00Z`)) / 86_400_000) + 1);
    const completedOrders = orders.filter((order) => order.status !== 'cancelled');
    const orderCount = orders.length;

    const categoryRevenueArr = Object.entries(catMap).map(([name, value]) => ({
      name: name.toUpperCase(),
      value,
    }));

    return {
      totalRevenue: revSum,
      avgDailyRevenue: Math.round(revSum / daysCount),
      totalOrderCount: orderCount,
      avgOrderValue: completedOrders.length > 0 ? Math.round(revSum / completedOrders.length) : 0,
      dailySales: dailySalesArr,
      categoryRevenue: categoryRevenueArr.sort((a, b) => b.value - a.value),
      paymentMix: Object.entries(paymentMap).map(([name, value]) => ({ name: name.toUpperCase(), value })),
      statusMix: Object.entries(statusMap).map(([name, orders]) => ({ name: name.toUpperCase(), orders })),
    };
  }, [orders, dateFrom, dateTo]);

  const periodSales = useMemo(() => {
    if (tab === 'daily' || tab === 'categories') return dailySales.slice(-14);
    const buckets = new Map<string, { period: string; revenue: number; orders: number }>();
    for (const order of orders) {
      const date = order.createdAt ? new Date(order.createdAt) : null;
      if (!date || Number.isNaN(date.getTime())) continue;
      const businessDate = orderDateStamp(date);
      let key: string;
      let label: string;
      if (tab === 'monthly') {
        key = businessDate.slice(0, 7);
        label = new Date(`${businessDate}T00:00:00+05:30`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit', timeZone: 'Asia/Kolkata' });
      } else {
        const monday = new Date(`${businessDate}T00:00:00Z`);
        const day = (monday.getUTCDay() + 6) % 7;
        monday.setUTCDate(monday.getUTCDate() - day);
        key = monday.toISOString().slice(0, 10);
        label = `Wk ${monday.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' })}`;
      }
      const bucket = buckets.get(key) || { period: label, revenue: 0, orders: 0 };
      bucket.orders += 1;
      if (order.status !== 'cancelled') bucket.revenue += order.grandTotal || order.subtotal || 0;
      buckets.set(key, bucket);
    }
    return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([, value]) => value);
  }, [dailySales, orders, tab]);

  const handleExportCSV = () => {
    const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csvContent = 'data:text/csv;charset=utf-8,' +
      'Order ID,Date,Customer,Payment Mode,Payment Status,Subtotal,Discount,CGST,SGST,Grand Total,Order Status\n' +
      orders.map((order) => [
        order.id, order.createdAt ? orderDateStamp(new Date(order.createdAt)) : order.orderDate,
        order.customerName, order.paymentMode, order.paymentStatus, order.subtotal,
        order.discount || 0, order.cgst, order.sgst, order.grandTotal, order.status,
      ].map(csvCell).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
      link.setAttribute('download', `palapitta_sales_report_${orderDateStamp()}.csv`);
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

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end border border-ad-hairline bg-ad-surface p-3">
          <label className="ad-label m-0">From<input className="ad-input mt-1" type="date" value={dateFrom} max={dateTo} onChange={(event) => setDateFrom(event.target.value)} /></label>
          <label className="ad-label m-0">To<input className="ad-input mt-1" type="date" value={dateTo} min={dateFrom} max={today} onChange={(event) => setDateTo(event.target.value)} /></label>
          <span className="ad-kicker pb-2">IST business dates</span>
        </div>

        {error && (
          <div role="alert" className="border-2 border-ad-accent bg-ad-accent-soft p-4 flex items-center gap-3">
            <AlertTriangle className="size-4" /><span className="text-sm">Could not load reports: {(error as Error).message}</span>
            <button className="ad-btn ad-btn-secondary ml-auto" onClick={() => refetch()}><RefreshCw className="size-4" /> Retry</button>
          </div>
        )}

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
            <div className="w-full h-72" role="img" aria-label={`${tab} sales chart for ${dateFrom} through ${dateTo}`}>
              <ResponsiveContainer width="100%" height="100%">
                {tab === 'categories' ? (
                  <BarChart data={categoryRevenue.slice(0, 10)} layout="vertical" margin={{ left: 18 }}>
                    <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
                    <XAxis type="number" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" width={110} stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: GRID, borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      formatter={(val: any) => [`₹${Number(val || 0).toLocaleString('en-IN')}`, 'Revenue']}
                    />
                    <Bar dataKey="value" name="Revenue" radius={[0, 4, 4, 0]}>
                      {categoryRevenue.slice(0, 10).map((_, index) => (
                        <Cell key={`cat-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <BarChart data={periodSales as any[]} margin={{ top: 8, right: 12, left: 4 }}>
                    <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
                    <XAxis dataKey={tab === 'daily' ? 'date' : 'period'} stroke={AXIS} fontSize={11} tickLine={false} />
                    <YAxis yAxisId="money" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="orders" orientation="right" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: GRID, borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      formatter={(val: any, name: any) => [name === 'Revenue' ? `₹${Number(val || 0).toLocaleString('en-IN')}` : val, name || '']}
                    />
                    <Legend />
                    <Bar yAxisId="money" dataKey="revenue" name="Revenue" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="orders" dataKey="orders" name="Orders" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionCard>
            <div className="ad-section-head"><h3 className="ad-h text-[17px]">Orders by status</h3></div>
            <p className="sr-only">{statusMix.map((item) => `${item.name}: ${item.orders}`).join(', ')}</p>
            <div className="h-64" role="img" aria-label="Order totals grouped by status">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusMix} layout="vertical" margin={{ left: 18 }}>
                  <CartesianGrid horizontal={false} stroke={GRID} strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} stroke={AXIS} fontSize={11} />
                  <YAxis type="category" dataKey="name" width={90} stroke={AXIS} fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: GRID, borderRadius: '8px' }} />
                  <Bar dataKey="orders" name="Orders" radius={[0, 4, 4, 0]}>
                    {statusMix.map((entry, index) => {
                      const isOk = ['DELIVERED', 'COMPLETED', 'PAID', 'SERVED'].includes(entry.name);
                      const isWarn = ['PENDING', 'PREPARING', 'READY'].includes(entry.name);
                      const isErr = ['CANCELLED', 'REJECTED'].includes(entry.name);
                      const fill = isOk ? '#10b981' : isWarn ? '#f59e0b' : isErr ? '#df301c' : COLORS[index % COLORS.length];
                      return <Cell key={`status-${index}`} fill={fill} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
          <SectionCard>
            <div className="ad-section-head"><h3 className="ad-h text-[17px]">Payment mix</h3></div>
            <p className="sr-only">{paymentMix.map((item) => `${item.name}: ${item.value}`).join(', ')}</p>
            <div className="h-64" role="img" aria-label="Orders grouped by payment mode">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentMix} dataKey="value" nameKey="name" innerRadius={48} outerRadius={82} paddingAngle={3}>
                    {paymentMix.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: GRID, borderRadius: '8px' }} />
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
