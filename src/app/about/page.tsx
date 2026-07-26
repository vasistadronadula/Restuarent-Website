'use client';
import React from 'react';
import {
  Box, Container, Grid, Typography, Chip, Paper,
} from '@mui/material';
import { EmojiEvents, Star } from '@mui/icons-material';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';

const timeline = [
  { year: '1998', event: 'Pala Pitta Ruchulu opens in Madhapur, Hyderabad, serving traditional rustic flavours.' },
  { year: '2003', event: 'Expanded to a 200-seat restaurant featuring authentic Telangana and Andhra kitchens.' },
  { year: '2008', event: 'Won "Best Traditional South Indian Restaurant in Hyderabad" award.' },
  { year: '2012', event: 'Introduced signature items: Kamju Pitta Fry & Gongura Biryani.' },
  { year: '2016', event: 'Expanded online delivery services across Madhapur, Gachibowli, and HITEC City.' },
  { year: '2020', event: 'Served over 100,000 satisfied foodies across Hyderabad during pandemic.' },
  { year: '2024', event: 'Achieved 4.9-star rating on Google Reviews with over 10,000+ reviews.' },
  { year: '2026', event: 'Celebrating 28 years of culinary excellence in authentic Telugu gastronomy.' },
];

const awards = [
  { title: 'Best Biryani in Hyderabad', org: 'Zomato Gold Award', year: '2024' },
  { title: 'Top South Indian Restaurant', org: 'Times Food Award', year: '2023' },
  { title: 'Hygiene Excellence Award', org: 'FSSAI', year: '2023' },
  { title: 'Customer Choice Award', org: 'Google Reviews', year: '2022' },
];

const values = [
  { icon: '🌿', title: 'Fresh Ingredients', desc: 'Sourced daily from local farmers and markets' },
  { icon: '🍳', title: 'Authentic Recipes', desc: 'Traditional recipes preserved through generations' },
  { icon: '❤️', title: 'Made with Love', desc: 'Every dish crafted with passion and care' },
  { icon: '🏆', title: 'Quality First', desc: 'Uncompromising on taste and hygiene standards' },
  { icon: '🌍', title: 'Sustainable', desc: 'Eco-friendly practices and local sourcing' },
  { icon: '😊', title: 'Guest Delight', desc: 'Your satisfaction is our greatest achievement' },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <Box sx={{
        position: 'relative', height: { xs: 350, md: 500 }, overflow: 'hidden',
        display: 'flex', alignItems: 'center',
      }}>
        <Box
          component="img"
          src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80"
          alt="Restaurant interior"
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(198,40,40,0.5) 100%)' }} />
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
          <Chip label="🏛️ Est. 1998 • Hyderabad" sx={{ bgcolor: 'rgba(255,152,0,0.8)', color: 'white', fontWeight: 600, mb: 2 }} />
          <Typography variant="h1" sx={{fontWeight: 800, color: 'white', fontSize: { xs: '2.5rem', md: '4rem' }, mb: 2}}>
            Our Story
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.85)', maxWidth: 600, fontWeight: 400, lineHeight: 1.8 }}>
            From a humble dream to Hyderabad&apos;s most-loved restaurant — Pala Pitta Ruchulu has been serving authentic Indian flavours since 1998.
          </Typography>
        </Container>
      </Box>

      {/* Story */}
      <Box sx={{ bgcolor: '#FFF8F2', py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Chip label="Our Journey" sx={{ bgcolor: 'rgba(198,40,40,0.1)', color: '#C62828', fontWeight: 600, mb: 2 }} />
              <Typography variant="h3" sx={{fontWeight: 800, mb: 3}}>
                A Legacy of <span className="gradient-text">Authentic Flavours</span>
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.9, mb: 2 }}>
                Pala Pitta Ruchulu was established in Madhapur with a passionate mission to bring authentic, uncompromised Telangana, Andhra, and Rayalaseema home-style culinary traditions to Hyderabad. Starting as a cozy dining destination, it quickly earned acclaim for its signature Kamju Pitta Fry, Gongura Biryanis, and Ragi Sangati with Natukodi Pulusu.
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.9, mb: 3 }}>
                Over 25 years, we have served over 500,000 happy customers, won multiple awards, and maintained our commitment to using only the freshest ingredients and time-honoured recipes. Today, Pala Pitta Ruchulu stands as a landmark of Indian culinary excellence in Hyderabad.
              </Typography>
              <Box sx={{ display: 'flex', gap: 3 }}>
                {[{ n: '25+', l: 'Years' }, { n: '500K+', l: 'Guests' }, { n: '50+', l: 'Awards' }].map((s) => (
                  <Box key={s.l}>
                    <Typography variant="h4" color="#C62828" sx={{fontWeight: 800}}>{s.n}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.l}</Typography>
                  </Box>
                ))}
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ position: 'relative' }}>
                <Box
                  component="img"
                  src="https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80"
                  alt="Our kitchen"
                  sx={{ width: '100%', borderRadius: '24px', boxShadow: '0 16px 64px rgba(0,0,0,0.15)' }}
                />
                <Paper sx={{ position: 'absolute', bottom: -20, left: -20, p: 2, borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Star sx={{ color: '#FF9800' }} />
                    <Typography sx={{fontWeight: 700}}>4.8/5 Rating</Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">Based on 10,000+ reviews</Typography>
                </Paper>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Values */}
      <Box sx={{ py: { xs: 6, md: 10 }, bgcolor: 'white' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h3" sx={{fontWeight: 800, mb: 1.5}}>
              Our <span className="gradient-text">Core Values</span>
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {values.map((v, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                <Box sx={{
                  p: 3, textAlign: 'center', borderRadius: '20px', bgcolor: '#FFF8F2',
                  transition: 'all 0.3s',
                  '&:hover': { transform: 'translateY(-6px)', boxShadow: '0 12px 40px rgba(198,40,40,0.1)', bgcolor: 'white' },
                }}>
                  <Typography sx={{ fontSize: '2.5rem', mb: 2 }}>{v.icon}</Typography>
                  <Typography variant="h6" sx={{fontWeight: 700, mb: 1}}>{v.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{v.desc}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Timeline */}
      <Box sx={{ py: { xs: 6, md: 10 }, bgcolor: '#FFF8F2' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h3" sx={{fontWeight: 800, mb: 1.5}}>
              Our <span className="gradient-text">Milestones</span>
            </Typography>
          </Box>
          <Box sx={{ position: 'relative' }}>
            <Box sx={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, bgcolor: 'rgba(198,40,40,0.2)', transform: 'translateX(-50%)', display: { xs: 'none', md: 'block' } }} />
            {timeline.map((item, i) => (
              <Box key={item.year} sx={{
                display: 'flex', justifyContent: i % 2 === 0 ? 'flex-start' : 'flex-end',
                mb: 3, position: 'relative',
              }}>
                <Paper sx={{
                  p: 3, borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  maxWidth: { xs: '100%', md: '45%' },
                  ml: i % 2 === 0 ? 0 : 'auto',
                  mr: i % 2 === 0 ? 'auto' : 0,
                }}>
                  <Chip label={item.year} sx={{ bgcolor: '#C62828', color: 'white', fontWeight: 800, mb: 1.5 }} />
                  <Typography variant="body1" sx={{fontWeight: 500}}>{item.event}</Typography>
                </Paper>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Awards */}
      <Box sx={{ py: { xs: 6, md: 10 }, bgcolor: 'white' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h3" sx={{fontWeight: 800, mb: 1.5}}>
              Awards & <span className="gradient-text">Recognition</span>
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {awards.map((award, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{
                  textAlign: 'center', p: 3.5, borderRadius: '20px', bgcolor: '#FFF8F2',
                  transition: 'all 0.3s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 40px rgba(255,152,0,0.15)' },
                }}>
                  <EmojiEvents sx={{ fontSize: 48, color: '#FF9800', mb: 2 }} />
                  <Typography variant="h6" sx={{fontWeight: 700, mb: 0.5}}>{award.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{mb: 1}}>{award.org}</Typography>
                  <Chip label={award.year} size="small" sx={{ bgcolor: 'rgba(255,152,0,0.15)', color: '#FF9800', fontWeight: 700 }} />
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Footer />
    </>
  );
}
