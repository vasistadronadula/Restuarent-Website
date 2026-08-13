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
import { Container } from './Container';

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
  { label: 'Menu', href: '/menu', icon: BookOpen },
  { label: 'My Orders', href: '/orders', icon: ReceiptText },
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
      {/* Main Bar */}
      <header
        className={cn(
          'sticky top-0 z-40 w-full transition-all duration-150 border-b bg-white',
          scrolled
            ? 'border-stone-200 shadow-sm shadow-stone-100/60'
            : 'border-stone-100'
        )}
      >
        <Container className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link href="/menu" aria-label={`${restaurantInfo.name} — Menu`} className="flex items-center shrink-0">
            <PalaPittaLogo variant="light" size="small" priority />
          </Link>

          {/* Desktop Nav Links */}
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
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
                    'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none',
                    active
                      ? 'text-amber-700 bg-amber-50'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
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
                <Button asChild variant="ghost" size="sm" className="relative h-9 w-9 p-0 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg">
                  <Link
                    href="/cart"
                    prefetch
                    aria-label={`Cart, ${totalItems} items`}
                    {...{ [CART_TARGET_ATTR]: '' }}
                  >
                    <ShoppingCart className="w-4.5 h-4.5" />
                    {totalItems > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-semibold bg-amber-600 text-white rounded-full px-1">
                        {totalItems > 99 ? '99+' : totalItems}
                      </span>
                    )}
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Your Cart</TooltipContent>
            </Tooltip>

            {isStaff && (
              <Button asChild variant="outline" size="sm" className="hidden md:inline-flex h-8 rounded-lg text-xs font-medium border-stone-200 text-stone-700 hover:bg-stone-50">
                <Link href={getRoleHome(userRole)} className="flex items-center gap-1.5">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Dashboard
                </Link>
              </Button>
            )}

            {!user && (
              <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex h-8 rounded-lg text-xs font-medium border-stone-200 text-stone-700 hover:bg-stone-50">
                <Link href={authHref.login} prefetch className="flex items-center gap-1.5">
                  <LogIn className="w-3.5 h-3.5" />
                  Log in
                </Link>
              </Button>
            )}

            {user && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-9 gap-2 rounded-lg px-2 text-sm text-stone-700 hover:bg-stone-100"
                    aria-label="Account menu"
                  >
                    <Avatar className="w-7 h-7 border border-stone-200">
                      <AvatarFallback className="bg-amber-600 text-white text-xs font-semibold">
                        {(userName || accountLabel || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-[90px] truncate font-medium md:block">
                      {userName?.split(' ')[0] || 'Account'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" sideOffset={6} className="w-56 p-1 rounded-xl bg-white border border-stone-200 text-stone-900 shadow-lg z-50">
                  <div className="px-3 py-2 border-b border-stone-100 mb-1">
                    <p className="truncate text-sm font-semibold text-stone-900">{userName || 'User'}</p>
                    <p className="mt-0.5 text-xs truncate text-stone-500">{accountLabel}</p>
                  </div>

                  {isStaff && (
                    <DropdownMenuItem asChild className="rounded-lg text-amber-700 font-medium focus:bg-amber-50 focus:text-amber-800">
                      <Link href={getRoleHome(userRole)} className="flex items-center gap-2">
                        <LayoutDashboard className="w-4 h-4" />
                        {getRoleDashboardLabel(userRole, userName)}
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {accountLinks.map(({ label, href, icon: Icon }) => (
                    <DropdownMenuItem key={href} asChild className="rounded-lg focus:bg-stone-50">
                      <Link href={href} className="flex items-center gap-2 text-sm">
                        <Icon className="w-4 h-4 text-stone-400" />
                        {label}
                      </Link>
                    </DropdownMenuItem>
                  ))}

                  <DropdownMenuSeparator className="bg-stone-100 my-1" />

                  <DropdownMenuItem
                    onClick={() => signOutUser()}
                    className="rounded-lg text-rose-600 focus:bg-rose-50 focus:text-rose-700 text-sm"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {user && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signOutUser()}
                    aria-label="Sign out"
                    className="hidden md:inline-flex h-9 w-9 p-0 text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sign out</TooltipContent>
              </Tooltip>
            )}

            <Button asChild size="sm" className="hidden sm:inline-flex h-8 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white px-4">
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
        </Container>
      </header>

      {cartEverOpened && <CartDrawer />}
    </>
  );
}

function MobileSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-stone-400 px-3 mb-2">
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
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          active
            ? 'bg-amber-600 text-white'
            : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
        )}
      >
        <Icon className="w-4 h-4" />
        {children}
      </Link>
    </SheetClose>
  );
}
