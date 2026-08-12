'use client';

import React, { useMemo, useState } from 'react';
import {
  Plus, Minus, Trash2, ShoppingBag, Banknote, QrCode, CreditCard,
  X, PauseCircle, Send, Printer, User, Phone, Edit3, Check, DollarSign
} from 'lucide-react';
import { MAX_LINE_QTY, type PosLine } from '@/hooks/usePosCart';
import type { BillTotals } from '@/lib/billing';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type PosOrderType = 'dine-in' | 'counter';

export const ORDER_TYPES: { type: PosOrderType; label: string; icon: string }[] = [
  { type: 'dine-in', label: 'Dine In', icon: '🍽️' },
  { type: 'counter', label: 'Takeaway', icon: '🛍️' },
];

export const PAYMENT_MODES = [
  { mode: 'cash', label: 'Cash', icon: Banknote, color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  { mode: 'upi', label: 'UPI', icon: QrCode, color: 'bg-purple-600 hover:bg-purple-700 text-white' },
  { mode: 'card', label: 'Card', icon: CreditCard, color: 'bg-blue-600 hover:bg-blue-700 text-white' },
] as const;

export type PosPaymentMode = (typeof PAYMENT_MODES)[number]['mode'];

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

  onIncrement: (key: string) => void;
  onDecrement: (key: string) => void;
  onSetQuantity: (key: string, qty: number) => void;
  onRemove: (key: string) => void;
  onClear: () => void;

  onPlace: () => void;
  onSendToKitchen?: () => void;
  onHoldOrder?: () => void;
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
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  onPlace,
  onSendToKitchen,
  onHoldOrder,
  onOpenTableMap,
  isPlacing,
  onClose,
  compact = false,
}: BillPanelProps) {
  const empty = lines.length === 0;
  const needsTable = orderType === 'dine-in' && tableNumber === '';
  const blocked = empty || needsTable;

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

  return (
    <div className="flex flex-col h-full min-h-0 bg-white border-l border-slate-200 select-none">

      {/* ── 1. CART HEADER ── */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="size-8.5 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <ShoppingBag className="size-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-950 leading-tight">
              Active Checkout
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              {totalUnits} {totalUnits === 1 ? 'item' : 'items'} in current ticket
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!empty && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
            >
              Clear
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="size-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── 2. ORDER TYPE & TABLE SELECTION ── */}
      <div className="p-4 border-b border-slate-100 bg-white shrink-0 space-y-3">
        {/* Order Type Segmented Switcher */}
        <div className="grid grid-cols-2 gap-2">
          {ORDER_TYPES.map((t) => {
            const isSelected = orderType === t.type;
            return (
              <button
                key={t.type}
                type="button"
                onClick={() => onOrderType(t.type)}
                className={cn(
                  'h-11 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all border-2',
                  isSelected
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                <span className="text-base">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dine-In Table Picker */}
        {orderType === 'dine-in' && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-500">
              <span>Table Allocation</span>
              {needsTable && <span className="text-rose-600 font-extrabold">* Required</span>}
            </div>

            <div className="flex gap-2">
              <Select
                value={tableNumber === '' ? '' : String(tableNumber)}
                onValueChange={(val) => onTableNumber(val === '' ? '' : Number(val))}
              >
                <SelectTrigger
                  className={cn(
                    'flex-1 h-10 bg-slate-50 rounded-xl text-xs font-bold transition-colors',
                    needsTable
                      ? 'border-2 border-rose-400 ring-2 ring-rose-400/20 bg-rose-50/50 text-rose-700'
                      : 'border-slate-200 text-slate-900'
                  )}
                >
                  <SelectValue placeholder="-- Select Dining Table --" />
                </SelectTrigger>
                <SelectContent>
                  {tables.length === 0 && <SelectItem value="" disabled>No tables configured</SelectItem>}
                  {tables.map((t) => (
                    <SelectItem key={t.id} value={String(t.tableNumber)}>
                      Table #{t.tableNumber} ({t.capacity} Seats)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {onOpenTableMap && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onOpenTableMap}
                  className="h-10 px-3 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs shrink-0"
                >
                  Floor Map
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Customer Fast Info (Optional phone & name) */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <input
            type="text"
            placeholder="Customer Name (opt)"
            value={customerName}
            onChange={(e) => onCustomerName(e.target.value)}
            className="h-8.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-medium placeholder:text-slate-400"
          />
          <input
            type="tel"
            placeholder="Phone (opt)"
            value={customerPhone}
            onChange={(e) => onCustomerPhone(e.target.value)}
            className="h-8.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-medium placeholder:text-slate-400 font-mono"
          />
        </div>
      </div>

      {/* ── 3. CART ITEMS LIST ── */}
      <div className="flex-1 min-h-0 flex flex-col bg-slate-50/40">
        {empty ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
            <div className="size-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-300 mb-3">
              <ShoppingBag className="size-8" />
            </div>
            <p className="text-sm font-bold text-slate-700">Till Cart is Empty</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
              Tap any food dish from the catalog to build ticket
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 scrollbar-none">
            {lines.map((line) => (
              <div
                key={line.key}
                className="p-2.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between gap-2.5"
              >
                {/* Item Name & Portion */}
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-900 truncate leading-snug">
                    {line.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-semibold font-mono mt-0.5">
                    ₹{line.unitPrice} {line.portion ? `· ${line.portion}` : ''}
                  </p>
                </div>

                {/* Stepper with Large 40px+ Touch Buttons */}
                <div className="flex items-center gap-0 bg-slate-100 rounded-xl border border-slate-200 overflow-hidden shrink-0">
                  <button
                    type="button"
                    onClick={() => (line.quantity <= 1 ? onRemove(line.key) : onDecrement(line.key))}
                    className="size-8 flex items-center justify-center text-slate-600 hover:bg-slate-200 active:scale-95 transition-colors"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-7 text-center text-xs font-black text-slate-900 font-mono tabular-nums">
                    {line.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onIncrement(line.key)}
                    className="size-8 flex items-center justify-center text-blue-600 hover:bg-blue-50 active:scale-95 transition-colors"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>

                {/* Line Total */}
                <span className="text-xs font-black text-slate-950 font-mono w-14 text-right tabular-nums shrink-0">
                  ₹{line.unitPrice * line.quantity}
                </span>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => onRemove(line.key)}
                  className="size-7 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors shrink-0"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 4. ORDER SUMMARY (SUBTOTAL, TAX, GRAND TOTAL) ── */}
      {!empty && (
        <div className="p-4 border-t border-slate-200 bg-white space-y-2 shrink-0">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span className="font-bold text-slate-900 font-mono">₹{totals.subtotal.toFixed(2)}</span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Discount Applied</span>
                <span className="font-mono">−₹{totals.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500">
              <span>GST Tax (5%)</span>
              <span className="font-bold text-slate-900 font-mono">₹{(totals.cgst + totals.sgst).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">Total Due</span>
              <span className="text-xs font-bold text-slate-500">Includes all taxes</span>
            </div>
            <span className="text-3xl font-black text-blue-600 font-mono tabular-nums">
              ₹{totals.grandTotal.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* ── 5. SMART PAYMENT SECTION & QUICK CASH UX ── */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/80 space-y-3 shrink-0">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
            Payment Mode
          </div>

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
                    'h-11 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 transition-all border-2',
                    isSelected
                      ? `${p.color} border-transparent shadow-md scale-[1.02]`
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  )}
                >
                  <Icon className="size-4" />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Smart Cash UX: Quick Amount Presets */}
          {paymentMode === 'cash' && !empty && (
            <div className="mt-2.5 space-y-2">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <span className="text-[10px] font-black uppercase text-slate-400 shrink-0">Tender:</span>
                {quickCashOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setCashReceived(String(opt))}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all border shrink-0',
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
                    min={0}
                    placeholder="Cash tendered"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="w-full h-9 pl-7 pr-3 text-sm font-bold font-mono bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                  />
                </div>

                {receivedAmount > 0 && (
                  <div className={cn(
                    'px-3 h-9 rounded-xl flex items-center font-mono text-xs font-black shrink-0 border',
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

        {/* ── 6. SUB-10s ACTION BUTTONS ── */}
        <div className="space-y-2 pt-1">
          {/* Complete Payment (Primary CTA) */}
          <button
            type="button"
            onClick={() => { if (!blocked) onPlace(); }}
            disabled={blocked || isPlacing}
            className={cn(
              'w-full h-14 rounded-2xl font-black text-sm sm:text-base text-white flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]',
              blocked || isPlacing
                ? 'bg-slate-300 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25'
            )}
          >
            {isPlacing ? (
              <>
                <span className="animate-spin text-base">⏳</span>
                <span>Charging & Printing…</span>
              </>
            ) : (
              <>
                <span>⚡ Complete Payment</span>
                {!empty && (
                  <span className="font-mono text-sm opacity-90 font-bold">· ₹{totals.grandTotal.toFixed(2)}</span>
                )}
              </>
            )}
          </button>

          {/* Secondary Action Row: Send to Kitchen / Hold Order */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={empty || isPlacing}
              onClick={onSendToKitchen || onPlace}
              className="h-10 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs gap-1.5"
            >
              <Send className="size-3.5 text-blue-600" />
              Send to KOT
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={empty || isPlacing}
              onClick={onHoldOrder}
              className="h-10 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs gap-1.5"
            >
              <PauseCircle className="size-3.5 text-amber-600" />
              Hold Order
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
