'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown, LayoutDashboard, LogIn, LogOut, Mail, Menu as MenuIcon, Phone,
  ReceiptText, ShoppingCart, User, UserPlus, UtensilsCrossed,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useCartStore, getCartTotalItems } from '@/store/useCartStore';
import { CART_TARGET_ATTR } from '@/lib/flyToCart';
import { useAuthStore } from '@/store/useAuthStore';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS, getRoleHome, isStaffRole, getRoleDashboardLabel } from '@/lib/roleAccess';
import { accountDisplayName, accountIdentityLabel } from '@/lib/phoneIdentity';
import { restaurantInfo } from '@/data/restaurantInfo';
import PalaPittaLogo from './PalaPittaLogo';
import { Container } from './Container';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';

const NAV_LINKS = [
  { label: 'Menu', href: '/menu', icon: UtensilsCrossed },
  { label: 'My Orders', href: '/orders', icon: ReceiptText },
  { label: 'Contact', href: '/contact', icon: Mail },
];

const ACCOUNT_LINKS = [
  { label: 'My Profile', href: '/profile', icon: User },
  { label: 'My Orders', href: '/orders', icon: ReceiptText },
];

const PHONE_HREF = `tel:${restaurantInfo.phone.replace(/\s/g, '')}`;

/**
 * The storefront header.
 *
 * Deliberately thin — 60px on a phone, 68px on desktop — and carrying only
 * four things: who you are looking at, where you can go, your cart, and your
 * account. Everything a delivery app puts here and nothing else, because this
 * bar is sticky and every pixel of it is a pixel of menu the customer cannot
 * see.
 *
 * The cart is the one item that gets colour. It is the only control here whose
 * state changes while you browse, and it is the destination of the fly-to-cart
 * animation, so it has to be findable without being read.
 */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);

  const totalItems = useCartStore((s) => getCartTotalItems(s.items));
  const user = useAuthStore((s) => s.user);
  const userRole = useAuthStore((s) => s.userRole);
  const { signOutUser } = useAuth();

  const userName = accountDisplayName(user);
  const accountLabel = accountIdentityLabel(user?.email, user?.user_metadata?.phone);
  const isStaff = isStaffRole(userRole);

  const accountLinks = useMemo(() => {
    // Admins and staff keep their profile on their own dashboard.
    if (isStaff) return ACCOUNT_LINKS.filter((link) => link.href !== '/profile');
    return ACCOUNT_LINKS;
  }, [isStaff]);

  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMobileOpen(false);
  }

  const authHref = useMemo(() => {
    const isAuthPage = !pathname || ['/login', '/signup', '/reset-password'].some((p) => pathname.startsWith(p));
    const suffix = isAuthPage || pathname === '/' ? '' : `?redirect=${encodeURIComponent(pathname)}`;
    return { login: `/login${suffix}`, signup: `/signup${suffix}` };
  }, [pathname]);

  useEffect(() => {
    let frame = 0;
    const handler = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setScrolled(window.scrollY > 8);
      });
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => {
      window.removeEventListener('scroll', handler);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    useCartStore.getState().closeCart();
  }, [pathname]);

  const isActive = useCallback(
    (href: string) => (href === '/' ? pathname === '/' : Boolean(pathname?.startsWith(href))),
    [pathname]
  );

  return (
    <header className="sticky top-0 z-40 w-full px-2 pt-2 md:px-3 md:pt-3">
      <div
        className={cn(
          'bg-brand relative overflow-hidden rounded-full transition-shadow duration-200',
          scrolled
            ? 'shadow-[0_10px_28px_rgba(148,67,11,0.38)]'
            : 'shadow-[0_4px_16px_rgba(148,67,11,0.22)]'
        )}
      >
        {/* Glass sheen — a soft highlight across the top half, like light
            glancing off a curved glossy surface. Purely decorative, so it
            sits behind the interactive content and never intercepts clicks. */}
        <div
          aria-hidden
          className="from-white/30 pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b to-transparent"
        />

        <Container className="relative flex h-[60px] items-center justify-between gap-3 md:h-[68px]">
          <Link
            href="/menu"
            aria-label={`${restaurantInfo.name} — Menu`}
            className="flex shrink-0 items-center"
          >
            <PalaPittaLogo variant="dark" size="small" priority />
          </Link>

          {/* ── Desktop navigation ─────────────────────────────────────── */}
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map(({ label, href, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3.5 py-2 text-[14px] font-semibold transition-colors outline-none',
                    active ? 'bg-white/15 text-white' : 'text-white/85 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon className="size-[17px]" />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* ── Actions ────────────────────────────────────────────────── */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <a
              href={PHONE_HREF}
              className="text-white/85 hover:bg-white/10 hover:text-white hidden items-center gap-2 rounded-lg px-3 py-2 text-[14px] font-semibold transition-colors lg:flex"
            >
              <Phone className="size-[17px]" />
              {restaurantInfo.phoneDisplay}
            </a>

            {/* Cart. The count lives inside the pill rather than as a floating
                badge so it can't collide with the header's bottom edge on a
                short viewport. A solid white pill is what pops against the
                brand-orange bar — the old brand-on-white treatment would
                vanish into the header now that the header itself is brand. */}
            <Link
              href="/cart"
              prefetch
              aria-label={`Cart, ${totalItems} ${totalItems === 1 ? 'item' : 'items'}`}
              {...{ [CART_TARGET_ATTR]: '' }}
              className={cn(
                'inline-flex h-10 items-center gap-2 rounded-full px-3 text-[14px] font-bold transition-colors outline-none sm:px-4',
                totalItems > 0
                  ? 'bg-white text-brand-700 hover:bg-white/90'
                  : 'text-white/85 hover:bg-white/10 hover:text-white'
              )}
            >
              <ShoppingCart className="size-[18px]" />
              <span className="hidden sm:inline">Cart</span>
              {totalItems > 0 && (
                <span className="bg-brand grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-extrabold text-white tabular-nums">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </Link>

            {isStaff && (
              <Link
                href={getRoleHome(userRole)}
                className="hidden h-10 items-center gap-2 rounded-full border border-white/30 px-4 text-[13px] font-bold text-white transition-colors hover:bg-white/10 md:inline-flex"
              >
                <LayoutDashboard className="size-4" />
                Dashboard
              </Link>
            )}

            {!user ? (
              <Link
                href={authHref.login}
                prefetch
                className="text-brand-700 hidden h-10 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-bold transition-colors hover:bg-white/90 sm:inline-flex"
              >
                <LogIn className="size-4" />
                Sign in
              </Link>
            ) : (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Account menu"
                    className="hidden h-10 items-center gap-2 rounded-full pr-2.5 pl-1.5 text-white transition-colors outline-none hover:bg-white/10 sm:inline-flex"
                  >
                    <Avatar className="size-7">
                      <AvatarFallback className="bg-white text-brand-700 text-[12px] font-extrabold">
                        {(userName || accountLabel || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-[92px] truncate text-[14px] font-semibold md:block">
                      {userName?.split(' ')[0] || 'Account'}
                    </span>
                    <ChevronDown className="size-4 text-white/70" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className="border-hair-1 w-60 rounded-2xl border bg-white p-1.5 shadow-[0_8px_32px_rgba(2,6,12,0.14)]"
                >
                  <div className="border-hair-2 mb-1 border-b px-3 py-2.5">
                    <p className="text-ink-1 truncate text-[14px] font-bold">{userName || 'User'}</p>
                    <p className="text-ink-4 mt-0.5 truncate text-[12px]">{accountLabel}</p>
                    <p className="text-ink-3 mt-1.5 text-[11px] font-semibold tracking-wide uppercase">
                      {userRole ? ROLE_LABELS[userRole] : 'Customer'}
                    </p>
                  </div>

                  {isStaff && (
                    <DropdownMenuItem asChild className="focus:bg-brand-50 rounded-xl">
                      <Link href={getRoleHome(userRole)} className="text-brand-700 flex items-center gap-2.5 text-[14px] font-semibold">
                        <LayoutDashboard className="size-4" />
                        {getRoleDashboardLabel(userRole, userName)}
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {accountLinks.map(({ label, href, icon: Icon }) => (
                    <DropdownMenuItem key={href} asChild className="focus:bg-hair-2 rounded-xl">
                      <Link href={href} className="text-ink-2 flex items-center gap-2.5 text-[14px] font-semibold">
                        <Icon className="text-ink-4 size-4" />
                        {label}
                      </Link>
                    </DropdownMenuItem>
                  ))}

                  <DropdownMenuSeparator className="bg-hair-2 my-1" />

                  <DropdownMenuItem
                    onClick={() => signOutUser()}
                    className="text-nonveg focus:bg-nonveg/8 focus:text-nonveg rounded-xl text-[14px] font-semibold"
                  >
                    <LogOut className="mr-2.5 size-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* ── Phone drawer ─────────────────────────────────────────── */}
            <Sheet modal={false} open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Open menu"
                  className="grid size-10 place-items-center rounded-full text-white transition-colors outline-none hover:bg-white/10 md:hidden"
                >
                  <MenuIcon className="size-[22px]" />
                </button>
              </SheetTrigger>

              <SheetContent
                side="right"
                className="border-hair-1 flex w-[290px] flex-col justify-between bg-white p-0"
              >
                <SheetHeader className="border-hair-2 border-b p-4">
                  <SheetTitle className="sr-only">Site menu</SheetTitle>
                  <PalaPittaLogo variant="light" size="small" />
                </SheetHeader>

                <div className="flex-1 space-y-5 overflow-y-auto p-4">
                  <MobileSection label="Explore">
                    {NAV_LINKS.map(({ label, href, icon: Icon }) => (
                      <MobileLink key={href} href={href} icon={Icon} active={isActive(href)}>
                        {label}
                      </MobileLink>
                    ))}
                  </MobileSection>

                  {!user ? (
                    <MobileSection label="Account">
                      <MobileLink href={authHref.login} icon={LogIn} active={pathname === '/login'}>
                        Sign in
                      </MobileLink>
                      <MobileLink href={authHref.signup} icon={UserPlus} active={pathname === '/signup'}>
                        Create account
                      </MobileLink>
                    </MobileSection>
                  ) : (
                    <MobileSection label={userName || 'Your account'}>
                      {isStaff && (
                        <MobileLink href={getRoleHome(userRole)} icon={LayoutDashboard} active={false}>
                          Dashboard
                        </MobileLink>
                      )}
                      {accountLinks.map(({ label, href, icon: Icon }) => (
                        <MobileLink key={href} href={href} icon={Icon} active={isActive(href)}>
                          {label}
                        </MobileLink>
                      ))}
                      <button
                        type="button"
                        onClick={() => { signOutUser(); setMobileOpen(false); }}
                        className="text-nonveg hover:bg-nonveg/8 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition-colors"
                      >
                        <LogOut className="size-[18px]" />
                        Sign out
                      </button>
                    </MobileSection>
                  )}
                </div>

                <div className="border-hair-2 space-y-2 border-t p-4">
                  <a
                    href={PHONE_HREF}
                    className="border-hair-1 text-ink-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-[14px] font-bold"
                  >
                    <Phone className="size-4" />
                    {restaurantInfo.phoneDisplay}
                  </a>
                  <SheetClose asChild>
                    <Link
                      href="/menu"
                      className="bg-brand hover:bg-brand-600 flex h-12 w-full items-center justify-center rounded-xl text-[15px] font-extrabold text-white transition-colors"
                    >
                      Order now
                    </Link>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </Container>
      </div>
    </header>
  );
}

function MobileSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-ink-4 mb-2 px-3 text-[11px] font-bold tracking-wider uppercase">{label}</p>
      {children}
    </div>
  );
}

function MobileLink({
  href,
  icon: Icon,
  active,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <SheetClose asChild>
      <Link
        href={href}
        className={cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition-colors',
          active ? 'bg-brand-50 text-brand-700' : 'text-ink-2 hover:bg-hair-2'
        )}
      >
        <Icon className={cn('size-[18px]', active ? 'text-brand' : 'text-ink-4')} />
        {children}
      </Link>
    </SheetClose>
  );
}
