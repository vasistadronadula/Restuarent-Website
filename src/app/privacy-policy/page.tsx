'use client';
import React from 'react';
import {
  Box, Container, Typography, Paper, Divider, Button, Stack,
} from '@mui/material';
import { Shield, ArrowBack } from '@mui/icons-material';
import Link from 'next/link';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';

export default function PrivacyPolicyPage() {
  return (
    <>
      <Navbar />

      <Box sx={{ bgcolor: '#FFF8F2', minHeight: '100vh', py: { xs: 4, md: 6 } }}>
        <Container maxWidth="md">
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <Button startIcon={<ArrowBack />} sx={{ color: '#616161', fontWeight: 600, mb: 1 }}>
                Back to Home
              </Button>
            </Link>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Shield sx={{ color: '#C62828', fontSize: 32 }} />
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#C62828', fontSize: { xs: '2rem', md: '2.5rem' } }}>
                Privacy Policy
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Pala Pitta Ruchulu (Royal Spice) • Effective Date: January 1, 2026
            </Typography>
          </Box>

          <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#212121', mb: 1 }}>
                  1. Introduction
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  Welcome to <strong>Pala Pitta Ruchulu</strong> (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;). We value your trust and are committed to protecting your personal information and privacy. This Privacy Policy outlines how we collect, use, store, and safeguard your details when you visit our website, place online food delivery orders, or book table reservations at our Madhapur, Hyderabad restaurant.
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#212121', mb: 1 }}>
                  2. Information We Collect
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 1.5 }}>
                  We collect information necessary to fulfill your food orders and provide seamless restaurant dining services:
                </Typography>
                <Box component="ul" sx={{ pl: 3, color: 'text.secondary', fontSize: '14px', lineHeight: 1.8 }}>
                  <li><strong>Contact Details:</strong> Full Name, Mobile Phone Number, Email Address, and Delivery Address.</li>
                  <li><strong>Order Information:</strong> Dishes selected, special cooking instructions, cart items, transaction history, and coupon codes applied.</li>
                  <li><strong>Table Reservations:</strong> Number of guests, date, preferred time slot, and special dietary/seating preferences.</li>
                  <li><strong>Technical Data:</strong> Device IP address, browser type, cookies, and local storage tokens used for maintaining your cart and login session.</li>
                </Box>
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#212121', mb: 1 }}>
                  3. How We Use Your Information
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 1.5 }}>
                  Your personal data is strictly used for legitimate restaurant business operations:
                </Typography>
                <Box component="ul" sx={{ pl: 3, color: 'text.secondary', fontSize: '14px', lineHeight: 1.8 }}>
                  <li>Processing and dispatching online food delivery and takeaway orders.</li>
                  <li>Sending real-time order status and delivery tracking updates via WhatsApp / SMS.</li>
                  <li>Confirming and managing table reservations.</li>
                  <li>Providing customer support regarding refunds, feedback, or kitchen queries.</li>
                  <li>Applying promotional discounts (such as <code>PALAPITTA10</code>) and loyalty rewards.</li>
                </Box>
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#212121', mb: 1 }}>
                  4. Guest Ordering & Account Security
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  We support <strong>Guest Checkout</strong> so you can place orders without creating a permanent account. For registered users, account credentials and authentication sessions are securely handled via Supabase Auth with industry-standard SSL encryption. We <strong>never sell or rent</strong> your personal information to third-party advertisers.
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#212121', mb: 1 }}>
                  5. Payment Security
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  All online payment transactions (UPI, Credit/Debit Cards, NetBanking) are processed through secure PCI-DSS compliant payment gateways. Pala Pitta Ruchulu does not store card CVVs or bank PINs on our servers.
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#212121', mb: 1 }}>
                  6. Contact & Legal Compliance
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
                  For any privacy questions or requests regarding your data, please reach out to our management team:
                </Typography>
                <Paper sx={{ p: 2.5, bgcolor: '#FFF8F2', borderRadius: '12px', border: '1px solid #FFCCBC' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#C62828', mb: 0.5 }}>
                    Pala Pitta Ruchulu (Royal Spice)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    📍 Location: Madhapur, Hyderabad, Telangana – 500081
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    📞 Phone: +91 70326 82089 | ✉️ Email: palapittaruchulu@gmail.com
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    📜 GSTIN: 36AAACR1234F1Z5 | FSSAI License No: 10020011003457
                  </Typography>
                </Paper>
              </Box>
            </Stack>
          </Paper>
        </Container>
      </Box>

      <Footer />
    </>
  );
}
