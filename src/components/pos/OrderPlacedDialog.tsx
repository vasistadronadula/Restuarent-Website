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
import { pos } from '@/theme/posColors';
import type { Order } from '@/types';

type PrintState = 'idle' | 'printing' | 'printed' | 'failed';

interface Props {
  order: Order | null;
  invoiceNo?: string;
  open: boolean;
  onNewOrder: () => void;
}

/**
 * Dark-themed order confirmation dialog — matches the POS palette.
 * Shows confirmation, the bill, and print/new-order actions.
 */
export default function OrderPlacedDialog({ order, invoiceNo, open, onNewOrder }: Props) {
  if (!order) return null;
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

  // Auto-print on Bluetooth if connected
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
    setBrowserPrinting(true);
    requestAnimationFrame(() => {
      window.print();
      setTimeout(() => setBrowserPrinting(false), 2000);
    });
  };

  const status = (() => {
    switch (printState) {
      case 'printing':
        return { icon: <CircularProgress size={15} sx={{ color: pos.charge }} />, text: 'Sending to printer…', color: pos.textMuted };
      case 'printed':
        return {
          icon: <Bluetooth sx={{ fontSize: 16, color: pos.charge }} />,
          text: `Printed on ${savedPrinterName() || 'the counter printer'}`,
          color: pos.charge,
        };
      case 'failed':
        return {
          icon: <ErrorOutlined sx={{ fontSize: 16, color: pos.danger }} />,
          text: 'Printer did not respond — print again or use the dialog',
          color: pos.danger,
        };
      default:
        return {
          icon: <ReceiptLong sx={{ fontSize: 16, color: pos.textMuted }} />,
          text: 'No printer paired — use Print bill',
          color: pos.textMuted,
        };
    }
  })();

  return (
    <>
      {open && <PrintBillPortal order={order} invoiceNo={invoiceNo} />}

      <Dialog
        open={open}
        fullScreen={fullScreen}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: fullScreen ? 0 : '16px',
              overflow: 'hidden',
              bgcolor: pos.surface,
            },
          },
        }}
      >
        {/* Success header */}
        <Box sx={{ px: 2.5, py: 2, bgcolor: pos.charge, color: '#FFFFFF' }}>
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

        {/* Printer status bar */}
        <Box
          sx={{
            px: 2.5, py: 1, display: 'flex', alignItems: 'center', gap: 0.75,
            bgcolor: pos.elevated, borderBottom: `1px solid ${pos.border}`,
          }}
        >
          {status.icon}
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: status.color }}>
            {status.text}
          </Typography>
        </Box>

        {/* Bill preview */}
        <DialogContent sx={{ p: 2, bgcolor: pos.bg }}>
          <Box
            sx={{
              bgcolor: '#FFFFFF', border: `1px dashed ${pos.border}`,
              borderRadius: '10px', py: 1, overflowX: 'auto',
            }}
          >
            <ThermalBill order={order} invoiceNo={invoiceNo} />
          </Box>
        </DialogContent>

        {/* Actions */}
        <DialogActions
          sx={{
            px: 2, py: 1.5,
            pb: fullScreen ? 'calc(14px + env(safe-area-inset-bottom, 0px))' : 1.5,
            gap: 1, borderTop: `1px solid ${pos.border}`,
            bgcolor: pos.elevated,
          }}
        >
          <Button
            onClick={printAgain}
            disabled={printState === 'printing' || browserPrinting}
            startIcon={<Print />}
            sx={{
              flex: 1, minHeight: 46, borderRadius: '12px', textTransform: 'none', fontWeight: 800,
              color: pos.textSecondary, border: `1px solid ${pos.border}`,
              '&:hover': { bgcolor: pos.surfaceHover },
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
              bgcolor: pos.charge, color: '#FFFFFF',
              boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
              '&:hover': { bgcolor: pos.chargeDark },
            }}
          >
            New order
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
