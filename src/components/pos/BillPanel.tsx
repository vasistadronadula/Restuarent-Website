'use client';

import React, { useMemo, useState } from 'react';
import {
  Plus, Minus, Trash2, ShoppingBag, X, UtensilsCrossed, LayoutGrid, Banknote, QrCode, CreditCard,
} from 'lucide-react';
import { MAX_LINE_QTY, type PosLine } from '@/hooks/usePosCart';
import type { BillTotals } from '@/lib/billing';
import { rupees, rupeesExact } from '@/lib/billing';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  onIncrement, onDecrement, onSetQuantity, onRemove, onClear,
  onPlace, isPlacing, onClose, compact = false,
}: BillPanelProps) {
  const empty = lines.length === 0;
  const needsTable = orderType === 'dine-in' && tableNumber === '';
  const blocked = empty || needsTable;

  // ── Cash tendered / change due ──────────────────────────────────────────
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
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-stone-900 border-l border-stone-200/80 dark:border-stone-800 p-4 space-y-4">
      {/* ── 1. ORDER TYPE Header ── */}
      <div className="space-y-2 flex-shrink-0">
        <div className="text-[11px] font-bold tracking-wider text-stone-400 uppercase">
          ORDER TYPE
        </div>

        <div className="grid grid-cols-2 gap-2">
          {ORDER_TYPES.map((t) => (
            <Button
              key={t.type}
              type="button"
              variant={orderType === t.type ? 'default' : 'outline'}
              size="sm"
              onClick={() => onOrderType(t.type)}
              className={`font-bold text-xs h-11 rounded-xl gap-2 transition-all ${
                orderType === t.type
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                  : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </Button>
          ))}
        </div>

        {/* Table Selector */}
        {orderType === 'dine-in' && (
          <div className="pt-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 mb-1">
              <span>Table Selection</span>
              {needsTable && <span className="text-rose-500 font-extrabold">* Required</span>}
            </div>
            <div className="flex gap-2">
              <Select
                value={tableNumber === '' ? '' : String(tableNumber)}
                onValueChange={(val) => onTableNumber(val === '' ? '' : Number(val))}
              >
                <SelectTrigger className={`flex-1 bg-white dark:bg-stone-800 rounded-xl text-xs font-bold h-10 transition-colors ${needsTable ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300' : 'border-stone-200 dark:border-stone-700'}`}>
                  <SelectValue placeholder="-- Select Table --" />
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
              <Button variant="outline" size="icon" className="size-10 rounded-xl border-stone-200 dark:border-stone-700 shrink-0">
                <LayoutGrid className="size-4 text-stone-500" />
              </Button>
            </div>
            {needsTable && (
              <p className="text-[11px] font-extrabold text-rose-500 mt-1 flex items-center gap-1">
                ⚠️ Please select a table for Dine In order
              </p>
            )}
          </div>
        )}
      </div>

      <hr className="border-stone-100 dark:border-stone-800" />

      {/* ── 2. CART ITEMS SECTION ── */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between pb-2">
          <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
            CART ({totalUnits} {totalUnits === 1 ? 'Item' : 'Items'})
          </h3>
          {!empty && (
            <button
              type="button"
              onClick={onClear}
              className="text-rose-500 hover:text-rose-600 text-xs font-bold flex items-center gap-1 hover:underline"
            >
              <span>Clear Cart</span>
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>

        {empty ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-stone-400">
            <ShoppingBag className="size-12 opacity-20 mb-2" />
            <p className="text-xs font-bold text-stone-500">Cart is empty</p>
            <p className="text-[11px] text-stone-400 mt-0.5">Select items from menu to start bill</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 scrollbar-none">
            {lines.map((line) => (
              <div
                key={line.key}
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800"
              >
                {/* Veg/Non-Veg dot */}
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <span className="shrink-0 mt-1">
                    <span className="inline-block size-2.5 rounded-full bg-emerald-600" />
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                      {line.name}
                    </h4>
                    <p className="text-[11px] text-stone-400 font-semibold">
                      ₹{line.unitPrice} {line.portion ? `· ${line.portion}` : ''}
                    </p>
                  </div>
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center gap-1 bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 px-1.5 py-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => (line.quantity <= 1 ? onRemove(line.key) : onDecrement(line.key))}
                    className="p-1 text-stone-500 hover:text-rose-600"
                  >
                    <Minus className="size-3" />
                  </button>
                  <span className="text-xs font-black px-1.5 text-stone-900 dark:text-stone-100 min-w-[16px] text-center">
                    {line.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onIncrement(line.key)}
                    className="p-1 text-stone-500 hover:text-blue-600"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>

                {/* Price */}
                <div className="text-xs font-black text-stone-900 dark:text-stone-100 shrink-0 w-14 text-right">
                  ₹{line.unitPrice * line.quantity}
                </div>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => onRemove(line.key)}
                  className="text-stone-400 hover:text-rose-600 p-1 shrink-0"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <hr className="border-stone-100 dark:border-stone-800" />

      {/* ── 3. BILL BREAKDOWN & GRAND TOTAL ── */}
      <div className="space-y-2 flex-shrink-0">
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-stone-500">
            <span>Subtotal</span>
            <span className="font-bold text-stone-800 dark:text-stone-200">₹{totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-stone-500">
            <span>Discount</span>
            <span className="font-bold text-emerald-600">-₹{totals.discountAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-stone-500">
            <span>Tax (5%)</span>
            <span className="font-bold text-stone-800 dark:text-stone-200">₹{(totals.cgst + totals.sgst).toFixed(2)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-stone-800">
          <span className="text-sm font-extrabold text-stone-900 dark:text-stone-100">Grand Total</span>
          <span className="text-xl font-black text-blue-600 dark:text-blue-400">
            ₹{totals.grandTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* ── 4. PAYMENT TYPE SELECTION & PLACE ORDER ── */}
      <div className="space-y-3 flex-shrink-0 pt-1">
        <div>
          <div className="text-[11px] font-extrabold tracking-wider text-stone-400 uppercase mb-1.5">
            PAYMENT TYPE
          </div>

          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_MODES.map((p) => {
              const Icon = p.icon;
              const isSelected = paymentMode === p.mode;
              return (
                <Button
                  key={p.mode}
                  type="button"
                  onClick={() => onPaymentMode(p.mode)}
                  className={`h-11 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    isSelected
                      ? `${p.color} ring-2 ring-offset-1 ring-stone-400 dark:ring-stone-600 shadow-md scale-[1.02]`
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  <Icon className="size-4" />
                  <span>{p.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Place Order CTA Button */}
        <Button
          type="button"
          onClick={() => {
            if (!blocked) {
              onPlace();
            }
          }}
          disabled={blocked || isPlacing}
          className={`w-full h-12 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all ${
            blocked ? 'opacity-50 cursor-not-allowed shadow-none' : ''
          }`}
        >
          {isPlacing ? (
            <>
              <span className="animate-spin text-sm">⏳</span>
              <span>Placing Order...</span>
            </>
          ) : (
            <>
              <span>⚡ Place Order</span>
              <span className="opacity-70">·</span>
              <span>₹{totals.grandTotal.toFixed(2)}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
