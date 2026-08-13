'use client';

import React from 'react';
import { useMenuItems, useCategories } from '@/lib/queries';
import { MenuItem } from '@/types/pos';
import MenuSection from './MenuSection';
import BillingSection from './BillingSection';
import { LoaderCircle, Wifi, RefreshCw } from 'lucide-react';

interface POSClientWrapperProps {
  initialMenuItems?: MenuItem[];
}

export default function POSClientWrapper({
  initialMenuItems = [],
}: POSClientWrapperProps) {
  // Live real-time Supabase menu items & categories
  const {
    data: menuItems = initialMenuItems,
    isLoading: isMenuLoading,
    isRefetching,
    refetch,
  } = useMenuItems();

  const { data: categories = [] } = useCategories();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] p-2.5 sm:p-4 md:p-5 antialiased">
      {/* Top Header / Live Realtime Sync Status Bar */}
      <div className="max-w-[1720px] mx-auto mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-[#475569] flex items-center gap-1.5">
            <Wifi className="size-3.5 text-emerald-600" />
            Supabase Realtime Live
          </span>
          {isRefetching && (
            <span className="text-[11px] text-[#2563EB] flex items-center gap-1">
              <RefreshCw className="size-3 animate-spin" /> Syncing...
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="text-xs text-[#475569] hover:text-[#2563EB] flex items-center gap-1 font-medium transition-colors"
        >
          <RefreshCw className={`size-3 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh Menu
        </button>
      </div>

      {/* 2-Column Responsive Layout: 60% Menu / 40% Billing on Desktop */}
      <div className="max-w-[1720px] mx-auto flex flex-col md:flex-row items-start gap-4 lg:gap-6">
        {/* Left Column (60% width): Menu & Order Entry */}
        <main className="w-full md:w-[58%] lg:w-[60%] shrink-0">
          {isMenuLoading && menuItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-[#475569] gap-2">
              <LoaderCircle className="size-8 animate-spin text-[#2563EB]" />
              <p className="text-sm font-medium">Loading live menu from database...</p>
            </div>
          ) : (
            <MenuSection
              menuItems={menuItems as MenuItem[]}
              categories={categories}
            />
          )}
        </main>

        {/* Right Column (40% width): Cart & Billing (Sticky on Desktop) */}
        <section className="w-full md:w-[42%] lg:w-[40%] shrink-0 pb-10 md:pb-0">
          <BillingSection />
        </section>
      </div>
    </div>
  );
}
