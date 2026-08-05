'use client';
import React, { useState, useMemo } from 'react';
import {
  Box, Paper, Typography, Grid, Chip, Table, TableBody,
  TableCell, TableHead, TableRow, IconButton, Tooltip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControlLabel, Switch, CircularProgress, Alert, useMediaQuery, useTheme,
  InputAdornment, Card, CardContent, Divider, Stack,
} from '@mui/material';
import {
  Edit, Delete, Add, LocalOffer, Close, Search,
  WarningAmber,
} from '@mui/icons-material';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  useGetCouponsQuery, useAddCouponMutation, useUpdateCouponMutation, useDeleteCouponMutation, Coupon,
} from '@/store/supabaseApi';
import toast from 'react-hot-toast';
import { PageHeader, StatCard, adminColors } from '@/components/admin/ui';

interface FormState {
  code: string;
  discount: string;
  maxDiscount: string;
  minOrder: string;
  description: string;
  isActive: boolean;
}

interface FormErrors {
  code?: string;
  discount?: string;
  maxDiscount?: string;
  minOrder?: string;
}

const defaultFormState: FormState = {
  code: '',
  discount: '10',
  maxDiscount: '100',
  minOrder: '0',
  description: '',
  isActive: true,
};

export default function CouponsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { data: coupons = [], isLoading } = useGetCouponsQuery();
  const [addCoupon] = useAddCouponMutation();
  const [updateCoupon] = useUpdateCouponMutation();
  const [deleteCoupon] = useDeleteCouponMutation();

  // Search and Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Form Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  // Delete Confirmation state
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filtered coupons
  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      const matchesSearch =
        c.code.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase().trim());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && c.isActive) ||
        (statusFilter === 'inactive' && !c.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [coupons, searchQuery, statusFilter]);

  const activeCount = useMemo(() => coupons.filter((c) => c.isActive).length, [coupons]);
  const avgDiscount = useMemo(() => {
    if (coupons.length === 0) return 0;
    const total = coupons.reduce((acc, c) => acc + c.discount, 0);
    return Math.round(total / coupons.length);
  }, [coupons]);

  const openAddDialog = () => {
    setEditingCode(null);
    setForm(defaultFormState);
    setErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (c: Coupon) => {
    setEditingCode(c.code);
    setForm({
      code: c.code,
      discount: String(c.discount),
      maxDiscount: String(c.maxDiscount),
      minOrder: String(c.minOrder),
      description: c.description || '',
      isActive: c.isActive,
    });
    setErrors({});
    setDialogOpen(true);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    const code = form.code.trim().toUpperCase();

    if (!code) {
      newErrors.code = 'Coupon code is required';
    } else if (!/^[A-Z0-9]{3,20}$/.test(code)) {
      newErrors.code = '3–20 alphanumeric characters, no spaces';
    } else if (!editingCode && coupons.some((c) => c.code.toUpperCase() === code)) {
      newErrors.code = 'Coupon code already exists';
    }

    const discountNum = Number(form.discount);
    if (form.discount === '' || isNaN(discountNum) || discountNum <= 0 || discountNum > 100) {
      newErrors.discount = 'Must be between 1% and 100%';
    }

    const maxDiscountNum = Number(form.maxDiscount);
    if (form.maxDiscount === '' || isNaN(maxDiscountNum) || maxDiscountNum <= 0) {
      newErrors.maxDiscount = 'Max discount cap must be greater than ₹0';
    }

    const minOrderNum = Number(form.minOrder);
    if (form.minOrder === '' || isNaN(minOrderNum) || minOrderNum < 0) {
      newErrors.minOrder = 'Minimum order cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    const code = form.code.trim().toUpperCase();
    const payload: Coupon = {
      code,
      discount: Number(form.discount),
      maxDiscount: Number(form.maxDiscount),
      minOrder: Number(form.minOrder) || 0,
      description: form.description.trim(),
      isActive: form.isActive,
    };

    try {
      const result = editingCode ? await updateCoupon(payload) : await addCoupon(payload);
      if ('error' in result && result.error) {
        const errorMsg = (result.error as { error?: string })?.error || 'Failed to save coupon';
        toast.error(errorMsg);
        return;
      }
      toast.success(editingCode ? `Coupon ${code} updated` : `Coupon ${code} created`);
      setDialogOpen(false);
    } catch {
      toast.error('An unexpected error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (code: string) => {
    setDeletingCode(code);
  };

  const handleDelete = async () => {
    if (!deletingCode) return;
    setDeleting(true);
    try {
      const result = await deleteCoupon(deletingCode);
      if ('error' in result && result.error) {
        toast.error((result.error as { error?: string })?.error || 'Failed to delete coupon');
      } else {
        toast.success(`Coupon ${deletingCode} deleted`);
      }
    } catch {
      toast.error('Failed to delete coupon');
    } finally {
      setDeleting(false);
      setDeletingCode(null);
    }
  };

  const handleToggleActive = async (c: Coupon) => {
    try {
      const result = await updateCoupon({ ...c, isActive: !c.isActive });
      if ('error' in result && result.error) {
        toast.error('Failed to update status');
      } else {
        toast.success(`Coupon ${c.code} is now ${!c.isActive ? 'Active' : 'Inactive'}`);
      }
    } catch {
      toast.error('Failed to toggle coupon status');
    }
  };

  return (
    <AdminLayout title="Coupons & Discounts">
      <PageHeader
        title="Coupons & Discounts"
        subtitle="Create and manage promo codes customers can apply at checkout."
      />

      {/* Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Coupons', value: coupons.length, emoji: '🎟️', accent: adminColors.info },
          { label: 'Active Codes', value: activeCount, emoji: '✅', accent: adminColors.success },
          { label: 'Inactive Codes', value: coupons.length - activeCount, emoji: '⏸️', accent: adminColors.neutral },
          { label: 'Avg Discount', value: `${avgDiscount}%`, emoji: '🏷️', accent: adminColors.warning },
        ].map((stat) => (
          <Grid key={stat.label} size={{ xs: 6, sm: 6, md: 3 }}>
            <StatCard icon={stat.emoji} label={stat.label} value={stat.value} accent={stat.accent} />
          </Grid>
        ))}
      </Grid>

      {/* Main Container */}
      <Paper sx={{ borderRadius: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {/* Header & Controls */}
        <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' } }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#212121' }}>All Coupons</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Showing {filteredCoupons.length} of {coupons.length} coupons
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Button
                variant="contained"
                onClick={openAddDialog}
                startIcon={<Add />}
                sx={{
                  borderRadius: '12px',
                  fontWeight: 700,
                  px: 2.5, py: 1,
                  background: 'linear-gradient(135deg, #C62828, #EF5350)',
                  boxShadow: '0 4px 12px rgba(198,40,40,0.3)',
                  '&:hover': { background: 'linear-gradient(135deg, #B71C1C, #E53935)' },
                }}
              >
                New Coupon
              </Button>
            </Stack>
          </Stack>

          {/* Search and Filters */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2.5, alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search coupon code or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ flex: 1, width: '100%' }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: '12px', bgcolor: '#FAFAFA' },
                },
              }}
            />

            <Box sx={{ display: 'flex', gap: 0.5, bgcolor: '#FAFAFA', p: 0.5, borderRadius: '12px', width: { xs: '100%', sm: 'auto' } }}>
              {(['all', 'active', 'inactive'] as const).map((st) => (
                <Button
                  key={st}
                  size="small"
                  onClick={() => setStatusFilter(st)}
                  sx={{
                    flex: { xs: 1, sm: 'initial' },
                    borderRadius: '8px',
                    px: 2, py: 0.5,
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'capitalize',
                    bgcolor: statusFilter === st ? '#FFFFFF' : 'transparent',
                    color: statusFilter === st ? '#C62828' : 'text.secondary',
                    boxShadow: statusFilter === st ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                    '&:hover': { bgcolor: statusFilter === st ? '#FFFFFF' : 'rgba(0,0,0,0.04)' },
                  }}
                >
                  {st}
                </Button>
              ))}
            </Box>
          </Stack>
        </Box>

        {/* Content Body */}
        {isLoading ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <CircularProgress size={36} sx={{ color: '#C62828' }} />
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5 }}>Loading coupons...</Typography>
          </Box>
        ) : filteredCoupons.length === 0 ? (
          <Box sx={{ py: 8, px: 2, textAlign: 'center' }}>
            <LocalOffer sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {searchQuery || statusFilter !== 'all' ? 'No matching coupons found' : 'No coupons created yet'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, maxWidth: 360, mx: 'auto' }}>
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search query or status filter.'
                : 'Create promotional discount codes to boost customer orders.'}
            </Typography>
            {!searchQuery && statusFilter === 'all' && (
              <Button
                variant="outlined"
                onClick={openAddDialog}
                startIcon={<Add />}
                sx={{ borderRadius: '10px', color: '#C62828', borderColor: '#C62828' }}
              >
                Create First Coupon
              </Button>
            )}
          </Box>
        ) : isMobile ? (
          /* Mobile Card View */
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredCoupons.map((c) => (
              <Card
                key={c.code}
                variant="outlined"
                sx={{
                  borderRadius: '16px',
                  borderColor: 'rgba(0,0,0,0.08)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Chip
                      label={c.code}
                      sx={{
                        bgcolor: c.isActive ? 'rgba(198,40,40,0.08)' : 'rgba(0,0,0,0.06)',
                        color: c.isActive ? '#C62828' : 'text.secondary',
                        fontWeight: 800,
                        fontSize: '13px',
                        borderRadius: '8px',
                        px: 0.5,
                      }}
                    />
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                      <Switch
                        size="small"
                        checked={c.isActive}
                        onChange={() => handleToggleActive(c)}
                        color="success"
                      />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: c.isActive ? 'success.main' : 'text.disabled' }}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </Typography>
                    </Stack>
                  </Stack>

                  <Grid container spacing={1.5} sx={{ mb: 1.5, bgcolor: '#FAFAFA', p: 1.5, borderRadius: '12px' }}>
                    <Grid size={{ xs: 4 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Discount</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#C62828' }}>{c.discount}%</Typography>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Max Cap</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>₹{c.maxDiscount}</Typography>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Min Order</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>₹{c.minOrder}</Typography>
                    </Grid>
                  </Grid>

                  {c.description && (
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '13px', mb: 1.5 }}>
                      {c.description}
                    </Typography>
                  )}

                  <Divider sx={{ my: 1 }} />

                  <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                    <Button
                      size="small"
                      startIcon={<Edit sx={{ fontSize: 16 }} />}
                      onClick={() => openEditDialog(c)}
                      sx={{ color: '#1565C0', borderRadius: '8px' }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      startIcon={<Delete sx={{ fontSize: 16 }} />}
                      onClick={() => confirmDelete(c.code)}
                      sx={{ color: '#C62828', borderRadius: '8px' }}
                    >
                      Delete
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          /* Desktop Table View */
          <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 760 }}>
              <TableHead sx={{ bgcolor: '#FAFAFA' }}>
                <TableRow>
                  {['Code', 'Discount', 'Max Discount', 'Min Order', 'Description', 'Status', 'Actions'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '12px', color: '#616161', py: 1.8, whiteSpace: 'nowrap' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCoupons.map((c) => (
                  <TableRow key={c.code} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Chip
                        label={c.code}
                        size="small"
                        sx={{
                          bgcolor: c.isActive ? 'rgba(198,40,40,0.08)' : 'rgba(0,0,0,0.06)',
                          color: c.isActive ? '#C62828' : 'text.secondary',
                          fontWeight: 800,
                          fontSize: '12px',
                          borderRadius: '6px',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#C62828' }}>{c.discount}%</Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>₹{c.maxDiscount}</Typography></TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>₹{c.minOrder}</Typography></TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 260, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {c.description || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                        <Switch size="small" checked={c.isActive} onChange={() => handleToggleActive(c)} color="success" />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: c.isActive ? 'success.main' : 'text.disabled' }}>
                          {c.isActive ? 'Active' : 'Inactive'}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Edit Coupon">
                          <IconButton size="small" onClick={() => openEditDialog(c)}>
                            <Edit sx={{ fontSize: 18, color: '#1565C0' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Coupon">
                          <IconButton size="small" onClick={() => confirmDelete(c.code)}>
                            <Delete sx={{ fontSize: 18, color: '#C62828' }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>

      {/* Add / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        fullScreen={isMobile}
        slotProps={{
          paper: { sx: { borderRadius: isMobile ? 0 : '20px', p: 0.5 } },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <LocalOffer sx={{ color: '#C62828' }} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>{editingCode ? 'Edit Coupon' : 'New Coupon'}</Typography>
          </Stack>
          <IconButton size="small" onClick={() => setDialogOpen(false)} disabled={saving} aria-label="Close">
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ borderTop: '1px solid rgba(0,0,0,0.06)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.2, pt: 1 }}>
            <TextField
              label="Coupon Code"
              value={form.code}
              onChange={(e) => {
                const upper = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                setForm({ ...form, code: upper });
                if (errors.code) setErrors({ ...errors, code: undefined });
              }}
              disabled={!!editingCode}
              placeholder="e.g. PALAPITTA10"
              fullWidth
              error={Boolean(errors.code)}
              helperText={errors.code || (editingCode ? 'Coupon codes cannot be changed after creation' : '3-20 letters/numbers (spaces automatically removed)')}
            />

            <TextField
              label="Discount Percentage"
              type="number"
              value={form.discount}
              onChange={(e) => {
                setForm({ ...form, discount: e.target.value });
                if (errors.discount) setErrors({ ...errors, discount: undefined });
              }}
              fullWidth
              error={Boolean(errors.discount)}
              helperText={errors.discount || 'Percentage off total order (1–100%)'}
              slotProps={{
                input: {
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                },
                htmlInput: { min: 1, max: 100 },
              }}
            />

            <TextField
              label="Maximum Discount Cap"
              type="number"
              value={form.maxDiscount}
              onChange={(e) => {
                setForm({ ...form, maxDiscount: e.target.value });
                if (errors.maxDiscount) setErrors({ ...errors, maxDiscount: undefined });
              }}
              fullWidth
              error={Boolean(errors.maxDiscount)}
              helperText={errors.maxDiscount || 'Maximum discount cap in ₹ for this code'}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                },
                htmlInput: { min: 1 },
              }}
            />

            <TextField
              label="Minimum Order Subtotal"
              type="number"
              value={form.minOrder}
              onChange={(e) => {
                setForm({ ...form, minOrder: e.target.value });
                if (errors.minOrder) setErrors({ ...errors, minOrder: undefined });
              }}
              fullWidth
              error={Boolean(errors.minOrder)}
              helperText={errors.minOrder || 'Min order subtotal required (set 0 for no minimum)'}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                },
                htmlInput: { min: 0 },
              }}
            />

            <TextField
              label="Description (Optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              multiline
              rows={2}
              fullWidth
              placeholder="e.g. Special festive 10% discount on all family platters"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  color="success"
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Active (visible & usable by customers at checkout)
                </Typography>
              }
            />

            {!editingCode && (
              <Alert severity="info" sx={{ borderRadius: '12px', fontSize: '12px' }}>
                Codes are converted to uppercase and matched case-insensitively when customers apply them at checkout.
              </Alert>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, pb: isMobile ? 'max(20px, env(safe-area-inset-bottom, 0px))' : 2.5 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit" disabled={saving} sx={{ borderRadius: '10px' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving}
            sx={{
              borderRadius: '10px',
              px: 3,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #C62828, #EF5350)',
              '&:hover': { background: 'linear-gradient(135deg, #B71C1C, #E53935)' },
            }}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : editingCode ? 'Update Coupon' : 'Create Coupon'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deletingCode)}
        onClose={() => !deleting && setDeletingCode(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: '20px', p: 1 } },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmber sx={{ color: '#C62828' }} />
          Delete Coupon {deletingCode}?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete coupon <strong>{deletingCode}</strong>?
            Customers will no longer be able to redeem this code at checkout. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeletingCode(null)} color="inherit" disabled={deleting} sx={{ borderRadius: '10px' }}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            disabled={deleting}
            sx={{ borderRadius: '10px', fontWeight: 700, px: 2.5 }}
          >
            {deleting ? <CircularProgress size={20} color="inherit" /> : 'Yes, Delete Coupon'}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}
