'use client';
import React, { useState } from 'react';
import {
  Box, Paper, Typography, Grid, Button, TextField, Divider, Chip,
  Select, MenuItem as MuiMenuItem, FormControl, InputLabel, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, Alert,
} from '@mui/material';
import { Print, WhatsApp, ContentCopy, QrCode, LocalOffer } from '@mui/icons-material';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { orders } from '@/data/mockData';
import { QRCodeCanvas } from 'qrcode.react';

const RESTAURANT = {
  name: 'Pala Pitta Ruchulu',
  address: '12-3-456, Royal Complex, Banjara Hills, Hyderabad – 500034',
  phone: '+91 98765 43210',
  email: 'info@palapittaruchulu.in',
  gstin: '36AAACR1234F1Z5',
  fssai: '10020011003457',
};

export default function BillsPage() {
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0].id);
  const [discount, setDiscount] = useState(0);
  const [showBill, setShowBill] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const order = orders.find((o) => o.id === selectedOrderId)!;
  const invoiceNo = `INV-2026-${String(Math.abs(parseInt(selectedOrderId.replace('o', ''))) * 154).padStart(4, '0')}`;
  const discountAmount = (order.subtotal * discount) / 100;
  const taxableAmount = order.subtotal - discountAmount;
  const cgst = parseFloat((taxableAmount * 0.025).toFixed(2));
  const sgst = parseFloat((taxableAmount * 0.025).toFixed(2));
  const grandTotal = parseFloat((taxableAmount + cgst + sgst + (order.deliveryCharge || 0)).toFixed(2));

  const whatsappMsg = encodeURIComponent(
    `Hello ${order.customerName}! 🙏\n\nThank you for visiting *Pala Pitta Ruchulu*.\n\nInvoice No: *${invoiceNo}*\nTotal Amount: *₹${grandTotal.toLocaleString()}*\n\nItems:\n${order.items.map(i => `• ${i.name} x${i.quantity} — ₹${i.price * i.quantity}`).join('\n')}\n\nWe hope to serve you again soon! 😊\n\n📍 Banjara Hills, Hyderabad\n📞 +91 98765 43210`
  );

  return (
    <AdminLayout title="Bills & Invoice">
      <Grid container spacing={3}>
        {/* Left – Controls */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, borderRadius: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', mb: 3 }}>
            <Typography variant="h6" sx={{fontWeight: 700, mb: 2.5}}>Generate Bill</Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Order</InputLabel>
              <Select value={selectedOrderId} label="Select Order"
                onChange={(e) => { setSelectedOrderId(e.target.value); setShowBill(false); }}>
                {orders.map((o) => (
                  <MuiMenuItem key={o.id} value={o.id}>
                    {o.orderId} – {o.customerName}
                  </MuiMenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth label="Discount (%)" type="number"
              value={discount} onChange={(e) => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
              slotProps={{
                htmlInput: { min: 0, max: 100 },
                input: { startAdornment: <LocalOffer sx={{ mr: 1, color: '#FF9800', fontSize: 20 }} /> },
              }}
              sx={{ mb: 2 }}
            />

            <Button
              fullWidth variant="contained" color="primary" size="large"
              onClick={() => setShowBill(true)}
              sx={{ mb: 1.5, borderRadius: '14px', background: 'linear-gradient(135deg, #C62828, #EF5350)', py: 1.5 }}
            >
              Generate Invoice
            </Button>

            {showBill && (
              <>
                <Button fullWidth variant="outlined" color="primary" startIcon={<Print />}
                  onClick={() => window.print()}
                  sx={{ mb: 1, borderRadius: '12px' }}>
                  Print Invoice
                </Button>
                <Button
                  fullWidth variant="contained"
                  startIcon={<WhatsApp />}
                  href={`https://wa.me/91${order.customerPhone.replace(/\D/g, '').slice(-10)}?text=${whatsappMsg}`}
                  target="_blank"
                  sx={{ mb: 1, borderRadius: '12px', bgcolor: '#25D366', '&:hover': { bgcolor: '#128C7E' } }}
                >
                  Share on WhatsApp
                </Button>
                <Button fullWidth variant="outlined" color="secondary" startIcon={<QrCode />}
                  onClick={() => setShowQR(!showQR)} sx={{ borderRadius: '12px' }}>
                  {showQR ? 'Hide' : 'Show'} Payment QR
                </Button>

                {showQR && (
                  <Box sx={{ textAlign: 'center', mt: 3, p: 2, bgcolor: 'white', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.08)' }}>
                    <Typography variant="caption" color="text.secondary" sx={{fontWeight: 600, display: 'block', mb: 1.5}}>
                      SCAN TO PAY VIA UPI
                    </Typography>
                    <QRCodeCanvas
                      value={`upi://pay?pa=palapittaruchulu@upi&pn=Royal%20Spice%20Restaurant&am=${grandTotal}&cu=INR&tn=${invoiceNo}`}
                      size={160}
                      level="H"
                    />
                    <Typography variant="caption" color="#C62828" sx={{fontWeight: 600, display: 'block', mt: 1.5}}>
                      palapittaruchulu@upi
                    </Typography>
                    <Typography variant="body2" color="primary" sx={{fontWeight: 800, mt: 0.5}}>
                      ₹{grandTotal.toLocaleString()}
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Paper>
        </Grid>

        {/* Right – Bill Preview */}
        <Grid size={{ xs: 12, md: 8 }}>
          {showBill ? (
            <Paper
              id="invoice-print"
              sx={{ p: 4, borderRadius: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', fontFamily: 'monospace' }}
            >
              {/* Invoice Header */}
              <Box sx={{ textAlign: 'center', mb: 3, pb: 2, borderBottom: '2px dashed rgba(0,0,0,0.15)' }}>
                <Typography variant="h4" color="#C62828" sx={{fontWeight: 800, fontFamily: 'Poppins'}}>
                  🍽️ Pala Pitta Ruchulu
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{mt: 0.5}}>{RESTAURANT.address}</Typography>
                <Typography variant="body2" color="text.secondary">{RESTAURANT.phone} | {RESTAURANT.email}</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">GSTIN: {RESTAURANT.gstin}</Typography>
                  <Typography variant="caption" color="text.secondary">FSSAI: {RESTAURANT.fssai}</Typography>
                </Box>
              </Box>

              {/* Invoice Info */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary" sx={{display: 'block'}}>INVOICE NO</Typography>
                  <Typography color="#C62828" sx={{fontWeight: 700}}>{invoiceNo}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{display: 'block', mt: 1}}>DATE</Typography>
                  <Typography sx={{fontWeight: 600}}>{order.orderDate} {order.orderTime}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary" sx={{display: 'block'}}>CUSTOMER</Typography>
                  <Typography sx={{fontWeight: 700}}>{order.customerName}</Typography>
                  <Typography variant="body2" color="text.secondary">{order.customerPhone}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{display: 'block', mt: 1}}>PAYMENT</Typography>
                  <Chip label={order.paymentMode.toUpperCase()} size="small" color="primary" />
                </Grid>
              </Grid>

              {/* Items */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', bgcolor: '#C62828', color: 'white', px: 2, py: 1, borderRadius: '8px', mb: 1 }}>
                  {['ITEM', 'QTY', 'RATE', 'AMOUNT'].map((h, i) => (
                    <Typography key={h} variant="caption"
                      sx={{ flex: i === 0 ? 2 : 1, textAlign: i > 0 ? 'right' : 'left', fontWeight: 700 }}>{h}</Typography>
                  ))}
                </Box>
                {order.items.map((item, i) => (
                  <Box key={i} sx={{ display: 'flex', px: 2, py: 1, bgcolor: i % 2 === 0 ? '#FAFAFA' : 'white', borderRadius: '6px' }}>
                    <Box sx={{ flex: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box className={item.vegStatus === 'veg' ? 'veg-indicator' : 'non-veg-indicator'} />
                        <Typography variant="body2" sx={{fontWeight: 500}}>{item.name}</Typography>
                      </Box>
                    </Box>
                    <Typography variant="body2" sx={{ flex: 1, textAlign: 'right' }}>{item.quantity}</Typography>
                    <Typography variant="body2" sx={{ flex: 1, textAlign: 'right' }}>₹{item.price}</Typography>
                    <Typography variant="body2" sx={{fontWeight: 600, flex: 1, textAlign: 'right'}}>₹{(item.price * item.quantity).toLocaleString()}</Typography>
                  </Box>
                ))}
              </Box>

              <Divider sx={{ mb: 2, borderStyle: 'dashed' }} />

              {/* Totals */}
              <Box sx={{ maxWidth: 280, ml: 'auto' }}>
                <Stack spacing={0.8}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                    <Typography variant="body2">₹{order.subtotal.toLocaleString()}</Typography>
                  </Box>
                  {discount > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="success.main">Discount ({discount}%)</Typography>
                      <Typography variant="body2" color="success.main">-₹{discountAmount.toFixed(2)}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">CGST @2.5%</Typography>
                    <Typography variant="body2">₹{cgst}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">SGST @2.5%</Typography>
                    <Typography variant="body2">₹{sgst}</Typography>
                  </Box>
                  {order.deliveryCharge > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Delivery</Typography>
                      <Typography variant="body2">₹{order.deliveryCharge}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1.5, borderTop: '2px solid #C62828' }}>
                    <Typography variant="h6" sx={{fontWeight: 800}}>GRAND TOTAL</Typography>
                    <Typography variant="h6" color="#C62828" sx={{fontWeight: 800}}>₹{grandTotal.toLocaleString()}</Typography>
                  </Box>
                </Stack>
              </Box>

              <Divider sx={{ my: 3, borderStyle: 'dashed' }} />
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Thank you for visiting Pala Pitta Ruchulu!</Typography>
                <Typography variant="caption" color="text.secondary">Visit us again • +91 98765 43210 • palapittaruchulu.in</Typography>
              </Box>
            </Paper>
          ) : (
            <Box sx={{ textAlign: 'center', py: 12, color: '#9E9E9E' }}>
              <Typography sx={{ fontSize: '4rem', mb: 2 }}>🧾</Typography>
              <Typography variant="h6" sx={{fontWeight: 600}}>Select an order and click "Generate Invoice"</Typography>
              <Typography variant="body2">The bill preview will appear here</Typography>
            </Box>
          )}
        </Grid>
      </Grid>
    </AdminLayout>
  );
}
