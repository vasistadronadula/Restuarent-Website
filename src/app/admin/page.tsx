'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { useAdminBadges } from '@/components/admin/useAdminBadges';
import { HairlineGrid, StatCell, StatusChip, Bar, EmptyState } from '@/components/admin/ui';
import type { Order, OrderItem } from '@/types';
import { orderDateStamp } from '@/lib/orderTime';
import { canAccess } from '@/lib/roleAccess';

// IST-pinned, matching how mapOrder() stamps `orderDate` — the browser's own
// local timezone must not decide "today" here. An admin opening the
// dashboard from outside India would otherwise compare against a day
// boundary that doesn't match the one every order was actually filed under.
const dayKey = (d: Date) => orderDateStamp(d);

const money = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** "+12% vs yesterday", or "first today" when there's nothing to compare to. */
function delta(today: number, yesterday: number): string {
  if (!yesterday) return today ? 'no figure for yesterday' : '—';
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : '±';
  return `${sign}${Math.abs(pct)}% vs yesterday`;
}

const orderWhere = (o: Order) =>
  o.tableNumber ? `T${String(o.tableNumber).padStart(2, '0')}`
  : o.orderType === 'counter' ? 'Counter'
  : o.orderType === 'takeaway' ? 'Takeaway'
  : 'Online';

const orderItemsLabel = (o: Order) => {
  const items = (o.items || []) as OrderItem[];
  if (!items.length) return '—';
  const head = items
    .slice(0, 2)
    .map((i) => (i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name))
    .join(', ');
  return items.length > 2 ? `${head} +${items.length - 2}` : head;
};

export default function AdminDashboard() {
  const { orders, menuItems } = useAdmin();
  const { user, userRole } = useAuth();
  const badges = useAdminBadges();
  // Chef/waiter can land here (the dashboard is shared by every staff role)
  // but can't reach POS, and waiter can't reach menu-management — the quick
  // links below used to point there regardless, so clicking one bounced the
  // visitor straight back out via AdminGuard's redirect.
  const canOpenPos = canAccess(userRole, '/admin/pos');

  // Dates are resolved after mount so the server pass and the first client
  // render agree — "today" on the server is not always today for the browser.
  const [nowTs, setNowTs] = useState(0);
  useEffect(() => {
    const tick = () => setNowTs(Date.now());
    tick();
    // Backgrounded tabs still ticked every 60s, recomputing stats/liveOrders/
    // topSellers/alerts for a dashboard nobody was looking at. Pausing on
    // `visibilitychange` and refreshing once on return keeps "today" from
    // ever going stale while it's actually on screen.
    let t: ReturnType<typeof setInterval> | null = null;
    const start = () => { if (!t) t = setInterval(tick, 60_000); };
    const stop = () => { if (t) { clearInterval(t); t = null; } };
    const onVisibility = () => {
      if (document.hidden) stop();
      else { tick(); start(); }
    };

    if (document.hidden) stop(); else start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const stats = useMemo(() => {
    const empty = {
      todayRevenue: 0, todayOrders: 0, avgTicket: 0, activeDishes: 0,
      revenueDelta: '—', ordersDelta: '—', ticketDelta: '—',
    };
    if (!nowTs) return empty;

    const today = dayKey(new Date(nowTs));
    const yesterday = dayKey(new Date(nowTs - 86_400_000));

    let todayRevenue = 0, todayOrders = 0, yRevenue = 0, yOrders = 0;

    for (const o of orders) {
      if (!o.createdAt) continue;
      const key = dayKey(new Date(o.createdAt));
      const live = o.status !== 'cancelled';
      if (key === today) {
        todayOrders++;
        if (live) todayRevenue += o.grandTotal || 0;
      } else if (key === yesterday) {
        yOrders++;
        if (live) yRevenue += o.grandTotal || 0;
      }
    }

    const avgTicket = todayOrders ? todayRevenue / todayOrders : 0;
    const yAvgTicket = yOrders ? yRevenue / yOrders : 0;

    return {
      todayRevenue,
      todayOrders,
      avgTicket,
      activeDishes: menuItems.filter((i) => i.isAvailable).length,
      revenueDelta: delta(todayRevenue, yRevenue),
      ordersDelta: delta(todayOrders, yOrders),
      ticketDelta: delta(Math.round(avgTicket), Math.round(yAvgTicket)),
    };
  }, [orders, menuItems, nowTs]);

  /** Everything still on the floor — newest first, capped at what fits. */
  const allLiveOrders = useMemo(
    () => orders.filter((o) => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready'),
    [orders],
  );
  const liveOrders = useMemo(() => allLiveOrders.slice(0, 8), [allLiveOrders]);
  // During a rush, orders past the 8 that fit on the dashboard used to just
  // vanish — the "All orders" link was the only hint anything was hidden.
  const hiddenLiveCount = allLiveOrders.length - liveOrders.length;

  const topSellers = useMemo(() => {
    if (!nowTs) return [] as { name: string; count: number }[];
    const today = dayKey(new Date(nowTs));
    const tally = new Map<string, number>();

    for (const o of orders) {
      if (o.status === 'cancelled') continue;
      if (!o.createdAt || dayKey(new Date(o.createdAt)) !== today) continue;
      for (const item of (o.items || []) as OrderItem[]) {
        if (!item?.name) continue;
        tally.set(item.name, (tally.get(item.name) || 0) + (item.quantity || 1));
      }
    }

    return [...tally.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [orders, nowTs]);

  const topMax = topSellers[0]?.count || 1;

  /** Things a manager should act on right now, in severity order. */
  const alerts = useMemo(() => {
    const out: { text: string; href: string }[] = [];
    if (badges.pendingOrders > 0) {
      out.push({
        text: `${badges.pendingOrders} order${badges.pendingOrders > 1 ? 's' : ''} not accepted yet`,
        href: '/admin/orders',
      });
    }
    if (badges.kitchenTickets > 0) {
      out.push({
        text: `${badges.kitchenTickets} ticket${badges.kitchenTickets > 1 ? 's' : ''} live on the pass`,
        href: '/admin/kitchen',
      });
    }
    const off = menuItems.filter((i) => !i.isAvailable).length;
    if (off > 0) {
      out.push({ text: `${off} dish${off > 1 ? 'es' : ''} marked unavailable`, href: '/admin/menu-management' });
    }
    return out.filter((a) => canAccess(userRole, a.href));
  }, [badges, menuItems, userRole]);

  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.user_metadata?.name?.split(' ')[0] ||
    'there';

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b-2 border-ad-line pb-3">
          <p className="text-[13px] ad-muted m-0">
            Welcome back, {firstName}. Here is the floor right now.
          </p>
          {canOpenPos && (
            <Link href="/admin/pos" className="ad-btn ad-btn-primary self-start sm:self-auto">
              Open cashier POS
            </Link>
          )}
        </div>

        {/* ── Tonight's numbers ────────────────────────────────────── */}
        <HairlineGrid cols="grid-cols-2 lg:grid-cols-4">
          <StatCell label="Sales today" value={money(stats.todayRevenue)} delta={stats.revenueDelta} />
          <StatCell label="Orders today" value={String(stats.todayOrders)} delta={stats.ordersDelta} />
          <StatCell
            label="Awaiting action"
            value={String(badges.pendingOrders)}
            delta={badges.pendingOrders ? 'accept or reject now' : 'nothing waiting'}
            alert={badges.pendingOrders > 0}
          />
          <StatCell label="Avg ticket" value={money(stats.avgTicket)} delta={stats.ticketDelta} />
        </HairlineGrid>

        {/* ── Live orders + today's movers ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
          <section className="min-w-0">
            <div className="ad-section-head">
              <h3 className="ad-h text-[17px]">Live orders</h3>
              <span className="text-[12px] ad-muted">{allLiveOrders.length} on the floor</span>
              <Link href="/admin/bills" className="ml-auto text-[12px] text-ad-accent font-semibold no-underline">
                {hiddenLiveCount > 0 ? `View bills (+${hiddenLiveCount})` : 'View all bills'}
              </Link>
            </div>

            {liveOrders.length === 0 ? (
              <EmptyState
                title="Nothing open"
                subtitle="Every order has been served or settled."
                action={canOpenPos ? <Link href="/admin/pos" className="ad-btn ad-btn-secondary">Start an order</Link> : undefined}
              />
            ) : (
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Where</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveOrders.map((o) => (
                      <tr key={o.id}>
                        <td className="font-semibold whitespace-nowrap">
                          <Link href="/admin/bills" className="text-ad-ink hover:text-ad-accent no-underline">
                            #{String(o.orderId || o.id).slice(-4)}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap">{orderWhere(o)}</td>
                        <td className="ad-muted max-w-65 truncate">{orderItemsLabel(o)}</td>
                        <td className="font-semibold whitespace-nowrap">{money(o.grandTotal || 0)}</td>
                        <td><StatusChip status={o.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="min-w-0">
            <div className="ad-section-head">
              <h3 className="ad-h text-[17px]">Top sellers today</h3>
            </div>

            {topSellers.length === 0 ? (
              <p className="text-[13px] ad-muted">No dishes sold yet today.</p>
            ) : (
              <div className="flex flex-col gap-3.5">
                {topSellers.map((t) => (
                  <div key={t.name}>
                    <div className="flex justify-between gap-3 text-[14px] mb-1.5">
                      <span className="font-semibold truncate">{t.name}</span>
                      <span className="ad-muted flex-none">{t.count} sold</span>
                    </div>
                    <Bar pct={(t.count / topMax) * 100} />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-7 pt-3.5 border-t-2 border-ad-line">
              <div className="ad-kicker mb-2.5">Alerts</div>
              {alerts.length === 0 ? (
                <div className="text-[13px] ad-muted">Nothing needs attention.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {alerts.map((a) => (
                    <Link
                      key={a.text}
                      href={a.href}
                      className="text-[13px] no-underline text-ad-ink hover:text-ad-accent"
                    >
                      {a.text}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-7 pt-3.5 border-t-2 border-ad-line">
              <div className="ad-kicker mb-2.5">Menu</div>
              <div className="text-[13px]">
                {stats.activeDishes} of {menuItems.length} dishes available to order
              </div>
            </div>
          </section>
        </div>

      </div>
    </AdminLayout>
  );
}
