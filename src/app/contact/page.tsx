'use client';
import React, { useState } from 'react';
import {
  Box, Container, Grid, Typography, TextField, Button, Paper,
  Divider, Chip, Alert, CircularProgress,
} from '@mui/material';
import { Phone, Email, LocationOn, AccessTime, WhatsApp, Send, CheckCircle } from '@mui/icons-material';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import toast from 'react-hot-toast';

const contactInfo = [
  { icon: <LocationOn />, label: 'Address', value: '12-3-456, Royal Complex, Banjara Hills, Road No. 10\nHyderabad, Telangana – 500034', color: '#C62828' },
  { icon: <Phone />, label: 'Phone', value: '+91 98765 43210\n+91 40-2345-6789', color: '#2E7D32' },
  { icon: <Email />, label: 'Email', value: 'info@palapittaruchulu.in\nreservations@palapittaruchulu.in', color: '#1565C0' },
  { icon: <WhatsApp />, label: 'WhatsApp', value: '+91 98765 43210\n(Quick Replies Available)', color: '#25D366' },
];

const hours = [
  { day: 'Monday – Friday', time: '7:00 AM – 11:00 PM' },
  { day: 'Saturday – Sunday', time: '7:00 AM – 11:30 PM' },
  { day: 'Public Holidays', time: '8:00 AM – 10:30 PM' },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill all required fields');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setSubmitted(true);
    setLoading(false);
    toast.success('Message sent! We\'ll reply within 24 hours 😊');
  };

  return (
    <>
      <Navbar />

      {/* Hero */}
      <Box sx={{ background: 'linear-gradient(135deg, #1A0A0A, #C62828)', py: { xs: 6, md: 10 }, textAlign: 'center' }}>
        <Typography variant="h2" sx={{fontWeight: 800, color: 'white', fontSize: { xs: '2rem', md: '3rem' }, mb: 1.5}}>
          📞 Get in Touch
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.8)', maxWidth: 480, mx: 'auto' }}>
          Have a question, feedback, or a special request? We'd love to hear from you!
        </Typography>
      </Box>

      <Box sx={{ bgcolor: '#FFF8F2', py: { xs: 5, md: 8 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={5}>
            {/* Left – Contact Info + Map */}
            <Grid size={{ xs: 12, md: 5 }}>
              {/* Info Cards */}
              {contactInfo.map((info, i) => (
                <Paper key={i} sx={{ p: 2.5, borderRadius: '16px', mb: 2.5, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', display: 'flex', gap: 2 }}>
                  <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: info.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', color: info.color, flexShrink: 0 }}>
                    {info.icon}
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{fontWeight: 600, display: 'block'}}>{info.label.toUpperCase()}</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line', mt: 0.3, fontWeight: 500 }}>{info.value}</Typography>
                  </Box>
                </Paper>
              ))}

              {/* Hours */}
              <Paper sx={{ p: 2.5, borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', mb: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AccessTime sx={{ color: '#C62828' }} />
                  <Typography variant="subtitle1" sx={{fontWeight: 700}}>Opening Hours</Typography>
                </Box>
                {hours.map((h, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">{h.day}</Typography>
                    <Typography variant="body2" sx={{fontWeight: 600}}>{h.time}</Typography>
                  </Box>
                ))}
              </Paper>

              {/* Map Placeholder */}
              <Paper sx={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', height: 220, position: 'relative' }}>
                <Box
                  component="iframe"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3806.267578789453!2d78.4189!3d17.4159!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTfCsDI0JzU3LjIiTiA3OMKwMjUnMDQuMCJF!5e0!3m2!1sen!2sin!4v1626000000000!5m2!1sen!2sin"
                  width="100%"
                  height="220"
                  style={{ border: 0 }}
                  allowFullScreen={false}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <Box sx={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: 'rgba(255,248,242,0.9)', flexDirection: 'column', gap: 1,
                }}>
                  <LocationOn sx={{ fontSize: 48, color: '#C62828' }} />
                  <Typography sx={{fontWeight: 700}}>Banjara Hills, Hyderabad</Typography>
                  <Button
                    href="https://maps.google.com/?q=Banjara+Hills+Hyderabad"
                    target="_blank"
                    variant="contained" color="primary" size="small" sx={{ borderRadius: '10px' }}
                  >
                    Open in Google Maps
                  </Button>
                </Box>
              </Paper>
            </Grid>

            {/* Right – Contact Form */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: '24px', boxShadow: '0 8px 40px rgba(0,0,0,0.1)' }}>
                {submitted ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <CheckCircle sx={{ fontSize: 64, color: '#2E7D32', mb: 2 }} />
                    <Typography variant="h5" color="#2E7D32" sx={{fontWeight: 800, mb: 1}}>Message Sent!</Typography>
                    <Typography color="text.secondary" sx={{mb: 3}}>Thank you, {form.name}! We'll get back to you within 24 hours.</Typography>
                    <Button variant="outlined" color="primary" onClick={() => { setSubmitted(false); setForm({ name: '', email: '', phone: '', subject: '', message: '' }); }}>
                      Send Another Message
                    </Button>
                  </Box>
                ) : (
                  <>
                    <Typography variant="h5" color="#C62828" sx={{fontWeight: 800, mb: 0.5}}>Send us a Message</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{mb: 3}}>We'll reply within 24 hours during business days.</Typography>
                    <Grid container spacing={2.5}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth label="Your Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth label="Email Address *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth label="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth label="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                          placeholder="e.g. Table Reservation Query"
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField fullWidth label="Your Message *" multiline rows={5}
                          value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                          placeholder="Tell us how we can help you..."
                        />
                      </Grid>
                    </Grid>
                    <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                      <Button
                        fullWidth variant="contained" color="primary" size="large"
                        onClick={handleSubmit} disabled={loading} endIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Send />}
                        sx={{ py: 1.8, borderRadius: '14px', fontWeight: 700, background: 'linear-gradient(135deg, #C62828, #EF5350)' }}
                      >
                        {loading ? 'Sending...' : 'Send Message'}
                      </Button>
                      <Button
                        variant="outlined" color="success" size="large"
                        href="https://wa.me/919876543210"
                        target="_blank"
                        startIcon={<WhatsApp />}
                        sx={{ py: 1.8, borderRadius: '14px', fontWeight: 700, borderColor: '#25D366', color: '#25D366',
                          '&:hover': { bgcolor: 'rgba(37,211,102,0.08)', borderColor: '#25D366' } }}
                      >
                        WhatsApp
                      </Button>
                    </Box>
                  </>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Footer />
    </>
  );
}
