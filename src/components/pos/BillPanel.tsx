'use client';

import React, { useMemo, useState } from 'react';
import {
  Plus, Minus, Trash2, ShoppingBag, Banknote, QrCode, CreditCard,
  ChevronDown, X,
} from 'lucide-react';
import { MAX_LINE_QTY, type PosLine } from '@/hooks/usePosCart';
import type { BillTotals } from '@/lib/billing';
import { rupees } from '@/lib/billing';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type PosOrderType = 'dine-in' | 'counter';

export const ORDER_TYPES: { type: PosOrderType; label: string; icon: string }[] = [
  { type: 'dine-in', label: 'Dine In', icon: '🍽️' },
  { type: 'counter', label: 'Takeaway', icon: '🛍️' },
];

export const PAYMENT_MODES = [
  { mode: 'cash', label: 'Cash', icon: Banknote, bg: 'bg-emerald-600 hover:bg-emerald-700', ring: 'ring-emerald-400' },
  { mode: 'upi', label: 'UPI', icon: QrCode, bg: 'bg-purple-600 hover:bg-purple-700', ring: 'ring-purple-400' },
  { mode: 'card', label: 'Card', icon: CreditCard, bg: 'bg-blue-600 hover:bg-blue-700', ring: 'ring-blue-400' },
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

  onIncrement: (key: string) => void;
  onDecrement: (key: string) => void;
  onSetQuantity: (key: string, qty: number) => void;
  onRemove: (key: string) => void;
  onClear: () => void;

  onPlace: () => void;
  isPlacing: boolean;
  onClose?: () => void;
  compact?: boolean;
}

export default function BillPanel({
  lines, totals, totalUnits,
  orderType, onOrderType, tables, tableNumber, onTableNumber,
  paymentMode, onPaymentMode,
  onIncrement, onDecrement, onRemove, onClear,
  onPlace, isPlacing, onClose, compact = false,
}: BillPanelProps) {
  const empty = lines.length === 0;
  const needsTable = orderType === 'dine-in' && tableNumber === '';
  const blocked = empty || needsTable;

  // Cash change calculator
  const [cashReceived, setCashReceived] = useState('');
  const [cashResetKey, setCashResetKey] = useState('');
  const nextCashResetKey = `${paymentMode}:${empty}`;
  if (nextCashResetKey !== cashResetKey) {
    setCashResetKey(nextCashResetKey);
    if (paymentMode !== 'cash' || empty) setCashReceived('');
  }

  const receivedAmount = Number(cashReceived) || 0;
  const changeDue = Math.max(0, receivedAmount - totals.grandTotal);
  const cashShort = paymentMode === 'cash' && receivedAmount > 0 && receivedAmount < totals.grandTotal;

  return (
    <div className="flex flex-col h-full min-h-0 bg-white border-l border-stone-100">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-stone-100 bg-stone-50 shrink-0">
        <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
          <ShoppingBag className="size-4 text-orange-500" />
          Bill
          {totalUnits > 0 && (
            <span className="text-xs font-bold text-orange-600 bg-orange-100 border border-orange-200 px-2 py-0.5 rounded-full tabular-nums">
              {totalUnits}
            </span>
          )}
        </h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* ── Order Type ── */}
      <div className="px-4 pt-4 pb-3 shrink-0">
        <div className="text-[10px] font-black tracking-wider text-stone-400 uppercase mb-2">Order Type</div>
        <div className="grid grid-cols-2 gap-2">
          {ORDER_TYPES.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => onOrderType(t.type)}
              className={cn(
                'h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border-2',
                orderType === t.type
                  ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-200'
                  : 'bg-white border-stone-200 text-stone-600 hover:border-orange-300 hover:bg-orange-50'
              )}
            >
              <span className="text-base">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Table Selector */}
        {orderType === 'dine-in' && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] font-black text-stone-500 uppercase mb-2">
              <span>Table</span>
              {needsTable && <span className="text-rose-500">* Required</span>}
            </div>
            <Select
              value={tableNumber === '' ? '' : String(tableNumber)}
              onValueChange={(val) => onTableNumber(val === '' ? '' : Number(val))}
            >
              <SelectTrigger
                className={cn(
                  'h-10 bg-white rounded-xl text-sm font-bold transition-colors',
                  needsTable
                    ? 'border-2 border-rose-400 ring-2 ring-rose-400/20 text-rose-600'
                    : 'border-stone-200'
                )}
              >
                <SelectValue placeholder="Select table…" />
              </SelectTrigger>
              <SelectContent>
                {tables.length === 0 && <SelectItem value="" disabled>No tables set up</SelectItem>}
                {tables.map((t) => (
                  <SelectItem key={t.id} value={String(t.tableNumber)}>
                    Table {t.tableNumber} · {t.capacity} seats
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {needsTable && (
              <p className="text-[11px] font-bold text-rose-500 mt-1.5">⚠️ Select a table to continue</p>
            )}
          </div>
        )}
      </div>

      <div className="h-px bg-stone-100 mx-4 shrink-0" />

      {/* ── Cart Items ── */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2.5 shrink-0">
          <span className="text-[10px] font-black tracking-wider text-stone-400 uppercase">
            Cart {!empty && `(${totalUnits})`}
          </span>
          {!empty && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1 hover:underline"
            >
              <Trash2 className="size-3.5" />
              Clear
            </button>
          )}
        </div>

        {empty ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-8 text-stone-400">
            <ShoppingBag className="size-10 opacity-20 mb-3" />
            <p className="text-sm font-bold text-stone-500">Cart is empty</p>
            <p className="text-xs text-stone-400 mt-1">Tap on a dish to add it</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-2 space-y-2 scrollbar-none">
            {lines.map((line) => (
              <div
                key={line.key}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-stone-50 border border-stone-100"
              >
                {/* Name + price */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-stone-900 truncate leading-tight">{line.name}</p>
                  <p className="text-[11px] text-stone-400 font-semibold mt-0.5">
                    ₹{line.unitPrice}{line.portion ? ` · ${line.portion}` : ''}
                  </p>
                </div>

                {/* Qty stepper */}
                <div className="flex items-center gap-0 bg-white border border-stone-200 rounded-lg overflow-hidden shrink-0">
                  <button
                    type="button"
                    onClick={() => (line.quantity <= 1 ? onRemove(line.key) : onDecrement(line.key))}
                    className="w-7 h-7 flex items-center justify-center text-stone-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Minus className="size-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-black text-stone-900 tabular-nums">
                    {line.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onIncrement(line.key)}
                    className="w-7 h-7 flex items-center justify-center text-stone-500 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>

                {/* Line total */}
                <span className="text-sm font-black text-stone-900 shrink-0 w-14 text-right tabular-nums">
                  ₹{line.unitPrice * line.quantity}
                </span>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => onRemove(line.key)}
                  className="text-stone-300 hover:text-rose-500 transition-colors shrink-0"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Bill Summary ── */}
      {!empty && (
        <>
          <div className="h-px bg-stone-100 mx-4 shrink-0" />
          <div className="px-4 py-3 space-y-1.5 shrink-0">
            <div className="flex justify-between text-xs text-stone-500">
              <span>Subtotal</span>
              <span className="font-bold text-stone-700">₹{totals.subtotal.toFixed(2)}</span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-xs text-stone-500">
                <span>Discount</span>
                <span className="font-bold text-emerald-600">−₹{totals.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-stone-500">
              <span>Tax (GST 5%)</span>
              <span className="font-bold text-stone-700">₹{(totals.cgst + totals.sgst).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-stone-200 mt-1">
              <span className="text-base font-black text-stone-900">Grand Total</span>
              <span className="text-2xl font-black text-orange-600 tabular-nums">
                ₹{totals.grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </>
      )}

      {/* ── Payment + Place Order ── */}
      <div className="px-4 pb-4 pt-3 space-y-3 shrink-0 bg-white border-t border-stone-100">
        {/* Payment mode */}
        <div>
          <div className="text-[10px] font-black tracking-wider text-stone-400 uppercase mb-2">Payment</div>
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
                    'h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all border-2',
                    isSelected
                      ? `${p.bg} text-white border-transparent shadow-md`
                      : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50'
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Cash change calculator */}
          {paymentMode === 'cash' && !empty && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-500">₹</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder={totals.grandTotal.toFixed(0)}
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="w-full h-9 pl-7 pr-3 text-sm font-bold text-stone-900 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
                />
              </div>
              {receivedAmount > 0 && (
                <div className={cn(
                  'shrink-0 px-3 h-9 rounded-xl flex items-center text-sm font-black tabular-nums',
                  cashShort
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                )}>
                  {cashShort ? `−₹${(totals.grandTotal - receivedAmount).toFixed(0)}` : `+₹${changeDue.toFixed(0)}`}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Place Order CTA */}
        <button
          type="button"
          onClick={() => { if (!blocked) onPlace(); }}
          disabled={blocked || isPlacing}
          className={cn(
            'w-full h-14 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 transition-all',
            blocked || isPlacing
              ? 'bg-stone-300 cursor-not-allowed'
              : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-[0.98] shadow-lg shadow-orange-300/40'
          )}
        >
          {isPlacing ? (
            <>
              <span className="animate-spin text-lg">⏳</span>
              Placing…
            </>
          ) : (
            <>
              <span>⚡</span>
              <span>Place Order</span>
              {!empty && (
                <span className="opacity-80 text-sm font-bold">· ₹{totals.grandTotal.toFixed(2)}</span>
              )}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
