'use client';

import React, { useMemo, useState } from 'react';
import {
  Plus, Minus, Trash2, ShoppingBag, Banknote, QrCode, CreditCard,
  X, Send, Printer, User, Phone, Edit3, Check, Percent, Ban, ArrowRight,
  MessageSquarePlus, ChevronRight
} from 'lucide-react';
import { MAX_LINE_QTY, type PosLine } from '@/hooks/usePosCart';
import type { BillTotals, DiscountOption } from '@/lib/billing';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export type PosOrderType = 'dine-in' | 'counter';

export const ORDER_TYPES: { type: PosOrderType; label: string; icon: string }[] = [
  { type: 'dine-in', label: 'Dine In', icon: '🍽️' },
  { type: 'counter', label: 'Takeaway', icon: '🛍️' },
];

export const PAYMENT_MODES = [
  { mode: 'cash', label: 'Cash', icon: Banknote, color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  { mode: 'upi', label: 'UPI / QR', icon: QrCode, color: 'bg-purple-600 hover:bg-purple-700 text-white' },
  { mode: 'card', label: 'Card', icon: CreditCard, color: 'bg-blue-600 hover:bg-blue-700 text-white' },
] as const;

export type PosPaymentMode = (typeof PAYMENT_MODES)[number]['mode'];

const QUICK_ITEM_NOTES = [
  'No onions',
  'Extra spicy 🌶️',
  'Dressing on side',
  'Less oil / No ghee',
  'Pack separate 📦',
  'Less salt',
];

const DISCOUNT_PRESETS: { label: string; value: DiscountOption }[] = [
  { label: '0%', value: 0 },
  { label: '5%', value: { type: 'percent', value: 5 } },
  { label: '10%', value: { type: 'percent', value: 10 } },
  { label: '15%', value: { type: 'percent', value: 15 } },
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

  /* Modals */
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
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

  const handlePayClick = () => {
    if (blocked) return;
    setPayModalOpen(true);
  };

  const handleConfirmPay = () => {
    setPayModalOpen(false);
    onPlace();
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-white border-l border-slate-200 select-none font-sans text-slate-900">

      {/* ── 1. HEADER (Exact match: "Current Order" | "#ORD-492") ── */}
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">
          Current Order
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-400">
            #ORD-{tableNumber ? `T${tableNumber}` : 'POS'}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="size-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── 2. ORDER TYPE & TABLE SUMMARY BAR ── */}
      <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-600">
            {orderType === 'dine-in' ? '🍽️ Dine In' : '🛍️ Takeaway'}
          </span>
          {orderType === 'dine-in' && (
            <button
              type="button"
              onClick={onOpenTableMap}
              className={cn(
                'px-2 py-0.5 rounded-md font-bold text-[11px] border transition-colors',
                tableNumber !== ''
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-rose-50 text-rose-700 border-rose-300'
              )}
            >
              {tableNumber !== '' ? `Table #${tableNumber}` : 'Select Table *'}
            </button>
          )}
        </div>

        <div className="text-slate-400 text-[11px] font-medium">
          {totalUnits} {totalUnits === 1 ? 'item' : 'items'}
        </div>
      </div>

      {/* ── 3. ORDER ITEMS LIST (Clean RestoFlow Row Layout) ── */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100">
        {empty ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 h-full">
            <div className="size-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 mb-2.5">
              <ShoppingBag className="size-6" />
            </div>
            <p className="text-xs font-bold text-slate-600">No items selected</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Select dishes from the menu to build ticket
            </p>
          </div>
        ) : (
          lines.map((line) => (
            <div
              key={line.key}
              className="p-3.5 hover:bg-slate-50/80 transition-colors flex items-start gap-3 group"
            >
              {/* Quantity Box (e.g. 1x / 2x in green pill or slate box) */}
              <div
                onClick={() => onIncrement(line.key)}
                className="size-7.5 rounded-lg bg-emerald-500 text-white font-bold text-xs flex items-center justify-center font-mono shrink-0 cursor-pointer shadow-2xs hover:bg-emerald-600 transition-colors"
                title="Tap to increase quantity"
              >
                {line.quantity}x
              </div>

              {/* Title & Modifiers/Notes */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-1">
                  <h4 className="text-[13.5px] font-bold text-slate-900 leading-snug truncate">
                    {line.name}
                  </h4>
                  <span className="text-[13.5px] font-bold text-slate-900 font-mono shrink-0">
                    ₹{(line.unitPrice * line.quantity).toFixed(2)}
                  </span>
                </div>

                {/* Subtitle / Cooking modifier notes */}
                <div className="flex items-center gap-1.5 mt-0.5">
                  {line.notes ? (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <span>{line.notes}</span>
                      <button
                        type="button"
                        onClick={() => onSetLineNotes?.(line.key, '')}
                        className="text-slate-400 hover:text-rose-600 ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ) : editingNoteKey === line.key ? (
                    <div className="w-full space-y-1 mt-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      <div className="flex flex-wrap gap-1">
                        {QUICK_ITEM_NOTES.map((qn) => (
                          <button
                            key={qn}
                            type="button"
                            onClick={() => {
                              onSetLineNotes?.(line.key, qn);
                              setEditingNoteKey(null);
                            }}
                            className="px-1.5 py-0.5 rounded bg-white hover:bg-emerald-50 border border-slate-200 text-[10.5px] font-semibold text-slate-700"
                          >
                            {qn}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-1 pt-0.5">
                        <input
                          type="text"
                          placeholder="Note for kitchen…"
                          value={customNoteInput}
                          onChange={(e) => setCustomNoteInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && customNoteInput.trim()) {
                              onSetLineNotes?.(line.key, customNoteInput.trim());
                              setCustomNoteInput('');
                              setEditingNoteKey(null);
                            }
                          }}
                          className="flex-1 h-6 px-1.5 text-[11px] bg-white border border-slate-200 rounded font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customNoteInput.trim()) {
                              onSetLineNotes?.(line.key, customNoteInput.trim());
                            }
                            setCustomNoteInput('');
                            setEditingNoteKey(null);
                          }}
                          className="px-2 h-6 rounded bg-emerald-600 text-white text-[10.5px] font-bold"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingNoteKey(line.key)}
                      className="text-[11px] text-slate-400 hover:text-emerald-700 font-medium flex items-center gap-0.5"
                    >
                      <MessageSquarePlus className="size-2.5" />
                      <span>Add modifier / note</span>
                    </button>
                  )}
                </div>

                {/* Stepper Controls */}
                <div className="flex items-center gap-2 mt-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => (line.quantity <= 1 ? onRemove(line.key) : onDecrement(line.key))}
                    className="size-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                  >
                    <Minus className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onIncrement(line.key)}
                    className="size-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                  >
                    <Plus className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(line.key)}
                    className="size-6 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors ml-auto"
                    title="Remove item"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── 4. FIXED BOTTOM BILL SUMMARY (Exact match: Subtotal, Tax, Total, Void, Discount, Pay Now ➔) ── */}
      <div className="p-5 border-t border-slate-200 bg-white space-y-3.5 shrink-0">
        <div className="space-y-1.5 text-xs text-slate-600">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-900 font-mono">₹{totals.subtotal.toFixed(2)}</span>
          </div>

          {totals.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Discount</span>
              <span className="font-mono">−₹{totals.discountAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>Tax (5%)</span>
            <span className="font-semibold text-slate-900 font-mono">
              ₹{(totals.cgst + totals.sgst).toFixed(2)}
            </span>
          </div>

          {totals.packagingCharge && totals.packagingCharge > 0 && (
            <div className="flex justify-between text-amber-700">
              <span>Packaging</span>
              <span className="font-mono">+₹{totals.packagingCharge.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Total Highlight */}
        <div className="flex items-baseline justify-between pt-2 border-t border-slate-100">
          <span className="text-base font-bold text-slate-900">Total</span>
          <span className="text-2xl font-black text-slate-950 font-mono tabular-nums">
            ₹{totals.grandTotal.toFixed(2)}
          </span>
        </div>

        {/* Action Buttons: Void | Discount */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={empty || isPlacing}
            onClick={onClear}
            className="h-10 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Ban className="size-3.5 text-slate-500" />
            <span>Void</span>
          </button>

          <button
            type="button"
            disabled={empty || isPlacing}
            onClick={() => setDiscountModalOpen(true)}
            className="h-10 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-800 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Percent className="size-3.5 text-slate-500" />
            <span>Discount</span>
          </button>
        </div>

        {/* Primary Pay Now Button (Exact match: Dark Emerald Green full-width button with arrow) */}
        <button
          type="button"
          onClick={handlePayClick}
          disabled={blocked || isPlacing}
          className={cn(
            'w-full h-12 rounded-xl font-black text-sm sm:text-base text-white flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98]',
            blocked || isPlacing
              ? 'bg-slate-300 cursor-not-allowed shadow-none'
              : 'bg-[#047857] hover:bg-[#065F46] shadow-emerald-700/20'
          )}
        >
          {isPlacing ? (
            <span>Settling & Printing…</span>
          ) : (
            <>
              <span>Pay Now</span>
              <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </div>

      {/* ── DISCOUNT MODAL ── */}
      <Dialog open={discountModalOpen} onOpenChange={setDiscountModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Apply Ticket Discount
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2 py-3">
            {DISCOUNT_PRESETS.map((d) => {
              const active = isDiscountActive(d.value);
              return (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => {
                    onDiscount?.(d.value);
                    setDiscountModalOpen(false);
                  }}
                  className={cn(
                    'h-11 rounded-xl font-bold text-xs flex items-center justify-center border transition-all',
                    active
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  {d.label}
                </button>
              );
            })}
          </div>

          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDiscountModalOpen(false)}
              className="rounded-xl border-slate-200 text-slate-700"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── PAYMENT CHECKOUT MODAL ── */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center justify-between">
              <span>Complete Payment</span>
              <span className="text-xl font-mono text-emerald-700 font-black">
                ₹{totals.grandTotal.toFixed(2)}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Payment Mode Selector */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Select Payment Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_MODES.map((p) => {
                  const Icon = p.icon;
                  const isSelected = paymentMode === p.mode;
                  return (
                    <button
                      key={p.mode}
                      type="button"
                      onClick={() => onPaymentMode(p.mode)}
                      className={cn(
                        'h-12 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all border-2',
                        isSelected
                          ? `${p.color} border-transparent shadow-xs scale-[1.02]`
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <Icon className="size-4" />
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cash Tender Calculation */}
            {paymentMode === 'cash' && (
              <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  <span className="text-[11px] font-bold text-slate-500">Tender:</span>
                  {quickCashOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setCashReceived(String(opt))}
                      className={cn(
                        'px-3 py-1 rounded-lg text-xs font-bold font-mono border transition-all',
                        cashReceived === String(opt)
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
                      )}
                    >
                      ₹{opt}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">₹</span>
                    <input
                      type="number"
                      placeholder="Cash received"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      className="w-full h-9 pl-7 pr-3 text-sm font-bold font-mono bg-white border border-slate-200 rounded-xl text-slate-900"
                    />
                  </div>

                  {receivedAmount > 0 && (
                    <div className={cn(
                      'px-3 h-9 rounded-xl flex items-center font-mono text-xs font-bold shrink-0 border',
                      cashShort
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    )}>
                      {cashShort ? `Short ₹${(totals.grandTotal - receivedAmount).toFixed(0)}` : `Change ₹${changeDue.toFixed(0)}`}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="sm:justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPayModalOpen(false)}
              className="rounded-xl border-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmPay}
              className="rounded-xl bg-[#047857] hover:bg-[#065F46] text-white font-bold px-6"
            >
              Settle & Print (F2)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
