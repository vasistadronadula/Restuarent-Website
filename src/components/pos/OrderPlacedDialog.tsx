'use client';

import React, { useEffect, useState } from 'react';
import {
  Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  Typography, useMediaQuery, useTheme,
} from '@mui/material';
import { CheckCircle, Print, Bluetooth, ErrorOutlined, ReceiptLong } from '@mui/icons-material';
import ThermalBill from '@/components/bill/ThermalBill';
import PrintBillPortal from '@/components/bill/PrintBillPortal';
import { isPrinterConnected, printOrder, savedPrinterName } from '@/lib/thermalPrinter';
import { rupees } from '@/lib/billing';
import { adminColors } from '@/theme/adminColors';
import type { Order } from '@/types';

type PrintState = 'idle' | 'printing' | 'printed' | 'failed';

interface Props {
  order: Order | null;
  invoiceNo?: string;
  open: boolean;
  onNewOrder: () => void;
}

/**
 * What the cashier sees the instant an order is saved: confirmation, the
 * exact bill that is being printed, and one button to start the next order.
 *
 * If a Bluetooth printer is paired the ticket goes out immediately, before
 * the cashier does anything — the dialog just reports that it happened.
 * Otherwise it offers the browser print dialog. Either way the bill is on
 * screen, so a counter with no printer at all can still read the total back
 * to the customer.
 */
export default function OrderPlacedDialog({ order, invoiceNo, open, onNewOrder }: Props) {
  if (!order) return null;
  // Keyed by order id so each order gets a fresh print state — the initial
  // value is read at mount rather than pushed in from an effect.
  return (
    <PlacedDialog
      key={order.id}
      order={order}
      invoiceNo={invoiceNo}
      open={open}
      onNewOrder={onNewOrder}
    />
  );
}

function PlacedDialog({
  order, invoiceNo, open, onNewOrder,
}: Props & { order: Order }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [printState, setPrintState] = useState<PrintState>(() =>
    isPrinterConnected() ? 'printing' : 'idle'
  );
  const [browserPrinting, setBrowserPrinting] = useState(false);

  // Fire the thermal print once, as soon as the bill appears. The cashier
  // does nothing — the ticket is already coming out of the printer.
  useEffect(() => {
    if (!isPrinterConnected()) return;
    let cancelled = false;

    void printOrder(order, invoiceNo).then((ok) => {
      if (!cancelled) setPrintState(ok ? 'printed' : 'failed');
    });

    return () => { cancelled = true; };
  }, [order, invoiceNo]);

  const printAgain = async () => {
    if (isPrinterConnected()) {
      setPrintState('printing');
      const ok = await printOrder(order, invoiceNo);
      setPrintState(ok ? 'printed' : 'failed');
      return;
    }
    // No paired printer — hand it to the browser, which is where a USB or
    // network printer is reachable from.
    setBrowserPrinting(true);
    requestAnimationFrame(() => {
      window.print();
      setTimeout(() => setBrowserPrinting(false), 2000);
    });
  };

  const status = (() => {
    switch (printState) {
      case 'printing':
        return { icon: <CircularProgress size={15} />, text: 'Sending to printer…', color: adminColors.textMuted };
      case 'printed':
        return {
          icon: <Bluetooth sx={{ fontSize: 16, color: adminColors.success }} />,
          text: `Printed on ${savedPrinterName() || 'the counter printer'}`,
          color: adminColors.success,
        };
      case 'failed':
        return {
          icon: <ErrorOutlined sx={{ fontSize: 16, color: adminColors.danger }} />,
          text: 'Printer did not respond — print again or use the dialog',
          color: adminColors.danger,
        };
      default:
        return {
          icon: <ReceiptLong sx={{ fontSize: 16, color: adminColors.textMuted }} />,
          text: 'No printer paired — use Print bill',
          color: adminColors.textMuted,
        };
    }
  })();

  return (
    <>
      {/* Mounted while the dialog is open so Print (and Ctrl+P) hit the
          80mm bill rather than a screenshot of the app. */}
      {open && <PrintBillPortal order={order} invoiceNo={invoiceNo} />}

      <Dialog
        open={open}
        fullScreen={fullScreen}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: fullScreen ? 0 : '20px', overflow: 'hidden' } } }}
      >
        <Box sx={{ px: 2.5, py: 2, bgcolor: adminColors.success, color: '#FFFFFF' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle sx={{ fontSize: 26 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 900, fontSize: 16, lineHeight: 1.2 }}>
                Order placed · {rupees(order.grandTotal)}
              </Typography>
              <Typography sx={{ fontSize: 12, opacity: 0.9 }}>
                {order.id}{invoiceNo ? ` · Bill ${invoiceNo}` : ''}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            px: 2.5, py: 1, display: 'flex', alignItems: 'center', gap: 0.75,
            bgcolor: adminColors.bgSubtle, borderBottom: `1px solid ${adminColors.border}`,
          }}
        >
          {status.icon}
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: status.color }}>
            {status.text}
          </Typography>
        </Box>

        <DialogContent sx={{ p: 2, bgcolor: '#F5F5F4' }}>
          <Box sx={{ bgcolor: '#FFFFFF', border: '1px dashed #CBD5E1', borderRadius: '10px', py: 1, overflowX: 'auto' }}>
            <ThermalBill order={order} invoiceNo={invoiceNo} />
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: 2, py: 1.5,
            pb: fullScreen ? 'calc(14px + env(safe-area-inset-bottom, 0px))' : 1.5,
            gap: 1, borderTop: `1px solid ${adminColors.border}`,
          }}
        >
          <Button
            onClick={printAgain}
            disabled={printState === 'printing' || browserPrinting}
            startIcon={<Print />}
            sx={{
              flex: 1, minHeight: 46, borderRadius: '12px', textTransform: 'none', fontWeight: 800,
              color: adminColors.textSecondary, border: `1px solid ${adminColors.border}`,
            }}
          >
            {printState === 'printed' ? 'Print again' : 'Print bill'}
          </Button>
          <Button
            variant="contained"
            onClick={onNewOrder}
            autoFocus
            sx={{
              flex: 1, minHeight: 46, borderRadius: '12px', textTransform: 'none', fontWeight: 900,
              background: `linear-gradient(135deg, ${adminColors.brand}, ${adminColors.accent})`,
              boxShadow: 'none',
            }}
          >
            New order
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
