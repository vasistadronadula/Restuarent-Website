'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { canAccess } from '@/lib/roleAccess';
import { PageHeader, SectionHeading } from '@/components/admin/ui';
import {
  Users, Package, TrendingUp, ShieldCheck,
  ClipboardList, CalendarDays, ChefHat, BookOpen, Calculator,
  BarChart3, Receipt, Ticket, Briefcase, UserCircle,
  AlertTriangle, ArrowRight, Sparkles,
} from 'lucide-react';

const dayKey = (d: Date) => {
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

/** Group tiles so staff can scan by area of responsibility */
const LAUNCHPAD_GROUPS = [
  {
    label: 'Operations',
    pages: [
      {
        label: 'Cashier POS',
        href: '/admin/pos',
        icon: Calculator,
        description: 'Ring up sales, print receipts, take counter payments',
      },
      {
        label: 'Live Orders',
        href: '/admin/orders',
        icon: ClipboardList,
        description: 'Real-time order tracking and kitchen updates',
        badgeKey: 'pendingOrders',
        urgent: true,
      },
      {
        label: 'Kitchen KDS',
        href: '/admin/kitchen',
        icon: ChefHat,
        description: 'Kitchen display, cooking queues, lane progress',
      },
    ],
  },
  {
    label: 'Management',
    pages: [
      {
        label: 'Menu Management',
        href: '/admin/menu-management',
        icon: BookOpen,
        description: 'Edit dishes, prices, portions, categories',
      },
      {
        label: 'Coupons & Offers',
        href: '/admin/coupons',
        icon: Ticket,
        description: 'Promo codes, campaigns, flat discounts',
      },
    ],
  },
  {
    label: 'Reports & Admin',
    pages: [
      {
        label: 'Bills Ledger',
        href: '/admin/bills',
        icon: Receipt,
        description: 'Historical bill records and invoices',
      },
      {
        label: 'Reports & Stats',
        href: '/admin/reports',
        icon: BarChart3,
        description: 'Revenue, metrics, and top sellers',
      },
      {
        label: 'Live Performance',
        href: '/admin/performance',
        icon: TrendingUp,
        description: 'Real-time sales graphs and daily targets',
      },
      {
        label: 'My Profile',
        href: '/admin/profile',
        icon: UserCircle,
        description: 'Account details, avatar, notifications',
      },
    ],
  },
] as const;

export default function AdminDashboard() {
  const { orders, menuItems } = useAdmin();
  const { user } = useAuth();

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

  const greeting = useMemo(() => {
    if (!nowTs) return 'Welcome back';
    return greetingFor(new Date(nowTs).getHours());
  }, [nowTs]);

  const stats = useMemo(() => {
    if (!todayStr) {
      return {
        todayRevenue: 0, todayOrders: 0, pendingOrders: 0, activeDishes: 0,
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

    const activeDishes = menuItems.filter((i) => i.isAvailable).length;

    return {
      todayRevenue, todayOrders, pendingOrders, activeDishes,
    };
  }, [orders, menuItems, todayStr]);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.user_metadata?.name?.split(' ')[0]
    || 'Admin';

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-7 w-full max-w-full font-sans">

        {/* Greeting Header */}
        <PageHeader
          title={`${greeting}, ${firstName}`}
          subtitle="Here's what's happening at the restaurant today."
          action={
            <Link
              href="/admin/pos"
              className="flex items-center gap-2 px-4 py-2.5 bg-[#059669] hover:bg-[#047857] text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-[0.98]"
            >
              <Calculator className="w-4 h-4" />
              <span>Open Cashier POS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        />

        {/* ── Today's Status — 4 KPI cards ─────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            { label: "Today's Revenue", value: money(stats.todayRevenue), sub: 'excluding cancelled', icon: '💰' },
            { label: "Today's Orders", value: stats.todayOrders.toString(), sub: 'all statuses', icon: '🧾' },
            {
              label: 'Pending Orders',
              value: stats.pendingOrders.toString(),
              sub: 'need attention',
              urgent: stats.pendingOrders > 0,
              icon: '⏳',
            },
            {
              label: 'Active Menu Items',
              value: stats.activeDishes.toString(),
              sub: 'available to order',
              icon: '🍽️',
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-2xs transition-all ${
                kpi.urgent && Number(kpi.value) > 0
                  ? 'border-amber-300 bg-amber-50/50'
                  : 'border-slate-200/90'
              }`}
            >
              <div className="flex items-start justify-between">
                <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                  <span>{kpi.icon}</span>
                  <span>{kpi.label}</span>
                </p>
                {kpi.urgent && Number(kpi.value) > 0 && (
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                )}
              </div>
              <p className={`text-2xl sm:text-3xl font-black mt-2 tabular-nums font-mono ${
                kpi.urgent && Number(kpi.value) > 0 ? 'text-amber-800' : 'text-slate-900'
              }`}>
                {kpi.value}
              </p>
              <p className="text-xs text-slate-400 mt-1 font-medium">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* ── App Launcher Modules ──────────────────────────── */}
        <div className="space-y-7">
          {LAUNCHPAD_GROUPS.map((group) => (
            <div key={group.label}>
              <SectionHeading
                title={group.label}
                subtitle={`${group.pages.length} operational modules`}
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3.5 mt-3">
                {group.pages.map((page) => {
                  const IconComponent = page.icon;
                  const badgeVal = 'badgeKey' in page && page.badgeKey
                    ? stats[page.badgeKey as keyof typeof stats]
                    : 0;
                  const isUrgent = 'urgent' in page && page.urgent && badgeVal > 0;

                  return (
                    <Link
                      key={page.label}
                      href={page.href}
                      className={`group relative flex flex-col gap-3 p-4 sm:p-4.5 bg-white border rounded-2xl hover:shadow-md transition-all duration-150 active:scale-[0.99] ${
                        isUrgent
                          ? 'border-amber-300 hover:border-amber-400 bg-amber-50/20'
                          : 'border-slate-200/90 hover:border-emerald-300 hover:bg-emerald-50/10'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-9.5 h-9.5 rounded-xl flex items-center justify-center flex-shrink-0 shadow-2xs ${
                        isUrgent
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700 group-hover:bg-[#059669] group-hover:text-white'
                      } transition-colors`}>
                        <IconComponent className="w-4.5 h-4.5" />
                      </div>

                      {/* Label + description */}
                      <div>
                        <h3 className="font-bold text-[13.5px] text-slate-900 group-hover:text-[#059669] transition-colors leading-tight">
                          {page.label}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2 font-medium">
                          {page.description}
                        </p>
                      </div>

                      {/* Badge */}
                      {badgeVal > 0 && (
                        <span className="absolute top-3 right-3 bg-amber-600 text-white rounded-full min-w-[20px] h-[20px] px-1 flex items-center justify-center text-[10px] font-black font-mono shadow-xs">
                          {badgeVal}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

      </div>
    </AdminLayout>
  );
}
