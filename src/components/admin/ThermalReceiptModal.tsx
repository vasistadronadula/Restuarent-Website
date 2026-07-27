'use client';

import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box,
} from '@mui/material';
import { Print, Close, CheckCircle } from '@mui/icons-material';
import { Order } from '@/types';
import ThermalBill from '@/components/bill/ThermalBill';
import PrintBillPortal from '@/components/bill/PrintBillPortal';

interface Props {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  isAutoPrinted?: boolean;
  invoiceNo?: string;
}

/**
 * On-screen preview of the 80mm bill, plus the print action.
 *
 * The dialog shows the bill; PrintBillPortal renders a second, identical
 * copy at body level that is the one the printer actually receives. That
 * separation is why the printed output is a clean 80mm roll — see the
 * @media print block in globals.css.
 */
export default function ThermalReceiptModal({ order, open, onClose, isAutoPrinted = false, invoiceNo }: Props) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Mounted whenever a bill is on screen, so Ctrl+P works too. */}
      {open && <PrintBillPortal order={order} invoiceNo={invoiceNo} />}

      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', overflow: 'hidden' } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#1C1917', color: 'white', py: 1.5, px: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Print sx={{ color: '#EA580C' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              {isAutoPrinted ? 'New order — receipt' : 'Bill preview'}
            </Typography>
          </Box>
          <Button size="small" onClick={onClose} sx={{ color: '#A8A29E', minWidth: 0, p: 0.5 }}>
            <Close fontSize="small" />
          </Button>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5, bgcolor: '#FAFAF9' }}>
          {isAutoPrinted && (
            <Box sx={{ mb: 2, p: 1.2, bgcolor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle sx={{ color: '#15803D', fontSize: 20 }} />
              <Typography variant="caption" sx={{ color: '#166534', fontWeight: 700 }}>
                New order received — printing receipt
              </Typography>
            </Box>
          )}

          {/* Preview is the real bill at its real width, so what the cashier
              checks on screen is exactly what comes out of the printer. */}
          <Box
            sx={{
              bgcolor: 'white',
              border: '1px dashed #CBD5E1',
              borderRadius: '8px',
              py: 1,
              overflowX: 'auto',
            }}
          >
            <ThermalBill order={order} invoiceNo={invoiceNo} />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={onClose} variant="outlined" sx={{ borderRadius: '10px', color: '#78716C', borderColor: '#E7E5E4', textTransform: 'none', fontWeight: 700 }}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handlePrint}
            startIcon={<Print />}
            sx={{
              borderRadius: '10px',
              bgcolor: '#C62828',
              color: 'white',
              fontWeight: 800,
              px: 3,
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#9B1C1C' },
            }}
          >
            Print 80mm bill
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
