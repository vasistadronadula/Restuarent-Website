'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ADMIN_NAV, ADMIN_NAV_GROUPS, navItemForPath } from './adminNav';
import { useAdminBadges } from './useAdminBadges';
import { canAccess } from '@/lib/roleAccess';
import { useAuthStore } from '@/store/useAuthStore';
import { X } from 'lucide-react';

import Image from 'next/image';

interface Props {
  /** Drawer state. Above the pinned breakpoint the rail is always visible. */
  open: boolean;
  onClose: () => void;
  /**
   * Pins the rail open from `xl` instead of `lg`. KDS is a three-column
   * layout on till hardware that is often exactly 1280px wide — 236px of
   * permanent chrome there costs a column of tickets.
   */
  wide?: boolean;
}

/**
 * The console's dark rail — the one element that anchors every admin screen.
 *
 * Ink ground with the accent reserved for the active route, so at a glance
 * there is exactly one lit item on screen and it is always where you are.
 */
export default function AdminSidebar({ open, onClose, wide = false }: Props) {
  const pathname = usePathname();
  const badges = useAdminBadges();
  const active = navItemForPath(pathname);
  const userRole = useAuthStore((s) => s.userRole);
  // A restricted role (chef/cashier/waiter) used to see every link in the
  // rail and only find out a page wasn't theirs when AdminGuard bounced them
  // back out after the click — the rail should only ever offer what the
  // role can actually open.
  const visibleNav = ADMIN_NAV.filter((item) => canAccess(userRole, item.href));

  const rail = (
    <>
      <div className="px-4 pt-4 pb-3.5 border-b border-white/10 flex items-center justify-between gap-2">
        <Link href="/admin" className="flex items-center gap-2 min-w-0 transition-opacity hover:opacity-90">
          <div className="bg-white rounded-xl px-2.5 py-1.5 shadow-sm shrink-0">
            <Image
              src="/logo.png"
              alt="Pala Pitta Ruchulu"
              width={115}
              height={34}
              className="h-6 w-auto object-contain"
              priority
            />
          </div>
        </Link>
        <button
          type="button"
          onClick={onClose}
          className={`${wide ? 'xl:hidden' : 'lg:hidden'} -mr-1 p-1.5 text-white/75 hover:text-white`}
          aria-label="Close navigation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-3">
        {ADMIN_NAV_GROUPS.map((group) => {
          const items = visibleNav.filter((i) => i.group === group);
          if (!items.length) return null;
          return (
            <div key={group}>
              <div className="ad-nav-group">{group}</div>
              <div className="flex flex-col gap-0.5">
                {items.map((item) => {
                  const count = item.badge ? badges[item.badge] : 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className="ad-nav-item"
                      data-active={active?.href === item.href}
                      aria-current={active?.href === item.href ? 'page' : undefined}
                    >
                      <span className="truncate">{item.label}</span>
                      {count > 0 && <span className="ad-nav-badge">{count}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      {/* Pinned rail */}
      <aside
        className={`hidden ${wide ? 'xl:flex' : 'lg:flex'} flex-col flex-none sticky top-0 h-screen w-[var(--ad-sidebar-w)] bg-ad-accent text-white`}
        style={{ fontFamily: 'var(--ad-font)' }}
      >
        {rail}
      </aside>

      {/* Drawer, below the pinned breakpoint */}
      {open && (
        <div className={`${wide ? 'xl:hidden' : 'lg:hidden'} fixed inset-0 z-50 flex`}>
          <div
            className="absolute inset-0 bg-[rgba(32,30,29,0.55)]"
            onClick={onClose}
            aria-hidden
          />
          <aside
            className="relative flex flex-col w-[var(--ad-sidebar-w)] max-w-[80vw] h-full bg-ad-accent text-white"
            style={{ fontFamily: 'var(--ad-font)' }}
          >
            {rail}
          </aside>
        </div>
      )}
    </>
  );
}
