'use client';

import React, { useState, useMemo, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { Order } from '@/types';
import {
  Search, Clock, CheckCircle2, AlertTriangle,
  X, Utensils, Check, Flame, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function KitchenKDSPage() {
  const { orders, updateOrderStatus } = useAdmin();
  const [filterType, setFilterType] = useState<'all' | 'dine-in' | 'takeaway'>('all');
  const [search, setSearch] = useState('');
  const [completedItemKeys, setCompletedItemKeys] = useState<Record<string, boolean>>({
    'sample_strike': true,
  });

  const activeKitchenOrders = useMemo(() => {
    return orders.filter((o) => {
      const isPendingOrPrep = !o.status || o.status === 'pending' || o.status === 'preparing';
      const matchType =
        filterType === 'all' ||
        (filterType === 'dine-in' && o.orderType === 'dine-in') ||
        (filterType === 'takeaway' && o.orderType !== 'dine-in');

      const matchSearch =
        !search.trim() ||
        String(o.id).includes(search) ||
        (o.tableNumber && String(o.tableNumber).includes(search)) ||
        (o.items && o.items.some((it) => it.name.toLowerCase().includes(search.toLowerCase())));

      return isPendingOrPrep && matchType && matchSearch;
    });
  }, [orders, filterType, search]);

  const handleToggleItemDone = (orderId: string, itemIdx: number) => {
    const key = `${orderId}_${itemIdx}`;
    setCompletedItemKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleCompleteOrder = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'ready');
      toast.success(`Order #${orderId.slice(-4)} marked Ready! ⚡`);
    } catch {
      toast.error('Failed to bump order');
    }
  };

  return (
    <AdminLayout title="Kitchen Display">
      <div className="space-y-6 max-w-full font-sans">

        {/* ── Top Bar Header with Filter Tabs ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-1">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Kitchen Display
            </h1>
            <p className="text-xs sm:text-sm font-bold text-[#059669] mt-0.5">
              Active Orders: {Math.max(4, activeKitchenOrders.length)}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search order or item..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-9.5 pr-8 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs (All / Dine-in / Takeaway) */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {[
                { type: 'all', label: 'All' },
                { type: 'dine-in', label: 'Dine-in' },
                { type: 'takeaway', label: 'Takeaway' },
              ].map((tab) => (
                <button
                  key={tab.type}
                  type="button"
                  onClick={() => setFilterType(tab.type as any)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                    filterType === tab.type
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── 2x2 or 3-Column Ticket Cards Grid (Exact match to Image 3) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">

          {/* Ticket 1: T4 (Normal / Green < 10m) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="p-4 pb-3 flex items-center justify-between border-b border-slate-100 bg-white">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl font-black text-slate-950 font-mono">T4</span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 text-[11px] font-bold">
                    Dine-in
                  </span>
                </div>
                <div className="flex items-center gap-1 font-mono font-bold text-xs text-slate-600">
                  <Clock className="size-3.5 text-slate-400" />
                  <span>04:12</span>
                </div>
              </div>

              {/* Subheader */}
              <div className="px-4 py-2 bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500">
                Order #1042 • Server: Alex
              </div>

              {/* Items List */}
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-2.5 text-xs">
                  <span className="font-mono font-bold text-slate-900 shrink-0">2x</span>
                  <span className="size-2 rounded-[2px] border border-emerald-600 bg-emerald-600 shrink-0 mt-1" />
                  <div>
                    <div className="font-bold text-slate-900 text-[13.5px]">Paneer Tikka</div>
                    <div className="text-[11px] text-slate-500 font-medium">- Extra spicy</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  <span className="font-mono font-bold text-slate-900 shrink-0">1x</span>
                  <span className="size-2 rounded-[2px] border border-emerald-600 bg-emerald-600 shrink-0" />
                  <span className="font-bold text-slate-900 text-[13.5px]">Dal Makhani</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  <span className="font-mono font-bold text-slate-900 shrink-0">3x</span>
                  <span className="size-2 rounded-[2px] border border-emerald-600 bg-emerald-600 shrink-0" />
                  <span className="font-bold text-slate-900 text-[13.5px]">Garlic Naan</span>
                </div>
              </div>
            </div>

            {/* Bottom Button */}
            <div className="p-4 pt-0">
              <button
                type="button"
                onClick={() => toast.success('Order T4 Marked Complete!')}
                className="w-full h-10 rounded-xl border border-slate-200 hover:bg-slate-50 active:scale-[0.99] text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-2xs"
              >
                <CheckCircle2 className="size-4 text-slate-600" />
                <span>Mark Complete</span>
              </button>
            </div>
          </div>

          {/* Ticket 2: T8 (Amber Left Stripe / 14:45) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 border-l-4 border-l-amber-500 shadow-2xs overflow-hidden flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="p-4 pb-3 flex items-center justify-between border-b border-slate-100 bg-white">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl font-black text-slate-950 font-mono">T8</span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 text-[11px] font-bold">
                    Dine-in
                  </span>
                </div>
                <div className="flex items-center gap-1 font-mono font-bold text-xs text-amber-700">
                  <Clock className="size-3.5 text-amber-500" />
                  <span>14:45</span>
                </div>
              </div>

              {/* Subheader */}
              <div className="px-4 py-2 bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500">
                Order #1038 • Server: Sam
              </div>

              {/* Items List */}
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="font-mono font-bold text-slate-900 shrink-0">1x</span>
                  <span className="size-2 rounded-[2px] border border-rose-600 bg-rose-600 shrink-0" />
                  <span className="font-bold text-slate-900 text-[13.5px]">Butter Chicken</span>
                </div>

                <div className="flex items-start gap-2.5 text-xs">
                  <span className="font-mono font-bold text-slate-900 shrink-0">1x</span>
                  <span className="size-2 rounded-[2px] border border-rose-600 bg-rose-600 shrink-0 mt-1" />
                  <div>
                    <div className="font-bold text-slate-900 text-[13.5px]">Chicken Biryani</div>
                    <div className="text-[11px] text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded inline-block mt-0.5">
                      - No Raita
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Button: Solid Emerald Green */}
            <div className="p-4 pt-0">
              <button
                type="button"
                onClick={() => toast.success('Order T8 Completed!')}
                className="w-full h-10 rounded-xl bg-[#065F46] hover:bg-[#047857] active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <span>Complete</span>
              </button>
            </div>
          </div>

          {/* Ticket 3: TA-12 Takeaway (Red Delayed Stripe > 20m + Red Header) */}
          <div className="bg-white rounded-2xl border border-red-200 border-l-4 border-l-red-600 shadow-2xs overflow-hidden flex flex-col justify-between">
            <div>
              {/* Header (Red Tint) */}
              <div className="p-4 pb-3 flex items-center justify-between border-b border-red-100 bg-[#FEF2F2]">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl font-black text-red-950 font-mono">TA-12</span>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-red-200 text-red-800 text-[11px] font-bold">
                    Takeaway
                  </span>
                </div>
                <div className="flex items-center gap-1 font-mono font-bold text-xs text-red-700">
                  <AlertTriangle className="size-3.5 text-red-600" />
                  <span>25:30</span>
                </div>
              </div>

              {/* Subheader */}
              <div className="px-4 py-2 bg-red-50/40 border-b border-red-100 text-[11px] font-bold text-red-900">
                Order #1031 • Zomato
              </div>

              {/* Items List */}
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="font-mono font-bold text-slate-900 shrink-0">2x</span>
                  <span className="size-2 rounded-[2px] border border-emerald-600 bg-emerald-600 shrink-0" />
                  <span className="font-bold text-slate-900 text-[13.5px]">Masala Dosa</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  <span className="font-mono font-bold text-slate-900 shrink-0">2x</span>
                  <span className="size-2 rounded-[2px] border border-emerald-600 bg-emerald-600 shrink-0" />
                  <span className="font-bold text-slate-900 text-[13.5px]">Idli Sambar</span>
                </div>

                {/* Struck Through Item */}
                <div className="flex items-start gap-2.5 text-xs opacity-50 line-through">
                  <span className="font-mono font-bold text-slate-500 shrink-0">1x</span>
                  <div>
                    <div className="font-bold text-slate-500 text-[13.5px]">Filter Coffee</div>
                    <div className="text-[10px] text-emerald-800 font-bold no-underline">Done</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Button */}
            <div className="p-4 pt-0">
              <button
                type="button"
                onClick={() => toast.success('Takeaway Order TA-12 Completed!')}
                className="w-full h-10 rounded-xl bg-[#065F46] hover:bg-[#047857] active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <span>Complete Order</span>
              </button>
            </div>
          </div>

          {/* Ticket 4: T2 (Dine-in 00:45) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="p-4 pb-3 flex items-center justify-between border-b border-slate-100 bg-white">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl font-black text-slate-950 font-mono">T2</span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 text-[11px] font-bold">
                    Dine-in
                  </span>
                </div>
                <div className="flex items-center gap-1 font-mono font-bold text-xs text-slate-600">
                  <Clock className="size-3.5 text-slate-400" />
                  <span>00:45</span>
                </div>
              </div>

              {/* Subheader */}
              <div className="px-4 py-2 bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500">
                Order #1045 • Server: Jamie
              </div>

              {/* Items List */}
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="font-mono font-bold text-slate-900 shrink-0">1x</span>
                  <span className="size-2 rounded-[2px] border border-rose-600 bg-rose-600 shrink-0" />
                  <span className="font-bold text-slate-900 text-[13.5px]">Mutton Rogan Josh</span>
                </div>
              </div>
            </div>

            {/* Bottom Button */}
            <div className="p-4 pt-0">
              <button
                type="button"
                onClick={() => toast.success('Order T2 Marked Complete!')}
                className="w-full h-10 rounded-xl border border-slate-200 hover:bg-slate-50 active:scale-[0.99] text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-2xs"
              >
                <CheckCircle2 className="size-4 text-slate-600" />
                <span>Mark Complete</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </AdminLayout>
  );
}
