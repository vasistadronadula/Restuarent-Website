'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Home, ReceiptText, ShoppingCart, UtensilsCrossed } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useCartStore, getCartTotalItems } from '@/store/useCartStore';
import { CART_TARGET_ATTR } from '@/lib/flyToCart';

/**
 * Storefront bottom navigation for phones.
 *
 * Everything a customer does on this site used to be two taps away behind a
 * hamburger: open the drawer, then pick. The five destinations below are the
 * whole customer journey — browse, order, pay, check on it, book a table — so
 * they get permanent thumb-height buttons instead.
 *
 * Desktop keeps the top navbar and never renders this; the breakpoint matches
 * the navbar's own `md` switch so exactly one of the two is ever in charge.
 */

const NAV_HEIGHT = 62;

/** Surfaces with their own chrome, or where a nav bar competes with the task. */
const HIDDEN_PREFIXES = ['/admin', '/cashier', '/checkout', '/login', '/signup', '/reset-password'];

const NAV_ITEMS = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Menu', href: '/menu', icon: BookOpen },
  { label: 'Cart', href: '/cart', icon: ShoppingCart, badge: true },
  { label: 'Orders', href: '/orders', icon: ReceiptText },
  { label: 'Book', href: '/reservation', icon: UtensilsCrossed },
] as const;

export default function MobileBottomNav() {
  const pathname = usePathname();
  const totalItems = useCartStore((s) => getCartTotalItems(s.items));

  const hidden = !pathname || HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));

  /**
   * Publish the height so page content can clear it. A fixed element is out of
   * flow and pushes nothing, so the footer's last row and the floating cart
   * bar both read this instead of hard-coding a number that goes stale the
   * moment the bar's height changes. Kept at 0px on desktop and on the pages
   * that hide the bar, so those surfaces reserve nothing.
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

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : Boolean(pathname?.startsWith(href));

  return (
    <nav
      aria-label="Primary"
      style={{ height: NAV_HEIGHT }}
      className={cn(
        'bg-background/95 fixed inset-x-0 bottom-0 z-40 flex border-t backdrop-blur-xl md:hidden',
        // The inset keeps the labels off the iOS home indicator without
        // shrinking the tap targets themselves.
        'pb-[env(safe-area-inset-bottom,0px)]',
        'shadow-[0_-4px_24px_rgba(0,0,0,0.08)]'
      )}
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        const showBadge = 'badge' in item && item.badge && totalItems > 0;

        return (
          <Link
            key={item.label}
            href={item.href}
            prefetch
            onClick={() => useCartStore.getState().closeCart()}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors outline-none',
              'focus-visible:bg-muted',
              active ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            {/* Active marker hangs off the top edge, so the icon row keeps its
                full height and the labels never shift as you navigate. */}
            <span
              aria-hidden="true"
              className={cn(
                'bg-primary absolute top-0 left-1/2 h-[3px] w-6.5 -translate-x-1/2 rounded-b-[3px] transition-transform duration-200',
                active ? 'scale-x-100' : 'scale-x-0'
              )}
            />
            {/* On phones this tab is the cart, so it is where an added dish
                flies to — see lib/flyToCart. The attribute goes on the icon
                wrapper rather than the whole tab so the arrival lands on the
                icon itself instead of the full-height column. */}
            <span className="relative" {...('badge' in item && item.badge ? { [CART_TARGET_ATTR]: '' } : {})}>
              <Icon className={cn('size-[23px]', active && 'fill-primary/15')} />
              {showBadge && (
                <span className="bg-primary text-primary-foreground absolute -top-1.5 -right-2 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-extrabold tabular-nums">
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
