'use client';

import React, { useState } from 'react';
import {
  Select, MenuItem as MuiMenuItem,
} from '@mui/material';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip,
  CartesianGrid,
} from 'recharts';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import Link from 'next/link';
import { Order } from '@/types';

const PIE_COLORS = ['#f97316', '#ef4444', '#3b82f6', '#22c55e', '#a855f7'];

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pending',   color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  preparing: { label: 'Preparing', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  ready:     { label: 'Ready',     color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
  delivered: { label: 'Delivered', color: '#94a3b8', bg: 'rgba(33,33,33,0.08)' },
  cancelled: { label: 'Cancelled', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
};

/* ─── Small reusable components ─────────────────────────────── */

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.03)',
      border: '1px solid rgba(0,0,0,0.05)',
      borderRadius: 20,
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 8 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#212121', letterSpacing: '-0.3px' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: 'rgba(33,33,33,0.5)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

function Pill({ label, style }: { label: string; style?: React.CSSProperties }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase',
      padding: '3px 9px', borderRadius: 20, ...style,
    }}>{label}</span>
  );
}

/* ─── Main Dashboard ─────────────────────────────────────────── */

export default function AdminDashboard() {
  const { orders, reservations, menuItems, inventory, updateOrderStatus } = useAdmin();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [chartMetric, setChartMetric] = useState<'revenue' | 'orders'>('revenue');

  /* ── Computed metrics ─────────────────────── */
  const totalRevenue = orders.reduce((s, o) => s + (o.grandTotal || o.subtotal || 0), 0);
  const pendingCount = orders.filter((o) => o.status === 'pending' || o.status === 'preparing').length;
  const activeReservations = reservations.filter((r) => r.status === 'confirmed' || r.status === 'pending').length;
  const lowStockCount = inventory.filter((i) => i.quantity <= i.minQuantity).length;
  const totalGuests = reservations.reduce((s, r) => s + (Number(r.guests) || 1), 0);
  const todayRevenue = totalRevenue; // simplified; same orders array

  /* ── Filtered orders ──────────────────────── */
  const filteredOrders = orders.filter((o) => {
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q
      || String(o.id).toLowerCase().includes(q)
      || (o.customerName || '').toLowerCase().includes(q)
      || (o.customerPhone || '').includes(q);
    return matchStatus && matchSearch;
  });

  /* ── Top dishes ───────────────────────────── */
  const itemMap: Record<string, { name: string; count: number; total: number }> = {};
  orders.forEach((o) => {
    (o.items || []).forEach((it) => {
      const n = it.name || 'Dish';
      if (!itemMap[n]) itemMap[n] = { name: n, count: 0, total: 0 };
      itemMap[n].count += it.quantity || 1;
      itemMap[n].total += (it.price || 0) * (it.quantity || 1);
    });
  });
  const topDishes = Object.values(itemMap).sort((a, b) => b.count - a.count).slice(0, 5);
  const maxDishCount = topDishes.length > 0 ? Math.max(...topDishes.map((d) => d.count)) : 1;

  /* ── Daily sales chart ────────────────────── */
  const salesByDate: Record<string, { revenue: number; orders: number }> = {};
  orders.forEach((o) => {
    const d = o.orderDate || 'Today';
    if (!salesByDate[d]) salesByDate[d] = { revenue: 0, orders: 0 };
    salesByDate[d].revenue += o.grandTotal || o.subtotal || 0;
    salesByDate[d].orders += 1;
  });
  const dailySales = Object.entries(salesByDate).map(([date, v]) => ({ date, ...v }));

  /* ── Category share ───────────────────────── */
  let vegRev = 0, nonVegRev = 0;
  orders.forEach((o) => {
    (o.items || []).forEach((it) => {
      if (it.vegStatus === 'veg') vegRev += (it.price || 0) * (it.quantity || 1);
      else nonVegRev += (it.price || 0) * (it.quantity || 1);
    });
  });
  const total = vegRev + nonVegRev;
  const catShare = [
    { name: 'Non-Veg 🍗', value: total > 0 ? Math.round((nonVegRev / total) * 100) : 65 },
    { name: 'Veg 🥗',     value: total > 0 ? Math.round((vegRev / total) * 100) : 35 },
  ];

  /* ── KPI cards ────────────────────────────── */
  const kpis = [
    {
      label: "Today's Revenue",
      value: `₹${todayRevenue.toLocaleString()}`,
      sub: `${orders.length} total orders`,
      trend: '+18.4%',
      up: true,
      progress: Math.min(100, Math.round((todayRevenue / 50000) * 100)),
      accent: '#f97316',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93V18h-2v-1.07C9.06 16.54 8 15.38 8 14h2c0 .55.45 1 1 1h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-1.66 0-3-1.34-3-3 0-1.38 1.06-2.54 2.5-2.93V6h2v1.07C13.94 7.46 15 8.62 15 10h-2c0-.55-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1h2c1.66 0 3 1.34 3 3 0 1.38-1.06 2.54-2.5 2.93z" fill="currentColor"/>
        </svg>
      ),
    },
    {
      label: 'Active Orders',
      value: `${orders.length}`,
      sub: `${pendingCount} need attention`,
      trend: pendingCount > 0 ? `${pendingCount} pending` : 'All clear',
      up: true,
      progress: Math.min(100, pendingCount * 15),
      accent: '#3b82f6',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V7H9V5ZM9 12H15M9 16H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: 'Table Bookings',
      value: `${reservations.length}`,
      sub: `${totalGuests} guests reserved`,
      trend: `${activeReservations} active`,
      up: true,
      progress: Math.min(100, totalGuests * 4),
      accent: '#22c55e',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M3 10H21M8 2V6M16 2V6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: 'Inventory',
      value: `${inventory.length} items`,
      sub: lowStockCount > 0 ? `${lowStockCount} low stock!` : 'All stocked',
      trend: lowStockCount > 0 ? `${lowStockCount} alerts` : 'Optimal',
      up: lowStockCount === 0,
      progress: lowStockCount > 0 ? 30 : 94,
      accent: lowStockCount > 0 ? '#ef4444' : '#22c55e',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M21 8L12 3L3 8V16L12 21L21 16V8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
          <path d="M12 3V21M3 8L12 13L21 8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
        </svg>
      ),
    },
  ];


  return (
    <AdminLayout title="Command Center">
      <style>{`
        .dashboard-root {
          display: flex;
          flex-direction: column;
          gap: 18px;
          color: #212121;
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
        }

        /* Hero Banner — deliberately stays a dark brand-gradient card (same
           idea as the customer site's HeroSlider) rather than following the
           rest of the dashboard's light theme. */
        .hero-banner {
          border-radius: 22px;
          background: linear-gradient(135deg, #2D0000 0%, #C62828 60%, #8E0000 100%);
          border: 1px solid rgba(255,255,255,0.08);
          padding: 22px 24px;
          position: relative;
          overflow: hidden;
        }
        .hero-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }
        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255,255,255,0.12);
        }
        .action-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 16px; border-radius: 12px;
          font-size: 12px; font-weight: 700;
          cursor: pointer; text-decoration: none;
          transition: all 0.15s ease;
          border: 1px solid transparent;
          -webkit-tap-highlight-color: transparent;
        }
        .action-btn:active { transform: scale(0.95); }

        /* KPI Grid */
        .kpi-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (min-width: 900px) {
          .kpi-grid { grid-template-columns: repeat(4, 1fr); gap: 16px; }
        }
        .kpi-card {
          background: rgba(0,0,0,0.03);
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: 18px;
          padding: 16px;
          transition: all 0.2s ease;
          cursor: default;
        }
        .kpi-card:hover {
          background: rgba(0,0,0,0.04);
          transform: translateY(-2px);
          border-color: rgba(0,0,0,0.08);
        }
        .kpi-icon-wrap {
          width: 40px; height: 40px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 12px;
        }
        .kpi-value {
          font-size: 22px; font-weight: 900;
          color: #212121; letter-spacing: -0.8px;
          line-height: 1.1;
        }
        @media (min-width: 900px) { .kpi-value { font-size: 26px; } }
        .kpi-label {
          font-size: 10px; font-weight: 700; letter-spacing: 0.6px;
          text-transform: uppercase; color: rgba(33,33,33,0.5);
          margin-bottom: 6px;
        }
        .kpi-sub { font-size: 11px; color: rgba(33,33,33,0.55); margin-top: 4px; }
        .kpi-trend {
          display: inline-flex; align-items: center; gap: 3px;
          font-size: 10px; font-weight: 700; margin-top: 8px;
          padding: 2px 8px; border-radius: 20px;
        }
        .kpi-progress-bg {
          height: 4px; border-radius: 2px;
          background: rgba(0,0,0,0.05);
          margin-top: 12px; overflow: hidden;
        }
        .kpi-progress-fill {
          height: 100%; border-radius: 2px;
          transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Chart area */
        .chart-grid {
          display: grid;
          gap: 14px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 1100px) {
          .chart-grid { grid-template-columns: 2fr 1fr; gap: 16px; }
        }

        /* Orders table */
        .orders-grid {
          display: grid;
          gap: 14px;
        }
        @media (min-width: 1100px) {
          .orders-grid { grid-template-columns: 2fr 1fr; gap: 16px; }
        }

        /* Status filter tabs */
        .status-tabs {
          display: flex; gap: 6px; flex-wrap: wrap;
        }
        .status-tab {
          padding: 5px 12px; border-radius: 20px;
          font-size: 11px; font-weight: 700;
          cursor: pointer; border: 1px solid transparent;
          transition: all 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }

        /* Orders table */
        .orders-table { width: 100%; border-collapse: collapse; }
        .orders-table th {
          font-size: 10px; font-weight: 700; letter-spacing: 0.6px;
          text-transform: uppercase; color: rgba(33,33,33,0.5);
          padding: 10px 14px; text-align: left;
          border-bottom: 1px solid rgba(0,0,0,0.04);
        }
        .orders-table td {
          padding: 12px 14px;
          border-bottom: 1px solid rgba(0,0,0,0.03);
          font-size: 12px; vertical-align: middle;
        }
        .orders-table tr:hover td { background: rgba(0,0,0,0.02); }
        .orders-table tr:last-child td { border-bottom: none; }

        /* Customer avatar */
        .cust-avatar {
          width: 30px; height: 30px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 800;
          background: linear-gradient(135deg, #c62828, #e65100);
          color: white; flex-shrink: 0;
        }

        /* Mobile order cards (xs) */
        .mobile-order-card {
          padding: 14px 16px;
          border-bottom: 1px solid rgba(0,0,0,0.03);
        }
        .mobile-order-card:last-child { border-bottom: none; }
        .show-mobile { display: block; }
        .show-desktop { display: none; }
        @media (min-width: 700px) {
          .show-mobile { display: none; }
          .show-desktop { display: block; }
        }

        /* Dishes bar */
        .dish-bar-bg {
          height: 5px; border-radius: 3px;
          background: rgba(0,0,0,0.05);
          margin-top: 6px; overflow: hidden;
        }
        .dish-bar-fill { height: 100%; border-radius: 3px; }

        /* Status select custom */
        .status-select-wrap .MuiOutlinedInput-notchedOutline { border: none !important; }
        .status-select-wrap .MuiSelect-select { padding: 4px 8px !important; font-size: 11px !important; font-weight: 700 !important; }

        /* Search */
        .search-box {
          display: flex; align-items: center; gap: 7px;
          background: rgba(0,0,0,0.04);
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 10px; padding: 6px 12px;
        }
        .search-box input {
          background: none; border: none; outline: none;
          color: #212121; font-size: 12px; width: 130px;
        }
        .search-box input::placeholder { color: rgba(33,33,33,0.45); }

        /* Chart toggle */
        .chart-toggle {
          display: flex; background: rgba(0,0,0,0.04);
          border-radius: 10px; padding: 3px; gap: 2px;
        }
        .chart-toggle-btn {
          padding: 4px 12px; border-radius: 8px; border: none;
          font-size: 11px; font-weight: 700; cursor: pointer;
          transition: all 0.15s ease;
        }

        /* View all link */
        .view-all {
          font-size: 11px; font-weight: 700; color: #f97316;
          text-decoration: none;
          display: flex; align-items: center; gap: 3px;
        }
        .view-all:hover { color: #fb923c; }
      `}</style>

      <div className="dashboard-root">

        {/* ─── Hero Banner ───────────────────────────────── */}
        <div className="hero-banner">
          {/* Background orbs */}
          <div className="hero-orb" style={{ width: 200, height: 200, top: -60, right: -40, background: 'radial-gradient(circle, rgba(255,152,0,0.25) 0%, transparent 70%)' }} />
          <div className="hero-orb" style={{ width: 150, height: 150, bottom: -40, left: '30%', background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Pill label="Live" style={{ background: 'rgba(34,197,94,0.2)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }} />
                  <Pill label="Restaurant Control" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)' }} />
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                  Operations Overview
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 6, maxWidth: 480 }}>
                  Real-time analytics for Pala Pitta Ruchulu — orders, kitchen, inventory & more.
                </div>
              </div>

              {/* Revenue highlight */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Total Revenue</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#FFB74D', letterSpacing: '-1px', lineHeight: 1.1 }}>
                  ₹{totalRevenue.toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{orders.length} orders recorded</div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="hero-actions">
              <Link href="/admin/bills" className="action-btn" style={{ background: 'linear-gradient(135deg, #FF9800, #F57C00)', color: 'white', boxShadow: '0 4px 14px rgba(255,152,0,0.35)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                New POS Bill
              </Link>
              <Link href="/admin/kitchen" className="action-btn" style={{ background: 'rgba(255,255,255,0.12)', color: '#FFB74D', border: '1px solid rgba(255,255,255,0.2)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 4C8.68629 4 6 6.68629 6 10V18H18V10C18 6.68629 15.3137 4 12 4ZM4 18H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                Live Kitchen KDS
              </Link>
              <Link href="/admin/orders" className="action-btn" style={{ background: 'rgba(255,255,255,0.12)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.2)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V7H9V5ZM9 12H15M9 16H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                All Orders ({orders.length})
              </Link>
              <Link href="/admin/menu-management" className="action-btn" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M15 8C15 8 14.5 11 12 11C9.5 11 9 8 9 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M17 3L19 5L22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Menu ({menuItems.length})
              </Link>
            </div>
          </div>
        </div>

        {/* ─── KPI Cards ──────────────────────────────────── */}
        <div className="kpi-grid">
          {kpis.map((k) => (
            <div key={k.label} className="kpi-card">
              <div className="kpi-icon-wrap" style={{ background: `${k.accent}18`, color: k.accent }}>
                {k.icon}
              </div>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value">{k.value}</div>
              <div className="kpi-sub">{k.sub}</div>
              <div
                className="kpi-trend"
                style={{
                  background: k.up ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                  color: k.up ? '#4ade80' : '#f87171',
                }}
              >
                {k.up ? '↑' : '↓'} {k.trend}
              </div>
              <div className="kpi-progress-bg">
                <div
                  className="kpi-progress-fill"
                  style={{ width: `${k.progress}%`, background: k.accent }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* ─── Charts ─────────────────────────────────────── */}
        <div className="chart-grid">

          {/* Area Chart */}
          <Card style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#212121', letterSpacing: '-0.2px' }}>Revenue & Orders Stream</div>
                <div style={{ fontSize: 11, color: 'rgba(33,33,33,0.45)', marginTop: 2 }}>Live data from all channels</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="chart-toggle">
                  <button
                    className="chart-toggle-btn"
                    onClick={() => setChartMetric('revenue')}
                    style={{
                      background: chartMetric === 'revenue' ? 'linear-gradient(135deg, #c62828, #e65100)' : 'transparent',
                      color: chartMetric === 'revenue' ? 'white' : 'rgba(33,33,33,0.5)',
                    }}
                  >Revenue ₹</button>
                  <button
                    className="chart-toggle-btn"
                    onClick={() => setChartMetric('orders')}
                    style={{
                      background: chartMetric === 'orders' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'transparent',
                      color: chartMetric === 'orders' ? 'white' : 'rgba(33,33,33,0.5)',
                    }}
                  >Orders</button>
                </div>
              </div>
            </div>

            {dailySales.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', borderRadius: 14, border: '1px dashed rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>📊</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>Awaiting Order Data</div>
                <div style={{ fontSize: 11, color: 'rgba(33,33,33,0.45)', marginTop: 4 }}>Charts will render as orders come in</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={dailySales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartMetric === 'revenue' ? '#f97316' : '#3b82f6'} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={chartMetric === 'revenue' ? '#f97316' : '#3b82f6'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(33,33,33,0.5)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'rgba(33,33,33,0.5)' }} tickFormatter={(v) => chartMetric === 'revenue' ? `₹${v}` : `${v}`} />
                  <RechartsTooltip
                    formatter={(v: unknown) => [
                      chartMetric === 'revenue' ? `₹${Number(v || 0).toLocaleString()}` : `${v} orders`,
                      chartMetric === 'revenue' ? 'Revenue' : 'Orders',
                    ]}
                    contentStyle={{ borderRadius: 14, background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', color: '#212121', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey={chartMetric}
                    stroke={chartMetric === 'revenue' ? '#f97316' : '#3b82f6'}
                    strokeWidth={3}
                    fill="url(#areaGrad)"
                    activeDot={{ r: 6, stroke: 'white', strokeWidth: 2, fill: chartMetric === 'revenue' ? '#f97316' : '#3b82f6' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Pie Chart */}
          <Card style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
            <SectionTitle title="Category Share" subtitle="Veg vs Non-Veg revenue" />
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={catShare} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={5} dataKey="value">
                  {catShare.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(v) => [`${v}%`, 'Share']}
                  contentStyle={{ borderRadius: 12, background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', color: '#212121' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: 12, marginTop: 'auto' }}>
              {catShare.map((cat, i) => (
                <div key={cat.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 3, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>{cat.name}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#212121' }}>{cat.value}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ─── Orders + Dishes ─────────────────────────────── */}
        <div className="orders-grid">

          {/* Live Orders */}
          <Card>
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              <SectionTitle
                title={`Live Orders (${filteredOrders.length})`}
                subtitle="Manage order statuses in real-time"
                action={
                  <Link href="/admin/orders" className="view-all">
                    View All →
                  </Link>
                }
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div className="status-tabs">
                  {['all', 'pending', 'preparing', 'ready', 'delivered'].map((s) => (
                    <button
                      key={s}
                      className="status-tab"
                      onClick={() => setStatusFilter(s)}
                      style={{
                        background: statusFilter === s
                          ? s === 'all' ? 'rgba(249,115,22,0.2)' : STATUS_META[s]?.bg || 'rgba(249,115,22,0.2)'
                          : 'rgba(0,0,0,0.03)',
                        color: statusFilter === s
                          ? s === 'all' ? '#f97316' : STATUS_META[s]?.color || '#f97316'
                          : 'rgba(33,33,33,0.55)',
                        borderColor: statusFilter === s
                          ? s === 'all' ? 'rgba(249,115,22,0.3)' : `${STATUS_META[s]?.color}44` || 'rgba(249,115,22,0.3)'
                          : 'rgba(0,0,0,0.04)',
                      }}
                    >
                      {s === 'all' ? `All (${orders.length})` : (STATUS_META[s]?.label || s)}
                    </button>
                  ))}
                </div>

                <div className="search-box">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="8" stroke="rgba(33,33,33,0.45)" strokeWidth="2"/>
                    <path d="M21 21L16.65 16.65" stroke="rgba(33,33,33,0.45)" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Desktop Table */}
            <div className="show-desktop" style={{ overflowX: 'auto' }}>
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'rgba(33,33,33,0.45)', fontSize: 13 }}>
                        No orders match the current filter
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.slice(0, 7).map((order) => {
                      const sm = STATUS_META[order.status] || STATUS_META.pending;
                      return (
                        <tr key={order.id}>
                          <td>
                            <span style={{ color: '#f97316', fontWeight: 800, fontSize: 13 }}>
                              #{String(order.id).slice(-5)}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div className="cust-avatar">
                                {(order.customerName || 'C').charAt(0)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#212121', fontSize: 12 }}>{order.customerName || 'Walk-in'}</div>
                                <div style={{ fontSize: 10, color: 'rgba(33,33,33,0.5)' }}>{order.customerPhone || '—'}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ color: 'rgba(33,33,33,0.55)', fontWeight: 600 }}>
                            {order.items?.length || 1} items
                          </td>
                          <td>
                            <span style={{ color: '#4ade80', fontWeight: 800, fontSize: 13 }}>
                              ₹{(order.grandTotal || order.subtotal || 0).toLocaleString()}
                            </span>
                          </td>
                          <td>
                            <div className="status-select-wrap">
                              <Select
                                size="small"
                                value={order.status}
                                onChange={(e) => updateOrderStatus(order.id, e.target.value as Order['status'])}
                                sx={{
                                  fontSize: '11px', fontWeight: 700, height: 28,
                                  borderRadius: '20px',
                                  background: sm.bg,
                                  color: sm.color,
                                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                                  '& .MuiSelect-icon': { color: sm.color },
                                }}
                              >
                                <MuiMenuItem value="pending">⏳ Pending</MuiMenuItem>
                                <MuiMenuItem value="preparing">👨‍🍳 Preparing</MuiMenuItem>
                                <MuiMenuItem value="ready">🛎️ Ready</MuiMenuItem>
                                <MuiMenuItem value="delivered">✅ Delivered</MuiMenuItem>
                                <MuiMenuItem value="cancelled">❌ Cancelled</MuiMenuItem>
                              </Select>
                            </div>
                          </td>
                          <td style={{ color: 'rgba(33,33,33,0.5)', fontSize: 11 }}>
                            {order.orderTime || 'Just now'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="show-mobile">
              {filteredOrders.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(33,33,33,0.45)', fontSize: 13 }}>
                  No orders match the filter
                </div>
              ) : (
                filteredOrders.slice(0, 6).map((order) => {
                  const sm = STATUS_META[order.status] || STATUS_META.pending;
                  return (
                    <div key={order.id} className="mobile-order-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="cust-avatar">{(order.customerName || 'C').charAt(0)}</div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#212121' }}>{order.customerName || 'Walk-in'}</div>
                            <div style={{ fontSize: 10, color: 'rgba(33,33,33,0.45)' }}>#{String(order.id).slice(-5)}</div>
                          </div>
                        </div>
                        <span style={{ color: '#4ade80', fontWeight: 800, fontSize: 14 }}>
                          ₹{(order.grandTotal || order.subtotal || 0).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="status-select-wrap">
                          <Select
                            size="small"
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value as Order['status'])}
                            sx={{
                              fontSize: '11px', fontWeight: 700, height: 26,
                              borderRadius: '20px', background: sm.bg, color: sm.color,
                              '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                              '& .MuiSelect-icon': { color: sm.color },
                            }}
                          >
                            <MuiMenuItem value="pending">⏳ Pending</MuiMenuItem>
                            <MuiMenuItem value="preparing">👨‍🍳 Preparing</MuiMenuItem>
                            <MuiMenuItem value="ready">🛎️ Ready</MuiMenuItem>
                            <MuiMenuItem value="delivered">✅ Delivered</MuiMenuItem>
                            <MuiMenuItem value="cancelled">❌ Cancelled</MuiMenuItem>
                          </Select>
                        </div>
                        <span style={{ fontSize: 10, color: 'rgba(33,33,33,0.45)' }}>{order.orderTime || 'Just now'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Right column: Top Dishes + Inventory */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Top Dishes */}
            <Card style={{ padding: 20 }}>
              <SectionTitle
                title="🔥 Top Dishes"
                subtitle="Most ordered this period"
              />
              {topDishes.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'rgba(33,33,33,0.45)', fontSize: 12 }}>
                  No dish data yet
                </div>
              ) : (
                topDishes.map((dish, i) => (
                  <div key={dish.name} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: 6,
                          background: i === 0 ? '#f97316' : i === 1 ? '#ef4444' : 'rgba(0,0,0,0.08)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 900, color: i < 2 ? 'white' : 'rgba(33,33,33,0.5)',
                        }}>
                          {i + 1}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {dish.name}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(33,33,33,0.55)' }}>
                        {dish.count}×
                      </span>
                    </div>
                    <div className="dish-bar-bg">
                      <div
                        className="dish-bar-fill"
                        style={{
                          width: `${Math.min(100, (dish.count / maxDishCount) * 100)}%`,
                          background: i === 0 ? '#f97316' : i === 1 ? '#ef4444' : '#3b82f6',
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </Card>

            {/* Inventory Health */}
            <Card style={{ padding: 20 }}>
              <SectionTitle
                title="📦 Inventory"
                subtitle="Stock levels"
                action={
                  <Link href="/admin/inventory" className="view-all">Manage →</Link>
                }
              />
              {inventory.length === 0 ? (
                <div style={{ fontSize: 12, color: 'rgba(33,33,33,0.45)', textAlign: 'center', padding: '16px 0' }}>
                  No inventory data
                </div>
              ) : (
                inventory.slice(0, 5).map((inv) => {
                  const isLow = inv.quantity <= inv.minQuantity;
                  return (
                    <div key={inv.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '9px 0', borderBottom: '1px solid rgba(0,0,0,0.04)',
                    }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1' }}>{inv.name}</div>
                        <div style={{ fontSize: 10, color: 'rgba(33,33,33,0.45)', marginTop: 1 }}>
                          Min: {inv.minQuantity} {inv.unit}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 11, fontWeight: 800,
                        padding: '3px 10px', borderRadius: 20,
                        background: isLow ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.12)',
                        color: isLow ? '#f87171' : '#4ade80',
                        border: `1px solid ${isLow ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.2)'}`,
                      }}>
                        {inv.quantity} {inv.unit}
                      </div>
                    </div>
                  );
                })
              )}
            </Card>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
