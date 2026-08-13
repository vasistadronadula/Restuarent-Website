'use client';

import React, { useMemo, useState } from 'react';
import {
  Plus, Minus, Trash2, ShoppingBag, Banknote, QrCode, CreditCard,
  X, Send, Printer, User, Phone, Edit3, Check, Percent, Package,
  Sparkles, MessageSquarePlus, ChevronDown
} from 'lucide-react';
import { MAX_LINE_QTY, type PosLine } from '@/hooks/usePosCart';
import type { BillTotals, DiscountOption } from '@/lib/billing';
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
    <div className="flex flex-col h-full min-h-0 bg-white border-l border-slate-200 select-none">

      {/* ── 1. CART HEADER ── */}
      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/90 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <ShoppingBag className="size-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-950 leading-tight flex items-center gap-1.5">
              <span>Active Checkout</span>
              {totalUnits > 0 && (
                <span className="px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800 text-[10px] font-black font-mono">
                  {totalUnits}
                </span>
              )}
            </h3>
            <p className="text-[10.5px] text-slate-500 font-medium">
              {totalUnits === 0 ? 'No items in cart' : `${lines.length} unique line items`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!empty && (
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors flex items-center gap-1"
              title="Clear all items from ticket"
            >
              <Trash2 className="size-3" />
              <span>Clear</span>
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="size-7.5 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── 2. ORDER TYPE & TABLE SELECTION ── */}
      <div className="p-3.5 border-b border-slate-100 bg-white shrink-0 space-y-2.5">
        {/* Order Type Segmented Switcher */}
        <div className="grid grid-cols-2 gap-1.5">
          {ORDER_TYPES.map((t) => {
            const isSelected = orderType === t.type;
            return (
              <button
                key={t.type}
                type="button"
                onClick={() => onOrderType(t.type)}
                className={cn(
                  'h-10 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all border-2',
                  isSelected
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xs shadow-blue-500/20 scale-[1.01]'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                <span className="text-sm">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dine-In Table Picker */}
        {orderType === 'dine-in' && (
          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between text-[10.5px] font-black uppercase tracking-wider text-slate-500">
              <span>Table Allocation</span>
              {needsTable && <span className="text-rose-600 font-extrabold">* Required</span>}
            </div>

            <div className="flex gap-1.5">
              <Select
                value={tableNumber === '' ? '' : String(tableNumber)}
                onValueChange={(val) => onTableNumber(val === '' ? '' : Number(val))}
              >
                <SelectTrigger
                  className={cn(
                    'flex-1 h-9 bg-slate-50 rounded-xl text-xs font-bold transition-colors',
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
                  className="h-9 px-2.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs shrink-0"
                >
                  Floor Map
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Customer Info (Optional Phone & Name) */}
        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          <div className="relative">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-slate-400" />
            <input
              type="text"
              placeholder="Customer Name"
              value={customerName}
              onChange={(e) => onCustomerName(e.target.value)}
              className="w-full h-8 pl-7 pr-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-medium placeholder:text-slate-400"
            />
          </div>
          <div className="relative">
            <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-slate-400" />
            <input
              type="tel"
              placeholder="Phone (WhatsApp)"
              value={customerPhone}
              onChange={(e) => onCustomerPhone(e.target.value)}
              className="w-full h-8 pl-7 pr-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-medium placeholder:text-slate-400 font-mono"
            />
          </div>
        </div>
      </div>

      {/* ── 3. CART ITEMS LIST ── */}
      <div className="flex-1 min-h-0 flex flex-col bg-slate-50/40">
        {empty ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="size-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 mb-2.5">
              <ShoppingBag className="size-7" />
            </div>
            <p className="text-xs font-bold text-slate-700">Till Cart is Empty</p>
            <p className="text-[11px] text-slate-400 mt-0.5 max-w-[180px]">
              Tap any dish from catalog to add to ticket
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2 scrollbar-none">
            {lines.map((line) => (
              <div
                key={line.key}
                className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1.5 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  {/* Item Name & Portion */}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 truncate leading-snug">
                      {line.name}
                    </h4>
                    <p className="text-[10.5px] text-slate-400 font-semibold font-mono mt-0.5">
                      ₹{line.unitPrice} {line.portion ? `· ${line.portion}` : ''}
                    </p>
                  </div>

                  {/* Stepper Buttons */}
                  <div className="flex items-center gap-0 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden shrink-0">
                    <button
                      type="button"
                      onClick={() => (line.quantity <= 1 ? onRemove(line.key) : onDecrement(line.key))}
                      className="size-7 flex items-center justify-center text-slate-600 hover:bg-slate-200 active:scale-95 transition-colors"
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-black text-slate-900 font-mono tabular-nums">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onIncrement(line.key)}
                      className="size-7 flex items-center justify-center text-blue-600 hover:bg-blue-50 active:scale-95 transition-colors"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <span className="text-xs font-black text-slate-950 font-mono w-12 text-right tabular-nums shrink-0">
                    ₹{line.unitPrice * line.quantity}
                  </span>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => onRemove(line.key)}
                    className="size-6.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors shrink-0"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>

                {/* Item Cooking Note & Modifier Tag */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  {line.notes ? (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/80 text-[10px] font-bold text-amber-800">
                      <span>📝 {line.notes}</span>
                      <button
                        type="button"
                        onClick={() => onSetLineNotes && onSetLineNotes(line.key, '')}
                        className="text-amber-600 hover:text-amber-900 font-bold ml-1"
                      >
                        ×
                      </button>
                    </div>
                  ) : editingNoteKey === line.key ? (
                    <div className="w-full space-y-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      <div className="flex flex-wrap gap-1">
                        {QUICK_ITEM_NOTES.map((qn) => (
                          <button
                            key={qn}
                            type="button"
                            onClick={() => {
                              onSetLineNotes && onSetLineNotes(line.key, qn);
                              setEditingNoteKey(null);
                            }}
                            className="px-1.5 py-0.5 rounded bg-white hover:bg-amber-50 border border-slate-200 text-[10px] font-bold text-slate-700"
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
                          className="flex-1 h-6 px-1.5 text-[10px] bg-white border border-slate-200 rounded font-medium"
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
                          className="px-2 h-6 rounded bg-slate-900 text-white text-[10px] font-bold"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomNoteInput('');
                            setEditingNoteKey(null);
                          }}
                          className="px-1.5 h-6 rounded bg-slate-200 text-slate-600 text-[10px] font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingNoteKey(line.key)}
                      className="text-[10px] font-bold text-slate-400 hover:text-blue-600 flex items-center gap-0.5 transition-colors"
                    >
                      <MessageSquarePlus className="size-2.5" />
                      <span>+ note</span>
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
        <div className="px-3.5 py-2 border-t border-slate-100 bg-white space-y-1.5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10.5px] font-black uppercase text-slate-400">
              <Percent className="size-3 text-emerald-600" />
              <span>Quick Discount</span>
            </div>

            {/* Packaging Charge Toggle (especially useful for Takeaway) */}
            {onPackagingCharge && (
              <button
                type="button"
                onClick={() => onPackagingCharge(packagingCharge > 0 ? 0 : 20)}
                className={cn(
                  'px-2 py-0.5 rounded-md text-[10.5px] font-bold flex items-center gap-1 transition-all border',
                  packagingCharge > 0
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                )}
              >
                <Package className="size-3" />
                <span>Pack Fee ₹20</span>
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
                    className={cn(
                      'px-2 py-0.5 rounded-md text-[10.5px] font-bold font-mono shrink-0 transition-all border',
                      active
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-200'
                    )}
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
        <div className="px-4 py-2.5 border-t border-slate-200 bg-white space-y-1.5 shrink-0">
          <div className="space-y-0.5 text-xs">
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
            {totals.packagingCharge && totals.packagingCharge > 0 && (
              <div className="flex justify-between text-amber-700 font-bold">
                <span>Packaging Charge</span>
                <span className="font-mono">+₹{totals.packagingCharge.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500">
              <span>GST Tax (5%)</span>
              <span className="font-bold text-slate-900 font-mono">₹{(totals.cgst + totals.sgst).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
            <div>
              <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 block">Total Payable</span>
              <span className="text-[11px] font-bold text-slate-500">Incl. all taxes</span>
            </div>
            <span className="text-2xl font-black text-blue-600 font-mono tabular-nums">
              ₹{totals.grandTotal.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* ── 6. SMART PAYMENT SECTION & QUICK CASH UX ── */}
      <div className="p-3.5 border-t border-slate-200 bg-slate-50/90 space-y-2.5 shrink-0">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
            Payment Mode
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {PAYMENT_MODES.map((p) => {
              const Icon = p.icon;
              const isSelected = paymentMode === p.mode;
              return (
                <button
                  key={p.mode}
                  type="button"
                  onClick={() => onPaymentMode(p.mode)}
                  className={cn(
                    'h-10 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all border-2',
                    isSelected
                      ? `${p.color} border-transparent shadow-xs scale-[1.01]`
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  )}
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
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                <span className="text-[10px] font-black uppercase text-slate-400 shrink-0">Tender:</span>
                {quickCashOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setCashReceived(String(opt))}
                    className={cn(
                      'px-2 py-0.5 rounded-lg text-xs font-bold font-mono transition-all border shrink-0',
                      cashReceived === String(opt)
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
                    )}
                  >
                    ₹{opt}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">₹</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="Cash tendered"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="w-full h-8 pl-6 pr-2 text-xs font-bold font-mono bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                  />
                </div>

                {receivedAmount > 0 && (
                  <div className={cn(
                    'px-2.5 h-8 rounded-xl flex items-center font-mono text-xs font-black shrink-0 border',
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

        {/* ── 7. SUB-10s ACTION BUTTONS ── */}
        <div className="space-y-1.5 pt-0.5">
          {/* Complete Payment & Print (Primary CTA) */}
          <button
            type="button"
            onClick={() => { if (!blocked) onPlace(); }}
            disabled={blocked || isPlacing}
            className={cn(
              'w-full h-12 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]',
              blocked || isPlacing
                ? 'bg-slate-300 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25'
            )}
          >
            {isPlacing ? (
              <>
                <span className="animate-spin text-sm">⏳</span>
                <span>Settling & Printing…</span>
              </>
            ) : (
              <>
                <span>⚡ Settle & Print Bill</span>
                {!empty && (
                  <span className="font-mono text-sm opacity-90 font-bold">· ₹{totals.grandTotal.toFixed(2)}</span>
                )}
                <span className="text-[10px] font-mono opacity-70 bg-black/20 px-1.5 py-0.5 rounded-md hidden sm:inline">F2</span>
              </>
            )}
          </button>

          {/* Secondary Action Row: Send to Kitchen / Clear Cart */}
          <div className="grid grid-cols-2 gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={empty || isPlacing}
              onClick={onSendToKitchen || onPlace}
              className="h-8.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs gap-1"
            >
              <Send className="size-3 text-blue-600" />
              <span>Send KOT</span>
              <span className="text-[9px] font-mono text-slate-400 hidden sm:inline">F8</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={empty || isPlacing}
              onClick={onClear}
              className="h-8.5 rounded-xl border-slate-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 font-bold text-xs gap-1"
            >
              <Trash2 className="size-3 text-rose-500" />
              <span>Clear Cart</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
