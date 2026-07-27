'use client';
import React from 'react';
import {
  Box, Container, Grid, Typography, IconButton, Divider, Chip,
} from '@mui/material';
import {
  Phone, Email, LocationOn, Facebook, Instagram,
  YouTube, Twitter, WhatsApp,
} from '@mui/icons-material';
import Link from 'next/link';
import PalaPittaLogo from './PalaPittaLogo';

const quickLinks = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about' },
  { label: 'Our Menu', href: '/menu' },
  { label: 'Reserve Table', href: '/reservation' },
  { label: 'Contact', href: '/contact' },
  { label: 'Admin Panel', href: '/admin' },
];

const menuCategories = [
  { label: 'Biryani', href: '/menu?category=biryani' },
  { label: 'North Indian', href: '/menu?category=north-indian' },
  { label: 'South Indian', href: '/menu?category=south-indian' },
  { label: 'Tandoori', href: '/menu?category=tandoori' },
  { label: 'Starters', href: '/menu?category=starters' },
  { label: 'Desserts', href: '/menu?category=desserts' },
];

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        background: 'linear-gradient(180deg, #1A0A0A 0%, #2D0000 100%)',
        color: 'white',
        pt: { xs: 6, md: 8 },
        // Reserve room for the fixed FloatingCartBar when it is on screen, so
        // a full cart never covers the policy links. See globals.css.
        pb: 'calc(24px + var(--ppr-floating-cart-h, 0px))',
        transition: 'padding-bottom 0.3s ease',
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 2.5, sm: 3, md: 4 } }}>
        <Grid container spacing={{ xs: 4, md: 5 }}>
          {/* Brand */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ mb: 2.5 }}>
              <PalaPittaLogo variant="dark" size="medium" />
            </Box>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.8, mb: 3, maxWidth: 300 }}>
              Authentic Indian Taste Since 1998. Savour the rich heritage of Indian cuisine crafted
              with love, tradition, and the finest spices from across India.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
              {[Facebook, Instagram, YouTube, Twitter].map((Icon, i) => (
                <IconButton
                  key={i}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)',
                    '&:hover': { bgcolor: '#C62828', color: 'white', transform: 'translateY(-2px)' },
                    transition: 'all 0.2s', borderRadius: '10px',
                  }}
                >
                  <Icon fontSize="small" />
                </IconButton>
              ))}
            </Box>
            <Chip
              label="🏆 Best Indian Restaurant – Hyderabad 2024"
              size="small"
              sx={{ bgcolor: 'rgba(255,152,0,0.15)', color: '#FF9800', border: '1px solid rgba(255,152,0,0.3)', fontSize: '11px' }}
            />
          </Grid>

          {/* Quick Links */}
          <Grid size={{ xs: 6, md: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 2.5, color: '#FF9800', fontWeight: 700 }}>
              Quick Links
            </Typography>
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'rgba(255,255,255,0.65)', mb: 1.2, cursor: 'pointer',
                    '&:hover': { color: '#FF9800', pl: 0.5 },
                    transition: 'all 0.2s',
                  }}
                >
                  → {link.label}
                </Typography>
              </Link>
            ))}
          </Grid>

          {/* Menu */}
          <Grid size={{ xs: 6, md: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 2.5, color: '#FF9800', fontWeight: 700 }}>
              Our Menu
            </Typography>
            {menuCategories.map((c) => (
              <Link key={c.href} href={c.href} style={{ textDecoration: 'none' }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'rgba(255,255,255,0.65)', mb: 1.2, cursor: 'pointer',
                    '&:hover': { color: '#FF9800', pl: 0.5 },
                    transition: 'all 0.2s',
                  }}
                >
                  → {c.label}
                </Typography>
              </Link>
            ))}
          </Grid>

          {/* Contact */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="subtitle1" sx={{ mb: 2.5, color: '#FF9800', fontWeight: 700 }}>
              Contact Us
            </Typography>
            {[
              { icon: <LocationOn fontSize="small" />, text: 'Madhapur, Hyderabad, TS – 500081' },
              { icon: <Phone fontSize="small" />, text: '+91 70326 82089 (Orders & Complaints)' },
              { icon: <Email fontSize="small" />, text: 'palapittaruchulu@gmail.com\nwww.palapittaruchulu.com' },
              { icon: <WhatsApp fontSize="small" />, text: 'Available on Swiggy & Zomato' },
            ].map((c, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 2, alignItems: 'flex-start' }}>
                <Box sx={{ color: '#FF9800', mt: 0.2 }}>{c.icon}</Box>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                  {c.text}
                </Typography>
              </Box>
            ))}

            <Box
              sx={{
                mt: 2, p: 2, bgcolor: 'rgba(255,255,255,0.06)',
                borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <Typography variant="caption" sx={{ color: '#FF9800', display: 'block', mb: 1, fontWeight: 600 }}>
                🕐 Opening Hours
              </Typography>
              {['Mon – Fri: 7:00 AM – 11:00 PM', 'Sat – Sun: 7:00 AM – 11:30 PM', 'Holidays: 8:00 AM – 10:30 PM'].map((h) => (
                <Typography key={h} variant="caption" sx={{ color: 'rgba(255,255,255,0.65)', display: 'block', mb: 0.5 }}>
                  {h}
                </Typography>
              ))}
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 4 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
            © 2026 Pala Pitta Ruchulu. All rights reserved. | GSTIN: 36AAACR1234F1Z5 | FSSAI: 10020011003457
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {[
              { label: 'Privacy Policy', href: '/privacy-policy' },
              { label: 'Terms', href: '/terms' },
              { label: 'Refund Policy', href: '/refund-policy' },
            ].map((policy) => (
              <Link key={policy.label} href={policy.href} style={{ textDecoration: 'none' }}>
                <Typography
                  variant="caption"
                  sx={{ color: 'rgba(255,255,255,0.4)', cursor: 'pointer', '&:hover': { color: '#FF9800' } }}
                >
                  {policy.label}
                </Typography>
              </Link>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
