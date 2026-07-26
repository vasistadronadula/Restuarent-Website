'use client';
import React, { useState, useMemo } from 'react';
import {
  Box, Paper, Typography, Chip, Button, TextField, Avatar, Grid,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  InputAdornment, Tooltip, Card, CardContent, CardActions,
  CircularProgress, Alert, useMediaQuery, useTheme,
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

const statusConfig = {
  pending:   { label: 'Pending',   color: '#FF9800', bg: 'rgba(255,152,0,0.1)'  },
  confirmed: { label: 'Confirmed', color: '#2E7D32', bg: 'rgba(46,125,50,0.1)' },
  completed: { label: 'Completed', color: '#616161', bg: 'rgba(97,97,97,0.1)'  },
  cancelled: { label: 'Cancelled', color: '#C62828', bg: 'rgba(198,40,40,0.1)' },
};

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
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth fullScreen={isMobile} slotProps={{ paper: { sx: { borderRadius: isMobile ? 0 : '20px' } } }}>
      <DialogTitle sx={{ fontWeight: 800, color: '#C62828', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
          sx={{ bgcolor: '#C62828', '&:hover': { bgcolor: '#B71C1C' }, borderRadius: '10px', fontWeight: 700 }}
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

      {/* ── TABLE MANAGEMENT PANEL ──────────────────────────────────────────── */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>🪑 Table Management</Typography>
            <Typography variant="body2" color="text.secondary">
              Add, edit or remove dining tables. Customers see real-time availability.
            </Typography>
          </Box>
          <Button
            variant="contained" startIcon={<Add />}
            onClick={() => { setEditingTable(null); setTableDialogOpen(true); }}
            sx={{ bgcolor: '#C62828', '&:hover': { bgcolor: '#B71C1C' }, borderRadius: '12px', fontWeight: 700 }}
          >
            Add Table
          </Button>
        </Box>

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
                <Card sx={{ borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', height: '100%' }}>
                  <CardContent sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <TableRestaurant sx={{ color: '#C62828', fontSize: 32 }} />
                      <Chip
                        label={table.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        sx={{
                          bgcolor: table.isActive ? 'rgba(46,125,50,0.1)' : 'rgba(0,0,0,0.06)',
                          color: table.isActive ? '#2E7D32' : '#9E9E9E',
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
                      <IconButton size="small" onClick={() => handleDeleteTable(table)} sx={{ color: '#C62828' }}>
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

      {/* Status Chips */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map((s) => (
          <Chip
            key={s}
            label={`${s === 'all' ? 'All' : statusConfig[s as ReservationStatus]?.label} (${counts[s] || 0})`}
            onClick={() => setFilterStatus(s)}
            sx={{
              fontWeight: filterStatus === s ? 700 : 500, cursor: 'pointer',
              bgcolor: filterStatus === s ? (s === 'all' ? '#C62828' : statusConfig[s as ReservationStatus]?.color) : 'white',
              color: filterStatus === s ? 'white' : '#424242',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)', transition: 'all 0.2s',
            }}
          />
        ))}
      </Box>

      <Paper sx={{ borderRadius: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <TextField
            size="small" placeholder="Search by name or phone..."
            value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: { xs: '100%', sm: 300 } }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ color: '#9E9E9E', fontSize: 18 }} /></InputAdornment> } }}
          />
        </Box>

        <Box sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 900 }}>
            <TableHead sx={{ bgcolor: '#FAFAFA' }}>
              <TableRow>
                {['ID', 'Customer', 'Contact', 'Guests', 'Date & Time', 'Table', 'Status', 'Request', 'Actions'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: '12px', color: '#616161', py: 1.5, whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((r) => {
                const sc = statusConfig[r.status];
                return (
                  <TableRow key={r.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#C62828', fontSize: '10px' }}>
                        {r.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#C62828', fontSize: '11px', fontWeight: 700 }}>
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
                          sx={{ bgcolor: 'rgba(198,40,40,0.08)', color: '#C62828', fontWeight: 700, fontSize: '11px' }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">–</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={sc.label} size="small" sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 600, fontSize: '11px' }} />
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
                                <CheckCircle sx={{ color: '#2E7D32', fontSize: 20 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Cancel & free table">
                              <IconButton size="small" onClick={() => handleCancelReservation(r.id)}>
                                <Cancel sx={{ color: '#C62828', fontSize: 20 }} />
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
                                <Cancel sx={{ color: '#C62828', fontSize: 20 }} />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>

        {filtered.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h2" sx={{ fontSize: '2.5rem', mb: 1 }}>📅</Typography>
            <Typography color="text.secondary">No reservations found</Typography>
          </Box>
        )}
      </Paper>

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
