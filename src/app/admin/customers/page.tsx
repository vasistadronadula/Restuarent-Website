'use client';
import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Chip, TextField, Avatar, Grid, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton,
  Dialog, DialogTitle, DialogContent, Divider, InputAdornment,
  useMediaQuery, useTheme,
} from '@mui/material';
import { Search, Star, Phone, Email, LocationOn, Visibility, Close } from '@mui/icons-material';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { Customer } from '@/types';
import { PageHeader, StatCard, SectionCard, EmptyState, adminColors } from '@/components/admin/ui';

export default function CustomersPage() {
  const { customers, orders } = useAdmin();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);

  const filtered = useMemo(() => customers.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search) || c.email.toLowerCase().includes(search.toLowerCase())
  ), [customers, search]);

  const vipCount = useMemo(() => customers.filter((c) => c.isVip).length, [customers]);
  const totalRevenue = useMemo(() => customers.reduce((s, c) => s + c.totalSpent, 0), [customers]);

  const getCustomerOrders = (phoneOrId: string) =>
    orders.filter(o => o.customerPhone === phoneOrId || o.customerId === phoneOrId || o.customerName === phoneOrId);

  return (
    <AdminLayout title="Customers Directory">
      <PageHeader title="Customers" subtitle="Every diner who's ever ordered — spend, loyalty, and history in one place." />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon="👥" label="Total Customers" value={customers.length} accent={adminColors.info} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon="⭐" label="VIP Customers" value={vipCount} accent={adminColors.accentOrange} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon="💰" label="Lifetime Revenue" value={`₹${totalRevenue.toLocaleString()}`} accent={adminColors.success} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon="🔍" label="Matching Search" value={filtered.length} accent={adminColors.accentRed} />
        </Grid>
      </Grid>

      <SectionCard noPadding>
        <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${adminColors.divider}`, flexWrap: 'wrap', gap: 2 }}>
          <TextField
            size="small" placeholder="Search customer by name, phone, email..."
            value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: { xs: '100%', sm: 340 } }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ color: '#9E9E9E', fontSize: 18 }} /></InputAdornment> } }}
          />
        </Box>

        {filtered.length === 0 ? (
          <EmptyState emoji="🔍" title="No customers found" subtitle="Customers register automatically when placing orders." />
        ) : isTablet ? (
          <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Stack spacing={1.5}>
              {filtered.map((c) => (
                <Box key={c.id} onClick={() => setSelected(c)}
                  sx={{ p: 1.75, borderRadius: adminColors.radiusMd, border: `1px solid ${adminColors.borderSubtle}`, bgcolor: adminColors.bgSubtle, cursor: 'pointer' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', minWidth: 0 }}>
                      <Avatar sx={{ bgcolor: adminColors.accentRed, fontWeight: 700 }}>{c.avatar}</Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{c.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{c.phone}</Typography>
                      </Box>
                    </Box>
                    {c.isVip && <Chip label="⭐ VIP" size="small" sx={{ bgcolor: adminColors.warningBg, color: adminColors.accentOrange, fontWeight: 700, fontSize: '10px' }} />}
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.25 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{c.totalOrders} orders</Typography>
                    <Typography variant="body2" color="primary" sx={{ fontWeight: 800 }}>₹{c.totalSpent.toLocaleString()}</Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 800 }}>
              <TableHead sx={{ bgcolor: adminColors.bgSubtle }}>
                <TableRow>
                  {['Customer', 'Contact', 'Orders', 'Total Spent', 'Loyalty', 'VIP Status', 'Last Visit', 'Actions'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '12px', color: '#616161', py: 1.5, whiteSpace: 'nowrap' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: adminColors.accentRed, fontWeight: 700 }}>{c.avatar}</Avatar>
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
                        <Star sx={{ fontSize: 14, color: adminColors.accentOrange }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{c.loyaltyPoints} pts</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {c.isVip && <Chip label="⭐ VIP" size="small" sx={{ bgcolor: adminColors.warningBg, color: adminColors.accentOrange, fontWeight: 700, fontSize: '10px' }} />}
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
        )}
      </SectionCard>

      {/* Customer Detail Dialog */}
      {selected && (
        <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="md" fullWidth fullScreen={isMobile}>
          <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
            <Box sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Customer Profile & History
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
              {selected.isVip && <Chip label="⭐ VIP Customer" sx={{ bgcolor: adminColors.warningBg, color: adminColors.accentOrange, fontWeight: 700 }} />}
              {isMobile && (
                <IconButton size="small" onClick={() => setSelected(null)} aria-label="Close">
                  <Close fontSize="small" />
                </IconButton>
              )}
            </Box>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ textAlign: 'center', p: 3, bgcolor: adminColors.bgPage, borderRadius: adminColors.radiusMd }}>
                  <Avatar sx={{ width: 80, height: 80, bgcolor: adminColors.accentRed, fontSize: '24px', fontWeight: 800, mx: 'auto', mb: 2 }}>
                    {selected.avatar}
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{selected.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Customer since {selected.joinDate}</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-around' }}>
                    {[{ label: 'Orders', value: selected.totalOrders }, { label: 'Points', value: selected.loyaltyPoints }].map((s) => (
                      <Box key={s.label} sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" color="primary" sx={{ fontWeight: 800 }}>{s.value}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, mb: 1.5 }}>CONTACT INFORMATION</Typography>
                {[
                  { icon: <Phone fontSize="small" />, text: selected.phone },
                  { icon: <Email fontSize="small" />, text: selected.email },
                  { icon: <LocationOn fontSize="small" />, text: `${selected.address}, ${selected.city}` },
                ].map((item, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
                    <Box sx={{ color: adminColors.accentRed }}>{item.icon}</Box>
                    <Typography variant="body2">{item.text}</Typography>
                  </Box>
                ))}

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, mb: 1.5 }}>CUSTOMER METRICS</Typography>
                <Grid container spacing={2}>
                  {[
                    { label: 'Total Spent', value: `₹${selected.totalSpent.toLocaleString()}` },
                    { label: 'Avg. Order', value: `₹${selected.totalOrders > 0 ? Math.round(selected.totalSpent / selected.totalOrders).toLocaleString() : 0}` },
                    { label: 'Loyalty Points', value: `${selected.loyaltyPoints} pts` },
                    { label: 'Last Visit', value: selected.lastVisit },
                  ].map((s) => (
                    <Grid key={s.label} size={{ xs: 6 }}>
                      <Box sx={{ p: 1.5, bgcolor: adminColors.bgSubtle, borderRadius: adminColors.radiusMd }}>
                        <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{s.value}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, mb: 1.5 }}>RECENT ORDER HISTORY</Typography>
                {getCustomerOrders(selected.phone || selected.id).slice(0, 4).map((o) => (
                  <Box key={o.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, p: 1.5, bgcolor: adminColors.bgSubtle, borderRadius: adminColors.radiusSm }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{o.orderId || o.id}</Typography>
                      <Typography variant="caption" color="text.secondary">{o.orderDate} • {(o.items || []).length} items</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>₹{(o.grandTotal || o.subtotal || 0).toLocaleString()}</Typography>
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
