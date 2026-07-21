'use client';
import React from 'react';
import {
  Box, Container, Typography, Button, Grid, Card, CardContent,
  CardMedia, Chip, Rating, Avatar, Stack, Paper, IconButton,
} from '@mui/material';
import {
  Restaurant, LocalOffer, Star, CheckCircle, ArrowForward,
  Bookmark, AccessTime, TableRestaurant, LocalDining, Phone,
  DeliveryDining, EmojiEvents,
} from '@mui/icons-material';
import Link from 'next/link';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import MenuCard from '@/components/customer/MenuCard';
import { menuItems } from '@/data/menuData';
import { reviews } from '@/data/mockData';

export default function HomePage() {
  const featuredDishes = menuItems.filter((i) => i.isPopular || i.isSpecial).slice(0, 6);

  const categories = [
    { name: 'Biryani Specials', desc: 'Aromatic long-grain basmati dum biryanis', img: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80', href: '/menu?category=biryani' },
    { name: 'South Indian', desc: 'Traditional crispy dosas, idlis & vada', img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&q=80', href: '/menu?category=south-indian' },
    { name: 'Tandoori Starters', desc: 'Charcoal-grilled juicy tikkas & kebabs', img: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&q=80', href: '/menu?category=tandoori' },
    { name: 'North Indian Curries', desc: 'Rich butter gravies and freshly baked naans', img: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&q=80', href: '/menu?category=north-indian' },
  ];

  const chefs = [
    { name: 'Chef Rajan Sharma', title: 'Executive Head Chef & Founder', exp: '25+ Years Experience', img: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=300&q=80' },
    { name: 'Chef Suresh Kumar', title: 'Tandoor & Kebab Master', exp: '18 Years Experience', img: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300&q=80' },
    { name: 'Chef Anita Rao', title: 'Authentic South Indian Specialist', exp: '15 Years Experience', img: 'https://images.unsplash.com/photo-1607631568010-a87245c0daf8?w=300&q=80' },
  ];

  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <Box
        sx={{
          position: 'relative',
          minHeight: { xs: '85vh', md: '90vh' },
          display: 'flex', alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(20, 5, 5, 0.92) 0%, rgba(198, 40, 40, 0.75) 100%), url(https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          color: 'white', pt: { xs: 8, md: 0 }, pb: 6,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Chip
                icon={<EmojiEvents sx={{ color: '#FF9800 !important' }} />}
                label="🏆 #1 Authentic Telugu & South Indian Restaurant – Hyderabad"
                sx={{
                  bgcolor: 'rgba(255,152,0,0.18)', color: '#FF9800',
                  border: '1px solid rgba(255,152,0,0.4)',
                  fontWeight: 700, mb: 3, fontSize: { xs: '11px', sm: '13px' },
                }}
              />
              <Typography
                variant="h1"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '2.4rem', sm: '3.5rem', md: '4.2rem' },
                  lineHeight: 1.15, mb: 2.5, letterSpacing: '-1px',
                }}
              >
                Experience Rich <br />
                <Box component="span" sx={{
                  background: 'linear-gradient(135deg, #FF9800 0%, #FFD54F 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  Pala Pitta Ruchulu
                </Box>
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: { xs: '1rem', md: '1.25rem' },
                  fontWeight: 400, lineHeight: 1.7, mb: 4, maxWidth: 580,
                }}
              >
                Savour traditional Telangana & Andhra flavours, slow-cooked dum biryanis,
                smoky charcoal tandoorikebabs, and authentic home-style Indian delicacies.
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 5 }}>
                <Link href="/menu" style={{ textDecoration: 'none' }}>
                  <Button
                    variant="contained" color="primary" size="large"
                    endIcon={<ArrowForward />}
                    sx={{
                      py: 1.6, px: 4, borderRadius: '12px', fontSize: '16px', fontWeight: 700,
                      background: 'linear-gradient(135deg, #C62828 0%, #FF9800 100%)',
                      boxShadow: '0 8px 24px rgba(198,40,40,0.4)',
                      '&:hover': { transform: 'translateY(-2px)' }, transition: 'all 0.2s',
                    }}
                  >
                    Explore Full Menu
                  </Button>
                </Link>
                <Link href="/reservation" style={{ textDecoration: 'none' }}>
                  <Button
                    variant="outlined" size="large"
                    startIcon={<TableRestaurant />}
                    sx={{
                      py: 1.6, px: 4, borderRadius: '12px', fontSize: '16px', fontWeight: 700,
                      color: 'white', borderColor: 'rgba(255,255,255,0.4)',
                      '&:hover': { borderColor: '#FF9800', color: '#FF9800', bgcolor: 'rgba(255,152,0,0.1)' },
                      transition: 'all 0.2s',
                    }}
                  >
                    Reserve Table
                  </Button>
                </Link>
              </Stack>

              {/* Stats badges */}
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', pt: 2, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                {[
                  { n: '500k+', t: 'Happy Diners' },
                  { n: '4.9 ★', t: 'Customer Rating' },
                  { n: '100+', t: 'Authentic Dishes' },
                  { n: '30 Min', t: 'Fast Delivery' },
                ].map((s) => (
                  <Box key={s.t}>
                    <Typography variant="h5" sx={{ color: '#FF9800', fontWeight: 800 }}>{s.n}</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>{s.t}</Typography>
                  </Box>
                ))}
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Special Offer Banner */}
      <Box sx={{ bgcolor: '#C62828', color: 'white', py: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <LocalOffer sx={{ color: '#FF9800' }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                🎉 Special Offer: Use code <Box component="span" sx={{ bgcolor: 'rgba(0,0,0,0.25)', px: 1, py: 0.3, borderRadius: '6px', color: '#FFD54F', letterSpacing: 1 }}>PALAPITTA10</Box> for 10% OFF on all orders above ₹500!
              </Typography>
            </Box>
            <Link href="/menu" style={{ textDecoration: 'none' }}>
              <Typography variant="caption" sx={{ color: '#FFD54F', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', '&:hover': { color: 'white' } }}>
                Order Now →
              </Typography>
            </Link>
          </Box>
        </Container>
      </Box>

      {/* Category Section */}
      <Box sx={{ bgcolor: '#FFF8F2', py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Chip label="OUR SPECIALITIES" sx={{ bgcolor: 'rgba(198,40,40,0.1)', color: '#C62828', fontWeight: 700, mb: 1.5 }} />
            <Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '2.8rem' }, color: '#212121', fontWeight: 800, mb: 1.5 }}>
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
                      borderRadius: '20px', overflow: 'hidden', height: '100%',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                      transition: 'all 0.3s ease', cursor: 'pointer',
                      '&:hover': { transform: 'translateY(-6px)', boxShadow: '0 12px 30px rgba(198,40,40,0.15)' },
                    }}
                  >
                    <CardMedia component="img" height="180" image={cat.img} alt={cat.name} />
                    <CardContent sx={{ p: 2.5 }}>
                      <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 700, color: '#212121' }}>{cat.name}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '13px' }}>{cat.desc}</Typography>
                    </CardContent>
                  </Card>
                </Link>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Bestseller Dishes */}
      <Box sx={{ py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 5, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Chip label="POPULAR DISHES" sx={{ bgcolor: 'rgba(255,152,0,0.15)', color: '#FF9800', fontWeight: 700, mb: 1.5 }} />
              <Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '2.8rem' }, fontWeight: 800 }}>
                Most Loved by Diners
              </Typography>
            </Box>
            <Link href="/menu" style={{ textDecoration: 'none' }}>
              <Button variant="outlined" color="primary" endIcon={<ArrowForward />} sx={{ borderRadius: '10px', fontWeight: 700 }}>
                View Full Menu
              </Button>
            </Link>
          </Box>

          <Grid container spacing={3}>
            {featuredDishes.map((dish) => (
              <Grid key={dish.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <MenuCard item={dish} />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Heritage & Quality Banner */}
      <Box sx={{ bgcolor: '#1A0A0A', color: 'white', py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Chip label="SINCE 1998" sx={{ bgcolor: '#FF9800', color: 'white', fontWeight: 700, mb: 2 }} />
              <Typography variant="h2" sx={{ color: 'white', fontSize: { xs: '2rem', md: '2.8rem' }, fontWeight: 800, mb: 2.5 }}>
                25+ Years of Pure Taste & Royal Tradition
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, mb: 3 }}>
                At Pala Pitta Ruchulu, food is not just a meal — it is an emotion. Every dish is slow-cooked in brass handis and traditional clay tandoors using hand-ground spices and pure cow ghee to preserve rich heritage flavours.
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
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{feature}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
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

      {/* Master Chefs Section */}
      <Box sx={{ py: { xs: 6, md: 10 }, bgcolor: '#FFF8F2' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Chip label="OUR EXPERTS" sx={{ bgcolor: 'rgba(198,40,40,0.1)', color: '#C62828', fontWeight: 700, mb: 1.5 }} />
            <Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '2.8rem' }, fontWeight: 800, mb: 1.5 }}>
              Meet Our Culinary Masters
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Master chefs dedicated to preserving authentic Indian culinary art.
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {chefs.map((chef) => (
              <Grid key={chef.name} size={{ xs: 12, md: 4 }}>
                <Paper sx={{ p: 3, borderRadius: '20px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                  <Avatar src={chef.img} sx={{ width: 100, height: 100, mx: 'auto', mb: 2, border: '3px solid #C62828' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{chef.name}</Typography>
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 500, mb: 1 }}>{chef.title}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{chef.exp}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Customer Reviews Section */}
      <Box sx={{ py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Chip label="DINER FEEDBACK" sx={{ bgcolor: 'rgba(255,152,0,0.15)', color: '#FF9800', fontWeight: 700, mb: 1.5 }} />
            <Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '2.8rem' }, fontWeight: 800, mb: 1.5 }}>
              What Our Diners Say
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {reviews.slice(0, 3).map((review) => (
              <Grid key={review.id} size={{ xs: 12, md: 4 }}>
                <Paper sx={{ p: 3, borderRadius: '20px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                  <Box>
                    <Rating value={review.rating} readOnly size="small" sx={{ mb: 2 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', lineHeight: 1.7, mb: 2 }}>
                      "{review.comment}"
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pt: 2, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <Avatar sx={{ bgcolor: '#C62828', width: 36, height: 36, fontSize: '13px', fontWeight: 700 }}>{review.avatar}</Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{review.customerName}</Typography>
                      <Typography variant="caption" color="text.secondary">Ordered {review.dish}</Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Call to Action Reservation Banner */}
      <Box sx={{ background: 'linear-gradient(135deg, #C62828 0%, #1A0A0A 100%)', color: 'white', py: 8, textAlign: 'center' }}>
        <Container maxWidth="md">
          <Typography variant="h2" sx={{ color: 'white', fontSize: { xs: '2rem', md: '3rem' }, fontWeight: 800, mb: 2 }}>
            Plan Your Special Dining Experience
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.85)', mb: 4, fontSize: '1.1rem' }}>
            Reserving a table takes less than a minute. Celebrate family gatherings, corporate lunches, or romantic dinners with us.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'center' }}>
            <Link href="/reservation" style={{ textDecoration: 'none' }}>
              <Button variant="contained" size="large" sx={{ py: 1.5, px: 4, borderRadius: '12px', bgcolor: '#FF9800', color: 'white', fontWeight: 700, '&:hover': { bgcolor: '#F57C00' } }}>
                🪑 Book Table Now
              </Button>
            </Link>
            <Link href="/contact" style={{ textDecoration: 'none' }}>
              <Button variant="outlined" size="large" sx={{ py: 1.5, px: 4, borderRadius: '12px', color: 'white', borderColor: 'white', fontWeight: 700, '&:hover': { borderColor: '#FF9800', color: '#FF9800' } }}>
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
