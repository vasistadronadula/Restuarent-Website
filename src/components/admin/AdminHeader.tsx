'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { useAutoPrint } from '@/hooks/useAutoPrint';
import { isPrinterConnected } from '@/lib/thermalPrinter';
import MobileAppInstallModal from './MobileAppInstallModal';
import PrinterSettingsPanel from './PrinterSettingsPanel';
import {
  ArrowLeft, LayoutGrid, ChevronRight, Bell, RefreshCw,
  Globe, LogOut, Printer, User, Settings, Clock, Sparkles
} from 'lucide-react';

function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="font-semibold">{time}</span>;
}

interface Props {
  title: string;
}

export default function AdminHeader({ title }: Props) {
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

  const [autoPrint, setAutoPrint] = useAutoPrint();

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
      sub: `₹${(o.grandTotal || o.subtotal || 0).toLocaleString()}`,
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
  const initials = adminName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'AD';
  const avatarUrl = user?.user_metadata?.avatar_url || '';
  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  const showAutoPrint = userRole === 'cashier';
  const showNotifications = showOrderAlerts || showReservationAlerts;
  const isDashboard = pathname === '/admin';
  const isPosPage = pathname === '/admin/pos' || pathname === '/cashier';
  const isKitchenPage = pathname === '/admin/kitchen' || pathname === '/kds';
  const isFullBleedPage = isPosPage || isKitchenPage;

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white border-b border-stone-200 shadow-xs">
        <div className={`mx-auto ${isFullBleedPage ? 'w-full px-3 sm:px-4' : 'max-w-[1600px] px-3 sm:px-5 lg:px-8'} h-14 flex items-center justify-between`}>
          
          {/* Left Side: Brand Logo & Navigation Breadcrumbs */}
          <div className="flex items-center gap-2.5 min-w-0">
            <Link href="/admin" className="flex items-center gap-2 group flex-shrink-0">
              <div className="bg-amber-600 text-white rounded-lg w-8 h-8 flex items-center justify-center font-bold text-sm shadow-xs">
                P
              </div>
              <span className="font-semibold text-sm text-stone-800 hidden md:block">
                Pala Pitta Ruchulu
              </span>
            </Link>

            {/* Breadcrumb separator & path */}
            {!isDashboard ? (
              <>
                <ChevronRight className="w-4 h-4 text-stone-300 flex-shrink-0" />
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 text-xs font-medium text-stone-400 hover:text-stone-700 transition-colors flex-shrink-0"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
                <ChevronRight className="w-4 h-4 text-stone-300 flex-shrink-0" />
                <span className="text-xs font-semibold text-stone-700 truncate max-w-[180px] sm:max-w-xs">
                  {title}
                </span>
              </>
            ) : (
              <>
                <span className="text-stone-300 hidden sm:inline flex-shrink-0">/</span>
                <span className="text-xs font-medium text-stone-400 hidden sm:inline flex-shrink-0">
                  Management Console
                </span>
              </>
            )}
          </div>

          {/* Right Side: Quick Actions & Profile Dropdown */}
          <div className="flex items-center gap-2 sm:gap-2.5">

            {/* POS Printer Connection Button (Visible when on POS page) */}
            {isPosPage ? (
              <button
                type="button"
                onClick={() => setPrinterSettingsOpen(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-2xs ${
                  printerConnected
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                }`}
                title={printerConnected ? 'Thermal printer connected (Bluetooth / USB) — click to manage' : 'Printer disconnected — click to connect Bluetooth / USB printer'}
              >
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  {printerConnected && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${printerConnected ? 'bg-emerald-600' : 'bg-amber-500'}`} />
                </span>
                <Printer className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline font-bold">
                  {printerConnected ? 'Printer Ready' : 'Connect Printer'}
                </span>
              </button>
            ) : (
              /* POS Quick Button for non-POS pages */
              <Link
                href="/admin/pos"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cashier POS</span>
              </Link>
            )}
            
            {/* Live Clock / Date Badge */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-stone-50 border border-stone-200 text-stone-500 rounded-lg text-xs font-medium">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span>{dateStr}</span>
              <span className="text-stone-300">·</span>
              <LiveClock />
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => window.location.reload()}
              className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Back to Customer Site */}
            <Link
              href="/"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Website</span>
            </Link>

            {/* Notifications Bell */}
            {showNotifications && (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                  className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors relative"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full w-[18px] h-[18px] flex items-center justify-center text-[10px] font-semibold">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-1.5rem))] sm:w-80 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                      <span className="font-semibold text-sm text-stone-800">Alerts</span>
                      {unreadCount > 0 && (
                        <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
                      {realNotifications.length === 0 ? (
                        <div className="p-8 text-center text-sm text-stone-400">
                          All caught up!
                        </div>
                      ) : (
                        realNotifications.map((n) => (
                          <div key={n.id} className="p-3 hover:bg-stone-50 flex items-start gap-3 transition-colors">
                            <div className={`p-1.5 rounded-lg text-sm ${n.type === 'order' ? 'bg-orange-50 text-orange-600' : 'bg-sky-50 text-sky-600'}`}>
                              {n.type === 'order' ? '🛒' : '📅'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-stone-800 truncate">{n.text}</div>
                              <div className="text-xs text-stone-500 mt-0.5">{n.sub}</div>
                              <div className="text-xs text-stone-400 mt-0.5">{n.time}</div>
                            </div>
                            {n.unread && <div className="w-2 h-2 rounded-full bg-rose-500 mt-2 flex-shrink-0" />}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profile Dropdown */}
            <div className="relative flex-shrink-0" ref={profileRef}>
              <button
                onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                className="w-8 h-8 rounded-lg bg-stone-800 border border-stone-200 flex items-center justify-center text-xs font-semibold text-white hover:bg-stone-700 transition-colors overflow-hidden shadow-sm"
                style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : undefined}
              >
                {avatarUrl ? '' : initials}
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden z-50">
                  <div className="p-4 flex items-center gap-3 border-b border-stone-100">
                    <div
                      className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center text-sm font-semibold text-white overflow-hidden flex-shrink-0"
                      style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : undefined}
                    >
                      {avatarUrl ? '' : initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-stone-900 truncate">{adminName}</div>
                      <div className="text-xs text-stone-400 truncate mt-0.5">{adminEmail}</div>
                      <span className="inline-block text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full mt-1 border border-amber-200/60">
                        {userRole ? ROLE_LABELS[userRole] : 'Staff'}
                      </span>
                    </div>
                  </div>

                  <div className="p-1.5 space-y-0.5">
                    <Link
                      href="/admin/profile"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-50 transition-colors"
                      onClick={() => setProfileOpen(false)}
                    >
                      <User className="w-4 h-4 text-stone-400" />
                      My Profile
                    </Link>

                    {staffApp && (
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-50 transition-colors"
                        onClick={() => { setInstallOpen(true); setProfileOpen(false); }}
                      >
                        <Settings className="w-4 h-4 text-stone-400" />
                        Install {staffApp.shortName}
                      </button>
                    )}

                    <Link
                      href="/"
                      className="sm:hidden flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-50 transition-colors"
                      onClick={() => setProfileOpen(false)}
                    >
                      <Globe className="w-4 h-4 text-stone-400" />
                      Customer Site
                    </Link>
                  </div>

                  <div className="p-1.5 border-t border-stone-100">
                    <button
                      onClick={() => { setProfileOpen(false); signOutUser(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>

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
