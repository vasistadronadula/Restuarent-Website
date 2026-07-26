'use client';

import React, { useState } from 'react';
import {
  Box, Paper, Typography, Grid, Chip, LinearProgress, Alert, Button, IconButton,
  Table, TableBody, TableCell, TableHead, TableRow, Tooltip, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem as MuiMenuItem,
  FormControl, InputLabel, InputBase, useMediaQuery, useTheme,
} from '@mui/material';
import {
  Warning, Add, Edit, Delete, Close,
  Search, AddCircleOutlined, RemoveCircleOutlined,
} from '@mui/icons-material';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { InventoryItem } from '@/types';
import toast from 'react-hot-toast';
import { PageHeader, StatCard, adminColors } from '@/components/admin/ui';

const CATEGORIES = ['All', 'Poultry & Meat', 'Rice & Grains', 'Spices & Condiments', 'Dairy & Milk', 'Vegetables', 'Beverages'];
const UNITS = ['Kg', 'Grams', 'Liters', 'Packs', 'Units', 'Bags', 'Tins'];

export default function InventoryPage() {
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, adjustInventoryQuantity } = useAdmin();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'good'>('all');

  // Modal States
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Form State
  const [form, setForm] = useState({
    name: '',
    category: 'Poultry & Meat',
    quantity: '10',
    unit: 'Kg',
    minQuantity: '5',
    costPerUnit: '100',
  });

  const lowStock = inventory.filter((i) => i.quantity <= i.minQuantity);
  const goodStock = inventory.filter((i) => i.quantity > i.minQuantity);

  // Filtered List
  const filteredInventory = inventory.filter((item) => {
    const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const isLow = item.quantity <= item.minQuantity;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'low' && isLow) || (statusFilter === 'good' && !isLow);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStockLevel = (item: InventoryItem) => {
    const pct = (item.quantity / Math.max(item.minQuantity * 3, 1)) * 100;
    if (pct >= 70) return { color: '#2E7D32', label: 'In Stock', pct: Math.min(pct, 100) };
    if (pct >= 40) return { color: '#FF9800', label: 'Medium', pct };
    return { color: '#C62828', label: 'Low Stock ⚠️', pct: Math.max(pct, 8) };
  };

  const handleOpenAdd = () => {
    setForm({ name: '', category: 'Poultry & Meat', quantity: '10', unit: 'Kg', minQuantity: '5', costPerUnit: '100' });
    setOpenAddDialog(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setForm({
      name: item.name,
      category: item.category,
      quantity: String(item.quantity),
      unit: item.unit,
      minQuantity: String(item.minQuantity),
      costPerUnit: String(item.costPerUnit),
    });
    setOpenEditDialog(true);
  };

  const handleOpenDelete = (item: InventoryItem) => {
    setSelectedItem(item);
    setOpenDeleteDialog(true);
  };

  const handleAddSubmit = () => {
    if (!form.name.trim()) { toast.error('Item name required'); return; }
    const newItem: InventoryItem = {
      id: `INV-${Date.now().toString().slice(-6)}`,
      name: form.name.trim(),
      category: form.category,
      quantity: Number(form.quantity) || 0,
      unit: form.unit,
      minQuantity: Number(form.minQuantity) || 5,
      costPerUnit: Number(form.costPerUnit) || 0,
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    addInventoryItem(newItem);
    setOpenAddDialog(false);
  };

  const handleEditSubmit = () => {
    if (!selectedItem || !form.name.trim()) return;
    const updated: InventoryItem = {
      ...selectedItem,
      name: form.name.trim(),
      category: form.category,
      quantity: Number(form.quantity) || 0,
      unit: form.unit,
      minQuantity: Number(form.minQuantity) || 5,
      costPerUnit: Number(form.costPerUnit) || 0,
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    updateInventoryItem(updated);
    setOpenEditDialog(false);
  };

  const handleDeleteConfirm = () => {
    if (!selectedItem) return;
    deleteInventoryItem(selectedItem.id);
    setOpenDeleteDialog(false);
  };

  return (
    <AdminLayout title="Raw Inventory & Stock Control">
      <PageHeader title="Inventory" subtitle="Raw materials, safety thresholds, and stock valuation — updated in real time." />

      {/* Low Stock Banner Alert */}
      {lowStock.length > 0 && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '16px', border: '1px solid rgba(198,40,40,0.3)', bgcolor: '#FEF2F2' }}>
          <Typography sx={{ fontWeight: 800, color: adminColors.accentRed }}>
            ⚠️ Urgent Action Needed: {lowStock.length} Raw Inventory Items Below Minimum Safety Threshold!
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Items affected: {lowStock.map((i) => `${i.name} (${i.quantity} ${i.unit})`).join(', ')}
          </Typography>
        </Alert>
      )}

      {/* Stats Cards Header */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon="📦" label="Total Stocked Items" value={inventory.length} sub="Active inventory list" accent={adminColors.info} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon="⚠️" label="Low Stock Alerts" value={lowStock.length} sub="Refill needed" accent={adminColors.danger} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon="✅" label="Sufficient Stock" value={goodStock.length} sub="Optimal inventory levels" accent={adminColors.success} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon="💰"
            label="Total Inventory Value"
            value={`₹${inventory.reduce((s, i) => s + i.quantity * i.costPerUnit, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            sub="Capital invested in raw materials"
            accent={adminColors.accentOrange}
          />
        </Grid>
      </Grid>

      {/* Main Content Table & Control Toolbar */}
      <Paper elevation={0} sx={{ borderRadius: '24px', border: '1px solid #E2E8F0', bgcolor: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
        <Box sx={{ p: 2.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A' }}>
                Inventory Management & Quick Stock Adjuster ({filteredInventory.length})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Add, edit, adjust stock quantities (+ / -), and set reorder thresholds in real-time
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleOpenAdd}
              sx={{
                bgcolor: '#C62828',
                color: 'white',
                borderRadius: '12px',
                fontWeight: 800,
                px: 2.5, py: 1,
                boxShadow: '0 4px 14px rgba(198,40,40,0.4)',
                '&:hover': { bgcolor: '#B71C1C' },
              }}
            >
              + Add Raw Item
            </Button>
          </Box>

          {/* Search Bar & Category Filter Pills */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
            <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat}
                  size="small"
                  onClick={() => setSelectedCategory(cat)}
                  sx={{
                    borderRadius: '8px',
                    px: 1.5, py: 0.4,
                    fontSize: '11px',
                    fontWeight: 700,
                    bgcolor: selectedCategory === cat ? '#0F172A' : 'white',
                    color: selectedCategory === cat ? 'white' : '#64748B',
                    border: '1px solid',
                    borderColor: selectedCategory === cat ? '#0F172A' : '#CBD5E1',
                    '&:hover': { bgcolor: selectedCategory === cat ? '#1E293B' : '#F1F5F9' },
                  }}
                >
                  {cat}
                </Button>
              ))}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ display: 'flex', bgcolor: 'white', borderRadius: '8px', px: 1.2, py: 0.4, border: '1px solid #CBD5E1', alignItems: 'center', gap: 1 }}>
                <Search style={{ fontSize: 16, color: '#94A3B8' }} />
                <InputBase
                  placeholder="Search item or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{ fontSize: '12px', width: 170 }}
                />
              </Box>

              <Select
                size="small"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'low' | 'good')}
                sx={{ fontSize: '11px', fontWeight: 800, height: 32, bgcolor: 'white', borderRadius: '8px' }}
              >
                <MuiMenuItem value="all">All Status</MuiMenuItem>
                <MuiMenuItem value="low">Low Stock Only ⚠️</MuiMenuItem>
                <MuiMenuItem value="good">Sufficient Stock ✅</MuiMenuItem>
              </Select>
            </Box>
          </Box>
        </Box>

        {/* Inventory Data Table */}
        <Box sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 850 }}>
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                {['Item Name', 'Category', 'Quantity', 'Quick Adjust', 'Safety Threshold', 'Level', 'Cost/Unit', 'Total Valuation', 'Actions'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 800, fontSize: '11px', color: '#64748B', py: 1.5, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ textAlign: 'center', py: 6 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                      No inventory items match your search.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventory.map((item) => {
                  const stock = getStockLevel(item);
                  const isLow = item.quantity <= item.minQuantity;
                  return (
                    <TableRow key={item.id} hover sx={{ bgcolor: isLow ? 'rgba(239,68,68,0.03)' : 'transparent', '&:hover': { bgcolor: '#F8FAFC' } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {isLow && <Warning style={{ fontSize: 16, color: '#DC2626' }} />}
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                              {item.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                              Updated: {item.lastUpdated}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={item.category} size="small" sx={{ bgcolor: '#F1F5F9', color: '#475569', fontWeight: 700, fontSize: '10px' }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 900, color: isLow ? '#DC2626' : '#0F172A' }}>
                          {item.quantity} {item.unit}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Tooltip title="Subtract 1">
                            <IconButton size="small" sx={{ color: '#DC2626', p: 0.3 }} onClick={() => adjustInventoryQuantity(item.id, -1)}>
                              <RemoveCircleOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Add 1">
                            <IconButton size="small" sx={{ color: '#16A34A', p: 0.3 }} onClick={() => adjustInventoryQuantity(item.id, 1)}>
                              <AddCircleOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Add 5">
                            <Button size="small" sx={{ minWidth: 28, height: 24, fontSize: '10px', fontWeight: 800, p: 0, color: '#0284C7' }} onClick={() => adjustInventoryQuantity(item.id, 5)}>
                              +5
                            </Button>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>
                          {item.minQuantity} {item.unit}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ width: 120 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                          <Chip label={stock.label} size="small" sx={{ bgcolor: `${stock.color}15`, color: stock.color, fontWeight: 800, fontSize: '10px', height: 20 }} />
                          <LinearProgress variant="determinate" value={stock.pct} sx={{ height: 5, borderRadius: 3, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: stock.color, borderRadius: 3 } }} />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569' }}>
                          ₹{item.costPerUnit.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#16A34A' }}>
                          ₹{(item.quantity * item.costPerUnit).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Edit Item">
                            <IconButton size="small" sx={{ color: '#0284C7' }} onClick={() => handleOpenEdit(item)}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Item">
                            <IconButton size="small" sx={{ color: '#DC2626' }} onClick={() => handleOpenDelete(item)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      {/* Modal: Add Inventory Item */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth fullScreen={isMobile} slotProps={{ paper: { sx: { borderRadius: isMobile ? 0 : '20px' } } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#C62828', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          📦 Add New Raw Inventory Item
          {isMobile && (
            <IconButton size="small" onClick={() => setOpenAddDialog(false)} aria-label="Close">
              <Close fontSize="small" />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField fullWidth label="Raw Material Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Bagara Rice, Natukodi Chicken" />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select value={form.category} label="Category" onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                      <MuiMenuItem key={c} value={c}>{c}</MuiMenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Measurement Unit</InputLabel>
                  <Select value={form.unit} label="Measurement Unit" onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                    {UNITS.map((u) => (
                      <MuiMenuItem key={u} value={u}>{u}</MuiMenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth label="Initial Quantity *" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth label="Min Safety Threshold *" type="number" value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth label="Unit Cost (₹) *" type="number" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })} />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pb: isMobile ? 'max(20px, env(safe-area-inset-bottom, 0px))' : 2.5 }}>
          <Button onClick={() => setOpenAddDialog(false)} sx={{ color: '#64748B' }}>Cancel</Button>
          <Button variant="contained" onClick={handleAddSubmit} sx={{ bgcolor: '#C62828', borderRadius: '10px', fontWeight: 800 }}>Save Item</Button>
        </DialogActions>
      </Dialog>

      {/* Modal: Edit Inventory Item */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth fullScreen={isMobile} slotProps={{ paper: { sx: { borderRadius: isMobile ? 0 : '20px' } } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          ✏️ Edit Inventory Item Details
          {isMobile && (
            <IconButton size="small" onClick={() => setOpenEditDialog(false)} aria-label="Close">
              <Close fontSize="small" />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField fullWidth label="Raw Material Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select value={form.category} label="Category" onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                      <MuiMenuItem key={c} value={c}>{c}</MuiMenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Measurement Unit</InputLabel>
                  <Select value={form.unit} label="Measurement Unit" onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                    {UNITS.map((u) => (
                      <MuiMenuItem key={u} value={u}>{u}</MuiMenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth label="Quantity *" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth label="Min Safety Threshold *" type="number" value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth label="Unit Cost (₹) *" type="number" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })} />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pb: isMobile ? 'max(20px, env(safe-area-inset-bottom, 0px))' : 2.5 }}>
          <Button onClick={() => setOpenEditDialog(false)} sx={{ color: '#64748B' }}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSubmit} sx={{ bgcolor: '#0F172A', borderRadius: '10px', fontWeight: 800 }}>Update Item</Button>
        </DialogActions>
      </Dialog>

      {/* Modal: Delete Confirmation */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)} slotProps={{ paper: { sx: { borderRadius: '16px', p: 1 } } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#DC2626' }}>🗑️ Delete Inventory Item?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete <strong>{selectedItem?.name}</strong> from inventory records? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm} sx={{ fontWeight: 800, borderRadius: '10px' }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}
