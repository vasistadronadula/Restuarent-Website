'use client';

import React, { useState } from 'react';
import {
  Box, Button, TextField, Select, MenuItem as MuiMenuItem,
  FormControl, InputLabel, Table, TableBody, TableCell, TableHead, TableRow,
  IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, Switch, InputAdornment, Tooltip, Avatar, Stack, Typography,
  useMediaQuery, useTheme,
} from '@mui/material';
import {
  Add, Edit, Delete, Search, UploadFile, Close,
} from '@mui/icons-material';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { supabase } from '@/lib/supabase';
import { MenuItem as MenuItemType, Category, VegStatus } from '@/types';
import { categoryLabels } from '@/data/menuData';
import toast from 'react-hot-toast';
import { PageHeader, StatCard, SectionCard, EmptyState, adminColors } from '@/components/admin/ui';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

export default function MenuManagementPage() {
  const { menuItems, addMenuItem, updateMenuItem, deleteMenuItem } = useAdmin();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [editItem, setEditItem] = useState<Partial<MenuItemType>>({
    name: '',
    description: '',
    price: 200,
    category: 'north-indian',
    vegStatus: 'veg',
    image: '',
    isAvailable: true,
    isPopular: false,
    isSpecial: false,
    prepTime: 20,
    portionPrices: { single: 150, full: 200, large: 550 },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Image must be under 5MB.');
      return;
    }

    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(path, file, { cacheControl: '31536000', upsert: false });

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`);
        return;
      }

      const { data } = supabase.storage.from('menu-images').getPublicUrl(path);
      setEditItem((prev) => ({ ...prev, image: data.publicUrl }));
      toast.success('Image uploaded!');
    } catch {
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const openAdd = () => {
    setIsEdit(false);
    setEditItem({
      name: '',
      description: '',
      price: 200,
      category: 'starters',
      vegStatus: 'non-veg',
      image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80',
      isAvailable: true,
      isPopular: false,
      isSpecial: false,
      prepTime: 20,
      portionPrices: { single: 150, full: 200, large: 550 },
    });
    setDialogOpen(true);
  };

  const openEdit = (item: MenuItemType) => {
    setIsEdit(true);
    setEditItem({
      ...item,
      portionPrices: item.portionPrices || { single: item.price - 50, full: item.price },
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!editItem.name || !editItem.price) return;
    const finalItem: MenuItemType = {
      id: editItem.id || `m-${Date.now()}`,
      name: editItem.name || '',
      description: editItem.description || '',
      price: Number(editItem.price) || 200,
      category: editItem.category || 'starters',
      vegStatus: editItem.vegStatus || 'veg',
      rating: editItem.rating || 4.5,
      reviewCount: editItem.reviewCount || 0,
      image: editItem.image || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80',
      isPopular: editItem.isPopular ?? false,
      isAvailable: editItem.isAvailable ?? true,
      isSpecial: editItem.isSpecial ?? false,
      tags: editItem.tags || ['palapitta'],
      prepTime: editItem.prepTime || 20,
      portionPrices: editItem.portionPrices,
    };

    if (isEdit) {
      updateMenuItem(finalItem);
    } else {
      addMenuItem(finalItem);
    }
    setDialogOpen(false);
  };

  const filtered = menuItems.filter((i) => {
    const matchCat = categoryFilter === 'all' || i.category === categoryFilter;
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const availableCount = menuItems.filter((i) => i.isAvailable).length;
  const popularCount = menuItems.filter((i) => i.isPopular).length;

  return (
    <AdminLayout title="Menu Catalog & Pricing Management">
      <PageHeader
        title="Menu Catalog"
        subtitle="Every dish, its portion pricing, and live availability."
        action={
          <Button variant="contained" startIcon={<Add />} onClick={openAdd}
            sx={{ borderRadius: '12px', fontWeight: 700, px: 2.5, bgcolor: adminColors.accentRed, '&:hover': { bgcolor: adminColors.accentRedDark } }}>
            Add New Dish
          </Button>
        }
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon="🍽️" label="Total Dishes" value={menuItems.length} accent={adminColors.info} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon="✅" label="Available" value={availableCount} accent={adminColors.success} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon="🔥" label="Popular" value={popularCount} accent={adminColors.accentOrange} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon="📁" label="Categories" value={Object.keys(categoryLabels).length} accent={adminColors.accentRed} />
        </Grid>
      </Grid>

      {/* Filter & Search Bar */}
      <SectionCard sx={{ mb: 3 }}>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth size="small" placeholder="Search dishes by name..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ color: '#9E9E9E' }} /></InputAdornment> } }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter Category</InputLabel>
              <Select value={categoryFilter} label="Filter Category" onChange={(e) => setCategoryFilter(e.target.value)}>
                <MuiMenuItem value="all">All Categories</MuiMenuItem>
                {Object.entries(categoryLabels).map(([k, v]) => (
                  <MuiMenuItem key={k} value={k}>{v}</MuiMenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </SectionCard>

      {/* Items */}
      <SectionCard noPadding>
        {filtered.length === 0 ? (
          <EmptyState emoji="🍽️" title="No dishes found" subtitle="Try a different search or category." />
        ) : isTablet ? (
          <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Stack spacing={1.5}>
              {filtered.map((item) => (
                <Box key={item.id} sx={{ p: 1.75, borderRadius: adminColors.radiusMd, border: `1px solid ${adminColors.borderSubtle}`, bgcolor: adminColors.bgSubtle }}>
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Avatar src={item.image} variant="rounded" sx={{ width: 52, height: 52, borderRadius: '10px', flexShrink: 0 }} />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                        <Box className={item.vegStatus === 'veg' ? 'veg-indicator' : 'non-veg-indicator'} />
                        <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{item.name}</Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{item.description}</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                        {item.portionPrices?.full ? (
                          <Chip label={`₹${item.portionPrices.full}`} size="small" sx={{ bgcolor: adminColors.accentRed, color: 'white', fontWeight: 700, fontSize: '10px', height: 20 }} />
                        ) : (
                          <Typography variant="body2" sx={{ fontWeight: 800, color: adminColors.accentRed }}>₹{item.price}</Typography>
                        )}
                        {item.isPopular && <Chip label="Popular" size="small" sx={{ bgcolor: adminColors.accentRed, color: 'white', fontWeight: 700, fontSize: '9px', height: 20 }} />}
                        {item.isSpecial && <Chip label="Special" size="small" sx={{ bgcolor: adminColors.accentOrange, color: 'white', fontWeight: 700, fontSize: '9px', height: 20 }} />}
                      </Box>
                    </Box>
                    <Switch checked={item.isAvailable} onChange={(e) => updateMenuItem({ ...item, isAvailable: e.target.checked })} color="success" size="small" />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1.25 }}>
                    <Button size="small" startIcon={<Edit sx={{ fontSize: 16 }} />} onClick={() => openEdit(item)}
                      sx={{ flex: 1, borderRadius: adminColors.radiusSm, fontSize: '11px', bgcolor: 'white', border: `1px solid ${adminColors.border}` }}>
                      Edit
                    </Button>
                    <IconButton size="small" onClick={() => { if (confirm(`Delete ${item.name}?`)) deleteMenuItem(item.id); }}
                      sx={{ bgcolor: 'white', border: `1px solid ${adminColors.border}`, color: adminColors.accentRed }}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 750 }}>
              <TableHead sx={{ bgcolor: adminColors.bgSubtle }}>
                <TableRow>
                  {['Item Name', 'Category', 'Portion Prices (S/F/L)', 'Status', 'Availability', 'Actions'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '12px', color: '#616161', py: 1.5 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar src={item.image} variant="rounded" sx={{ width: 44, height: 44, borderRadius: '8px' }} />
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            <Box className={item.vegStatus === 'veg' ? 'veg-indicator' : 'non-veg-indicator'} />
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.name}</Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 220 }}>
                            {item.description}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Chip label={categoryLabels[item.category] || item.category} size="small" sx={{ bgcolor: adminColors.bgSubtle, fontWeight: 600, fontSize: '11px' }} />
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {item.portionPrices?.single && (
                          <Chip label={`Single: ₹${item.portionPrices.single}`} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                        )}
                        {item.portionPrices?.full && (
                          <Chip label={`Full: ₹${item.portionPrices.full}`} size="small" color="error" sx={{ fontWeight: 700 }} />
                        )}
                        {item.portionPrices?.large && (
                          <Chip label={`Large: ₹${item.portionPrices.large}`} size="small" color="secondary" variant="outlined" sx={{ fontWeight: 700 }} />
                        )}
                        {!item.portionPrices && (
                          <Typography variant="body2" sx={{ fontWeight: 800, color: adminColors.accentRed }}>₹{item.price}</Typography>
                        )}
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {item.isSpecial && <Chip label="Special" size="small" sx={{ bgcolor: adminColors.accentOrange, color: 'white', fontWeight: 700, fontSize: '10px' }} />}
                        {item.isPopular && <Chip label="Popular" size="small" sx={{ bgcolor: adminColors.accentRed, color: 'white', fontWeight: 700, fontSize: '10px' }} />}
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Switch checked={item.isAvailable} onChange={(e) => updateMenuItem({ ...item, isAvailable: e.target.checked })} color="success" size="small" />
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Edit Dish">
                          <IconButton size="small" onClick={() => openEdit(item)}>
                            <Edit sx={{ fontSize: 18, color: '#1565C0' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Dish">
                          <IconButton size="small" onClick={() => { if (confirm(`Delete ${item.name}?`)) deleteMenuItem(item.id); }}>
                            <Delete sx={{ fontSize: 18, color: adminColors.accentRed }} />
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

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: '#FAF5EF', color: adminColors.accentRed, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {isEdit ? '✏️ Edit Menu Dish & Pricing' : '➕ Add New Dish to Menu'}
          {isMobile && (
            <IconButton size="small" onClick={() => setDialogOpen(false)} aria-label="Close">
              <Close fontSize="small" />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                fullWidth
                label="Dish Name *"
                value={editItem.name || ''}
                onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Veg Status</InputLabel>
                <Select
                  value={editItem.vegStatus || 'veg'}
                  label="Veg Status"
                  onChange={(e) => setEditItem({ ...editItem, vegStatus: e.target.value as VegStatus })}
                >
                  <MuiMenuItem value="veg">🌿 Vegetarian</MuiMenuItem>
                  <MuiMenuItem value="non-veg">🍗 Non-Vegetarian</MuiMenuItem>
                  <MuiMenuItem value="egg">🥚 Contains Egg</MuiMenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={editItem.description || ''}
                onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
              />
            </Grid>

            {/* Portion Prices (S / F / L) */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: adminColors.accentRed, mb: 1 }}>
                🍽️ Portion Sizing & Pricing (Single S / Full F / Large L):
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Single (S) Price (₹)"
                    type="number"
                    value={editItem.portionPrices?.single || ''}
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        portionPrices: { ...editItem.portionPrices, single: Number(e.target.value) },
                      })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Full (F) Price (₹) *"
                    type="number"
                    value={editItem.portionPrices?.full || editItem.price || ''}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setEditItem({
                        ...editItem,
                        price: val,
                        portionPrices: { ...editItem.portionPrices, full: val },
                      });
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Large (L) Price (₹)"
                    type="number"
                    value={editItem.portionPrices?.large || ''}
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        portionPrices: { ...editItem.portionPrices, large: Number(e.target.value) },
                      })
                    }
                  />
                </Grid>
              </Grid>
            </Grid>

            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={editItem.category || 'starters'}
                  label="Category"
                  onChange={(e) => setEditItem({ ...editItem, category: e.target.value as Category })}
                >
                  {Object.entries(categoryLabels).map(([k, v]) => (
                    <MuiMenuItem key={k} value={k}>
                      {v}
                    </MuiMenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                label="Prep Time (min)"
                type="number"
                value={editItem.prepTime || 20}
                onChange={(e) => setEditItem({ ...editItem, prepTime: Number(e.target.value) })}
              />
            </Grid>

            {/* Image Upload Option (File Upload + URL) */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                🖼️ Dish Image (Upload File or Enter URL):
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  component="label"
                  disabled={uploadingImage}
                  startIcon={<UploadFile />}
                  sx={{ borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}
                >
                  {uploadingImage ? 'Uploading...' : 'Upload File from Computer'}
                  <input type="file" hidden accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                </Button>
                <TextField
                  size="small"
                  label="Or Image URL"
                  value={editItem.image || ''}
                  onChange={(e) => setEditItem({ ...editItem, image: e.target.value })}
                  placeholder="https://..."
                  sx={{ flex: 1, minWidth: 200 }}
                />
              </Box>

              {editItem.image && (
                <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar src={editItem.image} variant="rounded" sx={{ width: 50, height: 50, borderRadius: '8px' }} />
                  <Typography variant="caption" color="text.secondary">
                    Image preview ready
                  </Typography>
                </Box>
              )}
            </Grid>

            <Grid size={{ xs: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Switch
                  checked={editItem.isAvailable ?? true}
                  onChange={(e) => setEditItem({ ...editItem, isAvailable: e.target.checked })}
                  color="success"
                />
                <Typography variant="body2">Available</Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Switch
                  checked={editItem.isPopular ?? false}
                  onChange={(e) => setEditItem({ ...editItem, isPopular: e.target.checked })}
                  color="warning"
                />
                <Typography variant="body2">🔥 Popular</Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Switch
                  checked={editItem.isSpecial ?? false}
                  onChange={(e) => setEditItem({ ...editItem, isSpecial: e.target.checked })}
                  color="error"
                />
                <Typography variant="body2">Chef Special</Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pb: isMobile ? 'max(20px, env(safe-area-inset-bottom, 0px))' : 2.5, gap: 1, bgcolor: '#FAFAFA' }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined" sx={{ borderRadius: '10px' }}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" color="primary" sx={{ borderRadius: '10px', fontWeight: 700 }}>
            {isEdit ? 'Save Changes' : 'Add Dish'}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}
