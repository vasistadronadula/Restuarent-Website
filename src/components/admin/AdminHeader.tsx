'use client';

import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import {
  ROLE_LABELS, receivesOrderNotifications, receivesReservationNotifications,
  isStaffRole,
} from '@/lib/roleAccess';
import { roleAppFor } from '@/lib/roleApps';
import { getPushState } from '@/lib/pushClient';
import { isPrinterConnected } from '@/lib/thermalPrinter';
import MobileAppInstallModal from './MobileAppInstallModal';
import PrinterSettingsPanel from './PrinterSettingsPanel';
import { navItemForPath } from './adminNav';
import {
  Bell, RefreshCw, Globe, LogOut, Printer, User, Settings, Menu,
} from 'lucide-react';

/** Which service the restaurant is in right now — the header's "Service:" line. */
function servicePeriod(hour: number): string {
  if (hour < 11) return 'Breakfast';
  if (hour < 16) return 'Lunch';
  if (hour < 19) return 'Snacks';
  return 'Dinner';
}

/**
 * The wall clock, read through useSyncExternalStore rather than a setState
 * ticker: the store is the only thing that has to be cached per 30s bucket,
 * and the server snapshot is a constant, so hydration can't mismatch on a
 * value that is different by definition on the two sides.
 */
type Stamp = { date: string; time: string; service: string } | null;

const CLOCK_TICK_MS = 30_000;
let clockBucket = -1;
let clockSnapshot: Stamp = null;

function subscribeClock(onChange: () => void) {
  const id = setInterval(onChange, CLOCK_TICK_MS);
  return () => clearInterval(id);
}

function getClockSnapshot(): Stamp {
  const bucket = Math.floor(Date.now() / CLOCK_TICK_MS);
  if (bucket !== clockBucket) {
    clockBucket = bucket;
    const now = new Date();
    clockSnapshot = {
      date: now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
      time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      service: servicePeriod(now.getHours()),
    };
  }
  return clockSnapshot;
}

const getServerClockSnapshot = (): Stamp => null;

function LiveStamp() {
  const stamp = useSyncExternalStore(subscribeClock, getClockSnapshot, getServerClockSnapshot);

  if (!stamp) return <div className="w-26" aria-hidden />;

  return (
    <div className="hidden xl:block text-[12px] leading-[1.3] text-right ad-muted">
      {stamp.date} · {stamp.time}
      <br />
      Service: {stamp.service}
    </div>
  );
}

interface Props {
  /** Overrides the registry title — used by routes that aren't in the nav. */
  title: string;
  onOpenNav: () => void;
  /** Matches AdminSidebar's `wide`: the menu button has to survive as long as
   *  the rail is still a drawer. */
  wideNav?: boolean;
}

export default function AdminHeader({ title, onOpenNav, wideNav = false }: Props) {
  const pathname = usePathname();
  const { orders, reservations } = useAdmin();
  const { user, userRole, signOutUser } = useAuth();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [printerSettingsOpen, setPrinterSettingsOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const [printerConnected, setPrinterConnected] = useState(false);

  useEffect(() => {
    const check = () => setPrinterConnected(isPrinterConnected());
    check();
    const id = setInterval(check, 2000);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', check);
    };
  }, []);

  // The auto-print switch lives in PrinterSettingsPanel, which the printer
  // chip above opens — the header no longer keeps its own copy of that state.

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const staffApp = roleAppFor(userRole);
  useEffect(() => {
    if (!user || !isStaffRole(userRole) || !staffApp) return;

    const seenKey = `pala_pitta_app_setup_${staffApp.slug}`;
    if (localStorage.getItem(seenKey) === 'done') return;

    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    const pushAnswered = getPushState() !== 'default';
    if (standalone && pushAnswered && userRole !== 'cashier') {
      localStorage.setItem(seenKey, 'done');
      return;
    }

    const timer = setTimeout(() => setInstallOpen(true), 1200);
    return () => clearTimeout(timer);
  }, [user, userRole, staffApp]);

  const closeInstallModal = () => {
    setInstallOpen(false);
    if (staffApp) localStorage.setItem(`pala_pitta_app_setup_${staffApp.slug}`, 'done');
  };

  const showOrderAlerts = receivesOrderNotifications(userRole);
  const showReservationAlerts = receivesReservationNotifications(userRole);

  const realNotifications = [
    ...(showOrderAlerts ? orders.slice(0, 5) : []).map((o) => ({
      id: `ord-${o.id}`,
      text: `Order #${String(o.id).slice(-4)} — ${o.customerName || 'Customer'}`,
      sub: `₹${(o.grandTotal || o.subtotal || 0).toLocaleString('en-IN')}`,
      time: o.orderTime || 'Today',
      unread: o.status === 'pending',
      type: 'order' as const,
    })),
    ...(showReservationAlerts ? reservations.slice(0, 3) : []).map((r) => ({
      id: `res-${r.id}`,
      text: `Table for ${r.customerName || 'Diner'}`,
      sub: `${r.guests} guests`,
      time: r.time || 'Today',
      unread: r.status === 'pending' || r.status === 'confirmed',
      type: 'reservation' as const,
    })),
  ];

  const unreadCount = realNotifications.filter((n) => n.unread).length;
  const adminName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Admin';
  const adminEmail = user?.email || '';
  const initials = String(adminName).split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'AD';
  const avatarUrl = user?.user_metadata?.avatar_url || '';

  const showNotifications = showOrderAlerts || showReservationAlerts;
  const isPosPage = pathname === '/admin/pos' || pathname === '/cashier';

  const navItem = navItemForPath(pathname);
  const pageTitle = navItem?.title || title;
  const pageKicker = navItem?.kicker || 'Console';

  const iconBtn =
    'p-2 text-ad-muted hover:text-ad-ink ad-hover-strong transition-colors';

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 sm:px-6 h-[var(--ad-header-h)] border-b-2 border-ad-line bg-ad-bg">
        <button
          type="button"
          onClick={onOpenNav}
          className={`${wideNav ? 'xl:hidden' : 'lg:hidden'} -ml-2 ${iconBtn}`}
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="ad-kicker truncate">{pageKicker}</div>
          <div className="ad-title truncate">{pageTitle}</div>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <LiveStamp />

          {isPosPage ? (
            <button
              type="button"
              onClick={() => setPrinterSettingsOpen(true)}
              className="ad-btn ad-btn-secondary ad-btn-sm"
              data-printer={printerConnected}
              title={
                printerConnected
                  ? 'Thermal printer connected — click to manage'
                  : 'Printer disconnected — click to connect a Bluetooth / USB printer'
              }
              style={
                printerConnected
                  ? undefined
                  : { borderColor: 'var(--ad-accent)', color: 'var(--ad-a800)', background: 'var(--ad-a100)' }
              }
            >
              <span
                className="w-2 h-2 flex-none"
                style={{ background: printerConnected ? 'var(--ad-ok)' : 'var(--ad-accent)' }}
              />
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {printerConnected ? 'Printer ready' : 'Connect printer'}
              </span>
            </button>
          ) : (
            <Link href="/admin/pos" className="ad-btn ad-btn-primary hidden sm:inline-flex">
              New order
            </Link>
          )}

          <button
            onClick={() => window.location.reload()}
            className={`hidden sm:block ${iconBtn}`}
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {showNotifications && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                className={`relative ${iconBtn}`}
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 grid place-items-center bg-ad-accent text-ad-bg text-[10px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] bg-ad-bg border-2 border-ad-line z-50">
                  <div className="px-4 py-3 border-b-2 border-ad-line flex items-center justify-between">
                    <span className="ad-kicker">Alerts</span>
                    {unreadCount > 0 && (
                      <span className="ad-tag ad-tag-accent">{unreadCount} new</span>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {realNotifications.length === 0 ? (
                      <div className="p-8 text-center text-sm ad-muted">All caught up.</div>
                    ) : (
                      realNotifications.map((n) => (
                        <div
                          key={n.id}
                          className="p-3 flex items-start gap-3 border-b border-ad-hairline last:border-0 ad-hover"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate">{n.text}</div>
                            <div className="text-xs ad-muted mt-0.5">{n.sub} · {n.time}</div>
                          </div>
                          {n.unread && <span className="w-2 h-2 mt-1.5 flex-none bg-ad-accent" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="relative shrink-0" ref={profileRef}>
            <button
              onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
              className="w-9 h-9 grid place-items-center bg-ad-ink text-ad-bg ad-num text-[12px] overflow-hidden"
              style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : undefined}
              aria-label="Account menu"
            >
              {avatarUrl ? '' : initials}
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-ad-bg border-2 border-ad-line z-50">
                <div className="p-4 flex items-center gap-3 border-b-2 border-ad-line">
                  <div
                    className="w-10 h-10 flex-none grid place-items-center bg-ad-accent text-ad-bg ad-num text-[13px] overflow-hidden"
                    style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : undefined}
                  >
                    {avatarUrl ? '' : initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{adminName}</div>
                    <div className="text-xs ad-muted truncate">{adminEmail}</div>
                    <span className="ad-tag ad-tag-accent mt-1.5">
                      {userRole ? ROLE_LABELS[userRole] : 'Staff'}
                    </span>
                  </div>
                </div>

                <div className="p-1">
                  <Link
                    href="/admin/profile"
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium no-underline text-ad-ink ad-hover-strong"
                    onClick={() => setProfileOpen(false)}
                  >
                    <User className="w-4 h-4 ad-muted" /> My profile
                  </Link>

                  {staffApp && (
                    <button
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-left ad-hover-strong"
                      onClick={() => { setInstallOpen(true); setProfileOpen(false); }}
                    >
                      <Settings className="w-4 h-4 ad-muted" /> Install {staffApp.shortName}
                    </button>
                  )}

                  <Link
                    href="/"
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium no-underline text-ad-ink ad-hover-strong"
                    onClick={() => setProfileOpen(false)}
                  >
                    <Globe className="w-4 h-4 ad-muted" /> Customer site
                  </Link>
                </div>

                <div className="p-1 border-t-2 border-ad-line">
                  <button
                    onClick={() => { setProfileOpen(false); signOutUser(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-left text-ad-accent-deep hover:bg-ad-accent-soft"
                  >
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <MobileAppInstallModal open={installOpen} onClose={closeInstallModal} />
      <PrinterSettingsPanel
        open={printerSettingsOpen}
        onClose={() => {
          setPrinterSettingsOpen(false);
          setPrinterConnected(isPrinterConnected());
        }}
      />
    </>
  );
}
