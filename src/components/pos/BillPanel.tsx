'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Box, Button, Chip, Divider, FormControl, IconButton, InputAdornment, InputLabel,
  MenuItem as MuiMenuItem, Select, Stack, TextField, Typography,
} from '@mui/material';
import {
  Add, Close, DeleteOutlined, Fastfood, PointOfSale, Remove,
} from '@mui/icons-material';
import { MAX_LINE_QTY, type PosLine } from '@/hooks/usePosCart';
import type { BillTotals } from '@/lib/billing';
import { rupees, rupeesExact } from '@/lib/billing';
import { adminColors } from '@/theme/adminColors';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80';

export type PosOrderType = 'dine-in' | 'counter';

export const ORDER_TYPES: { type: PosOrderType; label: string }[] = [
  { type: 'counter', label: '⚡ Counter' },
  { type: 'dine-in', label: '🍽️ Dine-in' },
];

export const PAYMENT_MODES = [
  { mode: 'cash', label: '💵 Cash' },
  { mode: 'upi', label: '📱 UPI' },
  { mode: 'card', label: '💳 Card' },
] as const;

export type PosPaymentMode = (typeof PAYMENT_MODES)[number]['mode'];

const DISCOUNTS = [0, 5, 10, 15, 20];

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
 * The bill itself: line items, totals and the single action that ends the
 * transaction. Identical on every screen size — it is the desktop side pane
 * and the contents of the phone sheet — so a cashier who learns it on the
 * counter tablet already knows it on their phone.
 *
 * Structure is deliberate: a fixed header, ONE scrolling region, and a
 * footer pinned to the bottom that always contains the pay button. On a
 * phone that is the difference between the button being reachable and not.
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, bgcolor: '#FFFFFF' }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Box
        sx={{
          flexShrink: 0, px: 1.75, py: 1.5,
          bgcolor: adminColors.textPrimary, color: '#FFFFFF',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <PointOfSale sx={{ fontSize: 20, color: adminColors.accent }} />
          <Typography sx={{ fontWeight: 800, fontSize: 15 }}>Bill</Typography>
          {totalUnits > 0 && (
            <Chip
              label={`${totalUnits} item${totalUnits === 1 ? '' : 's'}`}
              size="small"
              sx={{ height: 20, fontSize: 10.5, fontWeight: 800, bgcolor: adminColors.accent, color: '#FFFFFF' }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          {!empty && (
            <Button
              size="small"
              onClick={onClear}
              sx={{ color: '#FCA5A5', fontWeight: 700, textTransform: 'none', fontSize: 12, minWidth: 0 }}
            >
              Clear
            </Button>
          )}
          {onClose && (
            <IconButton size="small" onClick={onClose} sx={{ color: '#D6D3D1' }} aria-label="Close bill">
              <Close fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* ── Scrolling middle: order details + lines ─────────────────────── */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' }}>
        <Box sx={{ p: 1.5, bgcolor: adminColors.bgSubtle, borderBottom: `1px solid ${adminColors.border}` }}>
          <Box sx={{ display: 'flex', gap: 0.75, mb: 1.25 }}>
            {ORDER_TYPES.map((t) => (
              <Button
                key={t.type}
                onClick={() => onOrderType(t.type)}
                sx={{
                  flex: 1, minHeight: 42, borderRadius: '10px', textTransform: 'none',
                  fontWeight: 800, fontSize: 13,
                  bgcolor: orderType === t.type ? adminColors.brand : '#FFFFFF',
                  color: orderType === t.type ? '#FFFFFF' : adminColors.textSecondary,
                  border: `1px solid ${orderType === t.type ? adminColors.brand : adminColors.border}`,
                  '&:hover': { bgcolor: orderType === t.type ? adminColors.brandDark : adminColors.bgSubtle },
                }}
              >
                {t.label}
              </Button>
            ))}
          </Box>

          {orderType === 'dine-in' && (
            <FormControl fullWidth size="small" sx={{ mb: 1.25 }} error={needsTable && !empty}>
              <InputLabel>Table *</InputLabel>
              <Select<number | ''>
                value={tableNumber}
                label="Table *"
                onChange={(e) => {
                  const value = e.target.value;
                  onTableNumber(value === '' ? '' : Number(value));
                }}
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

          {/* Short labels and a wrap: this pane is 320px wide on a tablet, and
              "Customer (optional)" clipped its own floating label there. */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <TextField
              size="small" label="Name" placeholder="Walk-in"
              value={customerName} onChange={(e) => onCustomerName(e.target.value)}
              sx={{ flex: '1 1 130px', minWidth: 0 }}
            />
            <TextField
              size="small" label="Phone" inputMode="tel"
              value={customerPhone} onChange={(e) => onCustomerPhone(e.target.value)}
              sx={{ flex: '1 1 130px', minWidth: 0 }}
            />
          </Box>
        </Box>

        {empty ? (
          <Box sx={{ textAlign: 'center', py: 6, px: 2, color: adminColors.textFaint }}>
            <Fastfood sx={{ fontSize: 42, opacity: 0.4, mb: 1 }} />
            <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: adminColors.textMuted }}>
              No items yet
            </Typography>
            <Typography sx={{ fontSize: 12 }}>Tap a dish to start the bill</Typography>
          </Box>
        ) : (
          <Stack divider={<Divider />} sx={{ px: 0 }}>
            {lines.map((line) => (
              <Box key={line.key} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1 }}>
                <Box sx={{ position: 'relative', width: 40, height: 40, borderRadius: '9px', overflow: 'hidden', flexShrink: 0, bgcolor: '#F1EFED' }}>
                  <Image src={line.image || FALLBACK_IMAGE} alt="" fill sizes="40px" style={{ objectFit: 'cover' }} />
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: adminColors.textPrimary, lineHeight: 1.3 }}>
                    {line.name}
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: adminColors.textMuted }}>
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

                <Typography sx={{ width: 62, textAlign: 'right', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                  {rupees(line.unitPrice * line.quantity)}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      {/* ── Pinned footer: totals, payment, one action ──────────────────── */}
      <Box
        sx={{
          flexShrink: 0, px: 1.5, pt: 1.25,
          pb: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          bgcolor: adminColors.bgSubtle, borderTop: `1px solid ${adminColors.border}`,
        }}
      >
        {!empty && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: adminColors.textMuted, mr: 0.5 }}>
                DISCOUNT
              </Typography>
              {DISCOUNTS.map((d) => (
                <Chip
                  key={d}
                  label={`${d}%`}
                  size="small"
                  onClick={() => onDiscountPercent(d)}
                  sx={{
                    fontWeight: 800, fontSize: 11, height: 28, cursor: 'pointer',
                    bgcolor: discountPercent === d ? adminColors.brand : '#FFFFFF',
                    color: discountPercent === d ? '#FFFFFF' : adminColors.textMuted,
                    border: `1px solid ${discountPercent === d ? adminColors.brand : adminColors.border}`,
                  }}
                />
              ))}
            </Box>

            <Stack spacing={0.3} sx={{ mb: 1.25 }}>
              <Row label="Subtotal" value={rupeesExact(totals.subtotal)} />
              {totals.discountAmount > 0 && (
                <Row
                  label={`Discount (${discountPercent}%)`}
                  value={`−${rupeesExact(totals.discountAmount)}`}
                  color={adminColors.success}
                />
              )}
              <Row label="CGST 2.5%" value={rupeesExact(totals.cgst)} />
              <Row label="SGST 2.5%" value={rupeesExact(totals.sgst)} />
              {Math.abs(totals.roundOff) >= 0.01 && (
                <Row
                  label="Round off"
                  value={`${totals.roundOff > 0 ? '+' : '−'}${rupeesExact(Math.abs(totals.roundOff))}`}
                />
              )}
            </Stack>

            <Box sx={{ display: 'flex', gap: 0.75, mb: 1.25 }}>
              {PAYMENT_MODES.map((p) => (
                <Button
                  key={p.mode}
                  onClick={() => onPaymentMode(p.mode)}
                  sx={{
                    flex: 1, minHeight: 42, borderRadius: '10px', textTransform: 'none',
                    fontWeight: 800, fontSize: 12.5,
                    bgcolor: paymentMode === p.mode ? adminColors.textPrimary : '#FFFFFF',
                    color: paymentMode === p.mode ? '#FFFFFF' : adminColors.textSecondary,
                    border: `1px solid ${paymentMode === p.mode ? adminColors.textPrimary : adminColors.border}`,
                    '&:hover': { bgcolor: paymentMode === p.mode ? '#000000' : adminColors.bgSubtle },
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </Box>
          </>
        )}

        {/* Always mounted, disabled when there's nothing to charge — a
            cashier should never have to wonder where the button went. The
            label says what is missing rather than failing on press: the
            Table selector that unblocks a dine-in bill is in this same
            panel, a few centimetres above. */}
        <Button
          fullWidth
          variant="contained"
          onClick={onPlace}
          disabled={blocked || isPlacing}
          sx={{
            minHeight: 56, borderRadius: '14px', textTransform: 'none',
            fontSize: 15.5, fontWeight: 900,
            display: 'flex', justifyContent: 'space-between', px: 2.25,
            background: blocked ? '#D6D3D1' : `linear-gradient(135deg, ${adminColors.brand}, ${adminColors.accent})`,
            boxShadow: blocked ? 'none' : '0 8px 20px rgba(198,40,40,0.26)',
            '&.Mui-disabled': { color: '#FFFFFF', background: '#D6D3D1' },
          }}
        >
          <span>
            {isPlacing ? 'Saving…'
              : empty ? 'Add items to bill'
                : needsTable ? 'Pick a table first'
                  : 'Place order & print'}
          </span>
          <span>{rupees(totals.grandTotal)}</span>
        </Button>
      </Box>
    </Box>
  );
}

const MAX_QTY_DIGITS = String(MAX_LINE_QTY).length;

/**
 * Quantity for one bill line: − / editable number / +.
 *
 * The field holds its own draft string so a half-typed value never reaches
 * the cart. That matters because focusing the field selects its contents: a
 * cashier changing 1 to 10 types "1" then "0", and dispatching each keystroke
 * meant the intermediate "0" reached the reducer, which reads a quantity
 * below 1 as "remove this line" — the dish disappeared mid-edit and the
 * cashier re-added it at the wrong price. Only a usable number is committed;
 * an emptied field snaps back to the real quantity on blur.
 *
 * Deleting a line stays a deliberate press of the bin, never a side effect
 * of typing.
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

  // The cart is the source of truth. Whenever it moves underneath us — the
  // +/− buttons here, or the same dish tapped again on the grid — drop the
  // draft so the field shows what is actually on the bill.
  useEffect(() => { setDraft(null); }, [line.quantity]);

  const handleChange = (raw: string) => {
    // Leading zeros stripped so the first "0" of a select-all edit clears the
    // field instead of reading as zero.
    const digits = raw.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_QTY_DIGITS);
    setDraft(digits);
    if (digits !== '') onSetQuantity(line.key, Number(digits));
  };

  const atMinimum = line.quantity <= 1;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
      <IconButton
        onClick={() => (atMinimum ? onRemove(line.key) : onDecrement(line.key))}
        sx={{ width: 34, height: 34, border: `1px solid ${adminColors.border}`, borderRadius: '9px' }}
        aria-label={atMinimum ? `Remove ${line.name}` : `One less ${line.name}`}
      >
        {atMinimum
          ? <DeleteOutlined sx={{ fontSize: 17, color: adminColors.danger }} />
          : <Remove sx={{ fontSize: 17 }} />}
      </IconButton>

      {/* Typing a quantity beats tapping "+" eleven times. */}
      <TextField
        value={draft ?? String(line.quantity)}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={() => setDraft(null)}
        inputMode="numeric"
        size="small"
        sx={{
          width: 48,
          '& .MuiOutlinedInput-input': { textAlign: 'center', fontWeight: 800, fontSize: 13.5, py: 0.7, px: 0 },
          '& .MuiOutlinedInput-notchedOutline': { borderColor: adminColors.border },
        }}
        aria-label={`Quantity of ${line.name}`}
      />

      <IconButton
        onClick={() => onIncrement(line.key)}
        disabled={line.quantity >= MAX_LINE_QTY}
        sx={{ width: 34, height: 34, border: `1px solid ${adminColors.border}`, borderRadius: '9px' }}
        aria-label={`One more ${line.name}`}
      >
        <Add sx={{ fontSize: 17 }} />
      </IconButton>
    </Box>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography sx={{ fontSize: 12, color: color || adminColors.textMuted }}>{label}</Typography>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: color || adminColors.textSecondary }}>{value}</Typography>
    </Box>
  );
}
