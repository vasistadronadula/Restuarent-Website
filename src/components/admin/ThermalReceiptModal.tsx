'use client';

import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Divider, Stack,
} from '@mui/material';
import { Print, Close, CheckCircle } from '@mui/icons-material';
import { QRCodeCanvas } from 'qrcode.react';
import { Order } from '@/types';
import { restaurantInfo } from '@/data/restaurantInfo';

interface Props {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  isAutoPrinted?: boolean;
  invoiceNo?: string;
}

export default function ThermalReceiptModal({ order, open, onClose, isAutoPrinted = false, invoiceNo }: Props) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = order.orderDate || new Date().toLocaleDateString('en-IN');
  const formattedTime = order.orderTime || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '20px',
            overflow: 'hidden',
          },
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#0F172A', color: 'white', py: 1.5, px: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Print sx={{ color: '#F97316' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {isAutoPrinted ? '⚡ Auto-Printed Receipt' : 'Thermal Receipt'}
          </Typography>
        </Box>
        <Button size="small" onClick={onClose} sx={{ color: '#94A3B8', minWidth: 0, p: 0.5 }}>
          <Close fontSize="small" />
        </Button>
      </DialogTitle>

      <DialogContent sx={{ p: 3, bgcolor: '#FAFAFA' }}>
        {isAutoPrinted && (
          <Box sx={{ mb: 2, p: 1.2, bgcolor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle sx={{ color: '#16A34A', fontSize: 20 }} />
            <Typography variant="caption" sx={{ color: '#166534', fontWeight: 700 }}>
              New Order Received & Sent to Thermal Printer!
            </Typography>
          </Box>
        )}

        {/* 80mm Thermal Receipt Styled Printable Container */}
        <Box
          id="invoice-thermal-receipt"
          sx={{
            fontFamily: '"Courier New", Courier, monospace',
            bgcolor: 'white',
            p: 2.5,
            border: '1px dashed #CBD5E1',
            borderRadius: '8px',
            color: '#000000',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, fontSize: '18px', letterSpacing: 0.5 }}>
              PALA PITTA RUCHULU
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', fontSize: '11px', fontWeight: 600 }}>
              Authentic Telangana & Hyderabadi Cuisine
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', fontSize: '10px' }}>
              {restaurantInfo.addressLine} | Ph: {restaurantInfo.phoneDisplay}
            </Typography>
          </Box>

          <Divider sx={{ borderStyle: 'dashed', my: 1, borderColor: '#000' }} />

          {/* Order Details */}
          <Box sx={{ fontSize: '12px', mb: 1 }}>
            {invoiceNo && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Invoice #: <strong>{invoiceNo}</strong></span>
              </Box>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Order #: <strong>{order.id}</strong></span>
              <span>Type: <strong>{(order.orderType || 'takeaway').replace('-', ' ').toUpperCase()}</strong></span>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
              <span>Date: {formattedDate}</span>
              <span>Time: {formattedTime}</span>
            </Box>
            <Box sx={{ mt: 0.5 }}>
              Customer: <strong>{order.customerName || 'Walk-in Diner'}</strong> ({order.customerPhone || 'N/A'})
            </Box>
            {order.tableNumber && (
              <Box sx={{ mt: 0.5, fontWeight: 800 }}>
                TABLE NO: #{order.tableNumber}
              </Box>
            )}
          </Box>

          <Divider sx={{ borderStyle: 'dashed', my: 1, borderColor: '#000' }} />

          {/* Items Table */}
          <Box sx={{ fontSize: '12px', mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, pb: 0.5, borderBottom: '1px solid #000' }}>
              <span style={{ flex: 2 }}>ITEM</span>
              <span style={{ width: 40, textAlign: 'center' }}>QTY</span>
              <span style={{ width: 60, textAlign: 'right' }}>AMT</span>
            </Box>

            {(order.items || []).map((item, idx) => (
              <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.6, borderBottom: '1px dotted #E2E8F0' }}>
                <span style={{ flex: 2, fontWeight: 700 }}>
                  {item.vegStatus === 'veg' ? '🟢' : '🔴'} {item.name}
                </span>
                <span style={{ width: 40, textAlign: 'center', fontWeight: 800 }}>
                  x{item.quantity}
                </span>
                <span style={{ width: 60, textAlign: 'right', fontWeight: 700 }}>
                  ₹{(item.price * item.quantity).toLocaleString()}
                </span>
              </Box>
            ))}
          </Box>

          <Divider sx={{ borderStyle: 'dashed', my: 1, borderColor: '#000' }} />

          {/* Totals */}
          <Stack spacing={0.4} sx={{ fontSize: '12px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal:</span>
              <span>₹{(order.subtotal || 0).toLocaleString()}</span>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>CGST (2.5%):</span>
              <span>₹{(order.cgst || 0).toFixed(2)}</span>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>SGST (2.5%):</span>
              <span>₹{(order.sgst || 0).toFixed(2)}</span>
            </Box>
            {order.discount && order.discount > 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Discount:</span>
                <span>-₹{order.discount}</span>
              </Box>
            ) : null}
            <Divider sx={{ borderStyle: 'solid', my: 0.5, borderColor: '#000' }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 900 }}>
              <span>GRAND TOTAL:</span>
              <span>₹{(order.grandTotal || order.subtotal || 0).toLocaleString()}</span>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700 }}>
              <span>Payment ({(order.paymentMode || 'cod').toUpperCase()}):</span>
              <span>{order.paymentStatus === 'paid' ? 'PAID ✓' : 'UNPAID — COLLECT AT COUNTER'}</span>
            </Box>
          </Stack>

          <Divider sx={{ borderStyle: 'dashed', my: 1.5, borderColor: '#000' }} />

          {/* Order tracking QR */}
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
            <QRCodeCanvas value={`https://palapittaruchulu.vercel.app/orders?id=${order.id}`} size={64} />
          </Box>

          {/* Footer */}
          <Box sx={{ textAlign: 'center', fontSize: '10px' }}>
            <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', fontSize: '11px' }}>
              Thank You! Visit Again 🌶️
            </Typography>
            {(restaurantInfo.gstin || restaurantInfo.fssai) && (
              <span>
                {restaurantInfo.gstin && `GSTIN: ${restaurantInfo.gstin}`}
                {restaurantInfo.gstin && restaurantInfo.fssai && ' | '}
                {restaurantInfo.fssai && `FSSAI: ${restaurantInfo.fssai}`}
              </span>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: '10px', color: '#64748B', borderColor: '#CBD5E1' }}>
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
            boxShadow: '0 4px 12px rgba(198,40,40,0.3)',
            '&:hover': { bgcolor: '#B71C1C' },
          }}
        >
          Print 80mm Receipt
        </Button>
      </DialogActions>
    </Dialog>
  );
}
