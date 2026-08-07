'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';

import { cn } from '@/lib/utils';
import { restaurantInfo } from '@/data/restaurantInfo';
import { useCartStore } from '@/store/useCartStore';
import { Separator } from '@/components/ui/separator';
import PalaPittaLogo from './PalaPittaLogo';

const QUICK_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about' },
  { label: 'Our Menu', href: '/menu' },
  { label: 'Reserve Table', href: '/reservation' },
  { label: 'Contact', href: '/contact' },
  // Kept public deliberately: AdminGuard bounces anyone who isn't staff, and
  // this is how the counter staff reach the till from a shared device.
  { label: 'Staff Login', href: '/admin' },
];

const MENU_CATEGORIES = [
  { label: 'Biryani', href: '/menu?category=biryani' },
  { label: 'South Indian', href: '/menu?category=south-indian' },
  { label: 'Tandoori', href: '/menu?category=tandoori' },
  { label: 'Starters', href: '/menu?category=starters' },
  { label: 'Desserts', href: '/menu?category=desserts' },
];

const POLICY_LINKS = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Refund Policy', href: '/refund-policy' },
];

const HOURS = [
  'Mon – Sun: 12:00 PM – 11:00 PM',
  'Takeaway & Dine-In',
];

/** Lucide dropped brand glyphs, and WhatsApp is the one channel we have a real number for. */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.174.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.15-.174.199-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 016.988 2.896 9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.892c0 2.096.549 4.142 1.595 5.945L0 24l6.335-1.652a12.062 12.062 0 005.71 1.447h.006c6.585 0 11.946-5.335 11.949-11.893a11.82 11.82 0 00-3.48-8.413" />
    </svg>
  );
}

export default function Footer() {
  const closeCart = () => useCartStore.getState().closeCart();

  // Rendered only once the real registration numbers are filled into
  // restaurantInfo. The previous footer printed a fabricated GSTIN and FSSAI
  // number, which is exactly what the note in that file warns against — a
  // made-up registration number on a customer-facing page reads as a real one.
  const registrations = [
    restaurantInfo.gstin && `GSTIN: ${restaurantInfo.gstin}`,
    restaurantInfo.fssai && `FSSAI: ${restaurantInfo.fssai}`,
  ].filter(Boolean);

  return (
    <footer
      className="mt-auto bg-linear-to-b from-[#1A0A0A] to-[#2D0000] pt-14 text-white md:pt-16"
      // Reserve room for the phone bottom nav so it never covers the policy
      // links. It is the only fixed element left on the bottom edge — the
      // floating cart bar that used to sit above it is gone.
      style={{ paddingBottom: 'calc(1.5rem + var(--ppr-bottom-nav-h, 0px))' }}
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          {/* Brand */}
          <div className="md:col-span-4">
            <PalaPittaLogo variant="dark" size="medium" />
            <p className="mt-5 max-w-75 text-sm leading-relaxed text-white/70">
              Authentic Indian taste since 1998. Savour the rich heritage of Indian cuisine crafted
              with love, tradition, and the finest spices from across India.
            </p>
            <a
              href={`https://wa.me/${restaurantInfo.whatsapp}`}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-3.5 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:border-[#25D366]/40 hover:bg-[#25D366]/15 hover:text-white"
            >
              <WhatsAppIcon className="size-4 text-[#25D366]" />
              Message us on WhatsApp
            </a>
          </div>

          <FooterColumn title="Quick Links" className="md:col-span-2">
            {QUICK_LINKS.map((link) => (
              <FooterLink key={link.href} href={link.href} onClick={closeCart}>
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Our Menu" className="md:col-span-2">
            {MENU_CATEGORIES.map((c) => (
              <FooterLink key={c.href} href={c.href} onClick={closeCart}>
                {c.label}
              </FooterLink>
            ))}
          </FooterColumn>

          {/* Contact */}
          <div className="md:col-span-4">
            <h2 className="text-accent font-display mb-4 text-base font-bold">Contact Us</h2>

            <ul className="grid gap-3.5 text-sm text-white/70">
              <li className="flex gap-3">
                <MapPin className="text-accent mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {restaurantInfo.addressLine}
              </li>
              <li className="flex gap-3">
                <Phone className="text-accent mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <a
                  href={`tel:${restaurantInfo.phone.replace(/\s/g, '')}`}
                  className="hover:text-accent transition-colors"
                >
                  {restaurantInfo.phoneDisplay}
                </a>
              </li>
              <li className="flex gap-3">
                <Mail className="text-accent mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0">
                  <a
                    href={`mailto:${restaurantInfo.email}`}
                    className="hover:text-accent block break-all transition-colors"
                  >
                    {restaurantInfo.email}
                  </a>
                  <span className="block text-white/50">{restaurantInfo.website}</span>
                </span>
              </li>
            </ul>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/6 p-4">
              <p className="text-accent mb-2 flex items-center gap-1.5 text-xs font-bold">
                <Clock className="size-3.5" aria-hidden="true" />
                Opening Hours
              </p>
              {HOURS.map((h) => (
                <p key={h} className="text-xs leading-relaxed text-white/65">
                  {h}
                </p>
              ))}
            </div>
          </div>
        </div>

        <Separator className="my-8 bg-white/10" />

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/40">
          <p>
            © {new Date().getFullYear()} {restaurantInfo.name}. All rights reserved.
            {registrations.length > 0 && ` | ${registrations.join(' | ')}`}
          </p>
          <nav aria-label="Policies" className="flex gap-5">
            {POLICY_LINKS.map((policy) => (
              <Link
                key={policy.href}
                href={policy.href}
                onClick={closeCart}
                className="hover:text-accent transition-colors"
              >
                {policy.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('col-span-1', className)}>
      <h2 className="text-accent font-display mb-4 text-base font-bold">{title}</h2>
      <ul className="grid gap-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        className="hover:text-accent inline-block text-sm text-white/65 transition-all hover:translate-x-1"
      >
        {children}
      </Link>
    </li>
  );
}
