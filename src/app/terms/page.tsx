'use client';
import React from 'react';
import {
  Box, Container, Typography, Paper, Divider, Button, Stack,
} from '@mui/material';
import { Gavel, ArrowBack } from '@mui/icons-material';
import Link from 'next/link';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';

export default function TermsPage() {
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
              <Gavel sx={{ color: '#C62828', fontSize: 32 }} />
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#C62828', fontSize: { xs: '2rem', md: '2.5rem' } }}>
                Terms & Conditions
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
                  1. Agreement to Terms
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  By accessing or placing an order through the <strong>Pala Pitta Ruchulu</strong> website, mobile app, or dining at our Madhapur, Hyderabad outlet, you agree to comply with and be bound by these Terms & Conditions. If you do not agree, please refrain from using our services.
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#212121', mb: 1 }}>
                  2. Food Preparation & Allergen Disclaimer
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 1.5 }}>
                  At Pala Pitta Ruchulu, we prepare authentic Telangana, Andhra, and Hyderabadi dishes using traditional clay tandoors and brass handis:
                </Typography>
                <Box component="ul" sx={{ pl: 3, color: 'text.secondary', fontSize: '14px', lineHeight: 1.8 }}>
                  <li><strong>Veg & Non-Veg Integrity:</strong> We maintain strict separate cooking vessels and utensils for vegetarian items (🟢) and non-vegetarian items (🔴).</li>
                  <li><strong>Spice Levels:</strong> Dish spice levels range from Mild to Hot. Customers should specify spice preferences when ordering.</li>
                  <li><strong>Allergens:</strong> Our dishes may contain whole spices, tree nuts, dairy (pure cow ghee, curd, paneer), or sesame. Customers with severe food allergies must inform the kitchen before ordering.</li>
                </Box>
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#212121', mb: 1 }}>
                  3. Pricing, Taxes & Discounts
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 1.5 }}>
                  All food menu prices are listed in Indian Rupees (₹):
                </Typography>
                <Box component="ul" sx={{ pl: 3, color: 'text.secondary', fontSize: '14px', lineHeight: 1.8 }}>
                  <li><strong>GST Applicable:</strong> Statutory Central GST (CGST 2.5%) and State GST (SGST 2.5%) are calculated on the item subtotal in accordance with Indian tax laws.</li>
                  <li><strong>Coupons & Offers:</strong> Promotional discounts (e.g. <code>PALAPITTA10</code>) are valid only when minimum order conditions are met and cannot be combined with other offline offers.</li>
                  <li><strong>Delivery Charges:</strong> Delivery fees apply based on distance and order total as indicated during checkout.</li>
                </Box>
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#212121', mb: 1 }}>
                  4. Online Delivery & Guest Orders
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  Estimated delivery times (typically 30–45 minutes in Madhapur and surrounding areas) are subject to weather, traffic, and kitchen peak hours. Customers are responsible for providing an accurate 10-digit mobile number and full delivery address.
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#212121', mb: 1 }}>
                  5. Table Reservations
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  Reserved tables will be held for up to <strong>15 minutes</strong> past the reserved time. If guests do not arrive within the grace period, the table may be released to waiting walk-in diners.
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#212121', mb: 1 }}>
                  6. Governing Law
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  These terms are governed by the laws of Telangana, India. Any disputes arising out of restaurant transactions or services shall be subject to the exclusive jurisdiction of the courts in Hyderabad.
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Container>
      </Box>

      <Footer />
    </>
  );
}
