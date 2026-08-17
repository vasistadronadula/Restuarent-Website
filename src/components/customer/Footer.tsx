'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';

import { restaurantInfo } from '@/data/restaurantInfo';
import { useCartStore } from '@/store/useCartStore';
import PalaPittaLogo from './PalaPittaLogo';
import { Container } from './Container';

const NAV_LINKS = [
  { label: 'Our menu', href: '/menu' },
  { label: 'My orders', href: '/orders' },
  { label: 'Contact us', href: '/contact' },
  { label: 'Staff login', href: '/admin' },
];

const POLICY_LINKS = [
  { label: 'Privacy policy', href: '/privacy-policy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Refund policy', href: '/refund-policy' },
];

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.174.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.15-.174.199-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 016.988 2.896 9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.892c0 2.096.549 4.142 1.595 5.945L0 24l6.335-1.652a12.062 12.062 0 005.71 1.447h.006c6.585 0 11.946-5.335 11.949-11.893a11.82 11.82 0 00-3.48-8.413" />
    </svg>
  );
}

/**
 * The site footer.
 *
 * Light rather than the dark slab it replaces. A near-black footer under a
 * white menu reads as the end of the internet, and on a phone — where it sits
 * directly above the bottom nav — it made the nav look like part of the
 * footer rather than part of the app.
 */
export default function Footer() {
  const closeCart = () => useCartStore.getState().closeCart();

  const registrations = [
    restaurantInfo.gstin && `GSTIN: ${restaurantInfo.gstin}`,
    restaurantInfo.fssai && `FSSAI: ${restaurantInfo.fssai}`,
  ].filter(Boolean);

  return (
    <footer
      className="border-hair-1 mt-auto border-t bg-white pt-10"
      style={{ paddingBottom: 'calc(1.5rem + var(--ppr-bottom-nav-h, 0px) + env(safe-area-inset-bottom, 0px))' }}
    >
      <Container className="max-w-[1180px]">
        <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-3">
          {/* Brand */}
          <div>
            <PalaPittaLogo variant="light" size="small" />
            <p className="text-ink-3 mt-4 max-w-[280px] text-[13px] leading-relaxed">
              Authentic Telangana, Andhra and Hyderabadi cooking, served in Madhapur since 1998.
            </p>
            {restaurantInfo.whatsapp && (
              <a
                href={`https://wa.me/${restaurantInfo.whatsapp}`}
                target="_blank"
                rel="noreferrer noopener"
                className="border-hair-1 text-ink-2 hover:border-veg/50 hover:text-veg mt-4 inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-bold transition-colors"
              >
                <WhatsAppIcon className="text-veg size-4" />
                Message us on WhatsApp
              </a>
            )}
          </div>

          {/* Navigation */}
          <div>
            <h2 className="text-ink-4 mb-4 text-[11px] font-bold tracking-wider uppercase">
              Explore
            </h2>
            <ul className="grid gap-2.5">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={closeCart}
                    className="text-ink-2 hover:text-brand-600 text-[13.5px] font-semibold transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & hours */}
          <div>
            <h2 className="text-ink-4 mb-4 text-[11px] font-bold tracking-wider uppercase">
              Find us
            </h2>
            <ul className="text-ink-2 grid gap-3 text-[13.5px]">
              <li className="flex gap-3">
                <MapPin className="text-brand mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {restaurantInfo.addressLine}
              </li>
              <li className="flex gap-3">
                <Phone className="text-brand mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <a
                  href={`tel:${restaurantInfo.phone.replace(/\s/g, '')}`}
                  className="hover:text-brand-600 font-semibold transition-colors"
                >
                  {restaurantInfo.phoneDisplay}
                </a>
              </li>
              <li className="flex gap-3">
                <Mail className="text-brand mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <a
                  href={`mailto:${restaurantInfo.email}`}
                  className="hover:text-brand-600 break-all transition-colors"
                >
                  {restaurantInfo.email}
                </a>
              </li>
              <li className="flex gap-3">
                <Clock className="text-brand mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  Every day · {restaurantInfo.openingDisplay}
                  <span className="text-ink-4 block">Takeaway &amp; dine-in</span>
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-hair-2 text-ink-4 mt-9 flex flex-wrap items-center justify-between gap-3 border-t pt-6 text-[12px]">
          <p>
            © {new Date().getFullYear()} {restaurantInfo.name}
            {registrations.length > 0 && ` · ${registrations.join(' · ')}`}
          </p>
          <nav aria-label="Policies" className="flex flex-wrap gap-x-5 gap-y-1">
            {POLICY_LINKS.map((policy) => (
              <Link
                key={policy.href}
                href={policy.href}
                onClick={closeCart}
                className="hover:text-ink-2 font-semibold transition-colors"
              >
                {policy.label}
              </Link>
            ))}
          </nav>
        </div>
      </Container>
    </footer>
  );
}
