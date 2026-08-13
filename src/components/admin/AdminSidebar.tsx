'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutGrid, Calculator, BookOpen, ChefHat,
  Table as TableIcon, Ticket, Settings, Plus,
  ClipboardList, Receipt, BarChart3, User, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const ADMIN_NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin', icon: LayoutGrid, exact: true },
  { label: 'POS', href: '/admin/pos', icon: Calculator },
  { label: 'Menu', href: '/admin/menu-management', icon: BookOpen },
  { label: 'KDS', href: '/admin/kitchen', icon: ChefHat },
  { label: 'Tables', href: '/admin/tables', icon: TableIcon },
  { label: 'Coupons', href: '/admin/coupons', icon: Ticket },
  { label: 'Settings', href: '/admin/profile', icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user, userRole } = useAuth();

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Admin User';
  const roleLabel = userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : 'Manager';

  return (
    <aside className="w-56 lg:w-60 bg-white border-r border-slate-200/90 flex flex-col justify-between shrink-0 select-none h-screen sticky top-0 z-30 font-sans">
      <div className="p-4 space-y-4">
        {/* Brand Header */}
        <div className="px-2 pt-1">
          <Link href="/admin" className="flex items-center gap-2.5 group">
            <div className="size-8.5 rounded-xl bg-gradient-to-tr from-[#059669] to-[#10B981] flex items-center justify-center text-white font-black text-sm shadow-xs">
              R
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight leading-none group-hover:text-emerald-700 transition-colors">
                RestoFlow
              </h2>
              <p className="text-[10.5px] font-semibold text-slate-400 mt-0.5 tracking-wide">
                High-Volume Mode
              </p>
            </div>
          </Link>
        </div>

        {/* New Order CTA Button (Dark emerald green) */}
        <Link
          href="/admin/pos"
          className="w-full h-11 rounded-xl bg-[#065F46] hover:bg-[#047857] active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm shadow-emerald-950/10"
        >
          <Plus className="size-4 stroke-[2.5]" />
          <span>New Order</span>
        </Link>

        {/* Navigation Links */}
        <nav className="space-y-1 pt-1">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  'w-full h-10 px-3.5 rounded-xl font-bold text-xs flex items-center gap-3 transition-all',
                  isActive
                    ? 'bg-[#059669] text-white shadow-xs font-black'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                )}
              >
                <Icon className={cn('size-4 shrink-0', isActive ? 'text-white stroke-[2.5]' : 'text-slate-500')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile Widget */}
      <div className="p-4 border-t border-slate-100">
        <Link
          href="/admin/profile"
          className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-50 transition-colors group"
        >
          <div className="size-8.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
            {userName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-slate-900 truncate leading-tight group-hover:text-emerald-700">
              {userName}
            </h4>
            <p className="text-[10.5px] font-medium text-slate-400 truncate">
              {roleLabel}
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
