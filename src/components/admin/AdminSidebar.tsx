'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS } from '@/lib/roleAccess';
import { ADMIN_NAV, ADMIN_NAV_GROUPS, navItemForPath } from './adminNav';
import { useAdminBadges } from './useAdminBadges';
import { Globe, LogOut, X } from 'lucide-react';

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
  const { user, userRole, signOutUser } = useAuth();
  const badges = useAdminBadges();
  const active = navItemForPath(pathname);

  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Staff';
  const initials = String(name)
    .split(' ')
    .map((p: string) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'PP';

  const rail = (
    <>
      <div className="px-5 pt-5 pb-4 border-b-2 border-[rgba(243,242,242,0.28)] flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="ad-num text-[20px] leading-none truncate">PALA PITTA</div>
          <div className="text-[10px] tracking-[0.18em] uppercase opacity-60 mt-1.5">
            Restaurant
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`${wide ? 'xl:hidden' : 'lg:hidden'} -mr-1 -mt-1 p-1.5 text-[rgba(243,242,242,0.7)] hover:text-white`}
          aria-label="Close navigation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-3">
        {ADMIN_NAV_GROUPS.map((group) => {
          const items = ADMIN_NAV.filter((i) => i.group === group);
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

      <div className="border-t-2 border-[rgba(243,242,242,0.28)]">
        <div className="px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-[34px] h-[34px] flex-none grid place-items-center bg-ad-accent text-ad-bg ad-num text-[13px]">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold truncate">{name}</div>
              <div className="text-[10px] tracking-[0.12em] uppercase opacity-55">
                {userRole ? ROLE_LABELS[userRole] : 'Staff'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={signOutUser}
            className="flex-none p-2 text-[rgba(243,242,242,0.65)] hover:bg-ad-accent hover:text-white transition-colors"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Pinned rail */}
      <aside
        className={`hidden ${wide ? 'xl:flex' : 'lg:flex'} flex-col flex-none sticky top-0 h-screen w-[var(--ad-sidebar-w)] bg-ad-ink text-ad-bg`}
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
            className="relative flex flex-col w-[var(--ad-sidebar-w)] max-w-[80vw] h-full bg-ad-ink text-ad-bg"
            style={{ fontFamily: 'var(--ad-font)' }}
          >
            {rail}
          </aside>
        </div>
      )}
    </>
  );
}
