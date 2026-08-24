'use client';

import React, { useState } from 'react';
import {
  Plus, Minus, Trash2, Banknote, QrCode, CreditCard,
  X, Package, MessageSquarePlus, Utensils,
} from 'lucide-react';
import { type PosLine } from '@/hooks/usePosCart';
import type { BillTotals } from '@/lib/billing';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

  packagingCharge?: number;
  onPackagingCharge?: (fee: number) => void;

  onIncrement: (key: string) => void;
  onDecrement: (key: string) => void;
  onSetQuantity: (key: string, qty: number) => void;
  onSetLineNotes?: (key: string, notes: string) => void;
  onRemove: (key: string) => void;
  onClear: () => void;

  onPlace: () => void;
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
  packagingCharge = 0,
  onPackagingCharge,
  onIncrement,
  onDecrement,
  onSetQuantity,
  onSetLineNotes,
  onRemove,
  onClear,
  onPlace,
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

  return (
    <div className="flex flex-col md:flex-row h-full min-h-0 bg-ad-surface select-none overflow-hidden">

      {/* ========================================================================= */}
      {/* ── LEFT COLUMN (DESKTOP) / MAIN STREAM (MOBILE): MENU ITEMS LIST ───────── */}
      {/* ========================================================================= */}
      <div className="flex-1 min-h-0 flex flex-col md:border-r-2 md:border-ad-line overflow-hidden">
        
        {/* Items Column Header */}
        <div className="px-4 py-3 border-b-2 border-ad-line flex items-center justify-between gap-2 shrink-0 bg-ad-surface">
          <div className="flex items-center gap-2 min-w-0">
            <span className="ad-num text-[17px] font-bold text-ad-ink">Ticket Items</span>
            {totalUnits > 0 && (
              <span className="ad-num text-[12px] px-2 py-0.5 bg-ad-ink text-ad-bg rounded-full">
                {totalUnits} {totalUnits === 1 ? 'item' : 'items'}
              </span>
            )}
            <span className="text-[12px] ad-muted hidden sm:inline">
              ({lines.length} {lines.length === 1 ? 'dish' : 'dishes'})
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!empty && (
              <button
                type="button"
                onClick={onClear}
                className="ad-btn ad-btn-ghost ad-btn-sm text-ad-accent"
                title="Clear all items from this ticket"
              >
                <Trash2 className="size-3" />
                <span>Clear All</span>
              </button>
            )}
            {/* Mobile close button (shown in top-right on mobile only) */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="md:hidden ad-btn ad-btn-secondary ad-btn-icon size-8"
                aria-label="Close ticket"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Toolbar (Order Type & Table Quick Selector on Mobile) */}
        <div className="md:hidden px-3 py-2 border-b border-ad-hairline bg-ad-bg shrink-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="grid grid-cols-2 gap-1 flex-1">
              {ORDER_TYPES.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => onOrderType(t.type)}
                  className="ad-tab h-8 text-[12px] font-medium"
                  data-active={orderType === t.type}
                >
                  <span className="mr-1">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {onPackagingCharge && (
              <button
                type="button"
                onClick={() => onPackagingCharge(packagingCharge > 0 ? 0 : 20)}
                className="ad-tab h-8 px-2.5 text-[11px] flex items-center gap-1 shrink-0"
                data-active={packagingCharge > 0}
              >
                <Package className="size-3" />
                <span>Pack ₹20</span>
              </button>
            )}
          </div>

          {orderType === 'dine-in' && (
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="ad-kicker text-[11px] shrink-0">Table:</span>
              <Select
                value={tableNumber === '' ? '' : String(tableNumber)}
                onValueChange={(val) => onTableNumber(val === '' ? '' : Number(val))}
              >
                <SelectTrigger
                  className="ad-input flex-1 h-7.5 text-[12px] min-h-0"
                  style={needsTable ? { borderColor: 'var(--ad-critical)', borderWidth: '2px' } : undefined}
                >
                  <SelectValue placeholder="Select table (Required)" />
                </SelectTrigger>
                <SelectContent>
                  {tables.length === 0 && <SelectItem value="" disabled>No tables configured</SelectItem>}
                  {tables.map((t) => (
                    <SelectItem key={t.id} value={String(t.tableNumber)}>
                      Table {t.tableNumber} ({t.capacity} seats)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {onOpenTableMap && (
                <button
                  type="button"
                  onClick={onOpenTableMap}
                  className="ad-btn ad-btn-secondary h-7.5 px-2 text-[11px] shrink-0"
                >
                  Map
                </button>
              )}
            </div>
          )}
        </div>

        {/* Scrollable Cart Items Container */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 bg-ad-bg/40">
          {empty ? (
            <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 text-ad-muted">
              <Utensils className="size-10 mb-2 opacity-30 stroke-[1.5]" />
              <p className="ad-h text-[16px] text-ad-ink">Ticket is empty</p>
              <p className="text-[13px] mt-1 max-w-56 text-ad-muted">
                Tap items from the menu to add them to this ticket.
              </p>
            </div>
          ) : (
            lines.map((line) => (
              <div
                key={line.key}
                className="p-3 bg-ad-surface border border-ad-hairline rounded-sm shadow-xs transition-colors hover:border-ad-line space-y-2"
              >
                <div className="flex items-start justify-between gap-2.5">
                  {/* Dish name, portion, and unit rate */}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[14px] font-semibold text-ad-ink leading-snug m-0 line-clamp-2">
                      {line.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[12px] font-medium text-ad-muted">
                        ₹{line.unitPrice} each
                      </span>
                      {line.portion && (
                        <span className="ad-tag ad-tag-outline text-[10px] px-1.5 py-0">
                          {line.portion}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stepper Quantity Buttons */}
                  <div className="flex items-center border-2 border-ad-line rounded-sm overflow-hidden bg-ad-bg shrink-0">
                    <button
                      type="button"
                      onClick={() => (line.quantity <= 1 ? onRemove(line.key) : onDecrement(line.key))}
                      className="ad-btn size-7 p-0 ad-hover-strong hover:bg-ad-surface"
                      aria-label={`Decrease ${line.name}`}
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="w-8 text-center ad-num text-[14px] font-bold select-none">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onIncrement(line.key)}
                      className="ad-btn size-7 p-0 ad-hover-strong hover:bg-ad-surface"
                      aria-label={`Increase ${line.name}`}
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>

                  {/* Line Total Price */}
                  <div className="w-16 text-right shrink-0">
                    <span className="ad-num text-[15px] font-bold text-ad-ink">
                      ₹{line.unitPrice * line.quantity}
                    </span>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => onRemove(line.key)}
                    className="ad-btn size-7 p-0 shrink-0 text-ad-muted hover:text-ad-accent transition-colors"
                    aria-label={`Remove ${line.name}`}
                    title="Remove item"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                {/* Cooking Notes / Custom Instructions */}
                <div className="pt-1 border-t border-ad-hairline/60">
                  {line.notes ? (
                    <div className="flex items-center gap-1.5">
                      <span className="ad-tag ad-tag-accent text-[11px] inline-flex items-center gap-1">
                        <span>{line.notes}</span>
                        <button
                          type="button"
                          onClick={() => onSetLineNotes && onSetLineNotes(line.key, '')}
                          className="hover:opacity-80 font-bold ml-1 text-[13px] leading-none"
                          aria-label="Remove note"
                        >
                          ×
                        </button>
                      </span>
                    </div>
                  ) : editingNoteKey === line.key ? (
                    <div className="space-y-1.5 bg-ad-bg p-2 border border-ad-line rounded-sm">
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
                          className="ad-input flex-1 h-7 px-2 text-[12px] min-h-0 bg-ad-surface"
                          autoFocus
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
                          className="ad-btn ad-btn-dark h-7 px-2.5 text-[11px]"
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
                      onClick={() => {
                        setCustomNoteInput('');
                        setEditingNoteKey(line.key);
                      }}
                      className="ad-kicker hover:text-ad-accent flex items-center gap-1 text-[11px] transition-colors"
                    >
                      <MessageSquarePlus className="size-3" />
                      <span>+ Add cooking note</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── RIGHT COLUMN (DESKTOP) / BOTTOM DRAWER (MOBILE): CHECKOUT & TOTALS ─── */}
      {/* ========================================================================= */}
      <div className="md:w-[360px] lg:w-[390px] shrink-0 flex flex-col bg-ad-surface border-t-2 md:border-t-0 border-ad-line">
        
        {/* Desktop Header for Checkout Panel */}
        <div className="hidden md:flex items-center justify-between px-4 py-3 border-b-2 border-ad-line shrink-0">
          <div className="min-w-0">
            <span className="ad-num text-[16px] font-bold text-ad-ink">Checkout & Settle</span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="ad-btn ad-btn-secondary ad-btn-icon size-8"
              aria-label="Close ticket"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex-1 min-h-0 flex flex-col justify-between overflow-y-auto">
          <div className="p-3.5 space-y-3">
            
            {/* Desktop Order Type Selector & Table Picker */}
            <div className="hidden md:block space-y-2.5">
              <div className="ad-kicker">Order Type</div>
              <div className="grid grid-cols-2 gap-2">
                {ORDER_TYPES.map((t) => (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => onOrderType(t.type)}
                    className="ad-tab h-10 text-[13px] font-medium"
                    data-active={orderType === t.type}
                  >
                    <span className="mr-1.5">{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Dine-In Table Picker */}
              {orderType === 'dine-in' && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between ad-kicker text-[11px]">
                    <span>Table Selection</span>
                    {needsTable && <span className="text-ad-critical font-bold">Required</span>}
                  </div>

                  <div className="flex gap-1.5">
                    <Select
                      value={tableNumber === '' ? '' : String(tableNumber)}
                      onValueChange={(val) => onTableNumber(val === '' ? '' : Number(val))}
                    >
                      <SelectTrigger
                        className="ad-input flex-1"
                        style={needsTable ? { borderColor: 'var(--ad-critical)', borderWidth: '2px' } : undefined}
                      >
                        <SelectValue placeholder="Select table" />
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
                      <button
                        type="button"
                        onClick={onOpenTableMap}
                        className="ad-btn ad-btn-secondary shrink-0"
                      >
                        Floor map
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Packaging Charge Toggle (Desktop) */}
              {onPackagingCharge && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => onPackagingCharge(packagingCharge > 0 ? 0 : 20)}
                    className="ad-tab w-full h-8.5 flex items-center justify-center gap-1.5 text-[12px]"
                    data-active={packagingCharge > 0}
                  >
                    <Package className="size-3.5" />
                    <span>Packaging Charge (+₹20)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Payment Mode Selector */}
            <div className="space-y-1.5">
              <div className="ad-kicker text-[11px]">Payment Mode</div>
              <div className="grid grid-cols-3 gap-1.5">
                {PAYMENT_MODES.map((p) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.mode}
                      type="button"
                      onClick={() => onPaymentMode(p.mode)}
                      className="ad-tab h-9 flex items-center justify-center gap-1 text-[12px] font-medium"
                      data-active={paymentMode === p.mode}
                    >
                      <Icon className="size-3.5" />
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bill Calculation Breakdown */}
            {!empty && (
              <div className="p-3 bg-ad-bg border border-ad-line rounded-sm space-y-1.5 text-[13px]">
                <div className="flex justify-between text-ad-muted">
                  <span>Subtotal ({totalUnits} items)</span>
                  <span className="ad-num text-[13px] font-medium text-ad-ink">₹{totals.subtotal.toFixed(2)}</span>
                </div>
                {totals.packagingCharge && totals.packagingCharge > 0 && (
                  <div className="flex justify-between text-ad-muted">
                    <span>Packaging</span>
                    <span className="ad-num text-[13px] font-medium text-ad-ink">+₹{totals.packagingCharge.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-ad-muted">
                  <span>GST (5%)</span>
                  <span className="ad-num text-[13px] font-medium text-ad-ink">₹{(totals.cgst + totals.sgst).toFixed(2)}</span>
                </div>

                <div className="flex items-baseline justify-between pt-2 border-t border-ad-line">
                  <span className="ad-num text-[14px] font-bold text-ad-ink uppercase tracking-wide">Grand Total</span>
                  <span className="ad-num text-[22px] font-bold text-ad-ink">
                    ₹{totals.grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Settle & Action Buttons (Bottom of Right Column / Drawer) */}
          <div className="p-3.5 border-t border-ad-line bg-ad-surface space-y-2 shrink-0">
            {/* Primary Action Button: Settle and print */}
            <button
              type="button"
              onClick={() => { if (!blocked) onPlace(); }}
              disabled={blocked || isPlacing}
              className="ad-btn w-full h-12 text-[15px] font-bold justify-between px-4 rounded-sm shadow-sm transition-all"
              style={
                blocked || isPlacing
                  ? { background: 'var(--ad-n300)', color: 'var(--ad-n600)', cursor: 'not-allowed' }
                  : { background: 'var(--ad-ok)', color: '#ffffff' }
              }
            >
              {isPlacing ? (
                <span className="w-full text-center">Settling and printing…</span>
              ) : (
                <>
                  <span>Settle and print</span>
                  {!empty && (
                    <span className="ad-num text-[18px] font-bold">₹{totals.grandTotal.toFixed(2)}</span>
                  )}
                </>
              )}
            </button>

            {/* Secondary Action: Clear */}
            <button
              type="button"
              disabled={empty || isPlacing}
              onClick={onClear}
              className="ad-btn ad-btn-secondary w-full h-9 text-[13px]"
              style={{ color: 'var(--ad-accent)' }}
            >
              <Trash2 className="size-3.5" />
              <span>Clear</span>
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
