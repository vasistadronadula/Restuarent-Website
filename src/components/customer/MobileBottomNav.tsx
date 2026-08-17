'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReceiptText, ShoppingCart, User, UtensilsCrossed } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useCartStore, getCartTotalItems } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { CART_TARGET_ATTR } from '@/lib/flyToCart';

/**
 * Storefront bottom navigation for phones.
 *
 * Everything a customer does on this site used to be two taps away behind a
 * hamburger: open the drawer, then pick. The four destinations below are the
 * whole customer journey — browse, pay, check on it, manage your account — so
 * they get permanent thumb-height buttons instead.
 *
 * Desktop keeps the top navbar and never renders this; the breakpoint matches
 * the navbar's own `md` switch so exactly one of the two is ever in charge.
 */

const NAV_HEIGHT = 60;

/** Surfaces with their own chrome, or where a nav bar competes with the task. */
const HIDDEN_PREFIXES = ['/admin', '/cashier', '/checkout', '/login', '/signup', '/reset-password'];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const totalItems = useCartStore((s) => getCartTotalItems(s.items));
  const signedIn = useAuthStore((s) => Boolean(s.user));

  const hidden = !pathname || HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));

  /**
   * Publish the height so page content can clear it. A fixed element is out of
   * flow and pushes nothing, so the footer's last row and the sticky cart bar
   * both read this instead of hard-coding a number that goes stale the moment
   * the bar's height changes. Kept at 0px on desktop and on the pages that
   * hide the bar, so those surfaces reserve nothing.
   */
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(max-width: 767.95px)');
    const apply = () => {
      root.style.setProperty('--ppr-bottom-nav-h', !hidden && mq.matches ? `${NAV_HEIGHT}px` : '0px');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => {
      mq.removeEventListener('change', apply);
      root.style.setProperty('--ppr-bottom-nav-h', '0px');
    };
  }, [hidden]);

  if (hidden) return null;

  const items = [
    { label: 'Menu', href: '/menu', icon: UtensilsCrossed, badge: false },
    { label: 'Cart', href: '/cart', icon: ShoppingCart, badge: true },
    { label: 'Orders', href: '/orders', icon: ReceiptText, badge: false },
    { label: 'Account', href: signedIn ? '/profile' : '/login', icon: User, badge: false },
  ];

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : Boolean(pathname?.startsWith(href));

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'border-hair-1 fixed inset-x-0 bottom-0 z-40 flex border-t bg-white md:hidden',
        // The inset keeps the labels off the iOS home indicator without
        // shrinking the tap targets themselves.
        'pb-[env(safe-area-inset-bottom,0px)]',
        'shadow-[0_-2px_16px_rgba(2,6,12,0.08)]'
      )}
      style={{ height: `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))` }}
    >
      {items.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        const showBadge = item.badge && totalItems > 0;

        return (
          <Link
            key={item.label}
            href={item.href}
            prefetch
            onClick={() => useCartStore.getState().closeCart()}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors outline-none',
              active ? 'text-brand-700' : 'text-ink-3'
            )}
          >
            {/* Active marker hangs off the top edge, so the icon row keeps its
                full height and the labels never shift as you navigate. */}
            <span
              aria-hidden="true"
              className={cn(
                'bg-brand absolute top-0 left-1/2 h-[3px] w-7 -translate-x-1/2 rounded-b-full transition-transform duration-200',
                active ? 'scale-x-100' : 'scale-x-0'
              )}
            />
            {/* On phones this tab is the cart, so it is where an added dish
                flies to — see lib/flyToCart. The attribute goes on the icon
                wrapper rather than the whole tab so the arrival lands on the
                icon itself instead of the full-height column. */}
            <span className="relative" {...(item.badge ? { [CART_TARGET_ATTR]: '' } : {})}>
              <Icon className={cn('size-[21px]', active && 'text-brand')} />
              {showBadge && (
                <span className="bg-brand absolute -top-1.5 -right-2.5 grid h-[17px] min-w-[17px] place-items-center rounded-full px-1 text-[10px] font-extrabold tabular-nums text-white">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </span>
            <span className={cn('text-[10.5px] leading-none', active ? 'font-extrabold' : 'font-semibold')}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
