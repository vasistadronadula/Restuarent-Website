'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Search, Plus, MoreHorizontal, Calendar, Users,
  X, Check, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface CouponCardData {
  id: string;
  code: string;
  title: string;
  discountText: string;
  discountType: 'percent' | 'flat' | 'free';
  description: string;
  status: 'active' | 'scheduled' | 'expired';
  validity?: string;
  usage?: { current: number; max: number };
  noExpiry?: boolean;
  unlimited?: boolean;
  startsIn?: string;
  endedOn?: string;
}

const INITIAL_COUPONS: CouponCardData[] = [
  {
    id: 'c1',
    code: 'FESTIVE20',
    title: 'Festive Season',
    discountText: '20% OFF ENTIRE ORDER',
    discountType: 'percent',
    description: 'Holiday season special campaign across all locations.',
    status: 'active',
    validity: 'Dec 20 - Jan 05',
    usage: { current: 450, max: 1000 },
  },
  {
    id: 'c2',
    code: 'LUNCH10',
    title: 'Lunch Special',
    discountText: '₹100.00 FLAT DISCOUNT',
    discountType: 'flat',
    description: 'Valid only Mon-Fri, 11am-2pm.',
    status: 'active',
    noExpiry: true,
    unlimited: true,
  },
  {
    id: 'c3',
    code: 'FREESIDES',
    title: 'Free Appetizer',
    discountText: 'FREE APPETIZER',
    discountType: 'free',
    description: 'Min order ₹499. Dine-in only.',
    status: 'scheduled',
    startsIn: '3 Days (Nov 15)',
  },
  {
    id: 'c4',
    code: 'SPOOKY31',
    title: 'Halloween Special',
    discountText: '31% OFF',
    discountType: 'percent',
    description: 'Past limited-time festival coupon.',
    status: 'expired',
    endedOn: 'Oct 31, 2025',
  },
];

export default function CouponManagementPage() {
  const [coupons, setCoupons] = useState<CouponCardData[]>(INITIAL_COUPONS);
  const [search, setSearch] = useState('');
  const [newModalOpen, setNewModalOpen] = useState(false);

  /* Form */
  const [code, setCode] = useState('');
  const [discountText, setDiscountText] = useState('15% OFF ENTIRE ORDER');
  const [description, setDescription] = useState('');

  const filteredCoupons = coupons.filter(
    (c) =>
      !search.trim() ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateCoupon = () => {
    if (!code.trim()) {
      toast.error('Coupon code is required');
      return;
    }

    const newCoupon: CouponCardData = {
      id: `c_${Date.now()}`,
      code: code.trim().toUpperCase(),
      title: 'Custom Promotion',
      discountText: discountText.trim(),
      discountType: 'percent',
      description: description.trim() || 'Active promotional discount.',
      status: 'active',
      noExpiry: true,
      unlimited: true,
    };

    setCoupons([newCoupon, ...coupons]);
    toast.success(`Coupon ${newCoupon.code} created! 🎉`);
    setCode('');
    setDescription('');
    setNewModalOpen(false);
  };

  return (
    <AdminLayout title="Coupon Management">
      <div className="space-y-6 max-w-full font-sans">

        {/* ── Page Header with Search and Create CTA (Exact match to Image 5) ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-1">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Coupon Management
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              Monitor and manage active promotional campaigns.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search codes input */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search codes..."
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

            {/* New Coupon Button */}
            <button
              type="button"
              onClick={() => setNewModalOpen(true)}
              className="h-10 px-4.5 rounded-xl bg-[#065F46] hover:bg-[#047857] active:scale-[0.98] text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all shrink-0"
            >
              <Plus className="size-4 stroke-[2.5]" />
              <span>New Coupon</span>
            </button>
          </div>
        </div>

        {/* ── Coupon Cards Grid (Exact match to Image 5) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCoupons.map((coupon) => {
            const isActive = coupon.status === 'active';
            const isScheduled = coupon.status === 'scheduled';
            const isExpired = coupon.status === 'expired';

            return (
              <div
                key={coupon.id}
                className={cn(
                  'rounded-3xl p-6 shadow-2xs flex flex-col justify-between transition-all select-none border',
                  coupon.id === 'c1'
                    ? 'bg-gradient-to-br from-[#ECFDF5] via-white to-[#F0FDF4] border-emerald-300 ring-2 ring-emerald-500/10'
                    : isExpired
                    ? 'bg-white/80 border-slate-200 opacity-60'
                    : 'bg-white border-slate-200/90 hover:border-slate-300'
                )}
              >
                <div>
                  {/* Top Status Badge & Action Menu */}
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow-2xs',
                        isActive
                          ? 'bg-[#059669] text-white'
                          : isScheduled
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      )}
                    >
                      <span
                        className={cn(
                          'size-1.5 rounded-full',
                          isActive ? 'bg-white' : isScheduled ? 'bg-amber-600' : 'bg-slate-400'
                        )}
                      />
                      <span>
                        {isActive ? 'Active' : isScheduled ? 'Scheduled' : 'Expired'}
                      </span>
                    </span>

                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </div>

                  {/* Coupon Code & Discount Text */}
                  <div className="mt-4">
                    <h2
                      className={cn(
                        'text-2xl font-black tracking-tight font-mono',
                        coupon.id === 'c1'
                          ? 'text-[#059669]'
                          : isExpired
                          ? 'text-slate-400 line-through'
                          : 'text-slate-950'
                      )}
                    >
                      {coupon.code}
                    </h2>

                    <p
                      className={cn(
                        'text-lg font-black mt-1 font-mono tracking-tight',
                        coupon.discountType === 'flat'
                          ? 'text-blue-700'
                          : coupon.discountType === 'free'
                          ? 'text-amber-700'
                          : 'text-slate-900'
                      )}
                    >
                      {coupon.discountText}
                    </p>

                    <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                      {coupon.description}
                    </p>
                  </div>
                </div>

                {/* Footer Metadata */}
                <div className="pt-4 mt-6 border-t border-slate-100/90 text-xs text-slate-600">
                  {coupon.usage && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-slate-500">Validity</span>
                        <span className="font-mono text-slate-900">
                          {coupon.validity}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-400 font-medium">Usage Limit</span>
                        <span className="font-mono text-slate-900">
                          {coupon.usage.current} / {coupon.usage.max}
                        </span>
                      </div>

                      {/* Usage Progress Bar */}
                      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-[#059669] rounded-full"
                          style={{
                            width: `${(coupon.usage.current / coupon.usage.max) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {coupon.noExpiry && (
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-slate-400" />
                        <span>No Expiry</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="size-3.5 text-slate-400" />
                        <span>Unlimited Usage</span>
                      </span>
                    </div>
                  )}

                  {coupon.startsIn && (
                    <div className="flex items-center justify-between text-[11px] font-semibold text-amber-900">
                      <span>Starts In</span>
                      <span className="font-mono font-bold">{coupon.startsIn}</span>
                    </div>
                  )}

                  {coupon.endedOn && (
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                      <span>Ended On</span>
                      <span className="font-mono">{coupon.endedOn}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* ── New Coupon Modal ── */}
      <Dialog open={newModalOpen} onOpenChange={setNewModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              Create New Coupon
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div>
              <label className="font-bold text-slate-600 block mb-1">Coupon Code</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. BHARAT50"
                className="rounded-xl font-mono font-bold uppercase tracking-wider"
              />
            </div>

            <div>
              <label className="font-bold text-slate-600 block mb-1">Discount Headline</label>
              <Input
                value={discountText}
                onChange={(e) => setDiscountText(e.target.value)}
                placeholder="e.g. 20% OFF ENTIRE ORDER"
                className="rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="font-bold text-slate-600 block mb-1">Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Special weekend offer for online orders"
                className="rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="sm:justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewModalOpen(false)}
              className="rounded-xl border-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateCoupon}
              className="rounded-xl bg-[#065F46] hover:bg-[#047857] text-white font-bold px-5"
            >
              Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
