'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS } from '@/lib/roleAccess';
import MobileAppInstallModal from './MobileAppInstallModal';

interface Props {
  title: string;
  sidebarWidth?: number;
  onMobileDrawerToggle?: () => void;
}

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
  return <span>{time}</span>;
}

export default function AdminHeader({ title, onMobileDrawerToggle }: Props) {
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

  const realNotifications = [
    ...orders.slice(0, 5).map((o) => ({
      id: `ord-${o.id}`,
      text: `Order #${String(o.id).slice(-4)} — ${o.customerName || 'Customer'}`,
      sub: `₹${(o.grandTotal || o.subtotal || 0).toLocaleString()}`,
      time: o.orderTime || 'Today',
      unread: o.status === 'pending',
      type: 'order' as const,
    })),
    ...reservations.slice(0, 3).map((r) => ({
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

  return (
    <>
      <style>{`
        .admin-header {
          position: sticky;
          top: 0;
          z-index: 1100;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-bottom: 1px solid rgba(0,0,0,0.06);
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Display', sans-serif;
        }
        .header-inner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 16px;
          height: 58px;
          max-width: 100%;
        }
        @media (min-width: 900px) {
          .header-inner { height: 64px; padding: 0 24px; gap: 16px; }
          .header-menu-btn { display: none !important; }
          .header-mobile-meta { display: none !important; }
        }
        .header-menu-btn {
          width: 40px; height: 40px;
          min-width: 40px;
          border: none; background: rgba(0,0,0,0.04);
          border-radius: 10px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: rgba(33,33,33,0.7);
          transition: all 0.15s ease;
          flex-shrink: 0;
          -webkit-tap-highlight-color: transparent;
        }
        @media (min-width: 900px) {
          .header-menu-btn { width: 36px; height: 36px; min-width: 36px; }
        }
        .header-menu-btn:active { background: rgba(198,40,40,0.1); transform: scale(0.93); }
        .header-title-block { flex: 1; min-width: 0; }
        .header-title {
          font-size: 15px; font-weight: 800;
          color: #212121; line-height: 1.2;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          letter-spacing: -0.2px;
        }
        @media (min-width: 900px) { .header-title { font-size: 17px; } }
        .header-subtitle {
          font-size: 11px; font-weight: 500;
          color: rgba(33,33,33,0.55);
          display: flex; align-items: center; gap: 6px;
          margin-top: 1px;
        }
        .live-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 6px rgba(34,197,94,0.8);
          animation: pulse-dot 2s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.8); }
        }
        .header-actions { display: flex; align-items: center; gap: 6px; }
        .icon-btn {
          width: 40px; height: 40px; min-width: 40px;
          border: none; background: rgba(0,0,0,0.04);
          border-radius: 10px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: rgba(33,33,33,0.75);
          transition: all 0.15s ease; position: relative;
          -webkit-tap-highlight-color: transparent;
          flex-shrink: 0;
        }
        @media (min-width: 900px) {
          .icon-btn { width: 36px; height: 36px; min-width: 36px; }
        }
        .icon-btn:hover { background: rgba(198,40,40,0.08); color: #C62828; }
        .icon-btn:active { transform: scale(0.93); }
        .notif-badge {
          position: absolute; top: -3px; right: -3px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white; font-size: 9px; font-weight: 800;
          min-width: 16px; height: 16px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center; padding: 0 4px;
          border: 1.5px solid #FFFFFF;
          box-shadow: 0 2px 6px rgba(220,38,38,0.5);
        }
        .avatar-btn {
          width: 40px; height: 40px; min-width: 40px; border-radius: 10px;
          background: linear-gradient(135deg, #c62828, #e65100);
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 12px; font-weight: 800;
          box-shadow: 0 2px 8px rgba(198,40,40,0.4);
          transition: all 0.15s ease; letter-spacing: 0.5px;
          -webkit-tap-highlight-color: transparent;
          flex-shrink: 0;
        }
        @media (min-width: 900px) {
          .avatar-btn { width: 36px; height: 36px; min-width: 36px; }
        }
        .avatar-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(198,40,40,0.5); }
        .avatar-btn:active { transform: scale(0.93); }

        /* Dropdown panels */
        .dropdown-panel {
          position: absolute; top: calc(100% + 8px); right: 0;
          background: #FFFFFF;
          backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.02);
          min-width: 300px;
          max-width: calc(100vw - 24px);
          max-height: 70vh;
          overflow-y: auto;
          animation: dropIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          /* Stays above the mobile bottom nav (1250) but below MUI's
             Drawer/Dialog default (1300) so a modal opened from here
             (e.g. Install App) still lands on top of it. */
          z-index: 1260;
        }
        /* On narrow phones, anchor the dropdown to the viewport instead of
           the trigger button so it can never clip off the left edge. */
        @media (max-width: 420px) {
          .dropdown-panel {
            position: fixed;
            top: 62px;
            left: 12px;
            right: 12px;
            min-width: 0;
            width: auto;
            max-width: none;
          }
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .dropdown-header {
          padding: 16px 18px 12px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          display: flex; align-items: center; justify-content: space-between;
        }
        .dropdown-title {
          font-size: 13px; font-weight: 800; color: #212121; letter-spacing: -0.2px;
        }
        .dropdown-count {
          font-size: 10px; font-weight: 700; color: #ef4444;
          background: rgba(239,68,68,0.12); border-radius: 6px; padding: 2px 8px;
        }
        .notif-item {
          display: flex; gap: 12px; padding: 12px 18px;
          border-bottom: 1px solid rgba(0,0,0,0.04);
          transition: background 0.15s ease; cursor: pointer;
        }
        .notif-item:hover { background: rgba(0,0,0,0.03); }
        .notif-item:last-child { border-bottom: none; }
        .notif-icon {
          width: 36px; height: 36px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; font-size: 16px;
        }
        .notif-text { flex: 1; min-width: 0; }
        .notif-main { font-size: 12px; font-weight: 600; color: #212121; }
        .notif-sub { font-size: 11px; color: rgba(33,33,33,0.6); margin-top: 1px; }
        .notif-time { font-size: 10px; color: rgba(33,33,33,0.45); margin-top: 3px; }
        .unread-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #f97316; flex-shrink: 0; margin-top: 5px;
        }

        /* Profile Dropdown */
        .profile-header {
          padding: 18px; display: flex; gap: 14px; align-items: center;
          background: linear-gradient(135deg, rgba(198,40,40,0.08), rgba(230,81,0,0.06));
          border-bottom: 1px solid rgba(0,0,0,0.06);
        }
        .profile-avatar-lg {
          width: 48px; height: 48px; border-radius: 14px;
          background: linear-gradient(135deg, #c62828, #e65100);
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 15px; font-weight: 800;
          box-shadow: 0 4px 12px rgba(198,40,40,0.3);
        }
        .profile-name { font-size: 14px; font-weight: 800; color: #212121; }
        .profile-email { font-size: 11px; color: rgba(33,33,33,0.6); margin-top: 2px; }
        .profile-role {
          display: inline-block; margin-top: 6px;
          font-size: 9px; font-weight: 800; color: #C62828;
          background: rgba(198,40,40,0.1); border-radius: 5px; padding: 2px 8px;
          letter-spacing: 1px; text-transform: uppercase;
        }
        .menu-item {
          display: flex; gap: 12px; align-items: center;
          padding: 13px 18px; cursor: pointer;
          border-bottom: 1px solid rgba(0,0,0,0.04);
          transition: background 0.15s ease;
          color: rgba(33,33,33,0.8); font-size: 13px; font-weight: 600;
          text-decoration: none;
        }
        .menu-item:hover { background: rgba(198,40,40,0.05); color: #C62828; }
        .menu-item:last-child { border-bottom: none; }
        .menu-item-icon { width: 18px; display: flex; justify-content: center; }
        .menu-item.danger { color: #ef4444; }
        .menu-item.danger:hover { background: rgba(239,68,68,0.06); }

        @media (min-width: 900px) {
          .autoprint-chip { display: flex !important; }
        }
        .autoprint-chip {
          display: none;
          align-items: center; gap: 5px;
          padding: 0 12px; height: 32px; border-radius: 8px;
          border: none; cursor: pointer; font-size: 11px; font-weight: 700;
          transition: all 0.2s ease; letter-spacing: 0.3px;
          -webkit-tap-highlight-color: transparent;
        }
        .relative { position: relative; }
      `}</style>

      <header className="admin-header">
        <div className="header-inner">
          {/* Mobile Menu Toggle */}
          <button className="header-menu-btn" onClick={onMobileDrawerToggle} aria-label="Open menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 6H20M4 12H16M4 18H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {/* Title */}
          <div className="header-title-block">
            <div className="header-title">{title}</div>
            <div className="header-subtitle">
              <span className="live-dot" />
              <span>{dateStr}</span>
              <span style={{ color: 'rgba(100,116,139,0.6)' }}>·</span>
              <LiveClock />
            </div>
          </div>

          <div className="header-actions">
            {/* Auto Print Toggle - Desktop only */}
            <button
              className="autoprint-chip"
              onClick={toggleAutoPrint}
              style={{
                background: autoPrint ? 'rgba(22,163,74,0.12)' : 'rgba(0,0,0,0.04)',
                color: autoPrint ? '#16a34a' : 'rgba(33,33,33,0.55)',
                border: `1px solid ${autoPrint ? 'rgba(22,163,74,0.3)' : 'rgba(0,0,0,0.08)'}`,
              }}
              title={autoPrint ? 'Auto-Print ON' : 'Auto-Print OFF'}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M6 9V4H18V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <rect x="3" y="9" width="18" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M6 14H18M9 18V14M15 18V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {autoPrint ? 'AUTO-PRINT' : 'PRINT OFF'}
            </button>

            {/* Refresh */}
            <button className="icon-btn" onClick={() => window.location.reload()} title="Refresh">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M1 4V10H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3.51 15C4.15839 16.8604 5.38734 18.4553 7.01166 19.5484C8.63598 20.6415 10.5677 21.1783 12.5157 21.0821C14.4637 20.9858 16.3342 20.2617 17.845 19.0115C19.3558 17.7612 20.4262 16.0517 20.8917 14.1389C21.3573 12.2261 21.1928 10.2138 20.4217 8.39944C19.6506 6.58513 18.3124 5.06233 16.6123 4.0645C14.9123 3.06667 12.9361 2.64507 10.9799 2.86292C9.02375 3.08078 7.18519 3.92757 5.74 5.27L1 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                className="icon-btn"
                onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                aria-label="Notifications"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M13.73 21C13.5542 21.3031 13.3018 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </button>

              {notifOpen && (
                <div className="dropdown-panel" style={{ minWidth: 320 }}>
                  <div className="dropdown-header">
                    <span className="dropdown-title">Notifications</span>
                    {unreadCount > 0 && <span className="dropdown-count">{unreadCount} new</span>}
                  </div>
                  {realNotifications.length === 0 ? (
                    <div style={{ padding: '24px 18px', textAlign: 'center', color: 'rgba(100,116,139,0.7)', fontSize: '13px' }}>
                      All caught up! No new alerts.
                    </div>
                  ) : (
                    realNotifications.map((n) => (
                      <div key={n.id} className="notif-item">
                        <div
                          className="notif-icon"
                          style={{ background: n.type === 'order' ? 'rgba(249,115,22,0.12)' : 'rgba(2,132,199,0.12)' }}
                        >
                          {n.type === 'order' ? '🛒' : '📅'}
                        </div>
                        <div className="notif-text">
                          <div className="notif-main">{n.text}</div>
                          <div className="notif-sub">{n.sub}</div>
                          <div className="notif-time">{n.time}</div>
                        </div>
                        {n.unread && <div className="unread-dot" />}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Profile Avatar */}
            <div className="relative" ref={profileRef}>
              <button
                className="avatar-btn"
                onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                aria-label="Profile menu"
                style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : undefined}
              >
                {avatarUrl ? '' : initials}
              </button>

              {profileOpen && (
                <div className="dropdown-panel">
                  <div className="profile-header">
                    <div
                      className="profile-avatar-lg"
                      style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : undefined}
                    >
                      {avatarUrl ? '' : initials}
                    </div>
                    <div>
                      <div className="profile-name">{adminName}</div>
                      <div className="profile-email">{adminEmail}</div>
                      <div className="profile-role">{userRole ? ROLE_LABELS[userRole] : 'Admin'}</div>
                    </div>
                  </div>

                  <Link href="/admin/profile" className="menu-item" onClick={() => setProfileOpen(false)}>
                    <span className="menu-item-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                        <path d="M4 21C4 17.6863 7.58172 15 12 15C16.4183 15 20 17.6863 20 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </span>
                    My Profile
                  </Link>

                  <button className="menu-item" style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
                    onClick={() => { setInstallOpen(true); setProfileOpen(false); }}>
                    <span className="menu-item-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M12 16L7 11M12 16L17 11M12 16V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M3 20H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </span>
                    Install Mobile App
                  </button>

                  <Link href="/" className="menu-item">
                    <span className="menu-item-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H15V15H9V21H4C3.44772 21 3 20.5523 3 20V9.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    Customer Website
                  </Link>

                  <button className="menu-item danger" style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
                    onClick={() => { setProfileOpen(false); signOutUser(); }}>
                    <span className="menu-item-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M16 17L21 12L16 7M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <MobileAppInstallModal open={installOpen} onClose={() => setInstallOpen(false)} />
    </>
  );
}
