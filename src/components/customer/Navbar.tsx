'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ChevronDown,
  LayoutDashboard,
  LogIn,
  LogOut,
  Mail,
  Menu as MenuIcon,
  Phone,
  ReceiptText,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  User,
  UserPlus,
  UtensilsCrossed,
  X,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useScrolled } from '@/hooks/useScrolled';
import { useCartStore, getCartTotalItems } from '@/store/useCartStore';
import { CART_TARGET_ATTR } from '@/lib/flyToCart';
import { useAuthStore } from '@/store/useAuthStore';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS, getRoleHome, isStaffRole, getRoleDashboardLabel } from '@/lib/roleAccess';
import { accountDisplayName, accountIdentityLabel } from '@/lib/phoneIdentity';
import { restaurantInfo } from '@/data/restaurantInfo';
import PalaPittaLogo from './PalaPittaLogo';
import { Container } from './Container';
import { VegMark } from './store-ui';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { VegStatus } from '@/types';

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

/* ------------------------------------------------------------------ */
/*  Navbar Search + Filter                                            */
/* ------------------------------------------------------------------ */

function NavbarSearchInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const qParam = searchParams.get('q') ?? '';
  const vegParam = searchParams.get('veg') ?? 'all';
  const bestsellerParam = searchParams.get('bestseller') === 'true';
  const topRatedParam = searchParams.get('topRated') === 'true';
  const sortParam = searchParams.get('sort') ?? 'default';

  const [query, setQuery] = useState(qParam);
  // Keep local query state in sync with the URL when re-entering /menu,
  // so the clear button and input value match after a navigation round-trip.
  // Adjusted during render (not in an effect): this is the documented
  // pattern for syncing state from props/navigation without cascading renders.
  const [syncedParams, setSyncedParams] = useState(`${pathname}?${qParam}`);
  if (`${pathname}?${qParam}` !== syncedParams) {
    setSyncedParams(`${pathname}?${qParam}`);
    setQuery(qParam);
  }
  const [filterOpen, setFilterOpen] = useState(false);

  const activeFilterCount =
    (vegParam !== 'all' ? 1 : 0) +
    (bestsellerParam ? 1 : 0) +
    (topRatedParam ? 1 : 0) +
    (sortParam !== 'default' ? 1 : 0);

  const applyParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(window.location.search);
      Object.entries(updates).forEach(([k, v]) => {
        if (!v || v === 'all' || v === 'default') {
          params.delete(k);
        } else {
          params.set(k, v);
        }
      });
      const qs = params.toString();
      const target = qs ? `/menu?${qs}` : '/menu';
      if (pathname === '/menu' || pathname === '/') {
        // Same reason as the menu page: useSearchParams only re-emits on
        // router navigations, so history.replaceState desynced the filters.
        router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
      } else {
        router.push(target);
      }
    },
    [pathname, router]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyParams({ q: query.trim() || null });
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (pathname === '/menu' || pathname === '/') {
      applyParams({ q: val.trim() || null });
    }
  };

  const clearQuery = () => {
    setQuery('');
    applyParams({ q: null });
  };

  const toggleVeg = (val: VegStatus) => {
    applyParams({ veg: vegParam === val ? null : val });
  };

  const toggleSort = (val: 'price-asc' | 'price-desc') => {
    applyParams({ sort: sortParam === val ? null : val });
  };

  const toggleBestseller = () => {
    applyParams({ bestseller: bestsellerParam ? null : 'true' });
  };

  const toggleTopRated = () => {
    applyParams({ topRated: topRatedParam ? null : 'true' });
  };

  const clearAllFilters = () => {
    setQuery('');
    applyParams({
      q: null,
      veg: null,
      bestseller: null,
      topRated: null,
      sort: null,
    });
    setFilterOpen(false);
  };

  return (
    <div className="relative flex w-full items-center">
      <form
        onSubmit={handleSearchSubmit}
        className={cn(
          'group relative flex h-9 w-full items-center rounded-full transition-all duration-200 sm:h-9.5',
          'border border-white/20 bg-black/15 shadow-inner backdrop-blur-md hover:bg-black/20',
          'focus-within:border-white/40 focus-within:bg-black/30 focus-within:ring-2 focus-within:ring-white/20'
        )}
      >
        <Search className="pointer-events-none ml-3 size-3.5 shrink-0 text-white/75 group-focus-within:text-white" />

        <input
          type="search"
            value={pathname === '/menu' || pathname === '/' ? qParam : query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search dishes, biryani…"
          aria-label="Search dishes in menu"
          className={cn(
            'h-full w-full min-w-0 bg-transparent px-2.5 text-[13px] font-medium text-white outline-none',
            'placeholder:text-white/60 focus:placeholder:text-white/80',
            '[&::-webkit-search-cancel-button]:appearance-none'
          )}
        />

        {query && (
          <button
            type="button"
            onClick={clearQuery}
            aria-label="Clear search"
            className="mr-1 grid size-6 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/20 hover:text-white"
          >
            <X className="size-3" />
          </button>
        )}

        {/* ── Filter Popover Trigger ──────────────────────────────── */}
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Filter menu"
              className={cn(
                'mr-1 flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold tracking-tight transition-all outline-none',
                activeFilterCount > 0
                  ? 'bg-brand text-white shadow-sm hover:bg-brand-600'
                  : 'bg-white/15 text-white hover:bg-white/25'
              )}
            >
              <SlidersHorizontal className="size-3 shrink-0" />
              <span className="hidden lg:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-white text-brand-700 grid size-4 place-items-center rounded-full text-[9px] font-black">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="end"
            sideOffset={8}
            className="border-hair-1 z-50 w-[300px] rounded-2xl border bg-white p-3.5 shadow-[0_16px_40px_rgba(2,6,12,0.18)] sm:w-[340px]"
          >
            <div className="flex items-center justify-between border-b border-hair-2 pb-2.5">
              <div>
                <h4 className="text-ink-1 text-[14px] font-extrabold">Filters &amp; Sort</h4>
                <p className="text-ink-4 text-[11px]">Refine dishes by diet or price</p>
              </div>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-brand-700 hover:text-brand-800 text-[11px] font-bold"
                >
                  Reset all
                </button>
              )}
            </div>

            <div className="space-y-3.5 py-3 text-[12px]">
              {/* Dietary */}
              <div>
                <p className="text-ink-4 mb-1.5 text-[10px] font-bold uppercase tracking-wider">
                  Dietary
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleVeg('veg')}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all',
                      vegParam === 'veg'
                        ? 'border-brand bg-brand-50 text-brand-700'
                        : 'border-hair-2 bg-white text-ink-2 hover:border-hair-1'
                    )}
                  >
                    <VegMark status="veg" size={12} />
                    Veg
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleVeg('non-veg')}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all',
                      vegParam === 'non-veg'
                        ? 'border-brand bg-brand-50 text-brand-700'
                        : 'border-hair-2 bg-white text-ink-2 hover:border-hair-1'
                    )}
                  >
                    <VegMark status="non-veg" size={12} />
                    Non-veg
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleVeg('egg')}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all',
                      vegParam === 'egg'
                        ? 'border-brand bg-brand-50 text-brand-700'
                        : 'border-hair-2 bg-white text-ink-2 hover:border-hair-1'
                    )}
                  >
                    <VegMark status="egg" size={12} />
                    Egg
                  </button>
                </div>
              </div>

              {/* Highlights */}
              <div>
                <p className="text-ink-4 mb-1.5 text-[10px] font-bold uppercase tracking-wider">
                  Highlights
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={toggleBestseller}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all',
                      bestsellerParam
                        ? 'border-brand bg-brand-50 text-brand-700'
                        : 'border-hair-2 bg-white text-ink-2 hover:border-hair-1'
                    )}
                  >
                    Bestsellers
                  </button>
                  <button
                    type="button"
                    onClick={toggleTopRated}
                    className={cn(
                      'flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all',
                      topRatedParam
                        ? 'border-brand bg-brand-50 text-brand-700'
                        : 'border-hair-2 bg-white text-ink-2 hover:border-hair-1'
                    )}
                  >
                    <Star className="size-3 fill-amber-400 text-amber-400" />
                    Rated 4.0+
                  </button>
                </div>
              </div>

              {/* Sort */}
              <div>
                <p className="text-ink-4 mb-1.5 text-[10px] font-bold uppercase tracking-wider">
                  Sort By Price
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleSort('price-asc')}
                    className={cn(
                      'flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all',
                      sortParam === 'price-asc'
                        ? 'border-brand bg-brand-50 text-brand-700'
                        : 'border-hair-2 bg-white text-ink-2 hover:border-hair-1'
                    )}
                  >
                    <ArrowUpNarrowWide className="size-3" />
                    Price: Low to High
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSort('price-desc')}
                    className={cn(
                      'flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all',
                      sortParam === 'price-desc'
                        ? 'border-brand bg-brand-50 text-brand-700'
                        : 'border-hair-2 bg-white text-ink-2 hover:border-hair-1'
                    )}
                  >
                    <ArrowDownWideNarrow className="size-3" />
                    Price: High to Low
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-hair-2 pt-2.5">
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="bg-brand hover:bg-brand-600 flex h-8 w-full items-center justify-center rounded-xl text-[12px] font-extrabold text-white transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </form>
    </div>
  );
}

function NavbarSearch() {
  return (
    // key={qParam} was removed: it caused a full remount (and Suspense fallback
    // flash) on every keystroke when searching on the /menu page. The inner
    // component reads from URL params directly, so it doesn't need to be
    // destroyed and recreated when the query changes.
    <Suspense fallback={<div className="h-9 w-full rounded-full bg-white/10" />}>
      <NavbarSearchInner />
    </Suspense>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Navbar                                                        */
/* ------------------------------------------------------------------ */

export default function Navbar({ searchDocked }: { searchDocked?: boolean }) {
  const scrolled = useScrolled(40);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);

  /**
   * The search pill lives in the page hero at the top and flies into the
   * navbar once it scrolls out of view. Pages without a hero search (cart,
   * orders, …) fall back to the scroll position: past 40px the navbar grows
   * its own search. `searchDocked` is only ever passed by the menu page.
   */
  const showSearch = searchDocked ?? scrolled;

  const totalItems = useCartStore((s) => getCartTotalItems(s.items));
  const user = useAuthStore((s) => s.user);
  const userRole = useAuthStore((s) => s.userRole);
  const { signOutUser } = useAuth();

  const userName = accountDisplayName(user);
  const accountLabel = accountIdentityLabel(user?.email, user?.user_metadata?.phone);
  const isStaff = isStaffRole(userRole);

  const accountLinks = useMemo(() => {
    if (isStaff) return ACCOUNT_LINKS.filter((link) => link.href !== '/profile');
    return ACCOUNT_LINKS;
  }, [isStaff]);

  // Close the mobile drawer whenever the user navigates to a new page. Done
  // as a render-time adjustment (the sanctioned "adjust state when props
  // change" pattern): calling setState inside an effect for this trips
  // react-hooks/set-state-in-effect, and doing it in the render body is
  // idempotent, so StrictMode double-render is harmless.
  const [lastPath, setLastPath] = useState(pathname);
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
    useCartStore.getState().closeCart();
  }, [pathname]);

  /**
   * Publishes the navbar's live height as `--ppr-nav-h` so sticky followers —
   * the desktop category sidebar, the mobile category strip — can park
   * exactly underneath it instead of guessing a magic number. The height
   * changes when the search row docks in (a second row on phones), hence the
   * ResizeObserver rather than a one-off read.
   */
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const publish = () => {
      document.documentElement.style.setProperty(
        '--ppr-nav-h',
        `${Math.round(el.getBoundingClientRect().height)}px`
      );
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isActive = useCallback(
    (href: string) => (href === '/' ? pathname === '/' : Boolean(pathname?.startsWith(href))),
    [pathname]
  );

  return (
    <header ref={headerRef} className="fixed inset-x-0 top-0 z-50 w-full">
      <motion.div
        animate={{
          backgroundColor: scrolled ? 'rgba(195, 40, 24, 0.96)' : 'rgba(223, 48, 28, 1)',
          backdropFilter: scrolled ? 'blur(16px)' : 'blur(0px)',
          boxShadow: scrolled
            ? '0 6px 24px rgba(93,33,26,0.14)'
            : '0 1px 0 rgba(93,33,26,0.12)',
          borderBottomColor: scrolled ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)',
        }}
        transition={{
          type: 'spring',
          stiffness: 260,
          damping: 30,
          mass: 0.8,
        }}
        className="relative overflow-hidden border border-x-0 border-t-0 text-white"
      >
        <Container className="relative flex flex-col gap-2 py-2 md:h-[64px] md:flex-row md:items-center md:justify-between md:gap-4 md:py-0">
          {/* Left: Logo — subtle scale-down on scroll */}
          <div className="flex w-full items-center justify-between gap-2.5 md:w-auto">
            <motion.div
              animate={{ scale: scrolled ? 0.92 : 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="origin-left"
            >
              <Link
                href="/menu"
                aria-label={`${restaurantInfo.name} — Menu`}
                className="flex shrink-0 items-center transition-transform active:scale-95"
              >
                <PalaPittaLogo variant="dark" size="small" priority />
              </Link>
            </motion.div>

            {/* Mobile action buttons (Cart + Menu Drawer) */}
            <div className="flex items-center gap-1 md:hidden">
              <Link
                href="/cart"
                prefetch
                aria-label={`Cart, ${totalItems} ${totalItems === 1 ? 'item' : 'items'}`}
                {...{ [CART_TARGET_ATTR]: '' }}
                className={cn(
                  'relative flex h-8 items-center gap-1 rounded-full px-2.5 text-[12px] font-bold transition-all',
                  totalItems > 0
                    ? 'bg-brand text-white shadow-sm'
                    : 'bg-white/15 text-white hover:bg-white/25'
                )}
              >
                <ShoppingCart className="size-3.5" />
                {totalItems > 0 && (
                  <span className="bg-white text-brand-700 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-black tabular-nums">
                    {totalItems > 99 ? '99+' : totalItems}
                  </span>
                )}
              </Link>

              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    aria-label="Open menu"
                    className="grid size-8 place-items-center rounded-full text-white transition-colors outline-none hover:bg-white/15"
                  >
                    <MenuIcon className="size-4" />
                  </button>
                </SheetTrigger>

                <SheetContent
                  side="right"
                  className="border-hair-1 flex w-[290px] flex-col justify-between bg-white p-0"
                >
                  <SheetHeader className="border-hair-2 border-b p-4">
                    <SheetTitle className="sr-only">Site menu</SheetTitle>
                    <SheetDescription className="sr-only">
                      Browse restaurant, orders, and account.
                    </SheetDescription>
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
                          onClick={() => {
                            signOutUser();
                            setMobileOpen(false);
                          }}
                          className="text-nonveg hover:bg-nonveg/8 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors"
                        >
                          <LogOut className="size-4" />
                          Sign out
                        </button>
                      </MobileSection>
                    )}
                  </div>

                  <div className="border-hair-2 space-y-2 border-t p-4">
                    <a
                      href={PHONE_HREF}
                      className="border-hair-1 text-ink-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-[13px] font-bold"
                    >
                      <Phone className="size-3.5" />
                      {restaurantInfo.phoneDisplay}
                    </a>
                    <SheetClose asChild>
                      <Link
                        href="/menu"
                        className="bg-brand hover:bg-brand-600 flex h-11 w-full items-center justify-center rounded-xl text-[14px] font-extrabold text-white transition-colors"
                      >
                        Order now
                      </Link>
                    </SheetClose>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* ── Center Stage: Centered Nav Links at top -> Glides to side on scroll with Search Bar in center ── */}
          <div className="relative flex flex-1 items-center min-w-0 w-full md:w-auto">
            {/* Nav Links — proudly centered at top, smoothly glides beside logo on scroll */}
            <motion.nav
              layout
              transition={{
                type: 'spring',
                stiffness: 340,
                damping: 32,
                mass: 0.7,
              }}
              aria-label="Main"
              className={cn(
                'hidden md:flex items-center gap-1 lg:gap-1.5',
                showSearch
                  ? 'ml-2 shrink-0 lg:ml-4'
                  : 'mx-auto shrink-0'
              )}
            >
              {NAV_LINKS.map(({ label, href, icon: Icon }, i) => {
                const active = isActive(href);
                return (
                  <motion.div
                    key={href}
                    layout
                    initial={false}
                    animate={{
                      scale: showSearch ? 0.95 : 1,
                      opacity: 1,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 380,
                      damping: 30,
                      mass: 0.5,
                      delay: showSearch ? i * 0.03 : (NAV_LINKS.length - 1 - i) * 0.03,
                    }}
                  >
                    <Link
                      href={href}
                      prefetch
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex shrink-0 items-center gap-1.5 rounded-full font-bold whitespace-nowrap transition-colors outline-none',
                        showSearch
                          ? 'px-2.5 py-1 text-[12px] lg:px-3 lg:py-1.5 lg:text-[12.5px]'
                          : 'px-3.5 py-1.5 text-[12.5px] lg:px-4 lg:text-[13px]',
                        active
                          ? 'bg-cream text-brand-700 shadow-sm'
                          : 'text-white/85 hover:bg-white/15 hover:text-white'
                      )}
                    >
                      <Icon className="size-3.5 shrink-0" />
                      {label === 'My Orders' ? (
                        <span>
                          <span className="hidden xl:inline">My </span>Orders
                        </span>
                      ) : (
                        label
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </motion.nav>

            {/* Search Bar — the hero pill flies into this center slot on scroll */}
            <AnimatePresence mode="popLayout">
              {showSearch && (
                <motion.div
                  key="navbar-search"
                  initial={{ opacity: 0, scale: 0.92, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 0.92, filter: 'blur(6px)' }}
                  transition={{
                    type: 'spring',
                    stiffness: 320,
                    damping: 32,
                    mass: 0.6,
                    opacity: { duration: 0.2 },
                    filter: { duration: 0.25 },
                  }}
                  className="w-full md:mx-auto md:max-w-[480px] md:flex-1 md:px-1.5 lg:px-2"
                >
                  <NavbarSearch />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Desktop Actions ─────────────────────────────────────── */}
          <div className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap md:flex sm:gap-2">
            <a
              href={PHONE_HREF}
              className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold text-white/85 transition-colors hover:bg-white/10 hover:text-white xl:flex"
            >
              <Phone className="size-3.5" />
              {restaurantInfo.phoneDisplay}
            </a>

            {/* Cart Pill */}
            <Link
              href="/cart"
              prefetch
              aria-label={`Cart, ${totalItems} ${totalItems === 1 ? 'item' : 'items'}`}
              {...{ [CART_TARGET_ATTR]: '' }}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-bold transition-all outline-none',
                totalItems > 0
                  ? 'bg-white text-brand-700 shadow-sm hover:bg-white/90'
                  : 'bg-white/15 text-white hover:bg-white/20'
              )}
            >
              <ShoppingCart className="size-3.5" />
              <span>Cart</span>
              {totalItems > 0 && (
                <span className="bg-brand grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-black text-white tabular-nums">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </Link>

            {isStaff && (
              <Link
                href={getRoleHome(userRole)}
                className="hidden h-8 items-center gap-1.5 rounded-full border border-white/30 px-3 text-[12px] font-bold text-white transition-colors hover:bg-white/10 xl:inline-flex"
              >
                <LayoutDashboard className="size-3.5" />
                Dashboard
              </Link>
            )}

            {!user ? (
              <Link
                href={authHref.login}
                prefetch
                className="text-brand-700 hidden h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[12px] font-bold transition-colors hover:bg-white/90 sm:inline-flex"
              >
                <LogIn className="size-3.5" />
                Sign in
              </Link>
            ) : (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Account menu"
                    className="hidden h-8 items-center gap-1.5 rounded-full bg-white/15 pr-2.5 pl-1.5 text-white transition-colors outline-none hover:bg-white/25 sm:inline-flex"
                  >
                    <Avatar className="size-6">
                      <AvatarFallback className="bg-white text-brand-700 text-[10px] font-extrabold">
                        {(userName || accountLabel || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-[85px] truncate text-[12px] font-semibold lg:block">
                      {userName?.split(' ')[0] || 'Account'}
                    </span>
                    <ChevronDown className="size-3 text-white/70" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className="border-hair-1 w-56 rounded-2xl border bg-white p-1.5 shadow-[0_8px_32px_rgba(2,6,12,0.14)]"
                >
                  <div className="border-hair-2 mb-1 border-b px-3 py-2">
                    <p className="text-ink-1 truncate text-[13px] font-bold">{userName || 'User'}</p>
                    <p className="text-ink-4 truncate text-[11px]">{accountLabel}</p>
                    <p className="text-ink-3 mt-1 text-[10px] font-semibold tracking-wide uppercase">
                      {userRole ? ROLE_LABELS[userRole] : 'Customer'}
                    </p>
                  </div>

                  {isStaff && (
                    <DropdownMenuItem asChild className="focus:bg-brand-50 rounded-xl">
                      <Link
                        href={getRoleHome(userRole)}
                        className="text-brand-700 flex items-center gap-2 text-[13px] font-semibold"
                      >
                        <LayoutDashboard className="size-3.5" />
                        {getRoleDashboardLabel(userRole, userName)}
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {accountLinks.map(({ label, href, icon: Icon }) => (
                    <DropdownMenuItem key={href} asChild className="focus:bg-hair-2 rounded-xl">
                      <Link href={href} className="text-ink-2 flex items-center gap-2 text-[13px] font-semibold">
                        <Icon className="text-ink-4 size-3.5" />
                        {label}
                      </Link>
                    </DropdownMenuItem>
                  ))}

                  <DropdownMenuSeparator className="bg-hair-2 my-1" />

                  <DropdownMenuItem
                    onClick={() => signOutUser()}
                    className="text-nonveg focus:bg-nonveg/8 focus:text-nonveg rounded-xl text-[13px] font-semibold"
                  >
                    <LogOut className="mr-2 size-3.5" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </Container>
      </motion.div>
    </header>
  );
}

function MobileSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-ink-4 mb-1.5 px-3 text-[10px] font-bold tracking-wider uppercase">{label}</p>
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
          'flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors',
          active ? 'bg-brand-50 text-brand-700' : 'text-ink-2 hover:bg-hair-2'
        )}
      >
        <Icon className={cn('size-4', active ? 'text-brand' : 'text-ink-4')} />
        {children}
      </Link>
    </SheetClose>
  );
}
