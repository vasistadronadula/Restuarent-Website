'use client';
import React, { useState, useMemo } from 'react';
import {
  Box, Paper, Typography, Chip, Button, TextField, Grid,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Switch,
  InputAdornment, FormControl, InputLabel, Select, MenuItem as MuiMenuItem,
  Divider, Avatar, Tooltip,
} from '@mui/material';
import { Search, Add, Edit, Delete, Spa, Restaurant as RestaurantIcon, Star, ToggleOn, ToggleOff } from '@mui/icons-material';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { MenuItem, Category, VegStatus } from '@/types';
import { categoryLabels } from '@/data/menuData';
import toast from 'react-hot-toast';

const blankItem = (): Partial<MenuItem> => ({
  name: '', description: '', price: 0, category: 'north-indian', vegStatus: 'veg',
  rating: 4.5, reviewCount: 0, image: '', isPopular: false, isAvailable: true, isSpecial: false,
  tags: [], spiceLevel: 1, prepTime: 20,
});

export default function MenuManagementPage() {
  const { menuItems, addMenuItem, updateMenuItem, deleteMenuItem, toggleMenuItemAvailability } = useAdmin();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Partial<MenuItem>>(blankItem());
  const [isEdit, setIsEdit] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = useMemo(() => menuItems.filter((item) => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === 'all' || item.category === filterCategory;
    return matchSearch && matchCat;
  }), [menuItems, search, filterCategory]);

  const openAdd = () => { setEditItem(blankItem()); setIsEdit(false); setDialogOpen(true); };
  const openEdit = (item: MenuItem) => { setEditItem({ ...item }); setIsEdit(true); setDialogOpen(true); };

  const handleSave = () => {
    if (!editItem.name || !editItem.price) { toast.error('Name and price are required'); return; }
    if (isEdit) {
      updateMenuItem(editItem as MenuItem);
    } else {
      addMenuItem({ ...editItem, id: `m${Date.now()}`, reviewCount: 0 } as MenuItem);
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteMenuItem(id);
    setDeleteConfirm(null);
  };

  return (
    <AdminLayout title="Menu Management">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            size="small" placeholder="Search menu items..."
            value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 240 }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ color: '#9E9E9E', fontSize: 18 }} /></InputAdornment> } }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Category</InputLabel>
            <Select value={filterCategory} label="Category" onChange={(e) => setFilterCategory(e.target.value as any)}>
              <MuiMenuItem value="all">All Categories</MuiMenuItem>
              {Object.entries(categoryLabels).map(([k, v]) => (
                <MuiMenuItem key={k} value={k}>{v}</MuiMenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Button variant="contained" color="primary" startIcon={<Add />} onClick={openAdd}
          sx={{ borderRadius: '12px', background: 'linear-gradient(135deg, #C62828, #EF5350)' }}>
          Add New Item
        </Button>
      </Box>

      <Paper sx={{ borderRadius: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead sx={{ bgcolor: '#FAFAFA' }}>
              <TableRow>
                {['Item', 'Category', 'Type', 'Price', 'Rating', 'Available', 'Popular', 'Actions'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: '12px', color: '#616161', py: 1.5, whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        component="img"
                        src={item.image}
                        alt={item.name}
                        sx={{ width: 48, height: 48, borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
                        onError={(e: any) => { e.target.src = 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=48&q=60'; }}
                      />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.description}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={categoryLabels[item.category]} size="small" sx={{ bgcolor: 'rgba(198,40,40,0.08)', color: '#C62828', fontSize: '10px', fontWeight: 600 }} />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box className={item.vegStatus === 'veg' ? 'veg-indicator' : 'non-veg-indicator'} />
                      <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>{item.vegStatus}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell><Typography variant="body2" color="primary" sx={{ fontWeight: 700 }}>₹{item.price}</Typography></TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                      <Star sx={{ fontSize: 14, color: '#FF9800' }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.rating}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={item.isAvailable} size="small" color="success"
                      onChange={() => toggleMenuItemAvailability(item.id)}
                    />
                  </TableCell>
                  <TableCell>
                    {item.isPopular && <Chip label="🔥" size="small" sx={{ bgcolor: 'rgba(198,40,40,0.1)' }} />}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(item)}><Edit sx={{ fontSize: 18, color: '#1565C0' }} /></IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => setDeleteConfirm(item.id)}><Delete sx={{ fontSize: 18, color: '#C62828' }} /></IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
        {filtered.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h2" sx={{ fontSize: '2.5rem', mb: 1 }}>🍽️</Typography>
            <Typography color="text.secondary">No items found</Typography>
          </Box>
        )}
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{isEdit ? 'Edit Menu Item' : 'Add New Menu Item'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Item Name *" value={editItem.name || ''}
                onChange={(e) => setEditItem({ ...editItem, name: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Description" multiline rows={2}
                value={editItem.description || ''}
                onChange={(e) => setEditItem({ ...editItem, description: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="Price (₹) *" type="number"
                value={editItem.price || ''} onChange={(e) => setEditItem({ ...editItem, price: Number(e.target.value) })} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select value={editItem.category || 'north-indian'} label="Category"
                  onChange={(e) => setEditItem({ ...editItem, category: e.target.value as Category })}>
                  {Object.entries(categoryLabels).map(([k, v]) => (
                    <MuiMenuItem key={k} value={k}>{v}</MuiMenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Veg Status</InputLabel>
                <Select value={editItem.vegStatus || 'veg'} label="Veg Status"
                  onChange={(e) => setEditItem({ ...editItem, vegStatus: e.target.value as VegStatus })}>
                  <MuiMenuItem value="veg">🌿 Vegetarian</MuiMenuItem>
                  <MuiMenuItem value="non-veg">🍗 Non-Vegetarian</MuiMenuItem>
                  <MuiMenuItem value="egg">🥚 Contains Egg</MuiMenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="Prep Time (min)" type="number"
                value={editItem.prepTime || 20}
                onChange={(e) => setEditItem({ ...editItem, prepTime: Number(e.target.value) })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Image URL" value={editItem.image || ''}
                onChange={(e) => setEditItem({ ...editItem, image: e.target.value })}
                placeholder="https://..." />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Switch checked={editItem.isAvailable ?? true}
                  onChange={(e) => setEditItem({ ...editItem, isAvailable: e.target.checked })} color="success" />
                <Typography variant="body2">Available</Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Switch checked={editItem.isPopular ?? false}
                  onChange={(e) => setEditItem({ ...editItem, isPopular: e.target.checked })} color="warning" />
                <Typography variant="body2">Popular</Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Switch checked={editItem.isSpecial ?? false}
                  onChange={(e) => setEditItem({ ...editItem, isSpecial: e.target.checked })} color="error" />
                <Typography variant="body2">Special</Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined" sx={{ borderRadius: '10px' }}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" color="primary" sx={{ borderRadius: '10px', background: 'linear-gradient(135deg, #C62828, #EF5350)' }}>
            {isEdit ? 'Update Item' : 'Add Item'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle color="error" sx={{ fontWeight: 700 }}>Delete Menu Item?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">This action cannot be undone. Are you sure?</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteConfirm(null)} variant="outlined">Cancel</Button>
          <Button onClick={() => handleDelete(deleteConfirm!)} variant="contained" color="error" sx={{ borderRadius: '10px' }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}
