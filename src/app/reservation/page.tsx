'use client';
import React, { useState, useMemo } from 'react';
import {
  Box, Container, Grid, Typography, Button, TextField, Paper, Chip,
  Dialog, DialogContent, CircularProgress,
  MenuItem as MuiMenuItem, Select, FormControl, InputLabel, Alert,
  Stepper, Step, StepLabel, Tooltip,
} from '@mui/material';
import {
  CheckCircle, TableRestaurant,
  Phone, Email, Person, ArrowForward, ArrowBack,
} from '@mui/icons-material';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import toast from 'react-hot-toast';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { generateReservationId } from '@/lib/idGenerator';
import {
  useGetTablesQuery,
  useGetBookedTableSlotsQuery,
  useBookTableSlotMutation,
} from '@/store/supabaseApi';

const timeSlots = [
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM',
];

const getMinDate = () => new Date().toISOString().split('T')[0];

const STEPS = ['Date & Time', 'Choose Table', 'Your Details'];

export default function ReservationPage() {
  const { addReservationLocallyAndDB } = useAdmin();
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);

  // Step 1 state
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [guests, setGuests] = useState('2');
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});

  // Step 2 state
  const [selectedTableId, setSelectedTableId] = useState('');
  const [selectedTableNumber, setSelectedTableNumber] = useState(0);

  // Step 3 state
  const [form, setForm] = useState({ name: '', phone: '', email: '', request: '' });
  const [step3Errors, setStep3Errors] = useState<Record<string, string>>({});

  // Result state
  const [loading, setLoading] = useState(false);
  const [confirmId, setConfirmId] = useState('');
  const [success, setSuccess] = useState(false);

  // RTK Query
  const { data: tables = [], isLoading: tablesLoading } = useGetTablesQuery();
  const { data: bookedTableIds = [], isLoading: slotsLoading } = useGetBookedTableSlotsQuery(
    { date, timeSlot: time },
    { skip: !date || !time }
  );
  const [bookTableSlot] = useBookTableSlotMutation();

  // Active tables that can seat the guests
  const guestCount = Number(guests) || 2;
  const activeTables = useMemo(
    () => tables.filter((t) => t.isActive),
    [tables]
  );

  const getTableStatus = (tableId: string, capacity: number) => {
    if (bookedTableIds.includes(tableId)) return 'occupied';
    if (capacity < guestCount) return 'too-small';
    return 'available';
  };

  // ─── Step 1 validation ─────────────────────────────────────────────────────
  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!date) e.date = 'Please select a date';
    else {
      const today = new Date().toISOString().split('T')[0];
      if (date < today) e.date = 'Date cannot be in the past';
    }
    if (!time) e.time = 'Please select a time slot';
    setStep1Errors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Step 3 validation ─────────────────────────────────────────────────────
  const validateStep3 = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name required';
    if (!form.phone.trim()) e.phone = 'Phone required';
    setStep3Errors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Navigation ────────────────────────────────────────────────────────────
  const handleNext = () => {
    if (activeStep === 0 && !validateStep1()) return;
    if (activeStep === 1 && !selectedTableId) {
      toast.error('Please select an available table');
      return;
    }
    setActiveStep((s) => s + 1);
  };

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateStep3()) return;
    setLoading(true);

    const id = generateReservationId();
    const slotId = `SLOT-${id}`;
    const newResObj = {
      id,
      customerName: form.name,
      customerPhone: form.phone,
      email: form.email,
      guests: guestCount,
      date,
      time,
      specialRequest: form.request,
      status: 'confirmed' as const,
      createdAt: new Date().toISOString(),
      tableId: selectedTableId,
      tableNumber: selectedTableNumber,
      userId: user?.id || null,
    };

    // Single write path (RTK Query) — previously this also inserted via
    // lib/db.ts directly, writing the same reservation twice.
    try {
      await addReservationLocallyAndDB(newResObj);
      await bookTableSlot({
        id: slotId,
        tableId: selectedTableId,
        reservationId: id,
        date,
        timeSlot: time,
      }).unwrap();
    } catch {
      toast.error('We could not confirm your reservation. Please try again or call us directly.');
      setLoading(false);
      return;
    }

    setConfirmId(id);
    setSuccess(true);
    setLoading(false);
    toast.success('🎉 Table reserved & confirmed!');
  };

  return (
    <>
      <Navbar />

      {/* Hero */}
      <Box sx={{
        background: 'linear-gradient(135deg, #2D0000 0%, #C62828 100%)',
        py: { xs: 3, md: 4.5 }, textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,152,0,0.1) 0%, transparent 70%)' }} />
        <Typography variant="h2" sx={{ fontWeight: 800, color: 'white', fontSize: { xs: '1.8rem', md: '2.5rem' }, mb: 1, position: 'relative' }}>
          📅 Reserve Your Table
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', maxWidth: 500, mx: 'auto', position: 'relative' }}>
          Book your royal dining experience — choose your table and we&apos;ll hold it just for you.
        </Typography>
      </Box>

      <Box sx={{ bgcolor: '#FFF8F2', py: { xs: 3, md: 5 } }}>
        <Container maxWidth="md">

          {/* Stepper */}
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: '24px', boxShadow: '0 8px 40px rgba(0,0,0,0.1)' }}>

            {/* ── STEP 1: Date, Time, Guests ─────────────────────────────────── */}
            {activeStep === 0 && (
              <Box>
                <Typography variant="h5" color="#C62828" sx={{ fontWeight: 800, mb: 3 }}>
                  📅 When would you like to visit?
                </Typography>
                <Grid container spacing={2.5}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth label="Preferred Date *" type="date"
                      value={date} onChange={(e) => setDate(e.target.value)}
                      error={!!step1Errors.date} helperText={step1Errors.date}
                      slotProps={{ htmlInput: { min: getMinDate() }, inputLabel: { shrink: true } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Number of Guests *</InputLabel>
                      <Select value={guests} label="Number of Guests *" onChange={(e) => { setGuests(e.target.value); setSelectedTableId(''); setSelectedTableNumber(0); }}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map((n) => (
                          <MuiMenuItem key={n} value={String(n)}>{n} {n === 1 ? 'Guest' : 'Guests'}</MuiMenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 1.5 }}>
                      Select Time Slot *
                    </Typography>
                    {step1Errors.time && <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>{step1Errors.time}</Typography>}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {timeSlots.map((t) => (
                        <Chip
                          key={t} label={t}
                          onClick={() => { setTime(t); setSelectedTableId(''); setSelectedTableNumber(0); }}
                          sx={{
                            cursor: 'pointer', fontWeight: 600,
                            bgcolor: time === t ? '#C62828' : 'white',
                            color: time === t ? 'white' : '#424242',
                            border: `1.5px solid ${time === t ? '#C62828' : 'rgba(0,0,0,0.15)'}`,
                            '&:hover': { bgcolor: time === t ? '#8E0000' : 'rgba(198,40,40,0.08)' },
                            transition: 'all 0.2s',
                          }}
                        />
                      ))}
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* ── STEP 2: Table Picker ──────────────────────────────────────── */}
            {activeStep === 1 && (
              <Box>
                <Typography variant="h5" color="#C62828" sx={{ fontWeight: 800, mb: 1 }}>
                  🪑 Choose Your Table
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Showing tables for <strong>{date}</strong> at <strong>{time}</strong> for <strong>{guests} guests</strong>
                </Typography>

                {/* Legend */}
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                  {[
                    { color: '#2E7D32', bg: 'rgba(46,125,50,0.1)', label: '✅ Available' },
                    { color: '#C62828', bg: 'rgba(198,40,40,0.08)', label: '🔴 Occupied' },
                    { color: '#616161', bg: 'rgba(0,0,0,0.04)', label: '⚪ Too Small' },
                  ].map((l) => (
                    <Box key={l.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 14, height: 14, borderRadius: '4px', bgcolor: l.bg, border: `2px solid ${l.color}` }} />
                      <Typography variant="caption" sx={{ fontWeight: 600, color: '#616161' }}>{l.label}</Typography>
                    </Box>
                  ))}
                </Box>

                {(tablesLoading || slotsLoading) ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <CircularProgress color="primary" />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Checking table availability...</Typography>
                  </Box>
                ) : activeTables.length === 0 ? (
                  <Alert severity="info" sx={{ borderRadius: '14px' }}>
                    No tables have been set up yet. Please contact the restaurant directly at <strong>+91 70326 82089</strong>.
                  </Alert>
                ) : (
                  <Grid container spacing={2}>
                    {activeTables.map((table) => {
                      const status = getTableStatus(table.id, table.capacity);
                      const isSelected = selectedTableId === table.id;
                      const isAvailable = status === 'available';

                      const borderColor = isSelected ? '#C62828' : status === 'occupied' ? '#EF5350' : status === 'too-small' ? '#BDBDBD' : '#81C784';
                      const bgColor = isSelected ? 'rgba(198,40,40,0.08)' : status === 'occupied' ? 'rgba(239,83,80,0.06)' : status === 'too-small' ? 'rgba(0,0,0,0.03)' : 'rgba(129,199,132,0.08)';
                      const statusLabel = status === 'occupied' ? '🔴 Taken' : status === 'too-small' ? `⚪ Max ${table.capacity}` : '✅ Available';
                      const statusColor = status === 'occupied' ? '#C62828' : status === 'too-small' ? '#9E9E9E' : '#2E7D32';

                      return (
                        <Grid key={table.id} size={{ xs: 6, sm: 4, md: 3 }}>
                          <Tooltip
                            title={status === 'occupied' ? 'This table is already booked for this slot' : status === 'too-small' ? `Table seats max ${table.capacity}` : 'Click to select this table'}
                            arrow
                          >
                            <Box
                              onClick={() => {
                                if (!isAvailable) return;
                                setSelectedTableId(table.id);
                                setSelectedTableNumber(table.tableNumber);
                              }}
                              sx={{
                                p: 2, borderRadius: '16px', textAlign: 'center',
                                border: `2px solid ${borderColor}`,
                                bgcolor: bgColor,
                                cursor: isAvailable ? 'pointer' : 'not-allowed',
                                opacity: status === 'too-small' ? 0.6 : 1,
                                transition: 'all 0.2s',
                                boxShadow: isSelected ? '0 4px 16px rgba(198,40,40,0.3)' : 'none',
                                '&:hover': isAvailable ? { transform: 'translateY(-2px)', boxShadow: '0 6px 20px rgba(198,40,40,0.2)' } : {},
                              }}
                            >
                              <TableRestaurant sx={{ fontSize: 36, color: borderColor, mb: 0.5 }} />
                              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>
                                Table {table.tableNumber}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>
                                👥 {table.capacity} seats
                              </Typography>
                              {table.description && (
                                <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', fontSize: '10px', mb: 0.5 }}>
                                  {table.description}
                                </Typography>
                              )}
                              <Chip
                                label={statusLabel}
                                size="small"
                                sx={{ bgcolor: `${statusColor}15`, color: statusColor, fontWeight: 700, fontSize: '10px', height: 20, mt: 0.5 }}
                              />
                              {isSelected && (
                                <Box sx={{ mt: 1 }}>
                                  <CheckCircle sx={{ color: '#C62828', fontSize: 20 }} />
                                </Box>
                              )}
                            </Box>
                          </Tooltip>
                        </Grid>
                      );
                    })}
                  </Grid>
                )}

                {selectedTableId && (
                  <Alert severity="success" sx={{ mt: 3, borderRadius: '12px' }}>
                    🎯 <strong>Table {selectedTableNumber}</strong> selected for {guests} guests on {date} at {time}
                  </Alert>
                )}
              </Box>
            )}

            {/* ── STEP 3: Guest Details ─────────────────────────────────────── */}
            {activeStep === 2 && (
              <Box>
                <Typography variant="h5" color="#C62828" sx={{ fontWeight: 800, mb: 3 }}>
                  👤 Your Details
                </Typography>
                <Alert severity="info" sx={{ mb: 3, borderRadius: '12px' }}>
                  Table <strong>{selectedTableNumber}</strong> · {guests} guests · {date} at {time}
                </Alert>
                <Grid container spacing={2.5}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth label="Full Name *"
                      value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      error={!!step3Errors.name} helperText={step3Errors.name}
                      slotProps={{ input: { startAdornment: <Person sx={{ mr: 1, color: '#C62828', fontSize: 20 }} /> } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth label="Phone Number *"
                      value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      error={!!step3Errors.phone} helperText={step3Errors.phone}
                      slotProps={{ input: { startAdornment: <Phone sx={{ mr: 1, color: '#C62828', fontSize: 20 }} /> } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth label="Email Address (optional)"
                      value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                      type="email"
                      slotProps={{ input: { startAdornment: <Email sx={{ mr: 1, color: '#C62828', fontSize: 20 }} /> } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth label="Special Requests (Optional)" multiline rows={3}
                      value={form.request} onChange={(e) => setForm({ ...form, request: e.target.value })}
                      placeholder="e.g. Anniversary, vegetarian only, high chair needed..."
                    />
                  </Grid>
                </Grid>
                <Button
                  fullWidth variant="contained" color="primary" size="large"
                  onClick={handleSubmit} disabled={loading}
                  sx={{
                    mt: 3.5, py: 2, borderRadius: '14px', fontSize: '16px', fontWeight: 700,
                    background: 'linear-gradient(135deg, #C62828, #EF5350)',
                    boxShadow: '0 8px 24px rgba(198,40,40,0.3)',
                  }}
                >
                  {loading ? <CircularProgress size={26} color="inherit" /> : '🎉 Confirm Reservation'}
                </Button>
              </Box>
            )}

            {/* Navigation Buttons */}
            {activeStep < 3 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 3, borderTop: '1px solid #F1F5F9' }}>
                <Button
                  startIcon={<ArrowBack />}
                  onClick={() => setActiveStep((s) => s - 1)}
                  disabled={activeStep === 0}
                  sx={{ color: '#64748B' }}
                >
                  Back
                </Button>
                {activeStep < 2 && (
                  <Button
                    variant="contained" color="primary" endIcon={<ArrowForward />}
                    onClick={handleNext}
                    sx={{ borderRadius: '12px', px: 3, fontWeight: 700, background: 'linear-gradient(135deg, #C62828, #EF5350)' }}
                  >
                    {activeStep === 0 ? 'View Available Tables' : 'Enter Your Details'}
                  </Button>
                )}
              </Box>
            )}
          </Paper>

          {/* Info Cards */}
          <Grid container spacing={2} sx={{ mt: 3 }}>
            {[
              { icon: '📍', title: 'Location', content: 'Madhapur, Hyderabad, TS – 500081' },
              { icon: '🕐', title: 'Hours', content: 'Lunch: 12PM–3:30PM\nDinner: 7PM–11PM' },
              { icon: '📞', title: 'Call Us', content: '+91 70326 82089' },
            ].map((info) => (
              <Grid key={info.title} size={{ xs: 12, sm: 4 }}>
                <Paper sx={{ p: 2.5, borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Typography sx={{ fontSize: '1.5rem' }}>{info.icon}</Typography>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.3 }}>{info.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line', fontSize: '12px' }}>{info.content}</Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Success Dialog */}
      <Dialog open={success} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '24px' } } }}>
        <DialogContent sx={{ p: 5, textAlign: 'center' }}>
          <Box sx={{ width: 80, height: 80, bgcolor: 'rgba(46,125,50,0.1)', borderRadius: '50%', mx: 'auto', mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle sx={{ fontSize: 48, color: '#2E7D32' }} />
          </Box>
          <Typography variant="h4" color="#2E7D32" sx={{ fontWeight: 800, mb: 1 }}>
            Table Reserved! 🎉
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Your reservation is confirmed. We look forward to serving you, <strong>{form.name}</strong>!
          </Typography>
          <Box sx={{ bgcolor: '#FFF8F2', borderRadius: '14px', p: 3, mb: 3, textAlign: 'left' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>BOOKING DETAILS</Typography>
            <Typography variant="h6" color="#C62828" sx={{ fontWeight: 800, mb: 2 }}>{confirmId}</Typography>
            <Grid container spacing={1}>
              {[
                { label: 'Name', value: form.name },
                { label: 'Table', value: `Table ${selectedTableNumber}` },
                { label: 'Date', value: date },
                { label: 'Time', value: time },
                { label: 'Guests', value: `${guests} people` },
              ].map((d) => (
                <Grid key={d.label} size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">{d.label}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{d.value}</Typography>
                </Grid>
              ))}
            </Grid>
          </Box>
          <Button
            fullWidth variant="contained" color="primary"
            onClick={() => { setSuccess(false); setActiveStep(0); setDate(''); setTime(''); setGuests('2'); setSelectedTableId(''); setSelectedTableNumber(0); setForm({ name: '', phone: '', email: '', request: '' }); }}
            sx={{ borderRadius: '14px', py: 1.5, mb: 1.5 }}
          >
            Make Another Reservation
          </Button>
          <Button
            fullWidth variant="outlined" color="success"
            href={`https://wa.me/917032682089?text=Hello Pala Pitta Ruchulu! I have a reservation (${confirmId}) — Table ${selectedTableNumber} for ${guests} guests on ${date} at ${time}.`}
            target="_blank"
            sx={{ borderRadius: '14px', py: 1.5 }}
          >
            📱 Share on WhatsApp
          </Button>
        </DialogContent>
      </Dialog>

      <Footer />
    </>
  );
}
