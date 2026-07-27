'use client';

import React, { useState, useMemo } from 'react';
import {
  Box, Grid, Typography, Chip, Button, TextField,
  Table, TableBody, TableCell, TableHead, TableRow,
  Dialog, DialogContent, DialogActions, InputAdornment, Stack,
  Paper, IconButton, Tooltip,
} from '@mui/material';
import {
  Search, Print, Visibility, PointOfSale, ReceiptLong, Close,
} from '@mui/icons-material';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { Order } from '@/types';
import { PageHeader, StatCard, SectionCard, adminColors } from '@/components/admin/ui';
import ThermalBill from '@/components/bill/ThermalBill';
import PrintBillPortal from '@/components/bill/PrintBillPortal';
import { rupees } from '@/lib/billing';

export default function GeneratedBillsPage() {
  const { orders } = useAdmin();
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'upi' | 'card'>('all');
  const [selectedBillOrder, setSelectedBillOrder] = useState<Order | null>(null);
  const [reprintOrder, setReprintOrder] = useState<Order | null>(null);

  // Filter bills
  const filteredBills = useMemo(() => {
    return orders.filter((o) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        o.id.toLowerCase().includes(q) ||
        (o.orderId && o.orderId.toLowerCase().includes(q)) ||
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        (o.customerPhone && o.customerPhone.includes(q));

      const matchPayment = paymentFilter === 'all' || o.paymentMode === paymentFilter;

      return matchSearch && matchPayment;
    });
  }, [orders, search, paymentFilter]);

  // Statistics
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let cashRevenue = 0;
    let upiRevenue = 0;
    let cardRevenue = 0;

    orders.forEach((o) => {
      const amount = o.grandTotal || 0;
      totalRevenue += amount;
      if (o.paymentMode === 'cash') cashRevenue += amount;
      else if (o.paymentMode === 'upi') upiRevenue += amount;
      else if (o.paymentMode === 'card') cardRevenue += amount;
    });

    return {
      totalCount: orders.length,
      totalRevenue,
      cashRevenue,
      upiRevenue,
      cardRevenue,
    };
  }, [orders]);

  const handlePrint = (order: Order) => {
    setReprintOrder(order);
    requestAnimationFrame(() => {
      window.print();
      setTimeout(() => setReprintOrder(null), 2000);
    });
  };

  return (
    <AdminLayout title="Generated Bills History">
      {/* Mounted while re-printing to direct output to 80mm thermal receipt */}
      {reprintOrder && <PrintBillPortal order={reprintOrder} invoiceNo={reprintOrder.id} />}

      <PageHeader
        title="Generated Bills & Revenue"
        subtitle={`Viewing ${filteredBills.length} of ${orders.length} generated bills`}
      />

      {/* Summary Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            icon="📑"
            label="Total Bills"
            value={stats.totalCount}
            accent={adminColors.brand}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            icon="💵"
            label="Cash Collections"
            value={rupees(stats.cashRevenue)}
            accent={adminColors.success}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            icon="📱"
            label="UPI Collections"
            value={rupees(stats.upiRevenue)}
            accent="#7C3AED"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            icon="💳"
            label="Card Collections"
            value={rupees(stats.cardRevenue)}
            accent="#2563EB"
          />
        </Grid>
      </Grid>

      {/* Filter and Search Bar */}
      <SectionCard noPadding>
        <Box
          sx={{
            p: 2,
            display: 'flex',
            gap: 1.5,
            alignItems: 'center',
            flexWrap: 'wrap',
            borderBottom: `1px solid ${adminColors.divider}`,
            bgcolor: adminColors.bgPanel,
          }}
        >
          <TextField
            size="small"
            placeholder="Search by Bill No, Order ID, Customer or Phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: '1 1 240px', minWidth: 200 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: '#9E9E9E', fontSize: 18 }} />
                  </InputAdornment>
                ),
              },
            }}
          />

          {/* Payment filter chips */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {(
              [
                { mode: 'all', label: 'All Payments', emoji: '🏬' },
                { mode: 'cash', label: 'Cash', emoji: '💵' },
                { mode: 'upi', label: 'UPI', emoji: '📱' },
                { mode: 'card', label: 'Card', emoji: '💳' },
              ] as const
            ).map((p) => (
              <Chip
                key={p.mode}
                label={`${p.emoji} ${p.label}`}
                onClick={() => setPaymentFilter(p.mode)}
                sx={{
                  fontWeight: paymentFilter === p.mode ? 800 : 500,
                  bgcolor: paymentFilter === p.mode ? adminColors.brand : adminColors.neutralBg,
                  color: paymentFilter === p.mode ? '#FFFFFF' : adminColors.textSecondary,
                  cursor: 'pointer',
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Bills Table */}
        {filteredBills.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center', color: adminColors.textMuted }}>
            <ReceiptLong sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              No bills found
            </Typography>
            <Typography variant="body2" sx={{ fontSize: 13 }}>
              Try adjusting your search query or payment filter
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead sx={{ bgcolor: adminColors.bgSubtle }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Bill / Order No</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Date & Time</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Payment Mode</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Items</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredBills.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 800, fontSize: 13, color: adminColors.textPrimary }}>
                        {order.id}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ fontSize: 12.5, color: adminColors.textSecondary }}>
                        {order.orderDate} {order.orderTime}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: adminColors.textPrimary }}>
                        {order.customerName || 'Walk-in'}
                      </Typography>
                      {order.customerPhone && (
                        <Typography sx={{ fontSize: 11, color: adminColors.textMuted }}>
                          {order.customerPhone}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={order.orderType === 'dine-in' ? `Table ${order.tableNumber || ''}` : 'Counter'}
                        size="small"
                        sx={{
                          fontWeight: 700, fontSize: 11,
                          bgcolor: order.orderType === 'dine-in' ? '#EFF6FF' : '#F5F5F4',
                          color: order.orderType === 'dine-in' ? '#1D4ED8' : '#44403C',
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={(order.paymentMode || 'cash').toUpperCase()}
                        size="small"
                        sx={{
                          fontWeight: 800, fontSize: 11,
                          bgcolor:
                            order.paymentMode === 'cash'
                              ? '#F0FDF4'
                              : order.paymentMode === 'upi'
                              ? '#F5F3FF'
                              : '#EFF6FF',
                          color:
                            order.paymentMode === 'cash'
                              ? '#15803D'
                              : order.paymentMode === 'upi'
                              ? '#7C3AED'
                              : '#1D4ED8',
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ fontSize: 12.5, color: adminColors.textSecondary }}>
                        {(order.items || []).length} item{(order.items || []).length === 1 ? '' : 's'}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ textAlign: 'right' }}>
                      <Typography sx={{ fontWeight: 900, fontSize: 13.5, color: adminColors.brand }}>
                        {rupees(order.grandTotal || 0)}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title="View Receipt Details">
                          <IconButton
                            size="small"
                            onClick={() => setSelectedBillOrder(order)}
                            sx={{ color: adminColors.textSecondary }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Reprint 80mm Receipt">
                          <IconButton
                            size="small"
                            onClick={() => handlePrint(order)}
                            sx={{ color: adminColors.brand }}
                          >
                            <Print fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </SectionCard>

      {/* Bill View Modal */}
      {selectedBillOrder && (
        <Dialog
          open={!!selectedBillOrder}
          onClose={() => setSelectedBillOrder(null)}
          maxWidth="xs"
          fullWidth
          slotProps={{ paper: { sx: { borderRadius: '16px', overflow: 'hidden' } } }}
        >
          <Box sx={{ p: 2, bgcolor: adminColors.textPrimary, color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PointOfSale sx={{ color: adminColors.accent }} />
              <Typography sx={{ fontWeight: 800, fontSize: 15 }}>Bill Preview</Typography>
            </Box>
            <IconButton size="small" onClick={() => setSelectedBillOrder(null)} sx={{ color: '#FFFFFF' }}>
              <Close fontSize="small" />
            </IconButton>
          </Box>

          <DialogContent sx={{ p: 2, bgcolor: '#F5F5F4' }}>
            <Box sx={{ bgcolor: '#FFFFFF', border: '1px dashed #CBD5E1', borderRadius: '10px', py: 1 }}>
              <ThermalBill order={selectedBillOrder} invoiceNo={selectedBillOrder.id} />
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 2, gap: 1, borderTop: `1px solid ${adminColors.border}` }}>
            <Button
              fullWidth variant="contained"
              onClick={() => {
                handlePrint(selectedBillOrder);
                setSelectedBillOrder(null);
              }}
              startIcon={<Print />}
              sx={{ minHeight: 44, borderRadius: '10px', fontWeight: 800, bgcolor: adminColors.brand }}
            >
              Print Bill
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </AdminLayout>
  );
}
