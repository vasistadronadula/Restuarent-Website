'use client';
import React from 'react';
import {
  Box, Container, Typography, Button, Grid, Card, CardContent,
  CardMedia, Chip, Avatar, Stack, Paper,
} from '@mui/material';
import { LocalOffer, CheckCircle, ArrowForward } from '@mui/icons-material';
import Link from 'next/link';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import HeroSlider from '@/components/customer/HeroSlider';
import FoodMenuSlider from '@/components/customer/FoodMenuSlider';
import ReviewSlider from '@/components/customer/ReviewSlider';

export default function HomePage() {
  const categories = [
    { name: 'Pala Pitta Biryanis', desc: 'Signature Dum & Gongura Fry Piece Biryanis', img: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80', href: '/menu?category=biryani' },
    { name: 'Telangana & Andhra Specials', desc: 'Natukodi Pulusu, Kamju Pitta & Ragi Sangati', img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&q=80', href: '/menu?category=south-indian' },
    { name: 'Signature Starters', desc: 'Kamju Pitta Fry & Pala Pitta Special Wings', img: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=500&q=80', href: '/menu?category=starters' },
    { name: 'Hyderabadi Desserts', desc: 'Apricot Delight, Double Ka Meetha & Bobbatlu', img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&q=80', href: '/menu?category=desserts' },
  ];

  const chefs = [
    { name: 'Chef Yadaiah', title: 'Executive Head Chef', exp: '22+ Years Experience in Telangana & Andhra Cuisine', img: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=300&q=80' },
    { name: 'Chef Narsaiah', title: 'Hyderabadi Dum Biryani Master', exp: '18 Years Experience', img: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300&q=80' },
    { name: 'Chef Srinivasulu', title: 'Rayalaseema & Natukodi Specialist', exp: '15 Years Experience', img: 'https://images.unsplash.com/photo-1607631568010-a87245c0daf8?w=300&q=80' },
  ];

  return (
    <>
      <Navbar />

      {/* 1. Dynamic Animated Hero Carousel */}
      <HeroSlider />

      {/* 2. Special Offer Ticker Banner */}
      <Box
        sx={{
          bgcolor: '#C62828',
          color: 'white',
          py: 2,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <LocalOffer sx={{ color: '#FFD54F', animation: 'spin 4s linear infinite' }} />
              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: { xs: '13px', sm: '14px' } }}>
                🎉 Special Offer: Use code <Box component="span" sx={{ bgcolor: 'rgba(0,0,0,0.3)', px: 1.2, py: 0.4, borderRadius: '8px', color: '#FFD54F', letterSpacing: 1 }}>PALAPITTA10</Box> for 10% OFF on all orders above ₹500!
              </Typography>
            </Box>
            <Link href="/menu" style={{ textDecoration: 'none' }}>
              <Typography variant="caption" sx={{ color: '#FFD54F', fontWeight: 800, textDecoration: 'underline', cursor: 'pointer', '&:hover': { color: 'white' } }}>
                Order Now & Save →
              </Typography>
            </Link>
          </Box>
        </Container>
      </Box>

      {/* 3. Category Specials Section with Hover Animations */}
      <Box sx={{ bgcolor: '#FFF8F2', py: { xs: 4, md: 6 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Chip label="OUR SPECIALITIES" sx={{ bgcolor: 'rgba(198,40,40,0.1)', color: '#C62828', fontWeight: 800, mb: 1.5, px: 1 }} />
            <Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '2.8rem' }, color: '#212121', fontWeight: 900, mb: 1.5 }}>
              Discover Culinary Excellence
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 540, mx: 'auto' }}>
              Crafted with authentic spices handpicked from traditional markets, prepared with passion and secret family recipes.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {categories.map((cat) => (
              <Grid key={cat.name} size={{ xs: 12, sm: 6, md: 3 }}>
                <Link href={cat.href} style={{ textDecoration: 'none' }}>
                  <Card
                    sx={{
                      borderRadius: '24px', overflow: 'hidden', height: '100%',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', cursor: 'pointer',
                      border: '1px solid rgba(198,40,40,0.08)',
                      '&:hover': {
                        transform: 'translateY(-10px) scale(1.02)',
                        boxShadow: '0 20px 40px rgba(198,40,40,0.2)',
                        borderColor: '#FF9800',
                      },
                    }}
                  >
                    <Box sx={{ overflow: 'hidden', position: 'relative' }}>
                      <CardMedia
                        component="img"
                        height="190"
                        image={cat.img}
                        alt={cat.name}
                        sx={{
                          transition: 'transform 0.6s ease',
                          '&:hover': { transform: 'scale(1.12)' },
                        }}
                      />
                    </Box>
                    <CardContent sx={{ p: 2.5 }}>
                      <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 800, color: '#212121' }}>{cat.name}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '13px', lineHeight: 1.5 }}>{cat.desc}</Typography>
                    </CardContent>
                  </Card>
                </Link>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* 4. Food Menu Animated Slider Showcase Section */}
      <Box sx={{ py: { xs: 4, md: 6 }, bgcolor: '#FFFFFF' }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Chip label="INTERACTIVE SLIDER SHOWCASE" sx={{ bgcolor: 'rgba(255,152,0,0.15)', color: '#FF9800', fontWeight: 800, mb: 1.5 }} />
              <Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '2.8rem' }, fontWeight: 900 }}>
                Most Loved Culinary Creations
              </Typography>
            </Box>
            <Link href="/menu" style={{ textDecoration: 'none' }}>
              <Button variant="outlined" color="primary" endIcon={<ArrowForward />} sx={{ borderRadius: '12px', fontWeight: 800, py: 1, px: 2.5 }}>
                Explore Full Menu
              </Button>
            </Link>
          </Box>

          {/* Animated Slider Component */}
          <FoodMenuSlider />
        </Container>
      </Box>

      {/* 5. Heritage & 25+ Years Quality Banner */}
      <Box sx={{ bgcolor: '#160808', color: 'white', py: { xs: 4, md: 6 }, position: 'relative', overflow: 'hidden' }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Chip label="SINCE 1998" sx={{ bgcolor: '#FF9800', color: 'white', fontWeight: 800, mb: 2, px: 1 }} />
              <Typography variant="h2" sx={{ color: 'white', fontSize: { xs: '2rem', md: '2.8rem' }, fontWeight: 900, mb: 2.5 }}>
                25+ Years of Pure Taste & Royal Tradition
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.8, mb: 3 }}>
                At Pala Pitta Ruchulu, food is an emotion. Every dish is slow-cooked in traditional brass handis and clay tandoors using hand-ground spices and pure cow ghee.
              </Typography>
              <Grid container spacing={2}>
                {[
                  'Pure Cow Ghee & Whole Spices',
                  'Fresh Locally Sourced Produce',
                  'Authentic Dum Cooking Method',
                  '100% Hygienic Kitchen Standards',
                ].map((feature) => (
                  <Grid key={feature} size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircle sx={{ color: '#FF9800', fontSize: 20 }} />
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>{feature}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                sx={{
                  position: 'relative',
                  borderRadius: '28px',
                  overflow: 'hidden',
                  boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
                  border: '1px solid rgba(255,152,0,0.3)',
                  transition: 'transform 0.5s ease',
                  '&:hover': { transform: 'scale(1.02)' },
                }}
              >
                <Box
                  component="img"
                  src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80"
                  alt="Restaurant heritage"
                  sx={{ width: '100%', height: 380, objectFit: 'cover' }}
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* 6. Master Chefs Section */}
      <Box sx={{ py: { xs: 4, md: 6 }, bgcolor: '#FFF8F2' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Chip label="OUR EXPERTS" sx={{ bgcolor: 'rgba(198,40,40,0.1)', color: '#C62828', fontWeight: 800, mb: 1.5, px: 1 }} />
            <Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '2.8rem' }, fontWeight: 900, mb: 1.5 }}>
              Meet Our Culinary Masters
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Master chefs dedicated to preserving authentic Indian culinary art.
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {chefs.map((chef) => (
              <Grid key={chef.name} size={{ xs: 12, md: 4 }}>
                <Paper
                  sx={{
                    p: 4,
                    borderRadius: '24px',
                    textAlign: 'center',
                    boxShadow: '0 6px 24px rgba(0,0,0,0.06)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 16px 36px rgba(198,40,40,0.12)',
                    },
                  }}
                >
                  <Avatar
                    src={chef.img}
                    sx={{
                      width: 110,
                      height: 110,
                      mx: 'auto',
                      mb: 2.5,
                      border: '4px solid #C62828',
                      boxShadow: '0 6px 20px rgba(198,40,40,0.25)',
                    }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>{chef.name}</Typography>
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 700, mb: 1 }}>{chef.title}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{chef.exp}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* 7. Animated Customer Reviews Slider Section */}
      <Box sx={{ py: { xs: 4, md: 6 }, bgcolor: '#FFFFFF' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Chip label="DINER FEEDBACK SLIDER" sx={{ bgcolor: 'rgba(255,152,0,0.15)', color: '#FF9800', fontWeight: 800, mb: 1.5, px: 1 }} />
            <Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '2.8rem' }, fontWeight: 900, mb: 1.5 }}>
              What Our Diners Say
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Real reviews from real food lovers across Hyderabad
            </Typography>
          </Box>

          {/* Interactive Review Slider Component */}
          <ReviewSlider />
        </Container>
      </Box>

      {/* 8. Radiant CTA Banner with Pulse Animation */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #C62828 0%, #8E0000 50%, #1A0A0A 100%)',
          color: 'white',
          py: 5,
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 2 }}>
          <Typography variant="h2" sx={{ color: 'white', fontSize: { xs: '2.2rem', md: '3.2rem' }, fontWeight: 900, mb: 2 }}>
            Plan Your Special Dining Experience
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.88)', mb: 4.5, fontSize: '1.15rem', maxWidth: 640, mx: 'auto' }}>
            Reserving a table takes less than a minute. Celebrate family gatherings, corporate lunches, or romantic dinners with us.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} sx={{ justifyContent: 'center' }}>
            <Link href="/reservation" style={{ textDecoration: 'none' }}>
              <Button
                variant="contained"
                size="large"
                sx={{
                  py: 1.8,
                  px: 4.5,
                  borderRadius: '14px',
                  bgcolor: '#FF9800',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: '16px',
                  boxShadow: '0 8px 30px rgba(255,152,0,0.5)',
                  '&:hover': {
                    bgcolor: '#F57C00',
                    transform: 'scale(1.05)',
                  },
                  transition: 'all 0.25s ease',
                }}
              >
                🪑 Book Table Now
              </Button>
            </Link>
            <Link href="/contact" style={{ textDecoration: 'none' }}>
              <Button
                variant="outlined"
                size="large"
                sx={{
                  py: 1.8,
                  px: 4.5,
                  borderRadius: '14px',
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.6)',
                  fontWeight: 800,
                  fontSize: '16px',
                  backdropFilter: 'blur(6px)',
                  '&:hover': {
                    borderColor: '#FF9800',
                    color: '#FF9800',
                    bgcolor: 'rgba(255,152,0,0.15)',
                    transform: 'scale(1.05)',
                  },
                  transition: 'all 0.25s ease',
                }}
              >
                📞 Contact Us
              </Button>
            </Link>
          </Stack>
        </Container>
      </Box>

      <Footer />
    </>
  );
}
