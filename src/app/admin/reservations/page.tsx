'use client';
import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Chip, Button, TextField, Avatar, Grid,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  InputAdornment, Tooltip, Card, CardContent, CardActions,
  CircularProgress, Alert, Stack, useMediaQuery, useTheme,
} from '@mui/material';
import {
  Search, CheckCircle, Cancel, People, Close,
  Add, Edit, Delete, TableRestaurant,
} from '@mui/icons-material';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { ReservationStatus } from '@/types';
import {
  useGetTablesQuery,
  useAddTableMutation,
  useUpdateTableMutation,
  useDeleteTableMutation,
  useReleaseTableSlotMutation,
  RestaurantTable,
} from '@/store/supabaseApi';
import { generateTableId } from '@/lib/idGenerator';
import toast from 'react-hot-toast';
import { PageHeader, StatCard, SectionCard, StatusChip, EmptyState, adminColors, reservationStatusColors } from '@/components/admin/ui';

// ─── Add / Edit Table Dialog ──────────────────────────────────────────────────

interface TableDialogProps {
  open: boolean;
  editing: RestaurantTable | null;
  onClose: () => void;
}

function TableDialog({ open, editing, onClose }: TableDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { data: tables = [] } = useGetTablesQuery();
  const [addTable, { isLoading: adding }] = useAddTableMutation();
  const [updateTable, { isLoading: updating }] = useUpdateTableMutation();

  const [tableNum, setTableNum] = useState(editing?.tableNumber ?? 0);
  const [capacity, setCapacity] = useState(editing?.capacity ?? 4);
  const [description, setDescription] = useState(editing?.description ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!tableNum || tableNum < 1) e.tableNum = 'Table number must be ≥ 1';
    if (!editing) {
      const exists = tables.some((t) => t.tableNumber === tableNum);
      if (exists) e.tableNum = `Table ${tableNum} already exists`;
    }
    if (!capacity || capacity < 1) e.capacity = 'Capacity must be ≥ 1';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      if (editing) {
        await updateTable({ ...editing, capacity, description }).unwrap();
        toast.success(`Table ${editing.tableNumber} updated`);
      } else {
        const id = generateTableId(tableNum);
        await addTable({ id, tableNumber: tableNum, capacity, description }).unwrap();
        toast.success(`Table ${tableNum} added! Customers can now book it.`);
      }
      onClose();
    } catch (err: unknown) {
      const e = err as { error?: string };
      toast.error(e?.error || 'Failed to save table');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth fullScreen={isMobile} slotProps={{ paper: { sx: { borderRadius: isMobile ? 0 : adminColors.radiusLg } } }}>
      <DialogTitle sx={{ fontWeight: 800, color: adminColors.accentRed, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {editing ? `Edit Table ${editing.tableNumber}` : '+ Add New Table'}
        {isMobile && (
          <IconButton size="small" onClick={onClose} aria-label="Close">
            <Close fontSize="small" />
          </IconButton>
        )}
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth label="Table Number *" type="number"
              value={tableNum} onChange={(e) => setTableNum(Number(e.target.value))}
              disabled={!!editing}
              error={!!errors.tableNum} helperText={errors.tableNum}
              slotProps={{ htmlInput: { min: 1 } }}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth label="Capacity (seats) *" type="number"
              value={capacity} onChange={(e) => setCapacity(Number(e.target.value))}
              error={!!errors.capacity} helperText={errors.capacity}
              slotProps={{ htmlInput: { min: 1, max: 50 } }}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth label="Description (optional)"
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Window seat, Outdoor, Private room"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: isMobile ? 'max(20px, env(safe-area-inset-bottom, 0px))' : 3, gap: 1 }}>
        <Button onClick={onClose} sx={{ color: '#616161' }}>Cancel</Button>
        <Button
          variant="contained" onClick={handleSave}
          disabled={adding || updating}
          sx={{ bgcolor: adminColors.accentRed, '&:hover': { bgcolor: adminColors.accentRedDark }, borderRadius: '10px', fontWeight: 700 }}
        >
          {(adding || updating) ? <CircularProgress size={20} color="inherit" /> : editing ? 'Update Table' : 'Add Table'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReservationsPage() {
  const { reservations, updateReservationStatus } = useAdmin();
  const { data: tables = [], isLoading: tablesLoading } = useGetTablesQuery();
  const [deleteTable] = useDeleteTableMutation();
  const [releaseTableSlot] = useReleaseTableSlotMutation();
  const isTablet = useMediaQuery(useTheme().breakpoints.down('md'));

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ReservationStatus | 'all'>('all');
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);

  const filtered = useMemo(() => reservations.filter((r) => {
    const matchSearch = !search || r.customerName.toLowerCase().includes(search.toLowerCase()) || r.customerPhone.includes(search);
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchSearch && matchStatus;
  }), [reservations, search, filterStatus]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: reservations.length };
    reservations.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [reservations]);

  const totalGuestsToday = useMemo(
    () => reservations.filter((r) => r.status !== 'cancelled').reduce((s, r) => s + (Number(r.guests) || 0), 0),
    [reservations]
  );

  const handleDeleteTable = async (table: RestaurantTable) => {
    if (!confirm(`Delete Table ${table.tableNumber}? All future slot bookings for this table will be removed.`)) return;
    try {
      await deleteTable(table.id).unwrap();
      toast.success(`Table ${table.tableNumber} deleted`);
    } catch {
      toast.error('Failed to delete table');
    }
  };

  const handleCompleteReservation = async (id: string) => {
    await updateReservationStatus(id, 'completed');
    try { await releaseTableSlot(id).unwrap(); } catch { /* ignore */ }
    toast.success('Reservation completed — table slot released ✅');
  };

  const handleCancelReservation = async (id: string) => {
    await updateReservationStatus(id, 'cancelled');
    try { await releaseTableSlot(id).unwrap(); } catch { /* ignore */ }
    toast.success('Reservation cancelled — table slot freed');
  };

  return (
    <AdminLayout title="Reservations & Tables">
      <PageHeader title="Reservations & Tables" subtitle="Book, confirm, and manage every dining table in real time." />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon="📅" label="Pending" value={counts.pending || 0} accent={reservationStatusColors.pending.color} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon="✅" label="Confirmed" value={counts.confirmed || 0} accent={reservationStatusColors.confirmed.color} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon="🪑" label="Active Tables" value={tables.filter((t) => t.isActive).length} accent={adminColors.info} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon="👥" label="Guests Booked" value={totalGuestsToday} accent={adminColors.accentOrange} />
        </Grid>
      </Grid>

      {/* ── TABLE MANAGEMENT PANEL ──────────────────────────────────────────── */}
      <Box sx={{ mb: 4 }}>
        <PageHeader
          title="🪑 Table Management"
          subtitle="Add, edit or remove dining tables. Customers see real-time availability."
          action={
            <Button
              variant="contained" startIcon={<Add />}
              onClick={() => { setEditingTable(null); setTableDialogOpen(true); }}
              sx={{ bgcolor: adminColors.accentRed, '&:hover': { bgcolor: adminColors.accentRedDark }, borderRadius: '12px', fontWeight: 700 }}
            >
              Add Table
            </Button>
          }
        />

        {tablesLoading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress color="primary" /></Box>
        ) : tables.length === 0 ? (
          <Alert severity="warning" sx={{ borderRadius: '14px' }}>
            No tables added yet. Click <strong>&quot;Add Table&quot;</strong> to create your first table. Customers cannot make reservations until tables are added.
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {tables.map((table) => (
              <Grid key={table.id} size={{ xs: 6, sm: 4, md: 3 }}>
                <Card sx={{ borderRadius: adminColors.radiusMd, border: `1px solid ${adminColors.borderSubtle}`, boxShadow: adminColors.shadowSm, height: '100%' }}>
                  <CardContent sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <TableRestaurant sx={{ color: adminColors.accentRed, fontSize: 32 }} />
                      <Chip
                        label={table.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        sx={{
                          bgcolor: table.isActive ? adminColors.successBg : adminColors.neutralBg,
                          color: table.isActive ? adminColors.success : adminColors.neutral,
                          fontWeight: 700, fontSize: '10px',
                        }}
                      />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, mt: 1 }}>Table {table.tableNumber}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      👥 {table.capacity} seats
                    </Typography>
                    {table.description && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {table.description}
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 2, gap: 0.5 }}>
                    <Tooltip title="Edit Table">
                      <IconButton size="small" onClick={() => { setEditingTable(table); setTableDialogOpen(true); }} sx={{ color: '#1976D2' }}>
                        <Edit sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Table">
                      <IconButton size="small" onClick={() => handleDeleteTable(table)} sx={{ color: adminColors.accentRed }}>
                        <Delete sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* ── RESERVATION LIST ────────────────────────────────────────────────── */}
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>📅 Reservations</Typography>

      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map((s) => (
          <Chip
            key={s}
            label={`${s === 'all' ? 'All' : reservationStatusColors[s]?.label} (${counts[s] || 0})`}
            onClick={() => setFilterStatus(s)}
            sx={{
              fontWeight: filterStatus === s ? 700 : 500, cursor: 'pointer',
              bgcolor: filterStatus === s ? (s === 'all' ? adminColors.accentRed : reservationStatusColors[s]?.color) : adminColors.bgPanel,
              color: filterStatus === s ? 'white' : '#424242',
              boxShadow: adminColors.shadowSm, transition: 'all 0.2s',
            }}
          />
        ))}
      </Box>

      <SectionCard noPadding>
        <Box sx={{ p: 2.5, borderBottom: `1px solid ${adminColors.divider}` }}>
          <TextField
            size="small" placeholder="Search by name or phone..."
            value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: { xs: '100%', sm: 300 } }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ color: '#9E9E9E', fontSize: 18 }} /></InputAdornment> } }}
          />
        </Box>

        {filtered.length === 0 ? (
          <EmptyState emoji="📅" title="No reservations found" subtitle="Try a different search or filter." />
        ) : isTablet ? (
          /* ── Mobile / tablet: card list ─────────────────────────────── */
          <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Stack spacing={1.5}>
              {filtered.map((r) => (
                <Box key={r.id} sx={{ p: 1.75, borderRadius: adminColors.radiusMd, border: `1px solid ${adminColors.borderSubtle}`, bgcolor: adminColors.bgSubtle }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', minWidth: 0 }}>
                      <Avatar sx={{ width: 34, height: 34, bgcolor: adminColors.accentRed, fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                        {r.customerName.split(' ').map((n) => n[0]).join('')}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{r.customerName}</Typography>
                        <Typography variant="caption" color="text.secondary">{r.customerPhone}</Typography>
                      </Box>
                    </Box>
                    <StatusChip status={r.status} palette={reservationStatusColors} />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1.5, flexWrap: 'wrap' }}>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>📅 {r.date} · {r.time}</Typography>
                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                      <People sx={{ fontSize: 14, color: '#616161' }} /> {r.guests}
                    </Typography>
                    {r.tableNumber && (
                      <Chip label={`Table ${r.tableNumber}`} size="small" icon={<TableRestaurant sx={{ fontSize: '13px !important' }} />}
                        sx={{ bgcolor: 'rgba(198,40,40,0.08)', color: adminColors.accentRed, fontWeight: 700, fontSize: '10px', height: 22 }} />
                    )}
                  </Box>

                  {r.specialRequest && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, fontStyle: 'italic' }}>
                      “{r.specialRequest}”
                    </Typography>
                  )}

                  {(r.status === 'pending' || r.status === 'confirmed') && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                      {r.status === 'pending' && (
                        <Button size="small" variant="contained" color="success" startIcon={<CheckCircle sx={{ fontSize: 16 }} />}
                          onClick={() => updateReservationStatus(r.id, 'confirmed')}
                          sx={{ borderRadius: adminColors.radiusSm, fontSize: '11px', flex: 1 }}>
                          Confirm
                        </Button>
                      )}
                      {r.status === 'confirmed' && (
                        <Button size="small" variant="contained" color="success"
                          onClick={() => handleCompleteReservation(r.id)}
                          sx={{ borderRadius: adminColors.radiusSm, fontSize: '11px', flex: 1 }}>
                          Complete
                        </Button>
                      )}
                      <Button size="small" variant="outlined" color="error" startIcon={<Cancel sx={{ fontSize: 16 }} />}
                        onClick={() => handleCancelReservation(r.id)}
                        sx={{ borderRadius: adminColors.radiusSm, fontSize: '11px', flex: 1 }}>
                        Cancel
                      </Button>
                    </Box>
                  )}
                </Box>
              ))}
            </Stack>
          </Box>
        ) : (
          /* ── Desktop: table ──────────────────────────────────────────── */
          <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 900 }}>
              <TableHead sx={{ bgcolor: adminColors.bgSubtle }}>
                <TableRow>
                  {['ID', 'Customer', 'Contact', 'Guests', 'Date & Time', 'Table', 'Status', 'Request', 'Actions'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '12px', color: '#616161', py: 1.5, whiteSpace: 'nowrap' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600, color: adminColors.accentRed, fontSize: '10px' }}>
                        {r.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: adminColors.accentRed, fontSize: '11px', fontWeight: 700 }}>
                          {r.customerName.split(' ').map((n) => n[0]).join('')}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.customerName}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{r.customerPhone}</Typography>
                      {r.email && <Typography variant="caption" color="text.secondary">{r.email}</Typography>}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <People sx={{ fontSize: 16, color: '#616161' }} />
                        <Typography variant="body2">{r.guests}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.date}</Typography>
                      <Typography variant="caption" color="text.secondary">{r.time}</Typography>
                    </TableCell>
                    <TableCell>
                      {r.tableNumber ? (
                        <Chip
                          label={`Table ${r.tableNumber}`}
                          size="small"
                          icon={<TableRestaurant sx={{ fontSize: '14px !important' }} />}
                          sx={{ bgcolor: 'rgba(198,40,40,0.08)', color: adminColors.accentRed, fontWeight: 700, fontSize: '11px' }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">–</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={r.status} palette={reservationStatusColors} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 120, display: 'block' }}>
                        {r.specialRequest || '–'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {r.status === 'pending' && (
                          <>
                            <Tooltip title="Confirm">
                              <IconButton size="small" onClick={() => updateReservationStatus(r.id, 'confirmed')}>
                                <CheckCircle sx={{ color: adminColors.success, fontSize: 20 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Cancel & free table">
                              <IconButton size="small" onClick={() => handleCancelReservation(r.id)}>
                                <Cancel sx={{ color: adminColors.accentRed, fontSize: 20 }} />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {r.status === 'confirmed' && (
                          <>
                            <Button
                              size="small" variant="outlined" color="success"
                              onClick={() => handleCompleteReservation(r.id)}
                              sx={{ borderRadius: '8px', fontSize: '11px', mr: 0.5 }}
                            >
                              Complete
                            </Button>
                            <Tooltip title="Cancel & free table">
                              <IconButton size="small" onClick={() => handleCancelReservation(r.id)}>
                                <Cancel sx={{ color: adminColors.accentRed, fontSize: 20 }} />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </SectionCard>

      {/* Table Add/Edit Dialog */}
      <TableDialog
        key={`table-dialog-${tableDialogOpen}-${editingTable?.id ?? 'new'}`}
        open={tableDialogOpen}
        editing={editingTable}
        onClose={() => setTableDialogOpen(false)}
      />
    </AdminLayout>
  );
}
