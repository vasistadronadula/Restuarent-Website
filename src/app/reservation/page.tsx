'use client';
import React, { useState } from 'react';
import {
  Box, Container, Grid, Typography, Button, TextField, Paper, Chip,
  Dialog, DialogContent, DialogTitle, IconButton, Divider, CircularProgress,
  MenuItem as MuiMenuItem, Select, FormControl, InputLabel, Alert,
} from '@mui/material';
import {
  CheckCircle, Close, People, Schedule, Event, TableRestaurant,
  Phone, Email, Person,
} from '@mui/icons-material';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import toast from 'react-hot-toast';

const timeSlots = [
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM',
  '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM',
];

const generateConfirmId = () => `RES-${String(Math.floor(Math.random() * 90000) + 10000)}`;

const getMinDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

export default function ReservationPage() {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', guests: '2', date: '', time: '', request: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [confirmId, setConfirmId] = useState('');
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name required';
    if (!form.phone.trim()) e.phone = 'Phone required';
    if (!form.date) e.date = 'Please select a date';
    if (!form.time) e.time = 'Please select a time slot';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 2000));
    setConfirmId(generateConfirmId());
    setSuccess(true);
    setLoading(false);
  };

  return (
    <>
      <Navbar />

      {/* Hero */}
      <Box sx={{
        background: 'linear-gradient(135deg, #2D0000 0%, #C62828 100%)',
        py: { xs: 6, md: 10 }, textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,152,0,0.1) 0%, transparent 70%)' }} />
        <Typography variant="h2" sx={{fontWeight: 800, color: 'white', fontSize: { xs: '2rem', md: '3rem' }, mb: 1.5, position: 'relative'}}>
          📅 Reserve Your Table
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem', maxWidth: 500, mx: 'auto', position: 'relative' }}>
          Book your royal dining experience — perfect for family dinners, anniversaries, and celebrations.
        </Typography>
      </Box>

      <Box sx={{ bgcolor: '#FFF8F2', py: { xs: 5, md: 8 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={5}>
            {/* Form */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: '24px', boxShadow: '0 8px 40px rgba(0,0,0,0.1)' }}>
                <Typography variant="h5" color="#C62828" sx={{fontWeight: 800, mb: 3}}>
                  Make a Reservation
                </Typography>

                <Grid container spacing={2.5}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField fullWidth label="Full Name *"
                      value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      error={!!errors.name} helperText={errors.name}
                      slotProps={{ input: { startAdornment: <Person sx={{ mr: 1, color: '#C62828', fontSize: 20 }} /> } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField fullWidth label="Phone Number *"
                      value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      error={!!errors.phone} helperText={errors.phone}
                      slotProps={{ input: { startAdornment: <Phone sx={{ mr: 1, color: '#C62828', fontSize: 20 }} /> } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField fullWidth label="Email Address"
                      value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                      type="email"
                      slotProps={{ input: { startAdornment: <Email sx={{ mr: 1, color: '#C62828', fontSize: 20 }} /> } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Number of Guests *</InputLabel>
                      <Select
                        value={form.guests}
                        label="Number of Guests *"
                        onChange={(e) => setForm({ ...form, guests: e.target.value })}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20].map((n) => (
                          <MuiMenuItem key={n} value={String(n)}>{n} {n === 1 ? 'Guest' : 'Guests'}</MuiMenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField fullWidth label="Preferred Date *" type="date"
                      value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                      error={!!errors.date} helperText={errors.date}
                      slotProps={{ htmlInput: { min: getMinDate() }, inputLabel: { shrink: true } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary" sx={{fontWeight: 600, mb: 1.5}}>
                      Select Time Slot *
                    </Typography>
                    {errors.time && <Typography variant="caption" color="error" sx={{display: 'block', mb: 1}}>{errors.time}</Typography>}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {timeSlots.map((t) => (
                        <Chip
                          key={t} label={t}
                          onClick={() => setForm({ ...form, time: t })}
                          sx={{
                            cursor: 'pointer', fontWeight: 600,
                            bgcolor: form.time === t ? '#C62828' : 'white',
                            color: form.time === t ? 'white' : '#424242',
                            border: `1.5px solid ${form.time === t ? '#C62828' : 'rgba(0,0,0,0.15)'}`,
                            '&:hover': { bgcolor: form.time === t ? '#8E0000' : 'rgba(198,40,40,0.08)' },
                            transition: 'all 0.2s',
                          }}
                        />
                      ))}
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField fullWidth label="Special Requests (Optional)" multiline rows={3}
                      value={form.request} onChange={(e) => setForm({ ...form, request: e.target.value })}
                      placeholder="e.g. Anniversary celebration, vegetarian only, high chair needed..."
                    />
                  </Grid>
                </Grid>

                <Button
                  fullWidth variant="contained" color="primary" size="large"
                  onClick={handleSubmit} disabled={loading}
                  sx={{ mt: 3.5, py: 2, borderRadius: '14px', fontSize: '16px', fontWeight: 700,
                    background: 'linear-gradient(135deg, #C62828, #EF5350)', boxShadow: '0 8px 24px rgba(198,40,40,0.3)' }}
                >
                  {loading ? <CircularProgress size={26} color="inherit" /> : '🎉 Confirm Reservation'}
                </Button>
              </Paper>
            </Grid>

            {/* Info */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Box sx={{ position: 'sticky', top: 90 }}>
                {/* Info Cards */}
                {[
                  { icon: '📍', title: 'Location', content: '12-3-456, Royal Complex, Banjara Hills, Hyderabad – 500034' },
                  { icon: '🕐', title: 'Opening Hours', content: 'Lunch: 12PM – 3PM\nDinner: 7PM – 11PM\nBreakfast: 7AM – 11AM' },
                  { icon: '📞', title: 'Call Us', content: '+91 98765 43210\n+91 40-2345-6789' },
                ].map((info) => (
                  <Paper key={info.title} sx={{ p: 3, borderRadius: '16px', mb: 2.5, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Typography sx={{ fontSize: '1.8rem' }}>{info.icon}</Typography>
                      <Box>
                        <Typography variant="subtitle2" sx={{fontWeight: 700, mb: 0.5}}>{info.title}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>{info.content}</Typography>
                      </Box>
                    </Box>
                  </Paper>
                ))}

                <Alert severity="info" sx={{ borderRadius: '14px' }}>
                  <Typography variant="body2" sx={{fontWeight: 600, mb: 0.5}}>📋 Reservation Policy</Typography>
                  <Typography variant="caption" color="text.secondary">
                    • Tables are held for 15 minutes after booking time<br />
                    • Free cancellation up to 2 hours before<br />
                    • Large groups (10+) require ₹500 advance
                  </Typography>
                </Alert>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Success Dialog */}
      <Dialog open={success} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '24px' } } }}>
        <DialogContent sx={{ p: 5, textAlign: 'center' }}>
          <Box sx={{ width: 80, height: 80, bgcolor: 'rgba(46,125,50,0.1)', borderRadius: '50%', mx: 'auto', mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle sx={{ fontSize: 48, color: '#2E7D32' }} />
          </Box>
          <Typography variant="h4" color="#2E7D32" sx={{fontWeight: 800, mb: 1}}>
            Table Reserved! 🎉
          </Typography>
          <Typography color="text.secondary" sx={{mb: 3}}>
            Your reservation has been confirmed. We look forward to serving you, {form.name}!
          </Typography>
          <Box sx={{ bgcolor: '#FFF8F2', borderRadius: '14px', p: 3, mb: 3, textAlign: 'left' }}>
            <Typography variant="caption" color="text.secondary" sx={{fontWeight: 600, display: 'block', mb: 1}}>BOOKING DETAILS</Typography>
            <Typography variant="h6" color="#C62828" sx={{fontWeight: 800, mb: 2}}>{confirmId}</Typography>
            <Grid container spacing={1}>
              {[
                { label: 'Name', value: form.name },
                { label: 'Date', value: form.date },
                { label: 'Time', value: form.time },
                { label: 'Guests', value: `${form.guests} people` },
              ].map((d) => (
                <Grid key={d.label} size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">{d.label}</Typography>
                  <Typography variant="body2" sx={{fontWeight: 600}}>{d.value}</Typography>
                </Grid>
              ))}
            </Grid>
          </Box>
          <Button fullWidth variant="contained" color="primary" onClick={() => setSuccess(false)} sx={{ borderRadius: '14px', py: 1.5, mb: 1.5 }}>
            Great, Thanks!
          </Button>
          <Button
            fullWidth variant="outlined" color="success"
            startIcon={<Box component="span">📱</Box>}
            href={`https://wa.me/919876543210?text=Hello Pala Pitta Ruchulu! I have a reservation (${confirmId}) for ${form.guests} guests on ${form.date} at ${form.time}.`}
            target="_blank"
            sx={{ borderRadius: '14px', py: 1.5 }}
          >
            Share on WhatsApp
          </Button>
        </DialogContent>
      </Dialog>

      <Footer />
    </>
  );
}
