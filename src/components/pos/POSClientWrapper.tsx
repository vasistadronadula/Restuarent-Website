'use client';

import React from 'react';
import { MenuItem } from '@/types/pos';
import MenuSection from './MenuSection';
import BillingSection from './BillingSection';

interface POSClientWrapperProps {
  initialMenuItems: MenuItem[];
}

export default function POSClientWrapper({
  initialMenuItems,
}: POSClientWrapperProps) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] p-3 sm:p-4 md:p-6 antialiased">
      {/* 2-Column Responsive Layout: 60% Menu / 40% Billing on Desktop (>= 768px / 1024px) */}
      <div className="max-w-[1720px] mx-auto flex flex-col md:flex-row items-start gap-5 lg:gap-6">
        {/* Left Column (60% width): Menu & Order Entry */}
        <main className="w-full md:w-[58%] lg:w-[60%] shrink-0">
          <MenuSection menuItems={initialMenuItems} />
        </main>

        {/* Right Column (40% width): Cart & Billing (Sticky on Desktop) */}
        <section className="w-full md:w-[42%] lg:w-[40%] shrink-0 pb-10 md:pb-0">
          <BillingSection />
        </section>
      </div>
    </div>
  );
}
