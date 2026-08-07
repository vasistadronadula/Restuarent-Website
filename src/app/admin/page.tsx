'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { canAccess } from '@/lib/roleAccess';
import {
  PageHeader, StatCard, SectionHeading,
} from '@/components/admin/ui';
import {
  Users, Package, TrendingUp, ShieldCheck,
  ClipboardList, CalendarDays, ChefHat, BookOpen, Calculator,
  BarChart3, Receipt, Ticket, Briefcase, UserCircle
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

const LAUNCHPAD_PAGES = [
  {
    label: 'Cashier POS',
    href: '/admin/pos',
    icon: Calculator,
    color: 'from-rose-500 to-red-600 dark:from-rose-600 dark:to-red-700',
    description: 'Ring up walk-in counter sales, print receipts, and take payments',
  },
  {
    label: 'Live Orders',
    href: '/admin/orders',
    icon: ClipboardList,
    color: 'from-orange-500 to-amber-600 dark:from-orange-600 dark:to-amber-700',
    description: 'Real-time order tracking, statuses, and kitchen updates',
    badgeKey: 'pendingOrders',
  },
  {
    label: 'Kitchen KDS',
    href: '/admin/kitchen',
    icon: ChefHat,
    color: 'from-red-500 to-pink-600 dark:from-red-600 dark:to-pink-700',
    description: 'Kitchen Display System cooking queues and lane progress trackers',
  },
  {
    label: 'Table Bookings',
    href: '/admin/reservations',
    icon: CalendarDays,
    color: 'from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700',
    description: 'Manage guest reservations, table mappings, and walk-in seating',
    badgeKey: 'todayBookings',
  },
  {
    label: 'Inventory & Stock',
    href: '/admin/inventory',
    icon: Package,
    color: 'from-yellow-500 to-amber-600 dark:from-yellow-600 dark:to-amber-700',
    description: 'Ingredient stock levels, thresholds, alerts, and restock records',
    badgeKey: 'lowStock',
  },
  {
    label: 'Menu Management',
    href: '/admin/menu-management',
    icon: BookOpen,
    color: 'from-violet-500 to-purple-600 dark:from-violet-600 dark:to-purple-700',
    description: 'Edit restaurant menu dishes, prices, portions, and categories',
  },
  {
    label: 'Customers Directory',
    href: '/admin/customers',
    icon: Users,
    color: 'from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700',
    description: 'Manage customer accounts, VIP status, and overall order histories',
  },
  {
    label: 'Bills Ledger',
    href: '/admin/bills',
    icon: Receipt,
    color: 'from-stone-500 to-stone-600 dark:from-stone-600 dark:to-stone-700',
    description: 'Historical records, ledger and invoices of all generated bills',
  },
  {
    label: 'Coupons & Offers',
    href: '/admin/coupons',
    icon: Ticket,
    color: 'from-fuchsia-500 to-rose-600 dark:from-fuchsia-600 dark:to-rose-700',
    description: 'Create and configure promo campaign coupon codes and flat discounts',
  },
  {
    label: 'Reports & Stats',
    href: '/admin/reports',
    icon: BarChart3,
    color: 'from-cyan-500 to-blue-600 dark:from-cyan-600 dark:to-blue-700',
    description: 'Analytical dashboards of revenue streams, metrics, and top sellers',
  },
  {
    label: 'Live Performance',
    href: '/admin/performance',
    icon: TrendingUp,
    color: 'from-pink-500 to-rose-600 dark:from-pink-600 dark:to-rose-700',
    description: 'Real-time sales performance graphs, incoming orders, and daily targets',
  },
  {
    label: 'Employees & HR',
    href: '/admin/employees',
    icon: Briefcase,
    color: 'from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-800',
    description: 'Track team payroll, system login credentials, and shift schedules',
  },
  {
    label: 'My Profile',
    href: '/admin/profile',
    icon: UserCircle,
    color: 'from-neutral-500 to-neutral-600 dark:from-neutral-600 dark:to-neutral-700',
    description: 'Manage personal login account details, avatar, and staff notifications',
  },
];export default function AdminDashboard() {
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

  // Filter launcher pages by user role permissions
  const visiblePages = useMemo(() => {
    return LAUNCHPAD_PAGES.filter((p) => canAccess(userRole, p.href));
  }, [userRole]);

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-5 w-full max-w-full">
        
        {/* Compact greeting + role badge */}
        <PageHeader
          title={`${greeting}, ${user?.user_metadata?.full_name || user?.user_metadata?.name || 'Staff Member'} 👋`}
          subtitle="Restaurant operations hub — quick stats below and one-tap access to every module your role can open."
          action={
            <div className="flex items-center gap-2 px-2.5 py-1 bg-white dark:bg-[#1C1C1E] border border-stone-200/50 dark:border-[#2C2C2E]/60 rounded-xl text-stone-600 dark:text-stone-300 text-[10px] font-extrabold shadow-sm flex-shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Authorized: <span className="text-amber-700 dark:text-amber-500 capitalize">{userRole || 'staff'}</span></span>
            </div>
          }
        />

        {/* 2. App Launcher Grid */}
        <div className="space-y-3">
          <SectionHeading
            title="Restaurant Operations App Launcher"
            subtitle="Badges show items that need your attention."
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {visiblePages.map((page) => {
              const IconComponent = page.icon;
              const badgeVal = page.badgeKey ? stats[page.badgeKey as keyof typeof stats] : 0;
              
              return (
                <Link 
                  key={page.label} 
                  href={page.href}
                  className="group relative flex flex-col items-start p-3 bg-white dark:bg-[#1C1C1E]/80 border border-stone-200/50 dark:border-[#2C2C2E]/60 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.015)] dark:shadow-none hover:border-stone-300 dark:hover:border-stone-700 hover:shadow-xs transition-all duration-150 overflow-hidden"
                >
                  {/* Apple Squircle Icon */}
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${page.color} text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-150 flex-shrink-0`}>
                    <IconComponent className="w-4.5 h-4.5 stroke-[1.8]" />
                  </div>

                  {/* Launcher Page Title & Description */}
                  <h3 className="font-extrabold text-xs text-stone-850 dark:text-stone-100 mt-2.5 group-hover:text-amber-700 dark:group-hover:text-amber-500 transition-colors">
                    {page.label}
                  </h3>
                  <p className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 mt-0.5 leading-normal">
                    {page.description}
                  </p>

                  {/* Absolute Notification Count Badge (Apple iOS style) */}
                  {badgeVal > 0 && (
                    <span className="absolute top-3 right-3 bg-rose-600 text-white rounded-full min-w-[18px] h-4.5 px-1 flex items-center justify-center text-[9px] font-black shadow-md border border-white dark:border-[#1C1C1E] animate-pulse">
                      {badgeVal}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
        
      </div>
    </AdminLayout>
  );
}
