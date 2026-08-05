'use client';

import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Chip, Button, TextField, Avatar, Grid,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  InputAdornment, Tooltip, Card, CardContent, CardActions,
  CircularProgress, Alert, Stack, useMediaQuery, useTheme,
  MenuItem as MuiMenuItem, Select, FormControl, InputLabel, Paper, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import {
  Search, CheckCircle, Cancel, People, Close,
  Add, Edit, Delete, TableRestaurant, Map, GridView, FormatListBulleted,
  PersonAdd, EventSeat, Schedule, Phone, Person, Notes, CalendarToday,
  MeetingRoom, Star, CleanHands, DoneAll, AutoAwesome, FilterList, Refresh,
} from '@mui/icons-material';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { ReservationStatus, Reservation } from '@/types';
import {
  useGetTablesQuery,
  useAddTableMutation,
  useUpdateTableMutation,
  useDeleteTableMutation,
  useReleaseTableSlotMutation,
  useBookTableSlotMutation,
  RestaurantTable,
} from '@/store/supabaseApi';
import { generateTableId, generateOrderId } from '@/lib/idGenerator';
import toast from 'react-hot-toast';
import { PageHeader, StatCard, SectionCard, StatusChip, EmptyState, adminColors, reservationStatusColors } from '@/components/admin/ui';

// ─── Extended Status Config ──────────────────────────────────────────────────
const EXTENDED_STATUS_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  ...reservationStatusColors,
  seated: { label: 'Seated / Dining', color: '#1D4ED8', bg: '#EFF6FF' },
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
  const [isActive, setIsActive] = useState(editing?.isActive ?? true);
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
        await updateTable({ ...editing, capacity, description, isActive }).unwrap();
        toast.success(`Table ${editing.tableNumber} updated`);
      } else {
        const id = generateTableId(tableNum);
        await addTable({ id, tableNumber: tableNum, capacity, description }).unwrap();
        toast.success(`Table ${tableNum} added successfully!`);
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
              value={tableNum || ''} onChange={(e) => setTableNum(Number(e.target.value))}
              disabled={!!editing}
              error={!!errors.tableNum} helperText={errors.tableNum}
              slotProps={{ htmlInput: { min: 1 } }}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth label="Capacity (Seats) *" type="number"
              value={capacity || ''} onChange={(e) => setCapacity(Number(e.target.value))}
              error={!!errors.capacity} helperText={errors.capacity}
              slotProps={{ htmlInput: { min: 1, max: 50 } }}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Section / Location</InputLabel>
              <Select
                value={description || 'Main Hall'}
                label="Section / Location"
                onChange={(e) => setDescription(e.target.value)}
              >
                <MuiMenuItem value="Main Hall">🏛️ Main Dining Hall</MuiMenuItem>
                <MuiMenuItem value="Window View">🪟 Window View</MuiMenuItem>
                <MuiMenuItem value="Outdoor Garden">🌿 Outdoor Patio / Garden</MuiMenuItem>
                <MuiMenuItem value="VIP Suite">👑 VIP Private Room</MuiMenuItem>
              </Select>
            </FormControl>
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

// ─── Fast Walk-In / Phone Booking Dialog ─────────────────────────────────────

interface CreateReservationDialogProps {
  open: boolean;
  onClose: () => void;
  tables: RestaurantTable[];
  initialTable?: number | '';
}

function CreateReservationDialog({ open, onClose, tables, initialTable }: CreateReservationDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { addReservationLocallyAndDB } = useAdmin();
  const [bookSlot] = useBookTableSlotMutation();

  const todayStr = new Date().toISOString().split('T')[0];
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState('19:30');
  const [guests, setGuests] = useState(2);
  const [selectedTable, setSelectedTable] = useState<number | ''>(initialTable ?? '');

  React.useEffect(() => {
    if (open) setSelectedTable(initialTable ?? '');
  }, [open, initialTable]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<ReservationStatus>('confirmed');
  const [submitting, setSubmitting] = useState(false);

  const availableTables = useMemo(() => {
    return tables.filter((t) => t.isActive && t.capacity >= guests);
  }, [tables, guests]);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('Customer name is required'); return; }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      toast.error('Valid 10-digit phone number is required');
      return;
    }

    setSubmitting(true);
    const resId = `RES-${Date.now().toString().slice(-6)}`;

    const newRes: Reservation = {
      id: resId,
      customerName: name.trim(),
      customerPhone: phone.trim(),
      email: `${phone.trim().replace(/\D/g, '')}@guest.palapitta.com`,
      date,
      time,
      guests,
      status,
      tableNumber: selectedTable || undefined,
      specialRequest: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    try {
      await addReservationLocallyAndDB(newRes);
      if (selectedTable) {
        const targetTable = tables.find((t) => t.tableNumber === selectedTable);
        if (targetTable) {
          try {
            const slotId = `SLOT-${Date.now()}`;
            await bookSlot({ id: slotId, tableId: targetTable.id, reservationId: resId, date, timeSlot: time }).unwrap();
          } catch { /* Slot reserved */ }
        }
      }
      toast.success(`Booking ${resId} created successfully! 🎉`);
      onClose();
    } catch {
      toast.error('Failed to create reservation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile} slotProps={{ paper: { sx: { borderRadius: isMobile ? 0 : adminColors.radiusLg } } }}>
      <DialogTitle sx={{ fontWeight: 800, color: adminColors.accentRed, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        ⚡ Fast New Booking / Walk-In
        {isMobile && <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>}
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth size="small" label="Customer Name *"
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Anish Kumar"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth size="small" label="Mobile Phone *"
              value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit phone"
              slotProps={{ input: { startAdornment: <InputAdornment position="start">+91</InputAdornment> } }}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField
              fullWidth size="small" label="Date *" type="date"
              value={date} onChange={(e) => setDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField
              fullWidth size="small" label="Time Slot *" type="time"
              value={time} onChange={(e) => setTime(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth size="small" label="Guests (Seats) *" type="number"
              value={guests} onChange={(e) => setGuests(Math.max(1, Number(e.target.value)))}
              slotProps={{ htmlInput: { min: 1, max: 30 } }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Assign Table</InputLabel>
              <Select
                value={selectedTable}
                label="Assign Table"
                onChange={(e) => setSelectedTable(Number(e.target.value) || '')}
              >
                <MuiMenuItem value="">Auto-Assign Later</MuiMenuItem>
                {availableTables.map((t) => (
                  <MuiMenuItem key={t.id} value={t.tableNumber}>
                    Table {t.tableNumber} — {t.capacity} Seats ({t.description || 'Main'})
                  </MuiMenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Initial Status</InputLabel>
              <Select
                value={status}
                label="Initial Status"
                onChange={(e) => setStatus(e.target.value as ReservationStatus)}
              >
                <MuiMenuItem value="confirmed">✅ Confirmed (Walk-in / Phone)</MuiMenuItem>
                <MuiMenuItem value="pending">⏳ Pending Approval</MuiMenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth size="small" label="Special Requests / Notes"
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Birthday celebration, High chair needed"
              multiline rows={2}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={onClose} sx={{ color: '#616161' }}>Cancel</Button>
        <Button
          variant="contained" onClick={handleCreate} disabled={submitting}
          sx={{ bgcolor: adminColors.accentRed, '&:hover': { bgcolor: adminColors.accentRedDark }, borderRadius: '10px', fontWeight: 800 }}
        >
          {submitting ? <CircularProgress size={20} color="inherit" /> : '⚡ Create Booking'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main Reservations & Table Dashboard Page ─────────────────────────────────

export default function ReservationsPage() {
  const { reservations, updateReservationStatus, addReservationLocallyAndDB } = useAdmin();
  const { data: tables = [], isLoading: tablesLoading } = useGetTablesQuery();
  const [deleteTable] = useDeleteTableMutation();
  const [releaseTableSlot] = useReleaseTableSlotMutation();
  const isTablet = useMediaQuery(useTheme().breakpoints.down('md'));

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ReservationStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'tomorrow' | 'all'>('today');
  const [viewMode, setViewMode] = useState<'map' | 'grid' | 'list'>('map');

  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [createBookingOpen, setCreateBookingOpen] = useState(false);
  const [preselectedTableNum, setPreselectedTableNum] = useState<number | ''>('');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const filtered = useMemo(() => reservations.filter((r) => {
    const matchSearch = !search ||
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      r.customerPhone.includes(search) ||
      (r.tableNumber && r.tableNumber.toString().includes(search));

    const matchStatus = filterStatus === 'all' || r.status === filterStatus;

    let matchDate = true;
    if (dateFilter === 'today') matchDate = r.date === todayStr;
    if (dateFilter === 'tomorrow') matchDate = r.date === tomorrowStr;

    return matchSearch && matchStatus && matchDate;
  }), [reservations, search, filterStatus, dateFilter, todayStr, tomorrowStr]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: reservations.length };
    reservations.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [reservations]);

  const todayReservations = useMemo(() => reservations.filter((r) => r.date === todayStr), [reservations, todayStr]);

  const totalGuestsToday = useMemo(
    () => todayReservations.filter((r) => r.status !== 'cancelled').reduce((s, r) => s + (Number(r.guests) || 0), 0),
    [todayReservations]
  );

  // Map each table to its current active/reserved booking for today
  const tableOccupancyMap = useMemo(() => {
    const map: Record<number, Reservation> = {};
    todayReservations.forEach((r) => {
      if (r.tableNumber && (r.status === 'confirmed' || r.status === 'pending')) {
        map[r.tableNumber] = r;
      }
    });
    return map;
  }, [todayReservations]);

  const occupancyRate = useMemo(() => {
    if (tables.length === 0) return 0;
    const occupiedCount = Object.keys(tableOccupancyMap).length;
    return Math.round((occupiedCount / tables.length) * 100);
  }, [tables, tableOccupancyMap]);

  const handleDeleteTable = async (table: RestaurantTable) => {
    if (!confirm(`Delete Table ${table.tableNumber}? All slot bookings for this table will be removed.`)) return;
    try {
      await deleteTable(table.id).unwrap();
      toast.success(`Table ${table.tableNumber} deleted`);
    } catch (err) {
      toast.error((err as { error?: string })?.error || 'Failed to delete table');
    }
  };

  const handleCompleteReservation = async (id: string) => {
    const ok = await updateReservationStatus(id, 'completed');
    if (!ok) return;
    try { await releaseTableSlot(id).unwrap(); } catch { /* Slot released */ }
    toast.success('Reservation completed — table slot released 🟢');
  };

  const handleCancelReservation = async (id: string) => {
    const ok = await updateReservationStatus(id, 'cancelled');
    if (!ok) return;
    try { await releaseTableSlot(id).unwrap(); } catch { /* Slot freed */ }
    toast.success('Reservation cancelled — table slot freed 🟢');
  };

  const handleConfirmReservation = async (id: string) => {
    const ok = await updateReservationStatus(id, 'confirmed');
    if (ok) toast.success('Reservation confirmed! ✅');
  };

  return (
    <AdminLayout title="Reservations & Floor Layout">
      {/* Page Header */}
      <PageHeader
        title="Reservations & Floor Map"
        subtitle="Manage live table layouts, walk-ins, and guest bookings in real time."
        action={
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: '100%' }}>
            <Button
              variant="contained" startIcon={<PersonAdd />}
              onClick={() => setCreateBookingOpen(true)}
              sx={{ bgcolor: adminColors.accentRed, '&:hover': { bgcolor: adminColors.accentRedDark }, borderRadius: '12px', fontWeight: 800 }}
            >
              + Fast Booking / Walk-In
            </Button>
            <Button
              variant="outlined" startIcon={<Add />}
              onClick={() => { setEditingTable(null); setTableDialogOpen(true); }}
              sx={{ borderColor: adminColors.accentRed, color: adminColors.accentRed, borderRadius: '12px', fontWeight: 700 }}
            >
              + Add Table
            </Button>
          </Stack>
        }
      />

      {/* Top Metrics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon="📅" label="Today's Bookings" value={todayReservations.length} sub={`${counts.pending || 0} pending`} accent={adminColors.accentRed} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon="⏳" label="Pending Approvals" value={counts.pending || 0} sub="Requires confirmation" accent={reservationStatusColors.pending.color} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon="📊" label="Table Occupancy" value={`${occupancyRate}%`} sub={`${Object.keys(tableOccupancyMap).length} / ${tables.length} tables booked`} accent={adminColors.info} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon="👥" label="Confirmed Guests Today" value={totalGuestsToday} sub="Expected diners" accent={adminColors.success} />
        </Grid>
      </Grid>

      {/* Mode & Date Controls Bar */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', border: `1px solid ${adminColors.border}`, bgcolor: 'white', mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, val) => val && setViewMode(val)}
            size="small"
            sx={{ bgcolor: '#FFF8F2', p: 0.5, borderRadius: '12px' }}
          >
            <ToggleButton value="map" sx={{ borderRadius: '10px', fontWeight: 800, px: 2 }}>
              <Map sx={{ mr: 0.8, fontSize: 18 }} /> Visual Floor Map
            </ToggleButton>
            <ToggleButton value="grid" sx={{ borderRadius: '10px', fontWeight: 800, px: 2 }}>
              <GridView sx={{ mr: 0.8, fontSize: 18 }} /> Table Grid
            </ToggleButton>
            <ToggleButton value="list" sx={{ borderRadius: '10px', fontWeight: 800, px: 2 }}>
              <FormatListBulleted sx={{ mr: 0.8, fontSize: 18 }} /> Reservations Ledger
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Quick Date Selector */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarToday sx={{ color: 'text.secondary', fontSize: 18 }} />
            {(['today', 'tomorrow', 'all'] as const).map((df) => (
              <Chip
                key={df}
                label={df === 'today' ? 'Today' : df === 'tomorrow' ? 'Tomorrow' : 'All Dates'}
                onClick={() => setDateFilter(df)}
                sx={{
                  fontWeight: dateFilter === df ? 800 : 500,
                  bgcolor: dateFilter === df ? adminColors.accentRed : '#F5F5F5',
                  color: dateFilter === df ? 'white' : 'text.primary',
                  cursor: 'pointer',
                }}
              />
            ))}
          </Box>
        </Box>
      </Paper>

      {/* ── VIEW 1: INTERACTIVE VISUAL FLOOR MAP ────────────────────────────────── */}
      {viewMode === 'map' && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              🗺️ Restaurant Visual Floor Layout
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: adminColors.success }} />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>Available 🟢</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: reservationStatusColors.pending.color }} />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>Reserved 🟡</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: adminColors.info }} />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>Occupied / Dining 🔴</Typography>
              </Box>
            </Box>
          </Box>

          {tablesLoading ? (
            <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
          ) : tables.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: '16px' }}>
              No tables set up yet. Click <strong>&quot;Add Table&quot;</strong> to create your floor layout.
            </Alert>
          ) : (
            <Grid container spacing={2.5}>
              {tables.map((table) => {
                const activeBooking = tableOccupancyMap[table.tableNumber];
                const isOccupied = !!activeBooking;
                const isPending = activeBooking?.status === 'pending';

                let cardBg = '#FFFFFF';
                let borderColor = 'rgba(0,0,0,0.1)';
                let statusBadge: { label: string; color: string; bg: string } = { label: 'AVAILABLE', color: adminColors.success, bg: adminColors.successBg };

                if (isOccupied) {
                  if (isPending) {
                    statusBadge = { label: 'PENDING APPROVAL', color: reservationStatusColors.pending.color, bg: reservationStatusColors.pending.bg };
                    borderColor = reservationStatusColors.pending.color;
                  } else {
                    statusBadge = { label: 'RESERVED / SEATED', color: adminColors.info, bg: adminColors.infoBg };
                    borderColor = adminColors.info;
                  }
                }

                return (
                  <Grid key={table.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: '20px',
                        border: '2px solid',
                        borderColor: borderColor,
                        bgcolor: cardBg,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                        position: 'relative',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' },
                      }}
                    >
                      {/* Top Table Badge */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 42, height: 42, borderRadius: '12px', bgcolor: 'rgba(198,40,40,0.08)', color: adminColors.accentRed, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '18px' }}>
                            T{table.tableNumber}
                          </Box>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                              Table {table.tableNumber}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              👥 {table.capacity} Seats • {table.description || 'Main Hall'}
                            </Typography>
                          </Box>
                        </Box>

                        <Chip
                          label={statusBadge.label}
                          size="small"
                          sx={{ bgcolor: statusBadge.bg, color: statusBadge.color, fontWeight: 900, fontSize: '9.5px', height: 22 }}
                        />
                      </Box>

                      <Divider sx={{ my: 1.5 }} />

                      {/* Active Guest Info or Free Slot Banner */}
                      {activeBooking ? (
                        <Box sx={{ bgcolor: '#FFF8F2', p: 1.5, borderRadius: '12px', mb: 2, border: '1px dashed #FFB74D' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                              👤 {activeBooking.customerName}
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: adminColors.accentRed }}>
                              {activeBooking.time}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            📞 {activeBooking.customerPhone} • 👥 {activeBooking.guests} Guests
                          </Typography>
                          {activeBooking.specialRequest && (
                            <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'primary.main', display: 'block', mt: 0.5 }}>
                              &quot;{activeBooking.specialRequest}&quot;
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: adminColors.successBg, textAlign: 'center', mb: 2 }}>
                          <Typography variant="caption" sx={{ color: adminColors.success, fontWeight: 800 }}>
                            🟢 Table is Free & Ready for Walk-Ins
                          </Typography>
                        </Box>
                      )}

                      {/* Action Bar */}
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {activeBooking ? (
                          <>
                            {activeBooking.status === 'pending' ? (
                              <Button
                                size="small" variant="contained" color="success" fullWidth
                                onClick={() => handleConfirmReservation(activeBooking.id)}
                                sx={{ borderRadius: '10px', fontSize: '11.5px', fontWeight: 800 }}
                              >
                                Accept & Confirm
                              </Button>
                            ) : (
                              <Button
                                size="small" variant="contained" color="primary" fullWidth
                                onClick={() => handleCompleteReservation(activeBooking.id)}
                                sx={{ borderRadius: '10px', fontSize: '11.5px', fontWeight: 800, bgcolor: adminColors.success }}
                              >
                                Release Table
                              </Button>
                            )}
                            <IconButton size="small" onClick={() => handleCancelReservation(activeBooking.id)} sx={{ color: adminColors.accentRed }}>
                              <Cancel fontSize="small" />
                            </IconButton>
                          </>
                        ) : (
                          <Button
                            size="small" variant="outlined" color="primary" fullWidth
                            onClick={() => { setPreselectedTableNum(table.tableNumber); setCreateBookingOpen(true); }}
                            sx={{ borderRadius: '10px', fontSize: '11.5px', fontWeight: 700 }}
                          >
                            + Assign Walk-In
                          </Button>
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      )}

      {/* ── VIEW 2: TABLE GRID & MANAGEMENT ───────────────────────────────────── */}
      {viewMode === 'grid' && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              🪑 Table Seating Configuration
            </Typography>
            <Button
              variant="contained" startIcon={<Add />}
              onClick={() => { setEditingTable(null); setTableDialogOpen(true); }}
              sx={{ bgcolor: adminColors.accentRed, '&:hover': { bgcolor: adminColors.accentRedDark }, borderRadius: '12px', fontWeight: 700 }}
            >
              Add New Table
            </Button>
          </Box>

          {tablesLoading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress color="primary" /></Box>
          ) : tables.length === 0 ? (
            <Alert severity="warning" sx={{ borderRadius: '14px' }}>
              No tables added yet. Click <strong>&quot;Add Table&quot;</strong> to create your first table.
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
                          label={table.isActive ? 'Active' : 'Maintenance'}
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
                        👥 {table.capacity} Seats Capacity
                      </Typography>
                      {table.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          📍 {table.description}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions sx={{ px: 2, pb: 2, gap: 0.5 }}>
                      <Tooltip title="Edit Table Details">
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
      )}

      {/* ── VIEW 3: RESERVATION LEDGER & SEARCH ───────────────────────────────── */}
      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>📋 Reservations Ledger</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map((s) => (
            <Chip
              key={s}
              label={`${s === 'all' ? 'All' : reservationStatusColors[s]?.label || s} (${counts[s] || 0})`}
              onClick={() => setFilterStatus(s)}
              sx={{
                fontWeight: filterStatus === s ? 800 : 500, cursor: 'pointer',
                bgcolor: filterStatus === s ? (s === 'all' ? adminColors.accentRed : reservationStatusColors[s]?.color || '#424242') : '#F5F5F5',
                color: filterStatus === s ? 'white' : '#424242',
                boxShadow: adminColors.shadowSm, transition: 'all 0.2s',
              }}
            />
          ))}
        </Box>
      </Box>

      <SectionCard noPadding sx={{ mb: 4 }}>
        <Box sx={{ p: 2, borderBottom: `1px solid ${adminColors.divider}`, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small" placeholder="Search customer name, phone, or table..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1, maxWidth: 400, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ color: '#9E9E9E', fontSize: 18 }} /></InputAdornment> } }}
          />
        </Box>

        {filtered.length === 0 ? (
          <EmptyState emoji="📅" title="No matching reservations" subtitle="Try clearing the search query or changing date filters." />
        ) : isTablet ? (
          /* Mobile list cards */
          <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Stack spacing={1.5}>
              {filtered.map((r) => (
                <Box key={r.id} sx={{ p: 2, borderRadius: adminColors.radiusMd, border: `1px solid ${adminColors.borderSubtle}`, bgcolor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1.2, alignItems: 'center', minWidth: 0 }}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: adminColors.accentRed, fontSize: '12px', fontWeight: 800, flexShrink: 0 }}>
                        {r.customerName.split(' ').map((n) => n[0]).join('')}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>{r.customerName}</Typography>
                        <Typography variant="caption" color="text.secondary">{r.customerPhone}</Typography>
                      </Box>
                    </Box>
                    <StatusChip status={r.status} palette={EXTENDED_STATUS_COLORS} />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1.5, flexWrap: 'wrap' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>📅 {r.date} at {r.time}</Typography>
                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.4, fontWeight: 700 }}>
                      <People sx={{ fontSize: 14, color: '#616161' }} /> {r.guests} Guests
                    </Typography>
                    {r.tableNumber && (
                      <Chip label={`Table ${r.tableNumber}`} size="small" icon={<TableRestaurant sx={{ fontSize: '13px !important' }} />}
                        sx={{ bgcolor: 'rgba(198,40,40,0.08)', color: adminColors.accentRed, fontWeight: 800, fontSize: '10px', height: 22 }} />
                    )}
                  </Box>

                  {r.specialRequest && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, fontStyle: 'italic', bgcolor: '#FFF8F2', p: 0.8, borderRadius: '6px' }}>
                      “{r.specialRequest}”
                    </Typography>
                  )}

                  {(r.status === 'pending' || r.status === 'confirmed') && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                      {r.status === 'pending' && (
                        <Button size="small" variant="contained" color="success" startIcon={<CheckCircle sx={{ fontSize: 16 }} />}
                          onClick={() => handleConfirmReservation(r.id)}
                          sx={{ borderRadius: adminColors.radiusSm, fontSize: '11px', flex: 1, fontWeight: 800 }}>
                          Confirm
                        </Button>
                      )}
                      {r.status === 'confirmed' && (
                        <Button size="small" variant="contained" color="primary"
                          onClick={() => handleCompleteReservation(r.id)}
                          sx={{ borderRadius: adminColors.radiusSm, fontSize: '11px', flex: 1, fontWeight: 800, bgcolor: adminColors.success }}>
                          Complete
                        </Button>
                      )}
                      <Button size="small" variant="outlined" color="error" startIcon={<Cancel sx={{ fontSize: 16 }} />}
                        onClick={() => handleCancelReservation(r.id)}
                        sx={{ borderRadius: adminColors.radiusSm, fontSize: '11px', flex: 1, fontWeight: 700 }}>
                        Cancel
                      </Button>
                    </Box>
                  )}
                </Box>
              ))}
            </Stack>
          </Box>
        ) : (
          /* Desktop Table View */
          <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 900 }}>
              <TableHead sx={{ bgcolor: adminColors.bgSubtle }}>
                <TableRow>
                  {['ID', 'Customer', 'Contact', 'Party Size', 'Date & Time', 'Table', 'Status', 'Special Notes', 'Actions'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 800, fontSize: '12px', color: '#616161', py: 1.5, whiteSpace: 'nowrap' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 800, color: adminColors.accentRed, fontSize: '11px' }}>
                        {r.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: adminColors.accentRed, fontSize: '11px', fontWeight: 800 }}>
                          {r.customerName.split(' ').map((n) => n[0]).join('')}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{r.customerName}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.customerPhone}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <People sx={{ fontSize: 16, color: '#616161' }} />
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{r.guests} Seats</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{r.date}</Typography>
                      <Typography variant="caption" color="text.secondary">{r.time}</Typography>
                    </TableCell>
                    <TableCell>
                      {r.tableNumber ? (
                        <Chip
                          label={`Table ${r.tableNumber}`}
                          size="small"
                          icon={<TableRestaurant sx={{ fontSize: '14px !important' }} />}
                          sx={{ bgcolor: 'rgba(198,40,40,0.08)', color: adminColors.accentRed, fontWeight: 800, fontSize: '11px' }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">Unassigned</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={r.status} palette={EXTENDED_STATUS_COLORS} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 160, display: 'block' }}>
                        {r.specialRequest || '–'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {r.status === 'pending' && (
                          <Button
                            size="small" variant="contained" color="success"
                            onClick={() => handleConfirmReservation(r.id)}
                            sx={{ borderRadius: '8px', fontSize: '11px', fontWeight: 800 }}
                          >
                            Confirm
                          </Button>
                        )}
                        {r.status === 'confirmed' && (
                          <Button
                            size="small" variant="contained" color="primary"
                            onClick={() => handleCompleteReservation(r.id)}
                            sx={{ borderRadius: '8px', fontSize: '11px', fontWeight: 800, bgcolor: adminColors.success }}
                          >
                            Complete
                          </Button>
                        )}
                        {r.status !== 'completed' && r.status !== 'cancelled' && (
                          <Tooltip title="Cancel Booking & Free Table">
                            <IconButton size="small" onClick={() => handleCancelReservation(r.id)}>
                              <Cancel sx={{ color: adminColors.accentRed, fontSize: 20 }} />
                            </IconButton>
                          </Tooltip>
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

      {/* Add / Edit Table Dialog */}
      <TableDialog
        key={`table-dialog-${tableDialogOpen}-${editingTable?.id ?? 'new'}`}
        open={tableDialogOpen}
        editing={editingTable}
        onClose={() => setTableDialogOpen(false)}
      />

      {/* Fast Walk-In / Phone Booking Dialog */}
      <CreateReservationDialog
        open={createBookingOpen}
        onClose={() => setCreateBookingOpen(false)}
        tables={tables}
        initialTable={preselectedTableNum}
      />
    </AdminLayout>
  );
}
