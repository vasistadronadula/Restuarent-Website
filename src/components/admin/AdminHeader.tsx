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
import MobileAppInstallModal from './MobileAppInstallModal';
import { ThemeToggle } from '@/components/ui/theme-toggle';
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
  
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  
  const [autoPrint, setAutoPrint] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pala_pitta_auto_print');
      if (saved !== null) return saved !== 'false';
    }
    return true;
  });

  const toggleAutoPrint = () => {
    const next = !autoPrint;
    setAutoPrint(next);
    localStorage.setItem('pala_pitta_auto_print', String(next));
  };

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

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/85 dark:bg-[#1C1C1E]/90 backdrop-blur-xl border-b border-stone-200/40 dark:border-[#2C2C2E]/60 transition-colors duration-300 shadow-[0_1px_3px_rgba(0,0,0,0.02)] dark:shadow-none">
        <div className="mx-auto max-w-[1600px] h-14 flex items-center justify-between px-3 sm:px-5 lg:px-8">
          
          {/* Left Side: Brand Logo & Navigation Breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/admin" className="flex items-center gap-2 group flex-shrink-0">
              <div className="bg-gradient-to-br from-amber-500 to-amber-700 text-white rounded-[10px] w-8 h-8 flex items-center justify-center font-black text-xs shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-200">
                P
              </div>
              <span className="font-black text-[13px] tracking-tight text-stone-800 dark:text-stone-100 hidden md:block">
                Pala Pitta Ruchulu
              </span>
            </Link>

            {/* Breadcrumb separator & path */}
            {!isDashboard ? (
              <>
                <ChevronRight className="w-4 h-4 text-stone-300 dark:text-stone-700 flex-shrink-0" />
                <Link 
                  href="/admin" 
                  className="flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-amber-700 dark:text-stone-400 dark:hover:text-amber-500 transition-colors flex-shrink-0"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
                <ChevronRight className="w-4 h-4 text-stone-300 dark:text-stone-700 flex-shrink-0" />
                <span className="text-xs font-extrabold text-stone-800 dark:text-stone-200 truncate max-w-[180px] sm:max-w-xs">
                  {title}
                </span>
              </>
            ) : (
              <>
                <span className="text-stone-300 dark:text-stone-700 hidden sm:inline flex-shrink-0">·</span>
                <span className="text-xs font-extrabold text-stone-400 dark:text-stone-500 hidden sm:inline flex-shrink-0">
                  Management Console
                </span>
              </>
            )}
          </div>

          {/* Right Side: Quick Actions & Profile Dropdown */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Auto Print Toggle (Cashier Only) */}
            {showAutoPrint && (
              <button
                onClick={toggleAutoPrint}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider uppercase border transition-all duration-200 ${
                  autoPrint 
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30' 
                    : 'bg-stone-100 text-stone-500 border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700'
                }`}
              >
                <Printer className="w-3 h-3" />
                <span className="hidden lg:inline">{autoPrint ? 'Auto-Print ON' : 'Print OFF'}</span>
              </button>
            )}

            {/* Live Clock / Date Badge */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-stone-100/60 dark:bg-[#2C2C2E]/60 border border-stone-200/30 dark:border-[#3A3A3C]/40 text-stone-500 dark:text-stone-400 rounded-full text-[11px] font-semibold">
              <Clock className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" />
              <span>{dateStr}</span>
              <span className="text-stone-300 dark:text-stone-600">·</span>
              <LiveClock />
            </div>

            {/* Refresh Button */}
            <button 
              onClick={() => window.location.reload()} 
              className="p-2 rounded-lg text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-[#2C2C2E] transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Back to Customer Site */}
            <Link
              href="/"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-[#2C2C2E] transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Website</span>
            </Link>

            {/* Dark / Light Theme Toggle */}
            <ThemeToggle className="p-2 rounded-lg text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-[#2C2C2E] transition-colors" />

            {/* Notifications Bell */}
            {showNotifications && (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                  className="p-2 rounded-lg text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-[#2C2C2E] transition-colors relative"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-black shadow-md">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-1.5rem))] sm:w-80 bg-white dark:bg-[#1C1C1E] border border-stone-200/60 dark:border-[#2C2C2E] rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-black/40 overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-stone-100 dark:border-[#2C2C2E] flex items-center justify-between bg-stone-50/50 dark:bg-[#1C1C1E]">
                      <span className="font-extrabold text-sm text-stone-800 dark:text-stone-200">Alerts</span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-black text-rose-600 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400 px-2 py-0.5 rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-stone-100 dark:divide-[#2C2C2E]">
                      {realNotifications.length === 0 ? (
                        <div className="p-8 text-center text-xs text-stone-400 font-medium">
                          All caught up! No alerts.
                        </div>
                      ) : (
                        realNotifications.map((n) => (
                          <div key={n.id} className="p-3 hover:bg-stone-50 dark:hover:bg-[#2C2C2E]/60 flex items-start gap-3 transition-colors">
                            <div className={`p-1.5 rounded-lg text-sm ${n.type === 'order' ? 'bg-orange-50 dark:bg-orange-950/20 text-orange-600' : 'bg-sky-50 dark:bg-sky-950/20 text-sky-600'}`}>
                              {n.type === 'order' ? '🛒' : '📅'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">{n.text}</div>
                              <div className="text-[10px] font-semibold text-stone-500 mt-0.5">{n.sub}</div>
                              <div className="text-[9px] text-stone-400 font-semibold mt-1">{n.time}</div>
                            </div>
                            {n.unread && <div className="w-2 h-2 rounded-full bg-rose-600 mt-1.5 flex-shrink-0" />}
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
                className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-stone-700 to-stone-900 dark:from-stone-600 dark:to-stone-800 border border-stone-200/30 dark:border-[#3A3A3C]/50 flex items-center justify-center text-[11px] font-black text-white hover:scale-105 transition-transform duration-200 overflow-hidden shadow-sm"
                style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : undefined}
              >
                {avatarUrl ? '' : initials}
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#1C1C1E] border border-stone-200/60 dark:border-[#2C2C2E] rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-black/40 overflow-hidden z-50 divide-y divide-stone-100 dark:divide-[#2C2C2E]">
                  <div className="p-4 flex items-center gap-3 bg-stone-50/30 dark:bg-[#1C1C1E]">
                    <div
                      className="w-11 h-11 rounded-xl bg-gradient-to-tr from-stone-800 to-stone-900 flex items-center justify-center text-sm font-black text-white overflow-hidden flex-shrink-0"
                      style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : undefined}
                    >
                      {avatarUrl ? '' : initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-stone-800 dark:text-stone-100 truncate">{adminName}</div>
                      <div className="text-[10px] text-stone-400 font-semibold truncate mt-0.5">{adminEmail}</div>
                      <span className="inline-block text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 px-2 py-0.5 rounded-full mt-1.5 border border-amber-500/10">
                        {userRole ? ROLE_LABELS[userRole] : 'Staff'}
                      </span>
                    </div>
                  </div>

                  <div className="p-1.5 space-y-0.5">
                    <Link 
                      href="/admin/profile" 
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-stone-700 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors"
                      onClick={() => setProfileOpen(false)}
                    >
                      <User className="w-4 h-4 text-stone-400" />
                      <span>My Profile</span>
                    </Link>

                    {staffApp && (
                      <button 
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-stone-700 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors"
                        onClick={() => { setInstallOpen(true); setProfileOpen(false); }}
                      >
                        <Settings className="w-4 h-4 text-stone-400" />
                        <span>Install {staffApp.shortName}</span>
                      </button>
                    )}

                    <Link 
                      href="/" 
                      className="sm:hidden flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-stone-700 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors"
                      onClick={() => setProfileOpen(false)}
                    >
                      <Globe className="w-4 h-4 text-stone-400" />
                      <span>Customer Site</span>
                    </Link>
                  </div>

                  <div className="p-1.5">
                    <button 
                      onClick={() => { setProfileOpen(false); signOutUser(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      <MobileAppInstallModal open={installOpen} onClose={closeInstallModal} />
    </>
  );
}
