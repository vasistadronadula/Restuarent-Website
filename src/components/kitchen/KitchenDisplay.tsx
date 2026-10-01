'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowDownWideNarrow, CheckCheck, ChefHat, Flame,
  History, Inbox, Keyboard, Layers3, LayoutGrid, Maximize, Minimize, RefreshCw,
  Search, Settings2, ShoppingBag, UtensilsCrossed, Volume2, VolumeX, Wifi, WifiOff, X, Zap,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { KitchenTicket } from './KitchenTicket';
import styles from './kitchen.module.css';
import { useOrders, useUpdateOrderStatus, useUpdateOrderPrepTime } from '@/lib/queries/orders';
import { useMenuItems } from '@/lib/queries/menu';
import { usePrepareKitchenItem } from '@/lib/queries/kitchen';
import { queryKeys } from '@/lib/queries/keys';
import {
  KITCHEN_STAGES, kitchenTarget, kitchenTiming, sortKitchenOrders,
  timestamp, kitchenItemKey, type KitchenSort, type KitchenStage
} from '@/lib/kitchen/kitchen';
import { buildKitchenBatches } from '@/lib/kitchen/kitchenBatch';
import { playOrderChimeSound } from '@/lib/notifications/audio';
import { postAuthedJson } from '@/lib/authedFetch';
import { useNow } from '@/hooks/useNow';
import { useRealtimeStore } from '@/store/useRealtimeStore';
import type { Order, OrderStatus, OrderType } from '@/types';
import { getOrderToken, getOrderDisplayNumber } from '@/lib/orders/orderNumber';

const subscribeOnline = (listener: () => void) => {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
};
const onlineSnapshot = () => navigator.onLine;
const serverOnlineSnapshot = () => true;
type Panel = 'tools' | 'history' | 'batch' | 'note' | 'delay' | null;
const CHANNELS = [
  { value: 'all', label: 'All orders', icon: Layers3 },
  { value: 'dine-in', label: 'Dine-in', icon: UtensilsCrossed },
  { value: 'takeaway', label: 'Takeaway', icon: ShoppingBag },
  { value: 'counter', label: 'Counter', icon: Zap },
] as const;
const STAGE_DETAILS = {
  pending: { icon: Inbox, description: 'Waiting to start', empty: 'New orders will appear here.' },
  preparing: { icon: Flame, description: 'On the stove', empty: 'Start a new ticket to get cooking.' },
  ready: { icon: CheckCheck, description: 'Ready for handover', empty: 'Finished orders will wait here for pickup.' },
};

// Read at action time, including from an older Undo toast callback.
function connectionAllowsWrite(client: QueryClient) {
  const current = client.getQueryState(queryKeys.orders);
  return navigator.onLine && !!current?.dataUpdatedAt && Date.now() - current.dataUpdatedAt <= 15000 && current.status !== 'error';
}

export default function KitchenDisplay() {
  const ordersQuery = useOrders(true, true);
  const menuQuery = useMenuItems();
  const orders = ordersQuery.data;
  const updateStatus = useUpdateOrderStatus();
  const updateDetails = useUpdateOrderPrepTime();
  const prepareItem = usePrepareKitchenItem();
  const client = useQueryClient();
  const now = useNow(5000);
  const online = useSyncExternalStore(subscribeOnline, onlineSnapshot, serverOnlineSnapshot);
  const realtime = useRealtimeStore(s => s.orders);

  /* UI and Feature State */
  const [sound, setSound] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [stage, setStage] = useState<KitchenStage>('pending');
  const [filter, setFilter] = useState<'all' | OrderType>('all');
  const [sort, setSort] = useState<KitchenSort>('fifo');
  const [searchQuery, setSearchQuery] = useState('');
  const [dishFilter, setDishFilter] = useState<string | null>(null);
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [shortcuts, setShortcuts] = useState(true);
  const [showPrepSummary, setShowPrepSummary] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [selected, setSelected] = useState<Order | null>(null);
  const [note, setNote] = useState('');
  const [delay, setDelay] = useState('10');
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  /* Clock */
  const [clockStr, setClockStr] = useState('');
  useEffect(() => {
    const updateTime = () => {
      setClockStr(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const locks = useRef(new Set<string>());
  const seen = useRef<Set<string> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelTrigger = useRef<HTMLElement | null>(null);
  const stale = !ordersQuery.dataUpdatedAt || now - ordersQuery.dataUpdatedAt > 15000;
  const blocked = !online || stale || ordersQuery.isError;
  const connection = !online ? 'Offline' : ordersQuery.isPending ? 'Connecting'
    : stale || ordersQuery.isError ? 'Reconnecting' : realtime === 'subscribed' ? 'Live' : 'Polling';
  const selectedBusy = (panel === 'note' || panel === 'delay') && !!selected && busyIds.has(selected.id);

  const prepTimes = useMemo(() => new Map((menuQuery.data || []).filter(m => m.prepTime).map(m => [m.id, m.prepTime!])), [menuQuery.data]);

  // Operational totals always describe the whole kitchen, even when the board is filtered.
  const active = useMemo(() => (orders || []).filter(o =>
    KITCHEN_STAGES.some(s => s.status === o.status)), [orders]);

  /* Search & Dish Filter Applied */
  const displayActive = useMemo(() => {
    let list = active.filter(o => filter === 'all' || (o.orderType || 'takeaway') === filter);
    if (onlyOverdue) list = list.filter(o => kitchenTiming(o, now, kitchenTarget(o, prepTimes)).late);
    if (dishFilter) {
      list = list.filter(o => (o.items || []).some(i => i.name.toLowerCase() === dishFilter.toLowerCase()));
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(o => {
        const orderNum = o.orderNumber ? String(o.orderNumber) : '';
        const orderToken = getOrderToken(o).toLowerCase();
        const displayNum = getOrderDisplayNumber(o).toLowerCase();
        const customer = (o.customerName || '').toLowerCase();
        const table = o.tableNumber != null ? `table ${o.tableNumber}` : '';
        const items = (o.items || []).map(i => i.name.toLowerCase()).join(' ');
        return (
          (orderNum && `#${orderNum}`.includes(q)) ||
          o.id.toLowerCase().includes(q) ||
          orderToken.includes(q) ||
          displayNum.includes(q) ||
          customer.includes(q) ||
          table.includes(q) ||
          items.includes(q)
        );
      });
    }
    return sortKitchenOrders(list, sort, prepTimes);
  }, [active, filter, onlyOverdue, now, prepTimes, dishFilter, searchQuery, sort]);

  const overdue = active.filter(o => kitchenTiming(o, now, kitchenTarget(o, prepTimes)).late).length;
  const migrationNeeded = active.some(o => o.kitchenProgress === undefined);
  const history = useMemo(() => (orders || []).filter(o => o.status === 'delivered' || o.status === 'cancelled')
    .sort((a, b) => (timestamp(b.deliveredAt) ?? timestamp(b.createdAt) ?? 0) - (timestamp(a.deliveredAt) ?? timestamp(a.createdAt) ?? 0)).slice(0, 35), [orders]);
  const batches = useMemo(() => buildKitchenBatches(active, o => timestamp(o.createdAt) ?? 0), [active]);

  /* All-day counts cover unprepared quantities across the entire kitchen. */
  const prepSummary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const order of active) {
      if (order.status === 'ready') continue;
      (order.items || []).forEach((item, index) => {
        const key = kitchenItemKey(order.items, index);
        if (!order.kitchenProgress?.[key]) {
          counts.set(item.name, (counts.get(item.name) || 0) + (item.quantity || 1));
        }
      });
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [active]);
  const toCook = prepSummary.reduce((sum, item) => sum + item.count, 0);
  const readyCount = active.filter(o => o.status === 'ready').length;
  const hasFilters = filter !== 'all' || !!dishFilter || !!searchQuery.trim() || onlyOverdue;

  function clearFilters() {
    setFilter('all'); setDishFilter(null); setSearchQuery(''); setOnlyOverdue(false);
  }

  const openPanel = useCallback((next: Panel) => {
    panelTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPanel(next);
  }, []);

  const toggleSound = useCallback(() => {
    if (!sound) playOrderChimeSound();
    setSound(!sound);
  }, [sound]);

  /* Sound on New Ticket Arrival */
  useEffect(() => {
    if (!orders || ordersQuery.isPending) return;
    if (!seen.current) { seen.current = new Set(orders.map(o => o.id)); return; }
    const incoming = orders.filter(o => !seen.current!.has(o.id) && o.status === 'pending');
    orders.forEach(o => seen.current!.add(o.id));
    if (incoming.length) {
      if (sound) playOrderChimeSound();
      toast.info(`${incoming.length} new kitchen ticket${incoming.length === 1 ? '' : 's'}`, { id: 'kds-arrivals' });
    }
  }, [orders, ordersQuery.isPending, sound]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else toast.info('Fullscreen is unavailable here. The kitchen board already fills the window.');
    } catch { toast.error('Could not enter fullscreen. Try the browser fullscreen control.'); }
  }, []);

  useEffect(() => {
    const changed = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', changed);
    const keydown = (event: KeyboardEvent) => {
      if (!shortcuts || event.ctrlKey || event.altKey || event.metaKey || event.repeat || document.querySelector('[role="dialog"]')) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input,textarea,select'))) return;
      const lane = KITCHEN_STAGES[Number(event.key) - 1];
      if (lane) {
        setStage(lane.status);
        const heading = document.getElementById(`kds-${lane.status}`);
        if (heading?.getClientRects().length) heading.focus();
        else document.getElementById(`kds-tab-${lane.status}`)?.focus();
      }
      else if (event.key.toLowerCase() === 'f') void toggleFullscreen();
      else if (event.key.toLowerCase() === 'm') toggleSound();
      else if (event.key.toLowerCase() === 'b') openPanel('batch');
      else if (event.key.toLowerCase() === 'h') openPanel('history');
      else if (event.key.toLowerCase() === 's') setShowPrepSummary(v => !v);
      else if (event.key === '/') { event.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('fullscreenchange', changed); window.removeEventListener('keydown', keydown); };
  }, [toggleFullscreen, toggleSound, shortcuts, openPanel]);

  async function withTicketLock(id: string, work: () => Promise<void>) {
    if (locks.current.has(id)) return;
    if (!connectionAllowsWrite(client)) {
      toast.error('Kitchen data is not current. Reconnect or refresh before changing a ticket.'); return;
    }
    locks.current.add(id); setBusyIds(new Set(locks.current));
    try { await work(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'The change was not saved. Please retry.'); }
    finally { locks.current.delete(id); setBusyIds(new Set(locks.current)); }
  }

  async function changeStage(order: Order, next: OrderStatus, offerUndo = true) {
    await withTicketLock(order.id, async () => {
      const saved = await updateStatus.mutateAsync({ id: order.id, status: next, expectedStatus: order.status, optimistic: false });
      if (['preparing', 'ready', 'delivered'].includes(next)) {
        void postAuthedJson('/api/whatsapp/send-status-update', { orderId: order.id, newStatus: next });
        void postAuthedJson('/api/push/notify-status-update', { orderId: order.id, newStatus: next });
      }
      const token = getOrderToken(order);
      toast.success(`Ticket #${token} ${next === 'delivered' ? 'handed over' : next}`, {
        action: offerUndo ? { label: 'Undo', onClick: () => void changeStage(saved, order.status, false) } : undefined,
      });
    });
  }

  function recall(order: Order) {
    const previous: Partial<Record<OrderStatus, OrderStatus>> = { preparing: 'pending', ready: 'preparing', delivered: 'ready' };
    if (previous[order.status]) void changeStage(order, previous[order.status]!);
  }

  function openDetails(order: Order, kind: 'note' | 'delay') {
    setSelected(order); setNote(kind === 'note' ? order.notes || '' : ''); setDelay('10'); openPanel(kind);
  }

  async function saveDetails() {
    if (!selected) return;
    const minutes = Number(delay);
    if (panel === 'delay' && (!Number.isInteger(minutes) || minutes < 1 || minutes > 120)) {
      toast.error('Choose a whole number from 1 to 120 minutes.'); return;
    }
    await withTicketLock(selected.id, async () => {
      const latest = client.getQueryData<Order[]>(queryKeys.orders)?.find(o => o.id === selected.id);
      if (!latest || latest.status !== selected.status || latest.notes !== selected.notes || latest.delayMinutes !== selected.delayMinutes) {
        throw new Error('This ticket changed on another screen. Close and reopen its details.');
      }
      const total = (selected.delayMinutes || 0) + (panel === 'delay' ? minutes : 0);
      const nextNote = panel === 'delay' ? [selected.notes, note.trim() ? `Prep delay: ${note.trim()}` : ''].filter(Boolean).join('\n') : note;
      await updateDetails.mutateAsync({ id: selected.id, delayMinutes: total, notes: nextNote, optimistic: false,
        expected: { status: selected.status, notes: selected.notes, delayMinutes: selected.delayMinutes || 0 } });
      if (panel === 'delay') {
        void postAuthedJson('/api/whatsapp/send-delay-notification', { orderId: selected.id, extraMinutes: minutes, reason: note });
        void postAuthedJson('/api/push/notify-delay', { orderId: selected.id, extraMinutes: minutes, reason: note });
      }
      toast.success(panel === 'delay' ? `Added ${minutes} minutes` : 'Kitchen note saved'); setPanel(null);
    });
  }

  return (
    <AdminLayout title="Kitchen Display System">
      <div className={styles.screen}>
        <header className={styles.toolbar}>
          <div className={styles.identity}>
            <span className={styles.brandMark}><ChefHat size={25} strokeWidth={1.8} /></span>
            <div>
              <span className={styles.eyebrow}>Pala Pitta Ruchulu</span>
              <h1>Kitchen display <span className={styles.station}>All stations</span></h1>
            </div>
          </div>

          <nav className={styles.commands} aria-label="Kitchen controls">
            <div className={styles.liveInfo}>
              <span className={styles.connection} data-status={connection} role="status">
                {online ? <Wifi size={14} /> : <WifiOff size={14} />}{connection === 'Polling' ? 'Auto-sync' : connection}
              </span>
              <time className={styles.clock}>{clockStr || '—:—'}</time>
            </div>
            <button type="button" onClick={() => openPanel('history')} aria-label="Ticket history" title="Completed tickets (H)">
              <History size={18} /><span className={styles.commandLabel}>History</span>
            </button>
            <button type="button" onClick={toggleSound} aria-pressed={sound}
              aria-label={sound ? 'Mute kitchen alerts' : 'Enable kitchen alerts'} title={sound ? 'Sound on (M)' : 'Sound off (M)'}>
              {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
              <span className={styles.soundLabel}>Sound {sound ? 'on' : 'off'}</span>
            </button>
            <button type="button" onClick={() => void toggleFullscreen()}
              aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} title="Fullscreen (F)">
              {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
            <button type="button" onClick={() => openPanel('tools')} aria-label="Kitchen tools and filters" title="Kitchen tools and filters">
              <Settings2 size={18} />
            </button>
            <Link href="/admin" aria-label="Dashboard" title="Back to dashboard"><LayoutGrid size={18} /></Link>
          </nav>
        </header>

        <section className={styles.overview} aria-label="Kitchen overview">
          <div className={styles.metric}>
            <span className={styles.metricIcon}><Layers3 size={20} /></span>
            <div><span>Active tickets</span><strong>{ordersQuery.isPending ? '—' : active.length}<small>in the kitchen</small></strong></div>
          </div>
          <div className={styles.metric} data-tone="cooking">
            <span className={styles.metricIcon}><Flame size={20} /></span>
            <div><span>Items to cook</span><strong>{ordersQuery.isPending ? '—' : toCook}<small>across all orders</small></strong></div>
          </div>
          <button type="button" className={styles.metric} data-tone="late" data-alert={overdue > 0}
            aria-label={`Overdue tickets: ${overdue}`} aria-pressed={onlyOverdue} onClick={() => setOnlyOverdue(v => !v)}>
            <span className={styles.metricIcon}><AlertTriangle size={20} /></span>
            <div><span>Overdue tickets</span><strong>{ordersQuery.isPending ? '—' : overdue}<small>{onlyOverdue ? 'Showing overdue · clear' : 'Tap to focus'}</small></strong></div>
          </button>
          <div className={styles.metric} data-tone="ready">
            <span className={styles.metricIcon}><CheckCheck size={20} /></span>
            <div><span>Ready for pickup</span><strong>{ordersQuery.isPending ? '—' : readyCount}<small>awaiting handover</small></strong></div>
          </div>
        </section>

        {blocked && !ordersQuery.isPending && (
          <div className={styles.warning} role="alert">
            <WifiOff size={18} />
            <span>{online ? 'Live data could not be refreshed. Changes are paused.' : 'Offline — showing the last loaded tickets. Changes are paused.'}</span>
            <button type="button" className={styles.command} disabled={!online || ordersQuery.isFetching} onClick={() => void ordersQuery.refetch()}>
              <RefreshCw size={16} />{ordersQuery.isFetching ? 'Reconnecting…' : 'Retry'}
            </button>
          </div>
        )}
        {migrationNeeded && (
          <div className={styles.warning}><AlertTriangle size={18} /><span>Checklist sync needs the KDS database migration. Stage actions remain available when connected.</span></div>
        )}

        <div className={styles.filterBar}>
          <div className={styles.filterGroup} role="group" aria-label="Order channel">
            {CHANNELS.map(channel => (
              <button key={channel.value} type="button" className={styles.filterPill}
                aria-pressed={filter === channel.value} onClick={() => setFilter(channel.value)}>
                <channel.icon size={16} /><span>{channel.label}</span>{' '}
                <span className={styles.filterCount}>{channel.value === 'all' ? active.length : active.filter(o => (o.orderType || 'takeaway') === channel.value).length}</span>
              </button>
            ))}
          </div>
          <div className={styles.searchInputWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input ref={searchRef} type="search" placeholder="Search ticket, table or dish…" aria-label="Search tickets by number, table, customer or dish"
              className={styles.searchInput} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            {searchQuery ? (
              <button type="button" className={styles.clearSearch} aria-label="Clear search" onClick={() => { setSearchQuery(''); searchRef.current?.focus(); }}><X size={16} /></button>
            ) : shortcuts && <kbd className={styles.searchShortcut}>/</kbd>}
          </div>
          <label className={styles.sortControl}>
            <ArrowDownWideNarrow size={16} />
            <select aria-label="Sort tickets" value={sort} onChange={e => setSort(e.target.value as KitchenSort)}>
              <option value="fifo">Oldest first</option><option value="urgency">Due soonest</option><option value="table">Table number</option>
            </select>
          </label>
        </div>

        <div className={styles.boardTools}>
          <div className={styles.boardCaption} role="status">
            <strong>Order board</strong><span>{displayActive.length} {hasFilters ? `of ${active.length} ` : ''}tickets</span>
            {hasFilters && <button type="button" onClick={clearFilters}>Clear filters <X size={14} /></button>}
            {dishFilter && <span className={styles.dishFilterLabel} title={dishFilter}>{dishFilter}</span>}
          </div>
          <div className={styles.boardActions}>
            <button type="button" className={styles.command} onClick={() => setShowPrepSummary(v => !v)}
              aria-expanded={showPrepSummary} aria-controls="kds-prep-summary" title="All-day prep summary (S)">
              <ChefHat size={17} />All-day prep<span className={styles.count}>{toCook}</span>
            </button>
            <button type="button" className={styles.command} onClick={() => openPanel('batch')} aria-label={`Batch preparation, ${batches.length} groups`}>
              <Layers3 size={17} />Batch<span className={styles.count}>{batches.length}</span>
            </button>
          </div>
        </div>

        {showPrepSummary && (
          <div id="kds-prep-summary" className={styles.prepSummaryBar}>
            <span className={styles.prepSummaryTitle}><Flame size={16} />To cook · all orders</span>
            {prepSummary.length === 0 ? <span className={styles.prepSummaryEmpty}>All caught up. No items waiting to be cooked.</span> : prepSummary.map(item => (
              <button key={item.name} type="button" className={styles.prepSummaryItem} aria-pressed={dishFilter === item.name}
                onClick={() => setDishFilter(dishFilter === item.name ? null : item.name)} title={`Filter tickets containing ${item.name}`}>
                <span>{item.name}</span><span className={styles.prepSummaryQty}>{item.count}</span>
              </button>
            ))}
          </div>
        )}

        <nav className={styles.stages} aria-label="Ticket stages">
          {KITCHEN_STAGES.map(lane => (
            <button key={lane.status} id={`kds-tab-${lane.status}`} type="button" data-stage={lane.status}
              aria-label={`${lane.label}: ${displayActive.filter(o => o.status === lane.status).length} tickets`}
              aria-pressed={stage === lane.status} aria-controls={`kds-lane-${lane.status}`} onClick={() => setStage(lane.status)}>
              <span className={styles.stageDot} />{lane.label}<span className={styles.count}>{displayActive.filter(o => o.status === lane.status).length}</span>
            </button>
          ))}
        </nav>

        <div className={styles.board} aria-busy={ordersQuery.isPending}>
          {KITCHEN_STAGES.map(lane => {
            const laneOrders = displayActive.filter(o => o.status === lane.status);
            const detail = STAGE_DETAILS[lane.status];
            return (
              <section key={lane.status} id={`kds-lane-${lane.status}`} className={styles.lane} data-stage={lane.status}
                data-active={stage === lane.status} aria-label={`${lane.label} tickets`}>
                <div className={styles.laneHeader}>
                  <span className={styles.laneIcon}><detail.icon size={20} /></span>
                  <div><h2 id={`kds-${lane.status}`} tabIndex={-1}>{lane.label}<span className={styles.count}>{laneOrders.length}</span></h2><p>{detail.description}</p></div>
                  {shortcuts && <kbd>{KITCHEN_STAGES.indexOf(lane) + 1}</kbd>}
                </div>
                <div className={styles.tickets} tabIndex={0} role="region" aria-label={`${lane.label} ticket list`}>
                  {ordersQuery.isPending ? (
                    <div className={styles.loading} role="status"><RefreshCw size={22} className={styles.spin} /><strong>Loading tickets…</strong><span>Getting the kitchen up to date.</span></div>
                  ) : laneOrders.length === 0 ? (
                    <div className={styles.empty}>
                      <span className={styles.emptyIcon}>{blocked ? <WifiOff size={26} /> : hasFilters ? <Search size={26} /> : <detail.icon size={26} />}</span>
                      <strong>{blocked ? 'Waiting for connection' : hasFilters ? 'No matching tickets' : `No ${lane.label.toLowerCase()} tickets`}</strong>
                      <p>{blocked ? 'Reconnect to load the latest kitchen orders.' : hasFilters ? 'Try another search or clear your filters.' : detail.empty}</p>
                      {hasFilters && <button type="button" className={styles.command} onClick={clearFilters}>Clear filters</button>}
                    </div>
                  ) : (
                    laneOrders.map(order => (
                      <KitchenTicket
                        key={order.id}
                        order={order}
                        now={now}
                        target={kitchenTarget(order, prepTimes)}
                        busy={busyIds.has(order.id)}
                        disabled={blocked}
                        onPrepare={(index, prepared) => void withTicketLock(order.id, async () => {
                          await prepareItem.mutateAsync({ order, index, prepared });
                        })}
                        onAdvance={() => void changeStage(order, lane.next)}
                        onRecall={() => recall(order)}
                        onNote={() => openDetails(order, 'note')}
                        onDelay={() => openDetails(order, 'delay')}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <footer className={styles.boardFooter} data-blocked={blocked}>
          <span><span className={styles.stageDot} />{blocked ? 'Updates paused' : 'Orders update automatically'}</span>
          <span className={styles.keyboardHint}><Keyboard size={14} />{shortcuts ? '1–3 stages · / search · F fullscreen' : 'Keyboard shortcuts off'}</span>
          <span>Tap an item to mark it prepared</span>
        </footer>

        <Dialog open={panel !== null} onOpenChange={open => { if (!open && !selectedBusy) setPanel(null); }}>
          <DialogContent className={`${styles.dialog} sm:max-w-lg`} showCloseButton={!selectedBusy}
            onCloseAutoFocus={event => { event.preventDefault(); if (panelTrigger.current?.isConnected) panelTrigger.current.focus(); }}>
            <DialogHeader className="pr-10 text-left">
              <DialogTitle>
                {panel === 'tools' ? 'Kitchen tools' :
                 panel === 'history' ? 'Recent ticket history' :
                 panel === 'batch' ? 'Batch preparation' :
                 panel === 'delay' ? 'Extend preparation time' :
                 'Kitchen notes'}
              </DialogTitle>
              <DialogDescription>
                {panel === 'note' || panel === 'delay'
                  ? `Ticket #${getOrderToken(selected)}. Existing instructions are preserved when adding a delay.`
                   : panel === 'batch'
                   ? 'Matching portions and instructions across service channels, received within two minutes.'
                   : panel === 'history' ? 'Recent handed-over and cancelled tickets. Recall a handed-over order to the ready queue.'
                   : 'Adjust your kitchen display and notification preferences.'}
              </DialogDescription>
            </DialogHeader>

            {panel === 'tools' && (
              <div className={styles.fields}>
                <div>
                  <label htmlFor="kds-type">Order type</label>
                  <select id="kds-type" value={filter} onChange={e => setFilter(e.target.value as typeof filter)}>
                    <option value="all">All orders</option>
                    <option value="dine-in">Dine-in</option>
                    <option value="takeaway">Takeaway</option>
                    <option value="counter">Counter</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="kds-sort">Ticket order</label>
                  <select id="kds-sort" value={sort} onChange={e => setSort(e.target.value as KitchenSort)}>
                    <option value="fifo">Oldest first</option>
                    <option value="urgency">Due soonest</option>
                    <option value="table">Table number</option>
                  </select>
                </div>
                <div className={styles.dialogActions}>
                  <button type="button" className={styles.command} onClick={() => playOrderChimeSound()}>
                    <Volume2 size={18} /> Test chime
                  </button>
                  <button type="button" className={styles.command} onClick={() => setPanel('history')}>
                    Completed tickets · {history.length}
                  </button>
                </div>
                <button
                  type="button"
                  className={styles.command}
                  disabled={!online || ordersQuery.isFetching}
                  onClick={() => { void ordersQuery.refetch(); void menuQuery.refetch(); }}
                >
                  Refresh kitchen data
                </button>
                <button type="button" className={styles.command} aria-pressed={shortcuts} onClick={() => setShortcuts(v => !v)}>
                  <Keyboard size={18} />Keyboard shortcuts {shortcuts ? 'on' : 'off'}
                </button>
                <p className={styles.helpText}>
                  1/2/3 stages · / search · F fullscreen · M sound · S all-day prep · B batch · H history. Shortcuts pause while typing.
                </p>
              </div>
            )}

            {panel === 'history' && (
              <div className={styles.history}>
                {history.length === 0 ? (
                  <p>No completed tickets.</p>
                ) : (
                  history.map(o => (
                    <article key={o.id}>
                      <strong>
                        {getOrderDisplayNumber(o)} · {o.orderType === 'dine-in' ? `Table ${o.tableNumber ?? '—'}` : o.orderType === 'counter' ? 'Counter' : 'Takeaway'}
                      </strong>
                      <span className={styles.historyStatus} data-cancelled={o.status === 'cancelled'}>{o.status === 'delivered' ? 'Handed over' : 'Cancelled'}</span>
                      <span>{o.items.map(i => `${i.quantity} × ${i.name}`).join(', ')}</span>
                      {o.status === 'delivered' && (
                         <button
                          type="button"
                          className={styles.command}
                          disabled={blocked || busyIds.has(o.id)}
                          onClick={() => recall(o)}
                        >
                          {busyIds.has(o.id) ? 'Saving…' : 'Recall to ready'}
                        </button>
                      )}
                    </article>
                  ))
                )}
              </div>
            )}

            {panel === 'batch' && (
              <div className={styles.history}>
                {batches.length === 0 ? (
                  <p>No matching unprepared items to batch right now.</p>
                ) : (
                  batches.map(batch => (
                    <div className={styles.batch} key={batch.key}>
                      <strong>{batch.totalQuantity} × {batch.dish}</strong>
                      <span>{batch.orders.map(o => {
                        const order = active.find(order => order.id === o.orderId);
                        return `${order?.orderType === 'counter' ? 'Counter' : o.source} #${order ? getOrderToken(order) : o.token} ×${o.quantity}`;
                      }).join(' · ')}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {(panel === 'note' || panel === 'delay') && (
              <>
                <div className={styles.fields}>
                  {panel === 'delay' && (
                    <div>
                      <label htmlFor="kds-delay">Extra minutes (1–120)</label>
                      <div className={styles.delayPresets}>
                        {['5', '10', '15', '30'].map(m => (
                          <button
                            key={m}
                            type="button"
                            className={styles.command}
                            aria-pressed={delay === m}
                            disabled={selectedBusy}
                            onClick={() => setDelay(m)}
                          >
                            +{m}m
                          </button>
                        ))}
                      </div>
                      <input
                        id="kds-delay"
                        type="number"
                        min="1"
                        max="120"
                        step="1"
                        value={delay}
                        onChange={e => setDelay(e.target.value)}
                        disabled={selectedBusy}
                      />
                    </div>
                  )}
                  <div>
                    <label htmlFor="kds-note">
                      {panel === 'delay' ? 'Reason (appended to existing instructions)' : 'Special instructions / kitchen notes'}
                    </label>
                    <textarea
                      id="kds-note"
                      rows={4}
                      maxLength={2000}
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      disabled={selectedBusy}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <button type="button" className={styles.command} onClick={() => setPanel(null)} disabled={selectedBusy}>Cancel</button>
                  <button type="button" className={styles.primary} disabled={blocked || selectedBusy} onClick={() => void saveDetails()}>
                    {selectedBusy ? 'Saving…' : panel === 'delay' ? 'Add prep time' : 'Save note'}
                  </button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
