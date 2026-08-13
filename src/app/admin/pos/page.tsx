import React from 'react';
import POSClientWrapper from '@/components/pos/POSClientWrapper';
import { menuItems as fallbackMenuItems } from '@/data/menuData';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Point of Sale (POS) Billing | Pala Pitta Ruchulu',
  description:
    'Real-time restaurant POS order entry and billing system connected directly to live Supabase database.',
};

export default function POSPage() {
  return <POSClientWrapper initialMenuItems={fallbackMenuItems} />;
}
