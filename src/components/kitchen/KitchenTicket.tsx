'use client';
import React from 'react';
import { AlertTriangle, ArrowUpRight, Check, Clock, Flame, Loader2, Printer, StickyNote, Timer, Undo2, UtensilsCrossed, ShoppingBag, Zap } from 'lucide-react';
import type { Order } from '@/types';
import { kitchenItemKey, kitchenTiming, KITCHEN_STAGES } from '@/lib/kitchen/kitchen';
import { orderItemPortion } from '@/lib/orders/orderItems';
import { PORTION_LABELS } from '@/lib/orders/portionLabels';
import { getOrderDisplayNumber, getOrderToken } from '@/lib/orders/orderNumber';
import { printKitchenTicket } from '@/lib/printing/kotPrinter';
import styles from './kitchen.module.css';

export interface KitchenTicketProps {
  order: Order;
  target: number;
  now: number;
  busy: boolean;
  disabled: boolean;
  onPrepare: (index: number, prepared: boolean) => void;
  onAdvance: () => void;
  onRecall: () => void;
  onNote: () => void;
  onDelay: () => void;
}

export function KitchenTicket({ order, target, now, busy, disabled, onPrepare, onAdvance, onRecall, onNote, onDelay }: KitchenTicketProps) {
  const stage = KITCHEN_STAGES.find(s => s.status === order.status)!;
  const time = kitchenTiming(order, now, target);
  const checked = order.items.filter((_, i) => order.kitchenProgress?.[kitchenItemKey(order.items, i)]).length;
  const blocked = disabled || busy;
  const progressPercent = order.items.length > 0 ? Math.round((checked / order.items.length) * 100) : 0;
  const ticketAriaLabel = `Ticket ${getOrderToken(order)}`;
  const isReady = order.status === 'ready';
  const ActionIcon = order.status === 'pending' ? Flame : isReady ? ArrowUpRight : Check;
  const customer = order.customerName && !['Guest', 'Counter Customer'].includes(order.customerName) ? order.customerName : null;

  return (
    <article
      className={styles.ticket}
      data-stage={order.status}
      data-urgency={time.late ? 'late' : time.urgent ? 'soon' : 'normal'}
      aria-label={ticketAriaLabel}
      aria-busy={busy}
    >
      <header className={styles.ticketHeader}>
        <div className={styles.ticketIdentity}>
          <h3 className={styles.token} title={`Order ID: ${order.id}`}>{getOrderDisplayNumber(order)}</h3>
          <div className={styles.sourceRow}>
            <span className={styles.channelTag} data-type={order.orderType || 'takeaway'}>
              {order.orderType === 'dine-in' ? (
                <><UtensilsCrossed size={14} /> Table {order.tableNumber ?? '—'}</>
              ) : order.orderType === 'counter' ? (
                <><Zap size={14} /> Counter</>
              ) : (
                <><ShoppingBag size={14} /> Takeaway</>
              )}
            </span>
          </div>
          {customer && <span className={styles.source} title={customer}>{customer}</span>}
        </div>
        <div className={styles.timer}>
          <strong><Clock size={15} />{time.elapsed === null ? '—' : `${time.elapsed}m`}</strong>
          <span>{time.label}</span>
        </div>
      </header>

      {(time.late || time.urgent) && <div className={styles.urgencyStrip}>
        <AlertTriangle size={14} />
        <strong>{time.late ? `Overdue ${Math.max(0, Math.floor((time.age ?? 0) - target))}m` : 'Due soon'}</strong>
        <span>{Math.floor(time.age ?? 0)}m since ordered</span>
      </div>}

      {!isReady && order.kitchenProgress !== undefined && order.items.length > 1 && (
        <div className={styles.progressBarWrapper} role="progressbar" aria-label="Item preparation progress"
          aria-valuemin={0} aria-valuemax={order.items.length} aria-valuenow={checked} aria-valuetext={`${checked} of ${order.items.length} lines prepared`}>
          <div className={styles.progressBar} style={{ width: `${progressPercent}%` }} />
        </div>
      )}

      <div className={styles.ticketBody}>
        {order.notes && (
          <div className={styles.instructions}>
            <strong><StickyNote size={14} />Special instructions</strong>
            <span>{order.notes}</span>
          </div>
        )}
        <ul className={styles.items}>
          {order.items.map((item, index) => {
            const key = kitchenItemKey(order.items, index);
            const prepared = !!order.kitchenProgress?.[key];
            const portion = orderItemPortion(item);
            return (
              <li key={key}>
                <button
                  type="button"
                  className={styles.item}
                  aria-pressed={prepared}
                  aria-label={`${prepared ? 'Unmark' : 'Mark prepared'}: ${item.quantity} ${item.name}${portion ? `, ${portion}` : ''}`}
                  disabled={blocked || order.status === 'ready' || order.kitchenProgress === undefined}
                  onClick={() => onPrepare(index, !prepared)}
                >
                  <span className={styles.quantity}>×{item.quantity}</span>
                  <span className={styles.itemDescription}>
                    <span className={styles.itemTitleRow}>
                      <strong className={prepared && !isReady ? styles.itemPrepared : undefined}>{item.name}</strong>
                      {item.vegStatus && (
                        <span
                          className={styles.dietBadge}
                          data-veg={item.vegStatus}
                          title={item.vegStatus === 'veg' ? 'Vegetarian' : item.vegStatus === 'egg' ? 'Contains Egg' : 'Non-Vegetarian'}
                        >
                          <span className={styles.dietDot} />
                        </span>
                      )}
                    </span>
                    {(portion || item.vegStatus) && <span className={styles.itemDetail}>
                      {[portion ? (PORTION_LABELS[portion as keyof typeof PORTION_LABELS] || portion) : '',
                        item.vegStatus ? (item.vegStatus === 'veg' ? 'Veg' : item.vegStatus === 'egg' ? 'Egg' : 'Non-veg') : ''].filter(Boolean).join(' · ')}
                    </span>}
                    {item.notes && <em>{item.notes}</em>}
                  </span>
                  {!isReady && order.kitchenProgress !== undefined && <span className={styles.checkbox} aria-hidden="true">
                    {prepared && <Check size={18} strokeWidth={3} />}
                  </span>}
                </button>
              </li>
            );
          })}
        </ul>
        {order.items.length === 0 && <p className={styles.helpText}>No items on this ticket. Check the order before advancing.</p>}
      </div>

      <footer className={styles.ticketFooter}>
        <div className={styles.ticketMeta}>
          <span>
            {isReady ? 'Ready for handover' : order.kitchenProgress === undefined
              ? 'Checklist sync unavailable'
              : `${checked}/${order.items.length} lines prepared`}
          </span>
          {order.status !== 'ready' && <span>Target {target}m</span>}
        </div>
        <button type="button" className={styles.primary} disabled={blocked || order.items.length === 0} onClick={onAdvance}>
          {busy ? (
            <><Loader2 size={20} className={styles.spin} /> Saving…</>
          ) : (
            <><ActionIcon size={20} strokeWidth={2.5} /> {stage.action}</>
          )}
        </button>
        <div className={styles.secondaryActions}>
          {order.status !== 'pending' && (
            <button type="button" disabled={blocked} onClick={onRecall} title="Recall to previous stage">
              <Undo2 size={18} /> Back
            </button>
          )}
          <button type="button" disabled={blocked} onClick={onNote} title="Add kitchen notes">
            <StickyNote size={18} /> Note
          </button>
          {order.status !== 'ready' && (
            <button type="button" disabled={blocked} onClick={onDelay} title="Notify customer of preparation delay">
              <Timer size={18} /> Delay
            </button>
          )}
          <button
            type="button"
            onClick={() => printKitchenTicket(order)}
            title="Print Kitchen Order Ticket (KOT)"
          >
            <Printer size={18} /> Print
          </button>
        </div>
      </footer>
    </article>
  );
}
