'use client';

import React from 'react';
import {
  Box, Container, Typography, Button, Grid, Chip, Avatar, Stack,
} from '@mui/material';
import {
  LocalOffer, CheckCircle, ArrowForward, DeliveryDining,
  Restaurant, VerifiedUser, SupportAgent, ContentCopy,
} from '@mui/icons-material';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import HeroSlider from '@/components/customer/HeroSlider';
import FoodMenuSlider from '@/components/customer/FoodMenuSlider';
import ReviewSlider from '@/components/customer/ReviewSlider';
import Reveal from '@/components/customer/Reveal';

const COUPON_CODE = 'PALAPITTA10';

const categories = [
  {
    name: 'Pala Pitta Biryanis',
    desc: 'Signature Dum & Gongura Fry Piece Biryanis',
    img: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=80',
    href: '/menu?category=biryani',
  },
  {
    name: 'Telangana & Andhra Specials',
    desc: 'Natukodi Pulusu, Kamju Pitta & Ragi Sangati',
    img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&q=80',
    href: '/menu?category=south-indian',
  },
  {
    name: 'Signature Starters',
    desc: 'Kamju Pitta Fry & Pala Pitta Special Wings',
    img: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=600&q=80',
    href: '/menu?category=starters',
  },
  {
    name: 'Hyderabadi Desserts',
    desc: 'Apricot Delight, Double Ka Meetha & Bobbatlu',
    img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&q=80',
    href: '/menu?category=desserts',
  },
];

const promises = [
  { icon: <DeliveryDining />, title: '30-Minute Delivery', desc: 'Hot, sealed and on your table fast' },
  { icon: <Restaurant />, title: 'Cooked to Order', desc: 'Nothing sits under a lamp waiting' },
  { icon: <VerifiedUser />, title: 'FSSAI Certified', desc: 'Audited kitchen, traceable produce' },
  { icon: <SupportAgent />, title: 'Real Human Support', desc: 'Call us — a person picks up' },
];

const heritagePoints = [
  'Pure Cow Ghee & Whole Spices',
  'Fresh Locally Sourced Produce',
  'Authentic Dum Cooking Method',
  '100% Hygienic Kitchen Standards',
];

const chefs = [
  {
    name: 'Chef Yadaiah',
    title: 'Executive Head Chef',
    exp: '22+ Years in Telangana & Andhra Cuisine',
    img: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=300&q=80',
  },
  {
    name: 'Chef Narsaiah',
    title: 'Hyderabadi Dum Biryani Master',
    exp: '18 Years Experience',
    img: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300&q=80',
  },
  {
    name: 'Chef Srinivasulu',
    title: 'Rayalaseema & Natukodi Specialist',
    exp: '15 Years Experience',
    img: 'https://images.unsplash.com/photo-1607631568010-a87245c0daf8?w=300&q=80',
  },
];

/**
 * One vertical rhythm for every band on the page. Sections used to set their
 * own padding while their headings carried a larger margin than the padding
 * itself, so the gap above a heading read as smaller than the gap below it.
 */
function Section({
  children,
  bg = 'transparent',
  sx,
}: {
  children: React.ReactNode;
  bg?: string;
  sx?: object;
}) {
  return (
    <Box
      component="section"
      sx={{ bgcolor: bg, py: { xs: 6, sm: 7, md: 10 }, ...sx }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 2.5, sm: 3, md: 4 } }}>
        {children}
      </Container>
    </Box>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  tone = 'red',
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  tone?: 'red' | 'amber';
}) {
  const isAmber = tone === 'amber';
  return (
    <Reveal>
      <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 }, maxWidth: 640, mx: 'auto' }}>
        <Chip
          label={eyebrow}
          sx={{
            bgcolor: isAmber ? 'rgba(255,152,0,0.15)' : 'rgba(198,40,40,0.1)',
            color: isAmber ? '#E65100' : '#C62828',
            fontWeight: 800,
            letterSpacing: 0.6,
            fontSize: '11px',
            mb: 2,
            px: 1,
          }}
        />
        <Typography
          variant="h2"
          sx={{
            fontSize: { xs: 'clamp(1.65rem, 6.5vw, 2.1rem)', md: '2.6rem' },
            color: '#212121',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            mb: subtitle ? 1.5 : 0,
            textWrap: 'balance',
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.65 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Reveal>
  );
}

export default function HomePage() {
  const copyCoupon = async () => {
    try {
      await navigator.clipboard.writeText(COUPON_CODE);
      toast.success(`Coupon ${COUPON_CODE} copied!`, { icon: '🎟️' });
    } catch {
      // Clipboard access is denied on insecure origins and in some in-app
      // browsers — the code is on screen either way, so just say so.
      toast(`Use code ${COUPON_CODE} at checkout`, { icon: '🎟️' });
    }
  };

  return (
    <>
      <Navbar />

      <Box component="main">
        {/* 1. Hero carousel */}
        <HeroSlider />

        {/* 2. Offer ticker.
            The message scrolls as a marquee on phones, where it never fitted on
            one line, and sits still from `sm` up where there is room for it. */}
        <Box
          sx={{
            bgcolor: '#C62828',
            color: 'white',
            py: 1.4,
            borderBottom: '1px solid rgba(255,255,255,0.12)',
            overflow: 'hidden',
          }}
        >
          <Container maxWidth="lg" sx={{ px: { xs: 0, sm: 3, md: 4 } }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: { xs: 'flex-start', md: 'space-between' },
                gap: 2,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  minWidth: 0,
                  flex: 1,
                  overflow: 'hidden',
                  // Two copies of the message; the keyframe shifts the track by
                  // exactly half its width, so the loop has no visible seam.
                  '& .ppr-ticker-track': {
                    display: { xs: 'flex', sm: 'none' },
                    flexShrink: 0,
                    animation: 'ppr-marquee 18s linear infinite',
                  },
                }}
              >
                <Box className="ppr-ticker-track">
                  {[0, 1].map((copy) => (
                    <Box key={copy} sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 5, whiteSpace: 'nowrap' }}>
                      <LocalOffer sx={{ color: '#FFD54F', fontSize: 18, animation: 'ppr-spin 5s linear infinite' }} />
                      <Typography component="span" sx={{ fontWeight: 700, fontSize: '13px' }}>
                        🎉 Use code <Box component="span" sx={{ color: '#FFD54F', fontWeight: 900, letterSpacing: 1 }}>{COUPON_CODE}</Box> for 10% OFF above ₹500
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {/* Static, tappable version from `sm` up. */}
                <Box
                  sx={{
                    display: { xs: 'none', sm: 'flex' },
                    alignItems: 'center',
                    gap: 1.5,
                    flexWrap: 'wrap',
                    minWidth: 0,
                  }}
                >
                  <LocalOffer sx={{ color: '#FFD54F', fontSize: 20, animation: 'ppr-spin 5s linear infinite', flexShrink: 0 }} />
                  <Typography component="span" sx={{ fontWeight: 700, fontSize: '14px' }}>
                    🎉 Special Offer: Use code{' '}
                    <Box
                      component="button"
                      type="button"
                      onClick={copyCoupon}
                      aria-label={`Copy coupon code ${COUPON_CODE}`}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.6,
                        font: 'inherit',
                        cursor: 'pointer',
                        bgcolor: 'rgba(0,0,0,0.3)',
                        border: '1px dashed rgba(255,213,79,0.55)',
                        px: 1.2,
                        py: 0.3,
                        borderRadius: '8px',
                        color: '#FFD54F',
                        letterSpacing: 1,
                        verticalAlign: 'middle',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.5)', borderColor: '#FFD54F' },
                        transition: 'background-color 0.2s ease, border-color 0.2s ease',
                      }}
                    >
                      {COUPON_CODE}
                      <ContentCopy sx={{ fontSize: 13 }} />
                    </Box>{' '}
                    for 10% OFF on all orders above ₹500!
                  </Typography>
                </Box>
              </Box>

              <Box
                component={Link}
                href="/menu"
                sx={{
                  display: { xs: 'none', md: 'inline-flex' },
                  alignItems: 'center',
                  gap: 0.5,
                  flexShrink: 0,
                  color: '#FFD54F',
                  fontWeight: 800,
                  fontSize: '13px',
                  textDecoration: 'underline',
                  whiteSpace: 'nowrap',
                  '&:hover': { color: 'white' },
                }}
              >
                Order Now &amp; Save <ArrowForward sx={{ fontSize: 15 }} />
              </Box>
            </Box>
          </Container>
        </Box>

        {/* 3. Service promises */}
        <Box component="section" sx={{ bgcolor: '#FFFFFF', py: { xs: 4, md: 5 }, borderBottom: '1px solid rgba(198,40,40,0.07)' }}>
          <Container maxWidth="lg" sx={{ px: { xs: 2.5, sm: 3, md: 4 } }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
                gap: { xs: 2, md: 3 },
              }}
            >
              {promises.map((p, i) => (
                <Reveal key={p.title} delay={i * 70}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, height: '100%' }}>
                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: '12px',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#C62828',
                        bgcolor: 'rgba(198,40,40,0.08)',
                      }}
                    >
                      {p.icon}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: { xs: '13.5px', md: '15px' }, color: '#212121', lineHeight: 1.35 }}>
                        {p.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.5 }}>
                        {p.desc}
                      </Typography>
                    </Box>
                  </Box>
                </Reveal>
              ))}
            </Box>
          </Container>
        </Box>

        {/* 4. Category specials */}
        <Section bg="#FFF8F2">
          <SectionHeading
            eyebrow="OUR SPECIALITIES"
            title="Discover Culinary Excellence"
            subtitle="Crafted with authentic spices handpicked from traditional markets, prepared with passion and secret family recipes."
          />

          {/* Two per row on phones rather than one — full-width cards forced a
              lot of scrolling to see four tiles. */}
          <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
            {categories.map((cat, i) => (
              <Grid key={cat.name} size={{ xs: 6, md: 3 }}>
                <Reveal delay={i * 80} sx={{ height: '100%' }}>
                  <Box
                    component={Link}
                    href={cat.href}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      bgcolor: 'white',
                      borderRadius: '20px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                      border: '1px solid rgba(198,40,40,0.08)',
                      transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease, border-color 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 20px 40px rgba(198,40,40,0.18)',
                        borderColor: '#FF9800',
                      },
                      '&:hover .ppr-cat-img': { transform: 'scale(1.09)' },
                      '&:focus-visible': { outline: '2px solid #C62828', outlineOffset: 3 },
                    }}
                  >
                    <Box sx={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', overflow: 'hidden', bgcolor: '#F5E6DC' }}>
                      <Image
                        className="ppr-cat-img"
                        src={cat.img}
                        alt={cat.name}
                        fill
                        sizes="(max-width: 900px) 50vw, 280px"
                        style={{ objectFit: 'cover', transition: 'transform 0.6s ease' }}
                      />
                    </Box>
                    <Box sx={{ p: { xs: 1.5, sm: 2, md: 2.25 }, flexGrow: 1 }}>
                      <Typography
                        sx={{
                          fontWeight: 800,
                          color: '#212121',
                          mb: 0.5,
                          lineHeight: 1.3,
                          fontSize: { xs: '13.5px', sm: '15px', md: '16px' },
                        }}
                      >
                        {cat.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          fontSize: { xs: '11.5px', md: '13px' },
                          lineHeight: 1.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {cat.desc}
                      </Typography>
                    </Box>
                  </Box>
                </Reveal>
              </Grid>
            ))}
          </Grid>
        </Section>

        {/* 5. Dish showcase slider */}
        <Section bg="#FFFFFF">
          <Reveal>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'flex-end' },
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
                mb: { xs: 3, md: 4 },
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Chip
                  label="INTERACTIVE SHOWCASE"
                  sx={{ bgcolor: 'rgba(255,152,0,0.15)', color: '#E65100', fontWeight: 800, fontSize: '11px', letterSpacing: 0.6, mb: 1.5 }}
                />
                <Typography
                  variant="h2"
                  sx={{
                    fontSize: { xs: 'clamp(1.65rem, 6.5vw, 2.1rem)', md: '2.6rem' },
                    fontWeight: 900,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                  }}
                >
                  Most Loved Culinary Creations
                </Typography>
              </Box>
              <Button
                component={Link}
                href="/menu"
                variant="outlined"
                color="primary"
                endIcon={<ArrowForward />}
                sx={{ borderRadius: '12px', fontWeight: 800, py: 1, px: 2.5, flexShrink: 0, alignSelf: { xs: 'stretch', sm: 'auto' } }}
              >
                Explore Full Menu
              </Button>
            </Box>
          </Reveal>

          <Reveal delay={80}>
            <FoodMenuSlider />
          </Reveal>
        </Section>

        {/* 6. Heritage */}
        <Section bg="#160808" sx={{ color: 'white', position: 'relative', overflow: 'hidden' }}>
          <Grid container spacing={{ xs: 4, md: 6 }} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Reveal direction="right">
                <Chip label="SINCE 1998" sx={{ bgcolor: '#FF9800', color: 'white', fontWeight: 800, letterSpacing: 0.6, fontSize: '11px', mb: 2, px: 1 }} />
                <Typography
                  variant="h2"
                  sx={{
                    color: 'white',
                    fontSize: { xs: 'clamp(1.65rem, 6.5vw, 2.1rem)', md: '2.6rem' },
                    fontWeight: 900,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                    mb: 2,
                    textWrap: 'balance',
                  }}
                >
                  25+ Years of Pure Taste &amp; Royal Tradition
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.78)', lineHeight: 1.8, mb: 3, fontSize: { xs: '0.95rem', md: '1rem' } }}>
                  At Pala Pitta Ruchulu, food is an emotion. Every dish is slow-cooked in traditional
                  brass handis and clay tandoors using hand-ground spices and pure cow ghee.
                </Typography>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                    gap: 1.75,
                  }}
                >
                  {heritagePoints.map((feature) => (
                    <Box key={feature} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <CheckCircle sx={{ color: '#FF9800', fontSize: 20, mt: '1px', flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.92)', lineHeight: 1.45 }}>
                        {feature}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Reveal>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Reveal direction="left" delay={100}>
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    // Ratio instead of a fixed 380px height: the frame now keeps
                    // its proportions from a 320px phone to a 1200px desktop.
                    aspectRatio: { xs: '4 / 3', md: '5 / 4' },
                    borderRadius: '24px',
                    overflow: 'hidden',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.55)',
                    border: '1px solid rgba(255,152,0,0.3)',
                    transition: 'transform 0.5s ease',
                    '&:hover': { transform: 'scale(1.015)' },
                  }}
                >
                  <Image
                    src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&q=80"
                    alt="The Pala Pitta Ruchulu dining room"
                    fill
                    sizes="(max-width: 900px) 100vw, 560px"
                    style={{ objectFit: 'cover' }}
                  />
                </Box>
              </Reveal>
            </Grid>
          </Grid>
        </Section>

        {/* 7. Chefs */}
        <Section bg="#FFF8F2">
          <SectionHeading
            eyebrow="OUR EXPERTS"
            title="Meet Our Culinary Masters"
            subtitle="Master chefs dedicated to preserving authentic Indian culinary art."
          />

          {/* `justifyContent: center` matters at the `sm` breakpoint: three
              cards in a two-column grid leave one on its own, and centring it
              reads as deliberate instead of broken. */}
          <Grid container spacing={{ xs: 2.5, md: 4 }} sx={{ justifyContent: 'center' }}>
            {chefs.map((chef, i) => (
              <Grid key={chef.name} size={{ xs: 12, sm: 6, md: 4 }}>
                <Reveal delay={i * 90} sx={{ height: '100%' }}>
                  <Box
                    sx={{
                      p: { xs: 3, md: 4 },
                      height: '100%',
                      bgcolor: 'white',
                      borderRadius: '24px',
                      textAlign: 'center',
                      boxShadow: '0 6px 24px rgba(0,0,0,0.06)',
                      border: '1px solid rgba(198,40,40,0.06)',
                      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 16px 36px rgba(198,40,40,0.14)',
                      },
                      '&:hover .ppr-chef-avatar': { borderColor: '#FF9800' },
                    }}
                  >
                    <Avatar
                      className="ppr-chef-avatar"
                      src={chef.img}
                      alt={chef.name}
                      sx={{
                        width: { xs: 92, md: 110 },
                        height: { xs: 92, md: 110 },
                        mx: 'auto',
                        mb: 2.5,
                        border: '4px solid #C62828',
                        boxShadow: '0 6px 20px rgba(198,40,40,0.25)',
                        transition: 'border-color 0.3s ease',
                      }}
                    />
                    <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#212121' }}>
                      {chef.name}
                    </Typography>
                    <Typography variant="body2" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
                      {chef.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.5 }}>
                      {chef.exp}
                    </Typography>
                  </Box>
                </Reveal>
              </Grid>
            ))}
          </Grid>
        </Section>

        {/* 8. Reviews */}
        <Section bg="#FFFFFF">
          <SectionHeading
            eyebrow="DINER FEEDBACK"
            title="What Our Diners Say"
            subtitle="Real reviews from real food lovers across Hyderabad."
            tone="amber"
          />
          <Reveal delay={60}>
            <ReviewSlider />
          </Reveal>
        </Section>

        {/* 9. Closing CTA */}
        <Box
          component="section"
          sx={{
            position: 'relative',
            overflow: 'hidden',
            color: 'white',
            py: { xs: 7, md: 10 },
            background: 'linear-gradient(135deg, #C62828 0%, #8E0000 50%, #1A0A0A 100%)',
          }}
        >
          {/* Soft glow behind the copy. pointerEvents:none so it can never
              intercept a tap meant for the buttons underneath it. */}
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              top: '-30%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: { xs: 460, md: 760 },
              height: { xs: 460, md: 760 },
              pointerEvents: 'none',
              background: 'radial-gradient(circle, rgba(255,152,0,0.28) 0%, rgba(255,152,0,0) 68%)',
            }}
          />

          <Container maxWidth="md" sx={{ position: 'relative', zIndex: 2, px: { xs: 2.5, sm: 3, md: 4 }, textAlign: 'center' }}>
            <Reveal>
              <Typography
                variant="h2"
                sx={{
                  color: 'white',
                  fontSize: { xs: 'clamp(1.8rem, 7.5vw, 2.4rem)', md: '3rem' },
                  fontWeight: 900,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.18,
                  mb: 2,
                  textWrap: 'balance',
                }}
              >
                Plan Your Special Dining Experience
              </Typography>
              <Typography
                sx={{
                  color: 'rgba(255,255,255,0.86)',
                  mb: { xs: 3.5, md: 4.5 },
                  fontSize: { xs: '0.98rem', md: '1.1rem' },
                  lineHeight: 1.65,
                  maxWidth: 620,
                  mx: 'auto',
                }}
              >
                Reserving a table takes less than a minute. Celebrate family gatherings,
                corporate lunches, or romantic dinners with us.
              </Typography>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ justifyContent: 'center', alignItems: 'stretch' }}
              >
                <Button
                  component={Link}
                  href="/reservation"
                  variant="contained"
                  size="large"
                  sx={{
                    py: 1.6,
                    px: 4,
                    borderRadius: '14px',
                    bgcolor: '#FF9800',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '16px',
                    boxShadow: '0 8px 30px rgba(255,152,0,0.45)',
                    '&:hover': { bgcolor: '#F57C00', transform: 'translateY(-2px)', boxShadow: '0 12px 34px rgba(255,152,0,0.55)' },
                    transition: 'transform 0.25s ease, background-color 0.25s ease, box-shadow 0.25s ease',
                  }}
                >
                  🪑 Book Table Now
                </Button>
                <Button
                  component={Link}
                  href="/contact"
                  variant="outlined"
                  size="large"
                  sx={{
                    py: 1.6,
                    px: 4,
                    borderRadius: '14px',
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.55)',
                    fontWeight: 800,
                    fontSize: '16px',
                    backdropFilter: 'blur(6px)',
                    '&:hover': {
                      borderColor: '#FF9800',
                      color: '#FFD54F',
                      bgcolor: 'rgba(255,152,0,0.15)',
                      transform: 'translateY(-2px)',
                    },
                    transition: 'transform 0.25s ease, background-color 0.25s ease, border-color 0.25s ease',
                  }}
                >
                  📞 Contact Us
                </Button>
              </Stack>
            </Reveal>
          </Container>
        </Box>
      </Box>

      <Footer />
    </>
  );
}
