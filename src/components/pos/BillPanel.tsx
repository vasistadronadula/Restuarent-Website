'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Box, Button, Chip, Divider, FormControl, IconButton, InputLabel,
  MenuItem as MuiMenuItem, Select, Stack, TextField, Typography,
} from '@mui/material';
import {
  Add, Close, DeleteOutlined, Fastfood, LocalMall, Remove, ShoppingCart,
} from '@mui/icons-material';
import { MAX_LINE_QTY, type PosLine } from '@/hooks/usePosCart';
import type { BillTotals } from '@/lib/billing';
import { rupees, rupeesExact } from '@/lib/billing';
import { pos } from '@/theme/posColors';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80';

export type PosOrderType = 'dine-in' | 'counter';

export const ORDER_TYPES: { type: PosOrderType; label: string; icon: string }[] = [
  { type: 'counter', label: 'Counter', icon: '⚡' },
  { type: 'dine-in', label: 'Dine-in', icon: '🍽️' },
];

export const PAYMENT_MODES = [
  { mode: 'cash', label: 'Cash', icon: '💵', color: pos.cash },
  { mode: 'upi', label: 'UPI', icon: '📱', color: pos.upi },
  { mode: 'card', label: 'Card', icon: '💳', color: pos.card },
] as const;

export type PosPaymentMode = (typeof PAYMENT_MODES)[number]['mode'];

const DISCOUNTS = [0, 5, 10, 15, 20];

/* ── Dark-themed input overrides ──────────────────────────────── */
const darkInputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: pos.bg,
    color: pos.text,
    '& fieldset': { borderColor: pos.border },
    '&:hover fieldset': { borderColor: pos.surfaceHover },
    '&.Mui-focused fieldset': { borderColor: pos.borderFocus },
  },
  '& .MuiInputLabel-root': { color: pos.textMuted },
  '& .MuiInputLabel-root.Mui-focused': { color: pos.borderFocus },
};

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
  discountPercent: number;
  onDiscountPercent: (d: number) => void;

  onIncrement: (key: string) => void;
  onDecrement: (key: string) => void;
  onSetQuantity: (key: string, qty: number) => void;
  onRemove: (key: string) => void;
  onClear: () => void;

  onPlace: () => void;
  isPlacing: boolean;
  /** Rendered in the sheet on phones; absent in the desktop pane. */
  onClose?: () => void;
}

/**
 * Dark-themed bill panel — the cart sidebar on desktop/tablet and the
 * bottom-sheet contents on mobile. Structure: fixed header, scrolling
 * middle (order details + line items), pinned footer with charge button.
 */
export default function BillPanel({
  lines, totals, totalUnits,
  orderType, onOrderType, tables, tableNumber, onTableNumber,
  customerName, onCustomerName, customerPhone, onCustomerPhone,
  paymentMode, onPaymentMode, discountPercent, onDiscountPercent,
  onIncrement, onDecrement, onSetQuantity, onRemove, onClear,
  onPlace, isPlacing, onClose,
}: BillPanelProps) {
  const empty = lines.length === 0;
  const needsTable = orderType === 'dine-in' && tableNumber === '';
  const blocked = empty || needsTable;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, bgcolor: pos.surface }}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <Box
        sx={{
          flexShrink: 0, px: 1.5, py: 1.25,
          bgcolor: pos.elevated,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
          borderBottom: `1px solid ${pos.border}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
          <LocalMall sx={{ fontSize: 18, color: pos.charge }} />
          <Typography sx={{ fontWeight: 800, fontSize: 14, color: pos.text }}>
            Current Order
          </Typography>
          {totalUnits > 0 && (
            <Chip
              label={`${totalUnits}`}
              size="small"
              sx={{
                height: 20, fontSize: 10.5, fontWeight: 900,
                bgcolor: pos.charge, color: '#FFFFFF',
                '& .MuiChip-label': { px: 0.8 },
              }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          {!empty && (
            <Button
              size="small"
              onClick={onClear}
              sx={{
                color: pos.danger, fontWeight: 700, textTransform: 'none',
                fontSize: 11.5, minWidth: 0, px: 1,
                '&:hover': { bgcolor: pos.dangerSoft },
              }}
            >
              Clear
            </Button>
          )}
          {onClose && (
            <IconButton size="small" onClick={onClose} sx={{ color: pos.textMuted }} aria-label="Close bill">
              <Close fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* ── Scrolling middle ──────────────────────────────────────── */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' }}>
        {/* Order type + customer fields */}
        <Box sx={{ p: 1.25, borderBottom: `1px solid ${pos.border}` }}>
          <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
            {ORDER_TYPES.map((t) => (
              <Button
                key={t.type}
                onClick={() => onOrderType(t.type)}
                sx={{
                  flex: 1, minHeight: 36, borderRadius: '8px', textTransform: 'none',
                  fontWeight: 800, fontSize: 12,
                  bgcolor: orderType === t.type ? pos.categoryActive : pos.bg,
                  color: orderType === t.type ? '#FFFFFF' : pos.textMuted,
                  border: `1px solid ${orderType === t.type ? pos.categoryActive : pos.border}`,
                  '&:hover': {
                    bgcolor: orderType === t.type ? pos.categoryActive : pos.surfaceHover,
                  },
                }}
              >
                {t.icon} {t.label}
              </Button>
            ))}
          </Box>

          {orderType === 'dine-in' && (
            <FormControl
              fullWidth size="small"
              sx={{ mb: 1, ...darkInputSx }}
              error={needsTable && !empty}
            >
              <InputLabel>Table *</InputLabel>
              <Select<number | ''>
                value={tableNumber}
                label="Table *"
                onChange={(e) => {
                  const value = e.target.value;
                  onTableNumber(value === '' ? '' : Number(value));
                }}
                sx={{ color: pos.text }}
              >
                {tables.length === 0 && (
                  <MuiMenuItem disabled value="">No tables set up yet</MuiMenuItem>
                )}
                {tables.map((t) => (
                  <MuiMenuItem key={t.id} value={t.tableNumber}>
                    Table {t.tableNumber} · {t.capacity} seats{t.description ? ` · ${t.description}` : ''}
                  </MuiMenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            <TextField
              size="small" label="Name" placeholder="Walk-in"
              value={customerName} onChange={(e) => onCustomerName(e.target.value)}
              sx={{ flex: '1 1 120px', minWidth: 0, ...darkInputSx }}
            />
            <TextField
              size="small" label="Phone" inputMode="tel"
              value={customerPhone} onChange={(e) => onCustomerPhone(e.target.value)}
              sx={{ flex: '1 1 120px', minWidth: 0, ...darkInputSx }}
            />
          </Box>
        </Box>

        {/* Line items */}
        {empty ? (
          <Box sx={{ textAlign: 'center', py: 5, px: 2, color: pos.textFaint }}>
            <ShoppingCart sx={{ fontSize: 40, opacity: 0.4, mb: 1 }} />
            <Typography sx={{ fontWeight: 700, fontSize: 13, color: pos.textMuted }}>
              No items yet
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: pos.textFaint }}>
              Tap a dish to start the bill
            </Typography>
          </Box>
        ) : (
          <Stack divider={<Divider sx={{ borderColor: pos.border }} />} sx={{ px: 0 }}>
            {lines.map((line) => (
              <Box key={line.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.75 }}>
                <Box
                  sx={{
                    position: 'relative', width: 36, height: 36,
                    borderRadius: '8px', overflow: 'hidden',
                    flexShrink: 0, bgcolor: pos.bg,
                  }}
                >
                  <Image src={line.image || FALLBACK_IMAGE} alt="" fill sizes="36px" style={{ objectFit: 'cover' }} />
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: 12, fontWeight: 700, color: pos.text,
                      lineHeight: 1.25,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}
                  >
                    {line.name}
                  </Typography>
                  <Typography sx={{ fontSize: 10.5, color: pos.textMuted }}>
                    {rupeesExact(line.unitPrice)} each
                  </Typography>
                </Box>

                <QuantityStepper
                  line={line}
                  onIncrement={onIncrement}
                  onDecrement={onDecrement}
                  onSetQuantity={onSetQuantity}
                  onRemove={onRemove}
                />

                <Typography
                  sx={{
                    width: 58, textAlign: 'right', fontSize: 12.5,
                    fontWeight: 800, flexShrink: 0, color: pos.text,
                  }}
                >
                  {rupees(line.unitPrice * line.quantity)}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      {/* ── Pinned footer ─────────────────────────────────────────── */}
      <Box
        sx={{
          flexShrink: 0, px: 1.25, pt: 1,
          pb: 'calc(10px + env(safe-area-inset-bottom, 0px))',
          bgcolor: pos.elevated, borderTop: `1px solid ${pos.border}`,
        }}
      >
        {!empty && (
          <>
            {/* Totals */}
            <Stack spacing={0.2} sx={{ mb: 0.75 }}>
              <Row label="Subtotal" value={rupeesExact(totals.subtotal)} />
              {totals.discountAmount > 0 && (
                <Row
                  label={`Discount (${discountPercent || 0}%)`}
                  value={`−${rupeesExact(totals.discountAmount)}`}
                  color={pos.charge}
                />
              )}
              <Row label="CGST 2.5%" value={rupeesExact(totals.cgst)} />
              <Row label="SGST 2.5%" value={rupeesExact(totals.sgst)} />
            </Stack>

            {/* Payment mode */}
            <Box sx={{ display: 'flex', gap: 0.5, mb: 0.75 }}>
              {PAYMENT_MODES.map((p) => (
                <Button
                  key={p.mode}
                  onClick={() => onPaymentMode(p.mode)}
                  sx={{
                    flex: 1, minHeight: 36, borderRadius: '8px', textTransform: 'none',
                    fontWeight: 800, fontSize: 11.5,
                    bgcolor: paymentMode === p.mode ? p.color : pos.bg,
                    color: paymentMode === p.mode ? '#FFFFFF' : pos.textMuted,
                    border: `1px solid ${paymentMode === p.mode ? p.color : pos.border}`,
                    '&:hover': {
                      bgcolor: paymentMode === p.mode ? p.color : pos.surfaceHover,
                      opacity: paymentMode === p.mode ? 0.9 : 1,
                    },
                  }}
                >
                  {p.icon} {p.label}
                </Button>
              ))}
            </Box>
          </>
        )}

        {/* ── CHARGE BUTTON — the primary action ───────────────────── */}
        <Button
          fullWidth
          variant="contained"
          onClick={onPlace}
          disabled={blocked || isPlacing}
          sx={{
            minHeight: 52, borderRadius: '12px', textTransform: 'none',
            fontSize: 15, fontWeight: 900,
            display: 'flex', justifyContent: 'space-between', px: 2,
            bgcolor: blocked ? pos.surfaceActive : pos.charge,
            color: '#FFFFFF',
            boxShadow: blocked ? 'none' : '0 6px 20px rgba(16,185,129,0.35)',
            '&:hover': { bgcolor: blocked ? pos.surfaceActive : pos.chargeDark },
            '&.Mui-disabled': { color: pos.textFaint, bgcolor: pos.surfaceActive },
          }}
        >
          <span>
            {isPlacing ? 'Saving…'
              : empty ? 'Add items to bill'
                : needsTable ? 'Pick a table first'
                  : 'Charge'}
          </span>
          <span style={{ fontSize: 16, fontWeight: 900 }}>{rupees(totals.grandTotal)}</span>
        </Button>
      </Box>
    </Box>
  );
}

const MAX_QTY_DIGITS = String(MAX_LINE_QTY).length;

/**
 * Compact dark quantity stepper: − / editable number / +.
 */
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

  useEffect(() => { setDraft(null); }, [line.quantity]);

  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_QTY_DIGITS);
    setDraft(digits);
    if (digits !== '') onSetQuantity(line.key, Number(digits));
  };

  const atMinimum = line.quantity <= 1;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2, flexShrink: 0 }}>
      <IconButton
        onClick={() => (atMinimum ? onRemove(line.key) : onDecrement(line.key))}
        sx={{
          width: 28, height: 28,
          border: `1px solid ${pos.border}`, borderRadius: '7px',
          color: atMinimum ? pos.danger : pos.textMuted,
          '&:hover': { bgcolor: atMinimum ? pos.dangerSoft : pos.surfaceHover },
        }}
        aria-label={atMinimum ? `Remove ${line.name}` : `One less ${line.name}`}
      >
        {atMinimum
          ? <DeleteOutlined sx={{ fontSize: 14 }} />
          : <Remove sx={{ fontSize: 14 }} />}
      </IconButton>

      <TextField
        value={draft ?? String(line.quantity)}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={() => setDraft(null)}
        inputMode="numeric"
        size="small"
        sx={{
          width: 40,
          '& .MuiOutlinedInput-input': {
            textAlign: 'center', fontWeight: 800, fontSize: 12,
            py: 0.5, px: 0, color: pos.text,
          },
          '& .MuiOutlinedInput-notchedOutline': { borderColor: pos.border },
          '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: pos.surfaceHover },
          '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: pos.borderFocus },
        }}
        aria-label={`Quantity of ${line.name}`}
      />

      <IconButton
        onClick={() => onIncrement(line.key)}
        disabled={line.quantity >= MAX_LINE_QTY}
        sx={{
          width: 28, height: 28,
          border: `1px solid ${pos.border}`, borderRadius: '7px',
          color: pos.charge,
          '&:hover': { bgcolor: pos.chargeSoft },
        }}
        aria-label={`One more ${line.name}`}
      >
        <Add sx={{ fontSize: 14 }} />
      </IconButton>
    </Box>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography sx={{ fontSize: 11, color: color || pos.textFaint }}>{label}</Typography>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: color || pos.textSecondary }}>{value}</Typography>
    </Box>
  );
}
