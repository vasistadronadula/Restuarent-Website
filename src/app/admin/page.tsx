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
  AlertTriangle,
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
        description: 'Ring up sales, print receipts, take payments',
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
      {
        label: 'Table Bookings',
        href: '/admin/reservations',
        icon: CalendarDays,
        description: 'Reservations, table mapping, walk-in seating',
        badgeKey: 'todayBookings',
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
        label: 'Inventory & Stock',
        href: '/admin/inventory',
        icon: Package,
        description: 'Stock levels, thresholds, alerts, restocks',
        badgeKey: 'lowStock',
        urgent: true,
      },
      {
        label: 'Customers',
        href: '/admin/customers',
        icon: Users,
        description: 'Customer accounts, VIP status, order histories',
      },
      {
        label: 'Employees & HR',
        href: '/admin/employees',
        icon: Briefcase,
        description: 'Payroll, credentials, shift schedules',
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
    label: 'Reports',
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
  const { orders, reservations, inventory, employees } = useAdmin();
  const { user, userRole } = useAuth();

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
        todayRevenue: 0, todayOrders: 0, pendingOrders: 0,
        todayBookings: 0, lowStock: 0, totalEmployees: 0,
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
    const totalEmployees = employees.length;

    return {
      todayRevenue, todayOrders, pendingOrders,
      todayBookings, lowStock, totalEmployees,
    };
  }, [orders, reservations, inventory, employees, todayStr]);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.user_metadata?.name?.split(' ')[0]
    || 'there';

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6 w-full max-w-full">

        {/* Greeting + role */}
        <PageHeader
          title={`${greeting}, ${firstName}`}
          subtitle="Here's what's happening at the restaurant today."
          action={
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-medium text-stone-500 shadow-xs flex-shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span className="capitalize">{userRole || 'staff'}</span>
            </div>
          }
        />

        {/* ── Today's Status — 4 KPI cards ─────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Today's Revenue", value: money(stats.todayRevenue), sub: 'excluding cancelled' },
            { label: "Today's Orders", value: stats.todayOrders.toString(), sub: 'all statuses' },
            {
              label: 'Pending Orders',
              value: stats.pendingOrders.toString(),
              sub: 'need attention',
              urgent: stats.pendingOrders > 0,
            },
            {
              label: 'Low Stock Items',
              value: stats.lowStock.toString(),
              sub: 'below threshold',
              urgent: stats.lowStock > 0,
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className={`bg-white border rounded-xl p-4 ${
                kpi.urgent && Number(kpi.value) > 0
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-stone-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <p className="text-xs font-medium text-stone-500">{kpi.label}</p>
                {kpi.urgent && Number(kpi.value) > 0 && (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                )}
              </div>
              <p className={`text-2xl font-bold mt-1 tabular-nums ${
                kpi.urgent && Number(kpi.value) > 0 ? 'text-amber-700' : 'text-stone-900'
              }`}>
                {kpi.value}
              </p>
              <p className="text-xs text-stone-400 mt-0.5">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* ── App Launcher ─────────────────────────────────── */}
        <div className="space-y-6">
          {LAUNCHPAD_GROUPS.map((group) => {
            const visiblePages = group.pages.filter((p) => canAccess(userRole, p.href));
            if (visiblePages.length === 0) return null;

            return (
              <div key={group.label}>
                <SectionHeading
                  title={group.label}
                  subtitle={`${visiblePages.length} modules`}
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-3">
                  {visiblePages.map((page) => {
                    const IconComponent = page.icon;
                    const badgeVal = 'badgeKey' in page && page.badgeKey
                      ? stats[page.badgeKey as keyof typeof stats]
                      : 0;
                    const isUrgent = 'urgent' in page && page.urgent && badgeVal > 0;

                    return (
                      <Link
                        key={page.label}
                        href={page.href}
                        className={`group relative flex flex-col gap-3 p-4 bg-white border rounded-xl hover:shadow-sm transition-all duration-150 ${
                          isUrgent
                            ? 'border-amber-300 hover:border-amber-400'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        {/* Icon */}
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isUrgent
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-stone-100 text-stone-600 group-hover:bg-stone-200'
                        } transition-colors`}>
                          <IconComponent className="w-4.5 h-4.5" />
                        </div>

                        {/* Label + description */}
                        <div>
                          <h3 className="font-semibold text-sm text-stone-900 group-hover:text-amber-700 transition-colors leading-tight">
                            {page.label}
                          </h3>
                          <p className="text-xs text-stone-400 mt-0.5 leading-relaxed line-clamp-2">
                            {page.description}
                          </p>
                        </div>

                        {/* Badge — static, no pulse */}
                        {badgeVal > 0 && (
                          <span className="absolute top-3 right-3 bg-amber-600 text-white rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-semibold">
                            {badgeVal}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </AdminLayout>
  );
}
