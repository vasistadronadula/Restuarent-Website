'use client';

import React, { useMemo, useState } from 'react';
import {
  Plus, Minus, Trash2, Banknote, QrCode, CreditCard,
  X, Send, User, Phone, Percent, Package, MessageSquarePlus,
} from 'lucide-react';
import { type PosLine } from '@/hooks/usePosCart';
import type { BillTotals, DiscountOption } from '@/lib/billing';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type PosOrderType = 'dine-in' | 'counter';

export const ORDER_TYPES: { type: PosOrderType; label: string; icon: string }[] = [
  { type: 'dine-in', label: 'Dine In', icon: '🍽️' },
  { type: 'counter', label: 'Takeaway', icon: '🛍️' },
];

export const PAYMENT_MODES = [
  { mode: 'cash', label: 'Cash', icon: Banknote },
  { mode: 'upi', label: 'UPI', icon: QrCode },
  { mode: 'card', label: 'Card', icon: CreditCard },
] as const;

export type PosPaymentMode = (typeof PAYMENT_MODES)[number]['mode'];

const QUICK_ITEM_NOTES = [
  '🌶️ Extra Spicy',
  '🧂 Less Salt',
  '🧅 No Onion',
  '🧈 Extra Butter/Ghee',
  '📦 Pack Separate',
  '🚫 Less Oil',
];

const DISCOUNT_PRESETS: { label: string; value: DiscountOption }[] = [
  { label: '0%', value: 0 },
  { label: '5%', value: { type: 'percent', value: 5 } },
  { label: '10%', value: { type: 'percent', value: 10 } },
  { label: '₹50 Flat', value: { type: 'flat', value: 50 } },
  { label: '₹100 Flat', value: { type: 'flat', value: 100 } },
];

export interface BillPanelProps {
  lines: PosLine[];
  totals: BillTotals;
  totalUnits: number;

  orderType: PosOrderType;
  onOrderType: (t: PosOrderType) => void;
  tables: { id: string; tableNumber: number; capacity: number; description?: string }[];
  tableNumber: number | '';
  onTableNumber: (n: number | '') => void;

  paymentMode: PosPaymentMode;
  onPaymentMode: (m: PosPaymentMode) => void;

  customerName: string;
  onCustomerName: (name: string) => void;
  customerPhone: string;
  onCustomerPhone: (phone: string) => void;

  discount?: DiscountOption;
  onDiscount?: (d: DiscountOption) => void;
  packagingCharge?: number;
  onPackagingCharge?: (fee: number) => void;

  onIncrement: (key: string) => void;
  onDecrement: (key: string) => void;
  onSetQuantity: (key: string, qty: number) => void;
  onSetLineNotes?: (key: string, notes: string) => void;
  onRemove: (key: string) => void;
  onClear: () => void;

  onPlace: () => void;
  onSendToKitchen?: () => void;
  onOpenTableMap?: () => void;

  isPlacing: boolean;
  onClose?: () => void;
  compact?: boolean;
}

export default function BillPanel({
  lines,
  totals,
  totalUnits,
  orderType,
  onOrderType,
  tables,
  tableNumber,
  onTableNumber,
  paymentMode,
  onPaymentMode,
  customerName,
  onCustomerName,
  customerPhone,
  onCustomerPhone,
  discount = 0,
  onDiscount,
  packagingCharge = 0,
  onPackagingCharge,
  onIncrement,
  onDecrement,
  onSetQuantity,
  onSetLineNotes,
  onRemove,
  onClear,
  onPlace,
  onSendToKitchen,
  onOpenTableMap,
  isPlacing,
  onClose,
  compact = false,
}: BillPanelProps) {
  const empty = lines.length === 0;
  const needsTable = orderType === 'dine-in' && tableNumber === '';
  const blocked = empty || needsTable;

  /* Editing note key state */
  const [editingNoteKey, setEditingNoteKey] = useState<string | null>(null);
  const [customNoteInput, setCustomNoteInput] = useState('');

  /* Smart Cash Quick Tender Calculator */
  const [cashReceived, setCashReceived] = useState('');
  const [cashResetKey, setCashResetKey] = useState('');
  const nextCashResetKey = `${paymentMode}:${empty}:${totals.grandTotal}`;
  if (nextCashResetKey !== cashResetKey) {
    setCashResetKey(nextCashResetKey);
    if (paymentMode !== 'cash' || empty) setCashReceived('');
  }

  const receivedAmount = Number(cashReceived) || 0;
  const changeDue = Math.max(0, receivedAmount - totals.grandTotal);
  const cashShort = paymentMode === 'cash' && receivedAmount > 0 && receivedAmount < totals.grandTotal;

  // Preset denominations
  const quickCashOptions = useMemo(() => {
    const total = Math.ceil(totals.grandTotal);
    const presets = [100, 200, 500, 1000, 2000];
    const filtered = presets.filter((p) => p >= total);
    return [total, ...filtered.slice(0, 3)];
  }, [totals.grandTotal]);

  const isDiscountActive = (d: DiscountOption) => {
    if (typeof discount === 'number' && typeof d === 'number') return discount === d;
    if (typeof discount === 'object' && typeof d === 'object') {
      return discount.type === d.type && discount.value === d.value;
    }
    return false;
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-ad-surface select-none">

      {/* ── 1. TICKET HEADER ── */}
      <div className="px-4 py-3 border-b-2 border-ad-line flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <div className="ad-num text-[17px] flex items-center gap-2">
            <span>Ticket</span>
            {totalUnits > 0 && (
              <span className="ad-num text-[12px] px-1.5 bg-ad-ink text-ad-bg">{totalUnits}</span>
            )}
          </div>
          <div className="ad-kicker">
            {totalUnits === 0 ? 'Empty' : `${lines.length} lines`}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!empty && (
            <button
              type="button"
              onClick={onClear}
              className="ad-btn ad-btn-ghost ad-btn-sm"
              title="Clear all items from this ticket"
            >
              <Trash2 className="size-3" />
              <span>Clear</span>
            </button>
          )}
          {onClose && (
            <button type="button" onClick={onClose} className="ad-btn ad-btn-secondary ad-btn-icon">
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── 2. ORDER TYPE & TABLE SELECTION ── */}
      <div className="p-3.5 border-b border-ad-hairline shrink-0 space-y-2.5">
        {/* Order type */}
        <div className="grid grid-cols-2 gap-2">
          {ORDER_TYPES.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => onOrderType(t.type)}
              className="ad-tab h-10"
              data-active={orderType === t.type}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Dine-In Table Picker */}
        {orderType === 'dine-in' && (
          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between ad-kicker">
              <span>Table</span>
              {needsTable && <span className="text-ad-accent">Required</span>}
            </div>

            <div className="flex gap-1.5">
              <Select
                value={tableNumber === '' ? '' : String(tableNumber)}
                onValueChange={(val) => onTableNumber(val === '' ? '' : Number(val))}
              >
                <SelectTrigger
                  className="ad-input flex-1"
                  style={needsTable ? { borderColor: 'var(--ad-accent)', borderWidth: '2px' } : undefined}
                >
                  <SelectValue placeholder="Select a table" />
                </SelectTrigger>
                <SelectContent>
                  {tables.length === 0 && <SelectItem value="" disabled>No tables configured</SelectItem>}
                  {tables.map((t) => (
                    <SelectItem key={t.id} value={String(t.tableNumber)}>
                      Table {t.tableNumber} · {t.capacity} seats
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {onOpenTableMap && (
                <button type="button" onClick={onOpenTableMap} className="ad-btn ad-btn-secondary shrink-0">
                  Floor map
                </button>
              )}
            </div>
          </div>
        )}

        {/* Customer Info (Optional Phone & Name) */}
        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          <div className="relative">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-ad-muted z-10" />
            <input
              type="text"
              placeholder="Customer name"
              value={customerName}
              onChange={(e) => onCustomerName(e.target.value)}
              className="ad-input h-9 pl-7 pr-2 text-[13px]"
            />
          </div>
          <div className="relative">
            <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-ad-muted z-10" />
            <input
              type="tel"
              placeholder="Phone"
              value={customerPhone}
              onChange={(e) => onCustomerPhone(e.target.value)}
              className="ad-input h-9 pl-7 pr-2 text-[13px] tabular-nums"
            />
          </div>
        </div>
      </div>

      {/* ── 3. CART ITEMS LIST ── */}
      <div className="flex-1 min-h-0 flex flex-col">
        {empty ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <p className="ad-h text-[16px]">Ticket is empty</p>
            <p className="text-[13px] ad-muted mt-1.5 max-w-45">
              Tap a dish to start the ticket.
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
            {lines.map((line) => (
              <div
                key={line.key}
                className="px-3 py-2.5 bg-ad-bg border-b border-ad-hairline space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  {/* Item Name & Portion */}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[14px] font-semibold truncate leading-snug m-0">{line.name}</h4>
                    <p className="ad-kicker mt-0.5 m-0">
                      ₹{line.unitPrice}{line.portion ? ` · ${line.portion}` : ''}
                    </p>
                  </div>

                  {/* Stepper Buttons */}
                  <div className="flex items-center border border-ad-line overflow-hidden shrink-0">
                    <button
                      type="button"
                      onClick={() => (line.quantity <= 1 ? onRemove(line.key) : onDecrement(line.key))}
                      className="ad-btn size-7 p-0 ad-hover-strong"
                      aria-label={`Less ${line.name}`}
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="w-7 text-center ad-num text-[14px]">{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => onIncrement(line.key)}
                      className="ad-btn size-7 p-0 ad-hover-strong"
                      aria-label={`More ${line.name}`}
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>

                  {/* Line total */}
                  <span className="ad-num text-[14px] w-14 text-right shrink-0">
                    ₹{line.unitPrice * line.quantity}
                  </span>

                  <button
                    type="button"
                    onClick={() => onRemove(line.key)}
                    className="ad-btn size-7 p-0 shrink-0"
                    style={{ color: 'var(--ad-n500)' }}
                    aria-label={`Remove ${line.name}`}
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>

                {/* Item Cooking Note & Modifier Tag */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  {line.notes ? (
                    <span className="ad-tag ad-tag-accent">
                      {line.notes}
                      <button
                        type="button"
                        onClick={() => onSetLineNotes && onSetLineNotes(line.key, '')}
                        className="font-bold ml-1"
                        aria-label="Remove note"
                      >
                        ×
                      </button>
                    </span>
                  ) : editingNoteKey === line.key ? (
                    <div className="w-full space-y-1.5 bg-ad-surface p-2 border border-ad-hairline">
                      <div className="flex flex-wrap gap-1">
                        {QUICK_ITEM_NOTES.map((qn) => (
                          <button
                            key={qn}
                            type="button"
                            onClick={() => {
                              onSetLineNotes && onSetLineNotes(line.key, qn);
                              setEditingNoteKey(null);
                            }}
                            className="ad-tab px-2 py-0.5 text-[10px]"
                          >
                            {qn}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="Custom cooking note…"
                          value={customNoteInput}
                          onChange={(e) => setCustomNoteInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && customNoteInput.trim()) {
                              onSetLineNotes && onSetLineNotes(line.key, customNoteInput.trim());
                              setCustomNoteInput('');
                              setEditingNoteKey(null);
                            }
                          }}
                          className="ad-input flex-1 h-7 px-1.5 text-[12px] min-h-0"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customNoteInput.trim()) {
                              onSetLineNotes && onSetLineNotes(line.key, customNoteInput.trim());
                            }
                            setCustomNoteInput('');
                            setEditingNoteKey(null);
                          }}
                          className="ad-btn ad-btn-dark h-7 px-2 text-[11px]"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomNoteInput('');
                            setEditingNoteKey(null);
                          }}
                          className="ad-btn ad-btn-secondary h-7 px-2 text-[11px]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingNoteKey(line.key)}
                      className="ad-kicker hover:text-ad-accent flex items-center gap-1 transition-colors"
                    >
                      <MessageSquarePlus className="size-3" />
                      <span>Add note</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 4. QUICK DISCOUNT & CHARGES BAR ── */}
      {!empty && (
        <div className="px-3.5 py-2.5 border-t-2 border-ad-line space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <span className="ad-kicker flex items-center gap-1">
              <Percent className="size-3" /> Discount
            </span>

            {/* Packaging Charge Toggle (especially useful for Takeaway) */}
            {onPackagingCharge && (
              <button
                type="button"
                onClick={() => onPackagingCharge(packagingCharge > 0 ? 0 : 20)}
                className="ad-tab flex items-center gap-1 px-2 py-0.5"
                data-active={packagingCharge > 0}
              >
                <Package className="size-3" />
                <span>Pack ₹20</span>
              </button>
            )}
          </div>

          {onDiscount && (
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
              {DISCOUNT_PRESETS.map((d) => {
                const active = isDiscountActive(d.value);
                return (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => onDiscount(d.value)}
                    className="ad-tab shrink-0 px-2 py-0.5"
                    data-active={active}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 5. ORDER SUMMARY (SUBTOTAL, TAX, CHARGES, GRAND TOTAL) ── */}
      {!empty && (
        <div className="px-4 py-3 border-t-2 border-ad-line space-y-2 shrink-0">
          <div className="space-y-1 text-[13px]">
            <div className="flex justify-between">
              <span className="ad-muted">Subtotal</span>
              <span className="ad-num text-[13px]">₹{totals.subtotal.toFixed(2)}</span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between" style={{ color: 'var(--ad-ok)' }}>
                <span>Discount</span>
                <span className="ad-num text-[13px]">−₹{totals.discountAmount.toFixed(2)}</span>
              </div>
            )}
            {totals.packagingCharge && totals.packagingCharge > 0 && (
              <div className="flex justify-between">
                <span className="ad-muted">Packaging</span>
                <span className="ad-num text-[13px]">+₹{totals.packagingCharge.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="ad-muted">GST 5%</span>
              <span className="ad-num text-[13px]">₹{(totals.cgst + totals.sgst).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-baseline justify-between pt-2 border-t-2 border-ad-line">
            <span className="ad-kicker">Total</span>
            <span className="ad-num text-[26px]">₹{totals.grandTotal.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* ── 6. SMART PAYMENT SECTION & QUICK CASH UX ── */}
      <div className="p-3.5 border-t-2 border-ad-line space-y-2.5 shrink-0">
        <div>
          <div className="ad-kicker mb-1.5">Payment</div>

          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_MODES.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.mode}
                  type="button"
                  onClick={() => onPaymentMode(p.mode)}
                  className="ad-tab h-10 flex items-center justify-center gap-1.5"
                  data-active={paymentMode === p.mode}
                >
                  <Icon className="size-3.5" />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Smart Cash UX: Quick Amount Presets */}
          {paymentMode === 'cash' && !empty && (
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                <span className="ad-kicker shrink-0">Tender</span>
                {quickCashOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setCashReceived(String(opt))}
                    className="ad-tab shrink-0 px-2 py-0.5"
                    data-active={cashReceived === String(opt)}
                  >
                    ₹{opt}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 ad-num text-[13px] text-ad-muted z-10">₹</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="Cash tendered"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="ad-input h-9 pl-6 pr-2 tabular-nums"
                  />
                </div>

                {receivedAmount > 0 && (
                  <span className={cn('ad-tag h-9 px-3', cashShort ? 'ad-tag-accent' : 'ad-tag-ok')}>
                    <span className="ad-num text-[13px]">
                      {cashShort
                        ? `Short ₹${(totals.grandTotal - receivedAmount).toFixed(0)}`
                        : `Change ₹${changeDue.toFixed(0)}`}
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── 7. SUB-10s ACTION BUTTONS ── */}
        <div className="space-y-1.5 pt-0.5">
          {/* Complete Payment & Print (Primary CTA) */}
          {/* Settling money keeps its green: on this till green has always meant
              "take the payment", and repainting the confirm button accent-red
              would read as danger to a cashier mid-rush. */}
          <button
            type="button"
            onClick={() => { if (!blocked) onPlace(); }}
            disabled={blocked || isPlacing}
            className="ad-btn w-full h-12 text-[15px] justify-between px-4"
            style={
              blocked || isPlacing
                ? { background: 'var(--ad-n300)', color: 'var(--ad-n600)', cursor: 'not-allowed' }
                : { background: 'var(--ad-ok)', color: 'var(--ad-bg)' }
            }
          >
            {isPlacing ? (
              <span>Settling and printing…</span>
            ) : (
              <>
                <span>Settle and print</span>
                {!empty && <span className="ad-num text-[17px]">₹{totals.grandTotal.toFixed(2)}</span>}
              </>
            )}
          </button>

          {/* Secondary actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={empty || isPlacing}
              onClick={onSendToKitchen || onPlace}
              className="ad-btn ad-btn-secondary h-9"
            >
              <Send className="size-3" />
              <span>Send KOT</span>
            </button>

            <button
              type="button"
              disabled={empty || isPlacing}
              onClick={onClear}
              className="ad-btn ad-btn-secondary h-9"
              style={{ color: 'var(--ad-a700)' }}
            >
              <Trash2 className="size-3" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
