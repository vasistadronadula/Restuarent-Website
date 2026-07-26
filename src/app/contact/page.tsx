'use client';
import React from 'react';
import {
  Box, Container, Grid, Typography, Button, Paper, Divider, Chip,
} from '@mui/material';
import { Phone, Email, LocationOn, AccessTime, WhatsApp, OpenInNew } from '@mui/icons-material';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';

const contactInfo = [
  { icon: <LocationOn />, label: 'Address', value: '1/90/2/E/A, Sri Sai Nilayam, Vinayaka Nagar Colony,\nCircle 20, Madhapur, Hyderabad, TS – 500081', color: '#C62828' },
  { icon: <Phone />, label: 'Phone / Orders', value: '+91 70326 82089', color: '#2E7D32' },
  { icon: <Email />, label: 'Email / Web', value: 'palapittaruchulu@gmail.com\nwww.palapittaruchulu.com', color: '#1565C0' },
  { icon: <WhatsApp />, label: 'WhatsApp Direct', value: '+91 70326 82089\nInstant Customer Support', color: '#25D366' },
];

const hours = [
  { day: 'Monday – Friday', time: '7:00 AM – 11:00 PM' },
  { day: 'Saturday – Sunday', time: '7:00 AM – 11:30 PM' },
  { day: 'Public Holidays', time: '8:00 AM – 10:30 PM' },
];

export default function ContactPage() {
  const whatsappUrl = 'https://wa.me/917032682089';

  return (
    <>
      <Navbar />

      {/* Hero */}
      <Box sx={{ background: 'linear-gradient(135deg, #1A0A0A, #C62828)', py: { xs: 6, md: 10 }, textAlign: 'center' }}>
        <Typography variant="h2" sx={{ fontWeight: 800, color: 'white', fontSize: { xs: '2rem', md: '3rem' }, mb: 1.5 }}>
          📞 Contact Us
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.8)', maxWidth: 480, mx: 'auto' }}>
          Connect with Pala Pitta Ruchulu instantly on WhatsApp for orders, inquiries & reservations!
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
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>{info.label.toUpperCase()}</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line', mt: 0.3, fontWeight: 500 }}>{info.value}</Typography>
                  </Box>
                </Paper>
              ))}

              {/* Hours */}
              <Paper sx={{ p: 2.5, borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', mb: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AccessTime sx={{ color: '#C62828' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Opening Hours</Typography>
                </Box>
                {hours.map((h, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">{h.day}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{h.time}</Typography>
                  </Box>
                ))}
              </Paper>

              {/* Map */}
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
                  <Typography sx={{ fontWeight: 700 }}>Madhapur, Hyderabad</Typography>
                  <Button
                    href="https://maps.google.com/?q=Pala+Pitta+Ruchulu+Madhapur+Hyderabad"
                    target="_blank"
                    variant="contained" color="primary" size="small" sx={{ borderRadius: '10px' }}
                  >
                    Open in Google Maps
                  </Button>
                </Box>
              </Paper>
            </Grid>

            {/* Right – WhatsApp Direct Support Only */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper
                sx={{
                  p: { xs: 4, md: 6 },
                  borderRadius: '24px',
                  boxShadow: '0 12px 40px rgba(37,211,102,0.12)',
                  border: '2px solid rgba(37,211,102,0.3)',
                  background: 'linear-gradient(180deg, #FFFFFF 0%, #F4FBF6 100%)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 520,
                }}
              >
                {/* Large Animated WhatsApp Badge */}
                <Box
                  sx={{
                    width: 96,
                    height: 96,
                    borderRadius: '50%',
                    bgcolor: '#25D366',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3,
                    boxShadow: '0 12px 30px rgba(37,211,102,0.4)',
                    '& .MuiSvgIcon-root': {
                      fontSize: 54,
                      display: 'block',
                      margin: '0 auto',
                    },
                  }}
                >
                  <WhatsApp />
                </Box>

                <Chip
                  label="⚡ FASTEST SUPPORT"
                  sx={{
                    bgcolor: 'rgba(37,211,102,0.15)',
                    color: '#1B5E20',
                    fontWeight: 800,
                    fontSize: '12px',
                    letterSpacing: 1,
                    mb: 2,
                    px: 1,
                  }}
                />

                <Typography variant="h4" sx={{ fontWeight: 800, color: '#1B5E20', mb: 1.5 }}>
                  Chat Direct on WhatsApp 💬
                </Typography>

                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 460, mb: 4, lineHeight: 1.7 }}>
                  Skip the contact form! Click below to message Pala Pitta Ruchulu directly on WhatsApp for instant food orders, table bookings, catering queries & fast support.
                </Typography>

                {/* Primary WhatsApp Action Button */}
                <Button
                  variant="contained"
                  size="large"
                  href={whatsappUrl}
                  target="_blank"
                  startIcon={<WhatsApp sx={{ fontSize: 28 }} />}
                  endIcon={<OpenInNew />}
                  sx={{
                    py: 2,
                    px: 5,
                    borderRadius: '16px',
                    fontSize: '18px',
                    fontWeight: 800,
                    bgcolor: '#25D366',
                    color: 'white',
                    boxShadow: '0 8px 24px rgba(37,211,102,0.4)',
                    textTransform: 'none',
                    '&:hover': {
                      bgcolor: '#1EBE57',
                      boxShadow: '0 12px 32px rgba(37,211,102,0.5)',
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.2s ease',
                    mb: 4,
                  }}
                >
                  Chat on WhatsApp (+91 70326 82089)
                </Button>

                <Divider sx={{ width: '80%', mb: 4 }} />

                {/* Direct Action Chips */}
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1, mb: 2, textTransform: 'uppercase' }}>
                  Quick Action Links
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    href="https://wa.me/917032682089?text=Hi%20Pala%20Pitta%20Ruchulu,%20I%20want%20to%20place%20an%20order"
                    target="_blank"
                    startIcon={<WhatsApp />}
                    sx={{ borderRadius: '20px', borderColor: '#25D366', color: '#2E7D32', textTransform: 'none', fontWeight: 600 }}
                  >
                    🍲 Place Food Order
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    href="https://wa.me/917032682089?text=Hi%20Pala%20Pitta%20Ruchulu,%20I%20want%20to%20reserve%20a%20table"
                    target="_blank"
                    startIcon={<WhatsApp />}
                    sx={{ borderRadius: '20px', borderColor: '#25D366', color: '#2E7D32', textTransform: 'none', fontWeight: 600 }}
                  >
                    🪑 Book Table
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    href="https://wa.me/917032682089?text=Hi%20Pala%20Pitta%20Ruchulu,%20I%20have%20a%20catering%20inquiry"
                    target="_blank"
                    startIcon={<WhatsApp />}
                    sx={{ borderRadius: '20px', borderColor: '#25D366', color: '#2E7D32', textTransform: 'none', fontWeight: 600 }}
                  >
                    🎉 Party / Catering Inquiry
                  </Button>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Footer />
    </>
  );
}
