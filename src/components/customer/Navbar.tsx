'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, BookOpen, CalendarDays, ChevronDown, Clock, Info, LayoutDashboard, LogIn, LogOut,
  Mail, MapPin, Menu as MenuIcon, Phone, ReceiptText, ShoppingCart, User, UserPlus,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useCartStore, getCartTotalItems } from '@/store/useCartStore';
import { CART_TARGET_ATTR } from '@/lib/flyToCart';
import { useAuthStore } from '@/store/useAuthStore';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS, ROLE_ICONS, getRoleHome, isStaffRole, getRoleDashboardLabel } from '@/lib/roleAccess';
import { accountDisplayName, accountIdentityLabel } from '@/lib/phoneIdentity';
import { restaurantInfo } from '@/data/restaurantInfo';
import PalaPittaLogo from './PalaPittaLogo';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';

const CartDrawer = dynamic(() => import('./CartDrawer'), { ssr: false });

const PHONE_HREF = `tel:${restaurantInfo.phone.replace(/\s/g, '')}`;

const NAV_LINKS = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Menu', href: '/menu', icon: BookOpen },
  { label: 'Reservation', href: '/reservation', icon: CalendarDays },
  { label: 'About', href: '/about', icon: Info },
  { label: 'Contact', href: '/contact', icon: Mail },
];

const ACCOUNT_LINKS = [
  { label: 'My Profile', href: '/profile', icon: User },
  { label: 'My Orders', href: '/orders', icon: ReceiptText },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartEverOpened, setCartEverOpened] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);

  const totalItems = useCartStore((s) => getCartTotalItems(s.items));
  const cartIsOpen = useCartStore((s) => s.isOpen);
  const user = useAuthStore((s) => s.user);
  const userRole = useAuthStore((s) => s.userRole);
  const { signOutUser } = useAuth();

  const userName = accountDisplayName(user);
  const accountLabel = accountIdentityLabel(user?.email, user?.user_metadata?.phone);
  const isStaff = isStaffRole(userRole);

  const accountLinks = useMemo(() => {
    if (isStaff) {
      // Admins and Staff only keep profile on their dashboard (/admin/profile)
      return ACCOUNT_LINKS.filter((link) => link.href !== '/profile');
    }
    return ACCOUNT_LINKS;
  }, [isStaff]);

  if (cartIsOpen && !cartEverOpened) setCartEverOpened(true);

  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMobileOpen(false);
  }

  const closeDrawer = useCallback(() => setMobileOpen(false), []);

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
        setScrolled(window.scrollY > 15);
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

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : Boolean(pathname?.startsWith(href));

  const roleBadge = userRole
    ? `${ROLE_ICONS[userRole] || ''} ${ROLE_LABELS[userRole]}`.trim()
    : 'Customer';

  return (
    <>
      {/* Main Bar — Compact Apple-like glass navbar */}
      <header
        className={cn(
          'sticky top-0 z-40 w-full transition-all duration-300 border-b',
          scrolled
            ? 'bg-white/80 dark:bg-stone-950/80 backdrop-blur-xl border-stone-200/80 dark:border-stone-850/80 shadow-md shadow-stone-100/40 dark:shadow-black/20'
            : 'bg-white/95 dark:bg-stone-950/95 backdrop-blur-md border-stone-200/50 dark:border-stone-905'
        )}
      >
        <div className="mx-auto flex h-13 md:h-14 w-full max-w-none items-center justify-between px-4 sm:px-8 md:px-12">
          {/* Logo & Home Link */}
          <div className="flex items-center gap-4">
            <Link href="/" aria-label={`${restaurantInfo.name} — Home`} className="flex items-center shrink-0">
              <PalaPittaLogo variant="light" size="small" priority />
            </Link>
          </div>

          {/* Desktop Nav Links (Apple style pills) */}
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex bg-stone-100/80 dark:bg-stone-900/60 p-1 rounded-full border border-stone-200/80 dark:border-stone-800/60">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              const IconComponent = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-all outline-none',
                    active
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800/80'
                  )}
                >
                  <IconComponent className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="outline" size="sm" className="relative rounded-full h-8 w-8 p-0 border-stone-200 dark:border-stone-850 bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-200 hover:bg-amber-600 dark:hover:bg-amber-600 hover:text-white hover:border-amber-600">
                  {/* CART_TARGET_ATTR marks where an added dish flies to. See
                      lib/flyToCart — it looks the target up at flight time so
                      this and the phone bottom-nav tab can both claim it. */}
                  <Link
                    href="/cart"
                    prefetch
                    aria-label={`Cart, ${totalItems} items`}
                    {...{ [CART_TARGET_ATTR]: '' }}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {totalItems > 0 && (
                      <Badge
                        size="sm"
                        className="absolute -top-1.5 -right-1.5 min-w-4 h-4 text-[10px] bg-amber-600 text-white justify-center rounded-full px-1 font-black"
                      >
                        {totalItems > 99 ? '99+' : totalItems}
                      </Badge>
                    )}
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Your Cart</TooltipContent>
            </Tooltip>

            {isStaff && (
              <Button asChild variant="secondary" size="sm" className="hidden md:inline-flex h-8 rounded-full text-xs font-bold bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 hover:bg-amber-500/20 dark:hover:bg-amber-500/30 border border-amber-500/20 dark:border-amber-500/30">
                <Link href={getRoleHome(userRole)} className="flex items-center gap-1.5">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Dashboard
                </Link>
              </Button>
            )}

            {!user && (
              <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex h-8 rounded-full text-xs font-bold border-stone-200 dark:border-stone-850 bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-200 hover:bg-stone-200/80 dark:hover:bg-stone-800">
                <Link href={authHref.login} prefetch className="flex items-center gap-1.5">
                  <LogIn className="w-3.5 h-3.5" />
                  Log In
                </Link>
              </Button>
            )}

            {user && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 gap-1.5 rounded-full px-2 text-xs text-stone-700 dark:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800"
                    aria-label="Account menu"
                  >
                    <Avatar className="w-6 h-6 border border-amber-500">
                      <AvatarFallback className="bg-amber-600 text-white text-[10px] font-black">
                        {(userName || accountLabel || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-[90px] truncate font-extrabold md:block">
                      {userName?.split(' ')[0] || 'Account'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" sideOffset={6} className="w-60 p-0 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-white shadow-2xl overflow-hidden z-50">
                  <div className="bg-gradient-to-br from-stone-100 to-amber-50 dark:from-stone-900 dark:to-amber-955 p-3 text-stone-900 dark:text-white border-b border-stone-200 dark:border-stone-800">
                    <p className="truncate text-xs font-black">{userName || 'User'}</p>
                    <p className="mt-0.5 text-[10px] truncate text-stone-500 dark:text-stone-400">{accountLabel}</p>
                    <Badge variant="outline" className="mt-1.5 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                      {roleBadge}
                    </Badge>
                  </div>

                  <div className="p-1 space-y-0.5 text-xs">
                    {isStaff && (
                      <DropdownMenuItem asChild className="rounded-xl font-bold text-amber-600 dark:text-amber-400 focus:bg-stone-100 dark:focus:bg-stone-800 focus:text-amber-700 dark:focus:text-amber-300">
                        <Link href={getRoleHome(userRole)} className="flex items-center gap-2">
                          <LayoutDashboard className="w-4 h-4" />
                          {getRoleDashboardLabel(userRole, userName)}
                        </Link>
                      </DropdownMenuItem>
                    )}

                    {accountLinks.map(({ label, href, icon: Icon }) => (
                      <DropdownMenuItem key={href} asChild className="rounded-xl focus:bg-stone-100 dark:focus:bg-stone-800">
                        <Link href={href} className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                          {label}
                        </Link>
                      </DropdownMenuItem>
                    ))}

                    <DropdownMenuItem asChild className="rounded-xl focus:bg-stone-100 dark:focus:bg-stone-800">
                      <Link href="/reservation" className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                        Book a Table
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-stone-200 dark:bg-stone-800" />

                    <DropdownMenuItem
                      onClick={() => signOutUser()}
                      className="rounded-xl text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30 focus:text-rose-600 dark:focus:text-rose-400 font-bold"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button asChild size="sm" className="hidden sm:inline-flex h-8 rounded-full text-xs font-black bg-amber-600 hover:bg-amber-700 text-white shadow-md px-4">
              <Link href="/menu" prefetch>
                Order Now
              </Link>
            </Button>

            {/* Mobile Sheet Trigger */}
            <Sheet modal={false} open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 text-stone-700 dark:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800" aria-label="Open menu">
                  <MenuIcon className="w-5 h-5" />
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-[280px] p-0 bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800 text-stone-900 dark:text-white flex flex-col justify-between">
                <SheetHeader className="p-4 border-b border-stone-200 dark:border-stone-800">
                  <SheetTitle className="sr-only">Site Menu</SheetTitle>
                  <PalaPittaLogo variant="light" size="small" />
                </SheetHeader>

                <div className="p-4 space-y-3 flex-1 overflow-y-auto">
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
                        Log In
                      </MobileLink>
                      <MobileLink href={authHref.signup} icon={UserPlus} active={pathname === '/signup'}>
                        Sign Up
                      </MobileLink>
                    </MobileSection>
                  ) : (
                    <MobileSection label="Your Account">
                      {accountLinks.map(({ label, href, icon: Icon }) => (
                        <MobileLink key={href} href={href} icon={Icon} active={isActive(href)}>
                          {label}
                        </MobileLink>
                      ))}
                      <div className="pt-2 px-1">
                        <Separator className="bg-stone-200 dark:bg-stone-850 mb-2" />
                        <button
                          onClick={() => { signOutUser(); setMobileOpen(false); }}
                          className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold transition-all text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </MobileSection>
                  )}
                </div>

                <div className="p-4 border-t border-stone-200 dark:border-stone-800 space-y-2">
                  <SheetClose asChild>
                    <Button asChild size="lg" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-sm">
                      <Link href="/menu">Order Now</Link>
                    </Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {cartEverOpened && <CartDrawer />}
    </>
  );
}

function MobileSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 px-2">
        {label}
      </p>
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
          'flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold transition-all',
          active
            ? 'bg-amber-600 text-white shadow-xs'
            : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-900 hover:text-stone-900 dark:hover:text-white'
        )}
      >
        <Icon className="w-4 h-4" />
        {children}
      </Link>
    </SheetClose>
  );
}
