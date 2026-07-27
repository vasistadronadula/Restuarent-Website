'use client';
import React from 'react';
import {
  Box, Container, Typography, Paper, Divider, Button, Stack, Alert,
} from '@mui/material';
import { CurrencyRupee, ArrowBack } from '@mui/icons-material';
import Link from 'next/link';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';

export default function RefundPolicyPage() {
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
              <CurrencyRupee sx={{ color: '#C62828', fontSize: 32 }} />
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#C62828', fontSize: { xs: '2rem', md: '2.5rem' } }}>
                Cancellation & Refund Policy
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Pala Pitta Ruchulu (Royal Spice) • Effective Date: January 1, 2026
            </Typography>
          </Box>

          <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
            <Stack spacing={3}>
              <Alert severity="info" sx={{ borderRadius: '14px', fontSize: '13px' }}>
                💡 Customer satisfaction is our highest priority at <strong>Pala Pitta Ruchulu</strong>. If you experience any issue with your order, please contact our support team immediately at <strong>+91 70326 82089</strong>.
              </Alert>

              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#212121', mb: 1 }}>
                  1. Order Cancellation Policy
                </Typography>
                <Box component="ul" sx={{ pl: 3, color: 'text.secondary', fontSize: '14px', lineHeight: 1.8 }}>
                  <li><strong>Before Kitchen Preparation:</strong> You may cancel your order free of charge within <strong>2 minutes</strong> of placing it, or before the kitchen begins cooking. A 100% refund will be issued.</li>
                  <li><strong>After Kitchen Preparation Begins:</strong> Once our chefs start preparing your items, cancellations are not permitted as food cannot be reused.</li>
                </Box>
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#212121', mb: 1 }}>
                  2. Refund Eligibility & Scenarios
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 1.5 }}>
                  Full or partial refunds / replacements are granted under the following circumstances:
                </Typography>
                <Box component="ul" sx={{ pl: 3, color: 'text.secondary', fontSize: '14px', lineHeight: 1.8 }}>
                  <li><strong>Damaged / Spilled Food:</strong> If food containers arrive damaged or severely spilled during transit.</li>
                  <li><strong>Missing Items:</strong> If any item ordered is missing from your delivery package.</li>
                  <li><strong>Incorrect Order Delivered:</strong> If a wrong dish was delivered to your address.</li>
                  <li><strong>Quality / Freshness Defect:</strong> If the food is verified to be undercooked or defective upon delivery.</li>
                </Box>
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#212121', mb: 1 }}>
                  3. Non-Refundable Scenarios
                </Typography>
                <Box component="ul" sx={{ pl: 3, color: 'text.secondary', fontSize: '14px', lineHeight: 1.8 }}>
                  <li>Incorrect delivery address or mobile phone number provided by the customer.</li>
                  <li>Customer unavailable to receive delivery after driver arrival.</li>
                  <li>Change of personal preference after food has been prepared.</li>
                </Box>
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#212121', mb: 1 }}>
                  4. Refund Processing Timelines
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 1.5 }}>
                  Approved refunds are processed back to your original payment method:
                </Typography>
                <Box component="ul" sx={{ pl: 3, color: 'text.secondary', fontSize: '14px', lineHeight: 1.8 }}>
                  <li><strong>UPI / Credit / Debit Cards / Net Banking:</strong> Refunded within <strong>3–5 business days</strong> depending on your bank.</li>
                  <li><strong>Counter payments (cash at the restaurant):</strong> Eligible refunds are returned as cash at the counter, or credited via UPI transfer or an instant store voucher if you have already left.</li>
                </Box>
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#212121', mb: 1 }}>
                  5. How to Request a Refund
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
                  Please contact us within <strong>2 hours of order delivery</strong> with your Order ID and photos of the food package (if damaged):
                </Typography>
                <Paper sx={{ p: 2.5, bgcolor: '#FFF8F2', borderRadius: '12px', border: '1px solid #FFCCBC' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#C62828', mb: 0.5 }}>
                    Pala Pitta Ruchulu Support Team
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    📞 Order Hotline: +91 70326 82089
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    💬 WhatsApp Support: +91 70326 82089
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    ✉️ Email: palapittaruchulu@gmail.com
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
