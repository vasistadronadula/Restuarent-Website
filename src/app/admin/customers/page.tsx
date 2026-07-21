'use client';
import React, { useState, useMemo } from 'react';
import {
  Box, Paper, Typography, Chip, Button, TextField, Avatar, Grid,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton,
  Dialog, DialogTitle, DialogContent, Divider, InputAdornment, LinearProgress,
} from '@mui/material';
import { Search, Star, Phone, Email, LocationOn, EmojiEvents, Visibility } from '@mui/icons-material';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { orders } from '@/data/mockData';

export default function CustomersPage() {
  const { customers } = useAdmin();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<typeof customers[0] | null>(null);

  const filtered = useMemo(() => customers.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search) || c.email.toLowerCase().includes(search.toLowerCase())
  ), [customers, search]);

  const customerOrders = (customerId: string) => orders.filter(o => o.customerId === customerId);

  return (
    <AdminLayout title="Customers">
      <Paper sx={{ borderRadius: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <TextField
            size="small" placeholder="Search by name, phone, or email..."
            value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 320 }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ color: '#9E9E9E', fontSize: 18 }} /></InputAdornment> } }}
          />
          <Typography variant="body2" color="text.secondary">{filtered.length} customers</Typography>
        </Box>

        <Box sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead sx={{ bgcolor: '#FAFAFA' }}>
              <TableRow>
                {['Customer', 'Contact', 'Orders', 'Total Spent', 'Loyalty', 'VIP', 'Last Visit', 'Actions'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: '12px', color: '#616161', py: 1.5, whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ bgcolor: '#C62828', fontWeight: 700 }}>{c.avatar}</Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{c.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{c.phone}</Typography>
                    <Typography variant="caption" color="text.secondary">{c.email}</Typography>
                  </TableCell>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{c.totalOrders}</Typography></TableCell>
                  <TableCell><Typography variant="body2" color="primary" sx={{ fontWeight: 700 }}>₹{c.totalSpent.toLocaleString()}</Typography></TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Star sx={{ fontSize: 14, color: '#FF9800' }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{c.loyaltyPoints} pts</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {c.isVip && <Chip label="⭐ VIP" size="small" sx={{ bgcolor: 'rgba(255,152,0,0.15)', color: '#FF9800', fontWeight: 700, fontSize: '10px' }} />}
                  </TableCell>
                  <TableCell><Typography variant="caption" color="text.secondary">{c.lastVisit}</Typography></TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => setSelected(c)}>
                      <Visibility fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      {/* Customer Detail Dialog */}
      {selected && (
        <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
            Customer Profile
            {selected.isVip && <Chip label="⭐ VIP Customer" sx={{ bgcolor: 'rgba(255,152,0,0.15)', color: '#FF9800', fontWeight: 700 }} />}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ textAlign: 'center', p: 3, bgcolor: '#FFF8F2', borderRadius: '16px' }}>
                  <Avatar sx={{ width: 80, height: 80, bgcolor: '#C62828', fontSize: '24px', fontWeight: 800, mx: 'auto', mb: 2 }}>
                    {selected.avatar}
                  </Avatar>
                  <Typography variant="h6" sx={{fontWeight: 700}}>{selected.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>Customer since {selected.joinDate}</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-around' }}>
                    {[{ label: 'Orders', value: selected.totalOrders }, { label: 'Points', value: selected.loyaltyPoints }].map((s) => (
                      <Box key={s.label} sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" color="primary" sx={{fontWeight: 800}}>{s.value}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{fontWeight: 700, mb: 1.5}}>CONTACT INFORMATION</Typography>
                {[
                  { icon: <Phone fontSize="small" />, text: selected.phone },
                  { icon: <Email fontSize="small" />, text: selected.email },
                  { icon: <LocationOn fontSize="small" />, text: `${selected.address}, ${selected.city}` },
                ].map((item, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
                    <Box sx={{ color: '#C62828' }}>{item.icon}</Box>
                    <Typography variant="body2">{item.text}</Typography>
                  </Box>
                ))}

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{fontWeight: 700, mb: 1.5}}>STATS</Typography>
                <Grid container spacing={2}>
                  {[
                    { label: 'Total Spent', value: `₹${selected.totalSpent.toLocaleString()}` },
                    { label: 'Avg. Order', value: `₹${Math.round(selected.totalSpent / selected.totalOrders).toLocaleString()}` },
                    { label: 'Loyalty Points', value: `${selected.loyaltyPoints} pts` },
                    { label: 'Last Visit', value: selected.lastVisit },
                  ].map((s) => (
                    <Grid key={s.label} size={{ xs: 6 }}>
                      <Box sx={{ p: 1.5, bgcolor: '#F5F5F5', borderRadius: '12px' }}>
                        <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                        <Typography variant="subtitle1" sx={{fontWeight: 700}}>{s.value}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{fontWeight: 700, mb: 1.5}}>ORDER HISTORY</Typography>
                {customerOrders(selected.id).slice(0, 3).map((o) => (
                  <Box key={o.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, p: 1.5, bgcolor: '#FAFAFA', borderRadius: '10px' }}>
                    <Box>
                      <Typography variant="body2" sx={{fontWeight: 600}}>{o.orderId}</Typography>
                      <Typography variant="caption" color="text.secondary">{o.orderDate} • {o.items.length} items</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" sx={{fontWeight: 700}}>₹{o.grandTotal.toLocaleString()}</Typography>
                      <Chip label={o.status} size="small" sx={{ fontSize: '10px' }} />
                    </Box>
                  </Box>
                ))}
              </Grid>
            </Grid>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}
