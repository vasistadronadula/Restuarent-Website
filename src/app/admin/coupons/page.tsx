'use client';
import React, { useState } from 'react';
import {
  Box, Paper, Typography, Grid, Chip, Table, TableBody,
  TableCell, TableHead, TableRow, IconButton, Tooltip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControlLabel, Switch, CircularProgress, Alert, useMediaQuery, useTheme,
} from '@mui/material';
import { Edit, Delete, Add, LocalOffer, Close } from '@mui/icons-material';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  useGetCouponsQuery, useAddCouponMutation, useUpdateCouponMutation, useDeleteCouponMutation, Coupon,
} from '@/store/supabaseApi';
import toast from 'react-hot-toast';
import { PageHeader, StatCard, adminColors } from '@/components/admin/ui';

const emptyForm: Coupon = { code: '', discount: 10, maxDiscount: 100, minOrder: 0, description: '', isActive: true };

export default function CouponsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { data: coupons = [], isLoading } = useGetCouponsQuery();
  const [addCoupon] = useAddCouponMutation();
  const [updateCoupon] = useUpdateCouponMutation();
  const [deleteCoupon] = useDeleteCouponMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [form, setForm] = useState<Coupon>(emptyForm);
  const [saving, setSaving] = useState(false);

  const activeCount = coupons.filter((c) => c.isActive).length;

  const openAddDialog = () => {
    setEditingCode(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (c: Coupon) => {
    setEditingCode(c.code);
    setForm(c);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const code = form.code.trim().toUpperCase();
    if (!code) { toast.error('Coupon code is required'); return; }
    if (!/^[A-Z0-9]{3,20}$/.test(code)) {
      toast.error('Use 3–20 letters and numbers, no spaces');
      return;
    }
    if (!editingCode && coupons.some((c) => c.code === code)) {
      toast.error('A coupon with this code already exists');
      return;
    }
    // These go straight into the customer's bill total, so a typo here is a
    // pricing bug on the storefront — not something to discover later.
    if (!Number.isFinite(form.discount) || form.discount <= 0 || form.discount > 100) {
      toast.error('Discount must be between 1 and 100%');
      return;
    }
    if (!Number.isFinite(form.maxDiscount) || form.maxDiscount <= 0) {
      toast.error('Set the maximum discount amount in ₹');
      return;
    }
    if (!Number.isFinite(form.minOrder) || form.minOrder < 0) {
      toast.error('Minimum order cannot be negative');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, code, description: form.description.trim() };
      const result = editingCode ? await updateCoupon(payload) : await addCoupon(payload);
      if ('error' in result && result.error) {
        toast.error((result.error as { error?: string }).error || 'Failed to save coupon');
        return;
      }
      toast.success(editingCode ? 'Coupon updated' : 'Coupon created');
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (code: string) => {
    // A live promo code vanishing from the storefront is not something to do
    // on a single mis-tap.
    if (!confirm(`Delete coupon ${code}? Customers will no longer be able to use it.`)) return;
    const result = await deleteCoupon(code);
    if ('error' in result && result.error) {
      toast.error((result.error as { error?: string })?.error || 'Failed to delete coupon');
      return;
    }
    toast.success(`Coupon ${code} deleted`);
  };

  const handleToggleActive = async (c: Coupon) => {
    const result = await updateCoupon({ ...c, isActive: !c.isActive });
    if ('error' in result && result.error) {
      toast.error('Failed to update coupon');
    }
  };

  return (
    <AdminLayout title="Coupons & Discounts">
      <PageHeader title="Coupons & Discounts" subtitle="Create and manage promo codes customers can apply at checkout." />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Coupons', value: coupons.length, emoji: '🎟️', accent: adminColors.info },
          { label: 'Active', value: activeCount, emoji: '✅', accent: adminColors.success },
          { label: 'Inactive', value: coupons.length - activeCount, emoji: '⏸️', accent: adminColors.neutral },
        ].map((stat) => (
          <Grid key={stat.label} size={{ xs: 6, md: 4 }}>
            <StatCard icon={stat.emoji} label={stat.label} value={stat.value} accent={stat.accent} />
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ borderRadius: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>All Coupons</Typography>
          <Button
            variant="contained" size="small" color="primary" startIcon={<Add />}
            onClick={openAddDialog}
            sx={{ borderRadius: '10px', background: 'linear-gradient(135deg, #C62828, #EF5350)' }}
          >
            New Coupon
          </Button>
        </Box>

        {isLoading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
        ) : coupons.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
            <LocalOffer sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
            <Typography>No coupons yet. Create one to start offering discounts.</Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 760 }}>
              <TableHead sx={{ bgcolor: '#FAFAFA' }}>
                <TableRow>
                  {['Code', 'Discount', 'Max Discount', 'Min Order', 'Description', 'Status', 'Actions'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '12px', color: '#616161', py: 1.5, whiteSpace: 'nowrap' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {coupons.map((c) => (
                  <TableRow key={c.code} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Chip label={c.code} size="small" sx={{ bgcolor: 'rgba(198,40,40,0.08)', color: '#C62828', fontWeight: 800 }} />
                    </TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{c.discount}%</Typography></TableCell>
                    <TableCell><Typography variant="body2">₹{c.maxDiscount}</Typography></TableCell>
                    <TableCell><Typography variant="body2">₹{c.minOrder}</Typography></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary" sx={{ maxWidth: 260 }}>{c.description}</Typography></TableCell>
                    <TableCell>
                      <Switch size="small" checked={c.isActive} onChange={() => handleToggleActive(c)} color="success" />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit Coupon">
                        <IconButton size="small" onClick={() => openEditDialog(c)}>
                          <Edit sx={{ fontSize: 18, color: '#1565C0' }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Coupon">
                        <IconButton size="small" onClick={() => handleDelete(c.code)}>
                          <Delete sx={{ fontSize: 18, color: '#C62828' }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {editingCode ? 'Edit Coupon' : 'New Coupon'}
          {isMobile && (
            <IconButton size="small" onClick={() => setDialogOpen(false)} aria-label="Close">
              <Close fontSize="small" />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.2, pt: 1 }}>
            <TextField
              label="Coupon Code" value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              disabled={!!editingCode}
              placeholder="e.g. PALAPITTA10"
              fullWidth
            />
            <TextField
              label="Discount (%)" type="number" value={form.discount}
              onChange={(e) => {
                const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                setForm({ ...form, discount: val });
              }}
              fullWidth
              slotProps={{ htmlInput: { min: 0, max: 100 } }}
            />
            <TextField
              label="Max Discount (₹)" type="number" value={form.maxDiscount}
              onChange={(e) => {
                const val = Math.max(0, Number(e.target.value) || 0);
                setForm({ ...form, maxDiscount: val });
              }}
              fullWidth
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <TextField
              label="Minimum Order (₹)" type="number" value={form.minOrder}
              onChange={(e) => {
                const val = Math.max(0, Number(e.target.value) || 0);
                setForm({ ...form, minOrder: val });
              }}
              fullWidth
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <TextField
              label="Description" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              multiline rows={2} fullWidth
            />
            <FormControlLabel
              control={<Switch checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} color="success" />}
              label="Active (visible to customers at checkout)"
            />
            {!editingCode && (
              <Alert severity="info" sx={{ borderRadius: '10px', fontSize: '12px' }}>
                Codes are matched exactly (case-insensitive) against what customers type in at checkout.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1, pb: isMobile ? 'max(20px, env(safe-area-inset-bottom, 0px))' : 2.5 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">Cancel</Button>
          <Button
            onClick={handleSave} variant="contained" disabled={saving}
            sx={{ borderRadius: '10px', background: 'linear-gradient(135deg, #C62828, #EF5350)' }}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Save Coupon'}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}
