'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Plus, Minus, Trash2, ShoppingBag, X, ChevronDown, ChevronUp, ShoppingCart, Banknote,
} from 'lucide-react';
import { MAX_LINE_QTY, type PosLine } from '@/hooks/usePosCart';
import type { BillTotals } from '@/lib/billing';
import { rupees, rupeesExact } from '@/lib/billing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80';

export type PosOrderType = 'dine-in' | 'counter';

export const ORDER_TYPES: { type: PosOrderType; label: string; icon: string }[] = [
  { type: 'counter', label: 'Counter', icon: '⚡' },
  { type: 'dine-in', label: 'Dine-in', icon: '🍽️' },
];

export const PAYMENT_MODES = [
  { mode: 'cash', label: 'Cash', icon: '💵' },
  { mode: 'upi', label: 'UPI', icon: '📱' },
  { mode: 'card', label: 'Card', icon: '💳' },
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

  customerName: string;
  onCustomerName: (v: string) => void;
  customerPhone: string;
  onCustomerPhone: (v: string) => void;

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
  customerName, onCustomerName, customerPhone, onCustomerPhone,
  paymentMode, onPaymentMode,
  onIncrement, onDecrement, onSetQuantity, onRemove, onClear,
  onPlace, isPlacing, onClose, compact = false,
}: BillPanelProps) {
  const empty = lines.length === 0;
  const needsTable = orderType === 'dine-in' && tableNumber === '';
  const blocked = empty || needsTable;

  const [detailsChoice, setDetailsChoice] = useState<boolean | null>(null);
  const detailsOpen = needsTable || (detailsChoice ?? !compact);

  // ── Cash tendered / change due ──────────────────────────────────────────
  // The one calculation every cashier otherwise does in their head. Cleared
  // whenever the mode leaves cash or the bill empties out (order placed or
  // cart cleared), so a stale amount never carries over onto the next order.
  // Reset happens during render (same "did a tracked value change" pattern
  // QuantityStepper below uses for its own draft) rather than in an effect,
  // which would otherwise cost this component an extra cascading render on
  // every single mode/cart change.
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

  // A handful of denominations a cashier is actually handed, plus the exact
  // total — never more than four so the row stays one thumb's reach wide.
  const quickCashAmounts = useMemo(() => {
    const total = Math.ceil(totals.grandTotal);
    if (total <= 0) return [];
    const roundedUp = [50, 100, 500, 2000]
      .map((step) => Math.ceil(total / step) * step)
      .filter((amount) => amount > total);
    return Array.from(new Set([total, ...roundedUp])).slice(0, 4);
  }, [totals.grandTotal]);

  const detailsSummary = [
    orderType === 'dine-in'
      ? (tableNumber === '' ? 'Dine-in · no table' : `Dine-in · Table ${tableNumber}`)
      : 'Counter',
    customerName.trim() || 'Walk-in',
    customerPhone.trim(),
  ].filter(Boolean).join('  ·  ');

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-stone-900 border-l border-stone-200/80 dark:border-stone-800">
      <div className="flex-shrink-0 px-4 py-3 bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200/80 dark:border-stone-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ShoppingBag className="w-5 h-5 text-amber-600" />
          <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
            Current Order
          </h3>
          {totalUnits > 0 && (
            <Badge className="bg-amber-600 text-white font-black text-xs px-2 py-0.5 rounded-full">
              {totalUnits}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!empty && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold h-8"
            >
              Clear
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-stone-400"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <button
          type="button"
          onClick={() => setDetailsChoice(!detailsOpen)}
          className={`w-full flex items-center justify-between px-4 py-2.5 border-b border-stone-200/80 dark:border-stone-800 text-left transition-colors ${
            needsTable ? 'bg-rose-50 dark:bg-rose-950/20' : 'bg-stone-50/50 dark:bg-stone-800/30 hover:bg-stone-100 dark:hover:bg-stone-800/60'
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-extrabold tracking-wider text-stone-400">
              ORDER DETAILS
            </div>
            <div className={`text-xs font-bold truncate ${needsTable ? 'text-rose-600 dark:text-rose-400' : 'text-stone-800 dark:text-stone-200'}`}>
              {detailsSummary}
            </div>
          </div>
          {detailsOpen ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
        </button>

        {detailsOpen && (
          <div className="p-3 border-b border-stone-200/80 dark:border-stone-800 space-y-3 bg-stone-50/30 dark:bg-stone-900/40">
            <div className="flex gap-2">
              {ORDER_TYPES.map((t) => (
                <Button
                  key={t.type}
                  type="button"
                  variant={orderType === t.type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onOrderType(t.type)}
                  className={`flex-1 font-bold text-xs h-9 rounded-lg ${
                    orderType === t.type
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : 'border-stone-300 dark:border-stone-700'
                  }`}
                >
                  {t.icon} {t.label}
                </Button>
              ))}
            </div>

            {orderType === 'dine-in' && (
              <div>
                <Select
                  value={tableNumber === '' ? '' : String(tableNumber)}
                  onValueChange={(val) => onTableNumber(val === '' ? '' : Number(val))}
                >
                  <SelectTrigger className="w-full bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-700 rounded-lg text-xs font-bold">
                    <SelectValue placeholder="Select Table *" />
                  </SelectTrigger>
                  <SelectContent>
                    {tables.length === 0 && <SelectItem value="" disabled>No tables set up</SelectItem>}
                    {tables.map((t) => (
                      <SelectItem key={t.id} value={String(t.tableNumber)}>
                        Table {t.tableNumber} · {t.capacity} seats {t.description ? `(${t.description})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Customer Name"
                value={customerName}
                onChange={(e) => onCustomerName(e.target.value)}
                className="bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-700 rounded-lg text-xs"
              />
              <Input
                placeholder="Phone (10 digits)"
                value={customerPhone}
                onChange={(e) => onCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-700 rounded-lg text-xs"
              />
            </div>
          </div>
        )}

        {empty ? (
          <div className="text-center py-12 px-4 text-stone-400">
            <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30 text-stone-400" />
            <h4 className="font-bold text-sm text-stone-600 dark:text-stone-400">
              No items yet
            </h4>
            <p className="text-xs text-stone-400 mt-0.5">
              Tap a dish to start the bill
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {lines.map((line) => (
              <div key={line.key} className="flex items-center gap-2.5 px-3 py-2">
                <div className="relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-stone-100 dark:bg-stone-800">
                  <Image src={line.image || FALLBACK_IMAGE} alt="" fill sizes="36px" className="object-cover" />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                    {line.name}
                  </h4>
                  <div className="text-[11px] text-stone-500">
                    {rupeesExact(line.unitPrice)} each
                  </div>
                </div>

                <QuantityStepper
                  line={line}
                  onIncrement={onIncrement}
                  onDecrement={onDecrement}
                  onSetQuantity={onSetQuantity}
                  onRemove={onRemove}
                />

                <div className="w-14 text-right text-xs font-extrabold text-stone-900 dark:text-stone-100 flex-shrink-0">
                  {rupees(line.unitPrice * line.quantity)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 px-4 py-3 bg-stone-50/80 dark:bg-stone-800/80 border-t border-stone-200/80 dark:border-stone-800 space-y-3">
        {!empty && (
          <>
            <div className="space-y-1 text-xs">
              <Row label="Subtotal" value={rupeesExact(totals.subtotal)} />
              {totals.discountAmount > 0 && (
                <Row label="Discount" value={`-${rupeesExact(totals.discountAmount)}`} />
              )}
              <Row label="CGST 2.5%" value={rupeesExact(totals.cgst)} />
              <Row label="SGST 2.5%" value={rupeesExact(totals.sgst)} />
              {Math.abs(totals.roundOff) >= 0.01 && (
                <Row
                  label="Round off"
                  value={`${totals.roundOff > 0 ? '+' : '-'}${rupeesExact(Math.abs(totals.roundOff))}`}
                />
              )}
            </div>

            <div className="flex gap-1.5">
              {PAYMENT_MODES.map((p) => (
                <Button
                  key={p.mode}
                  type="button"
                  variant={paymentMode === p.mode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onPaymentMode(p.mode)}
                  className={`flex-1 font-bold text-xs h-9 rounded-lg ${
                    paymentMode === p.mode
                      ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                      : 'border-stone-300 dark:border-stone-700'
                  }`}
                >
                  {p.icon} {p.label}
                </Button>
              ))}
            </div>

            {paymentMode === 'cash' && (
              <div className="space-y-2 rounded-xl bg-stone-100/70 dark:bg-stone-800/50 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-extrabold text-stone-500 flex items-center gap-1">
                    <Banknote className="w-3.5 h-3.5" /> Cash received
                  </span>
                  {changeDue > 0 && (
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                      Change due {rupees(changeDue)}
                    </span>
                  )}
                </div>

                {quickCashAmounts.length > 0 && (
                  <div className="flex gap-1.5">
                    {quickCashAmounts.map((amount) => (
                      <Button
                        key={amount}
                        type="button"
                        size="sm"
                        variant={receivedAmount === amount ? 'default' : 'outline'}
                        onClick={() => setCashReceived(String(amount))}
                        className={`flex-1 h-8 text-xs font-bold rounded-lg ${
                          receivedAmount === amount ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''
                        }`}
                      >
                        {rupees(amount)}
                      </Button>
                    ))}
                  </div>
                )}

                <Input
                  inputMode="numeric"
                  placeholder="Or type amount received"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value.replace(/\D/g, ''))}
                  className="h-9 text-sm font-bold rounded-lg bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700"
                />

                {cashShort && (
                  <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                    Short by {rupees(totals.grandTotal - receivedAmount)}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        <Button
          className={`w-full h-12 rounded-xl text-base font-black flex justify-between px-4 text-white shadow-lg transition-all ${
            blocked
              ? 'bg-stone-300 dark:bg-stone-800 text-stone-500 shadow-none cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
          }`}
          onClick={onPlace}
          disabled={blocked || isPlacing}
        >
          <span>
            {isPlacing ? 'Saving…' : empty ? 'Add items to bill' : needsTable ? 'Pick a table first' : 'Charge'}
          </span>
          <span>{rupees(totals.grandTotal)}</span>
        </Button>
      </div>
    </div>
  );
}

const MAX_QTY_DIGITS = String(MAX_LINE_QTY).length;

function QuantityStepper({
  line, onIncrement, onDecrement, onSetQuantity, onRemove,
}: {
  line: PosLine;
  onIncrement: (key: string) => void;
  onDecrement: (key: string) => void;
  onSetQuantity: (key: string, qty: number) => void;
  onRemove: (key: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [lastQuantity, setLastQuantity] = useState(line.quantity);

  if (line.quantity !== lastQuantity) {
    setLastQuantity(line.quantity);
    setDraft(null);
  }

  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_QTY_DIGITS);
    setDraft(digits);
    if (digits !== '') onSetQuantity(line.key, Number(digits));
  };

  const atMinimum = line.quantity <= 1;

  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      <Button
        variant="outline"
        size="icon"
        onClick={() => (atMinimum ? onRemove(line.key) : onDecrement(line.key))}
        className={`w-9 h-9 rounded-lg p-0 ${atMinimum ? 'text-rose-600 border-rose-200 hover:bg-rose-50' : 'text-stone-600 border-stone-300'}`}
      >
        {atMinimum ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
      </Button>

      <Input
        value={draft ?? String(line.quantity)}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={() => setDraft(null)}
        inputMode="numeric"
        className="w-9 h-9 text-center font-black text-xs p-0 border-stone-300 dark:border-stone-700 rounded-lg"
      />

      <Button
        variant="outline"
        size="icon"
        onClick={() => onIncrement(line.key)}
        disabled={line.quantity >= MAX_LINE_QTY}
        className="w-9 h-9 rounded-lg p-0 text-amber-700 border-amber-300 hover:bg-amber-50"
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs text-stone-600 dark:text-stone-400">
      <span>{label}</span>
      <span className="font-bold text-stone-800 dark:text-stone-200">{value}</span>
    </div>
  );
}
