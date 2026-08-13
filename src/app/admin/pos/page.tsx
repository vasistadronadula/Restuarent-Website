import React from 'react';
import POSClientWrapper from '@/components/pos/POSClientWrapper';
import { initialMenuItems } from '@/data/posMenuData';
import { MenuItem, MenuCategory } from '@/types/pos';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Point of Sale (POS) Billing | Pala Pitta Ruchulu',
  description:
    'Frictionless high-volume restaurant POS order entry and billing system.',
};

/**
 * POSPage (Server Component)
 * Fetches or provides initial menu items server-side and passes them to the POS client hierarchy.
 */
export default async function POSPage() {
  // In production, server-side menu fetching can happen here:
  const menuItems: MenuItem[] = initialMenuItems;

  return <POSClientWrapper initialMenuItems={menuItems} />;
}
