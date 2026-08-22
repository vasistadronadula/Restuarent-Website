'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BadgePercent, ChevronRight } from 'lucide-react';

import { useCoupons } from '@/lib/queries';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Guest-only banner that tells a browsing (not-signed-in) diner what they're
 * leaving on the table: coupons only ever apply once signed in, see
 * CouponField's `if (!user) return null`. Signed-in customers already have
 * the real coupon picker at checkout, so this renders nothing for them —
 * repeating the same codes here would just be noise on top of the one place
 * they actually apply.
 */
export function CouponTeaser({ className }: { className?: string }) {
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();
  const { data: coupons = [] } = useCoupons();

  if (user) return null;

  const best = coupons
    .filter((c) => c.isActive)
    .sort((a, b) => b.discount - a.discount)[0];
  if (!best) return null;

  const loginHref = `/login?redirect=${encodeURIComponent(pathname || '/menu')}`;

  return (
    <Link
      href={loginHref}
      className={`border-brand-200 bg-brand-50 hover:bg-brand-100 group flex items-center gap-3 rounded-2xl border border-dashed px-4 py-3 transition-colors ${className ?? ''}`}
    >
      <span className="bg-brand grid size-9 shrink-0 place-items-center rounded-full text-white">
        <BadgePercent className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1 text-[13px] leading-tight">
        <strong className="text-brand-800 font-extrabold tracking-wide">
          {best.discount}% off with {best.code}
        </strong>
        <span className="text-brand-700 mt-0.5 block font-semibold">
          Sign in to unlock coupon discounts on your order
        </span>
      </span>
      <ChevronRight className="text-brand-600 size-[18px] shrink-0 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
