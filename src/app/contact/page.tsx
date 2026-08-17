'use client';

import React, { useState } from 'react';
import { Clock, ExternalLink, Mail, MapPin, MessageCircle, Navigation, Phone, Send } from 'lucide-react';

import { cn } from '@/lib/utils';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import { Container } from '@/components/customer/Container';
import { restaurantInfo } from '@/data/restaurantInfo';

const PHONE_RAW = restaurantInfo.whatsapp;
const ADDRESS =
  '1/90/2/E/A, Sri Sai Nilayam, Vinayaka Nagar Colony, Circle 20, Madhapur, Hyderabad, TS – 500081';
const MAPS_URL = 'https://maps.google.com/?q=Pala+Pitta+Ruchulu+Madhapur+Hyderabad';
const WHATSAPP_URL = `https://wa.me/${PHONE_RAW}`;

export default function ContactPage() {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = `Hi Pala Pitta Ruchulu!\n\nName: ${name}\nMobile: ${mobile}\nMessage: ${message}`;
    window.open(`https://wa.me/${PHONE_RAW}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="bg-store flex min-h-screen w-full flex-col">
      <Navbar />

      <main className="flex-1 py-6 sm:py-9">
        <Container className="max-w-[1080px]">
          <header className="mb-6">
            <h1 className="text-ink-1 font-display text-[24px] font-black tracking-tight sm:text-[28px]">
              Talk to us
            </h1>
            <p className="text-ink-3 mt-1.5 text-[13.5px]">
              A question about an order, a bulk booking, or feedback on a dish — whichever it is,
              WhatsApp gets the fastest reply.
            </p>
          </header>

          {/* ── The three things people actually want ─────────────────
              Big, single-purpose targets at the top of the page, before any
              form. Most people arriving here want to call or find the place;
              making them scroll past a contact card to reach a phone number
              is the whole reason contact pages get a bad name. */}
          <div className="grid gap-3 sm:grid-cols-3">
            <QuickAction
              href={`tel:+${PHONE_RAW}`}
              icon={Phone}
              label="Call us"
              sub={restaurantInfo.phoneDisplay}
            />
            <QuickAction
              href={WHATSAPP_URL}
              icon={MessageCircle}
              label="WhatsApp"
              sub="Usually replies in minutes"
              tone="veg"
              external
            />
            <QuickAction
              href={MAPS_URL}
              icon={Navigation}
              label="Directions"
              sub="Madhapur, Hyderabad"
              external
            />
          </div>

          {/* Two columns from `lg`: details + map on the left, the form on the
              right. A single stacked column of full-width sections is what
              this page had before, and at 1080px a details card or a form
              stretched edge to edge looks unfinished — splitting them keeps
              every card at a size that was actually designed for it. */}
          <div className="mt-5 grid gap-4 lg:grid-cols-2 lg:items-start">
            <div className="grid gap-4">
              {/* ── Details ──────────────────────────────────────────── */}
              <section className="border-hair-1 shadow-store rounded-2xl border bg-white p-5 sm:p-6">
                <h2 className="text-ink-4 text-[11px] font-bold tracking-wider uppercase">
                  Restaurant details
                </h2>

                <ul className="mt-4 grid gap-4">
                  <DetailRow icon={MapPin} label="Address">
                    {ADDRESS}
                  </DetailRow>
                  <DetailRow icon={Phone} label="Phone">
                    <a
                      href={`tel:+${PHONE_RAW}`}
                      className="hover:text-brand-600 font-semibold transition-colors"
                    >
                      {restaurantInfo.phoneDisplay}
                    </a>
                  </DetailRow>
                  <DetailRow icon={Mail} label="Email">
                    <a
                      href={`mailto:${restaurantInfo.email}`}
                      className="hover:text-brand-600 font-semibold break-all transition-colors"
                    >
                      {restaurantInfo.email}
                    </a>
                  </DetailRow>
                  <DetailRow icon={Clock} label="Open">
                    Every day · {restaurantInfo.openingDisplay}
                  </DetailRow>
                </ul>
              </section>

              {/* ── Map ──────────────────────────────────────────────── */}
              <section className="border-hair-1 shadow-store overflow-hidden rounded-2xl border bg-white">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3806.267578789453!2d78.4189!3d17.4159!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTfCsDI0JzU3LjIiTiA3OMKwMjUnMDQuMCJF!5e0!3m2!1sen!2sin!4v1626000000000!5m2!1sen!2sin"
                  width="100%"
                  height="260"
                  style={{ border: 0 }}
                  allowFullScreen={false}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="block w-full"
                  title="Pala Pitta Ruchulu location"
                />
                <div className="border-hair-2 flex items-center justify-between border-t px-4 py-3">
                  <span className="text-ink-2 text-[13px] font-semibold">Madhapur, Hyderabad</span>
                  <a
                    href={MAPS_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-700 inline-flex items-center gap-1.5 text-[13px] font-extrabold hover:underline"
                  >
                    Open in Maps
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </section>
            </div>

            {/* ── Message form ─────────────────────────────────────────── */}
            <section className="border-hair-1 shadow-store rounded-2xl border bg-white p-5 sm:p-6">
              <h2 className="text-ink-1 text-[16px] font-extrabold">Send a message</h2>
              <p className="text-ink-4 mt-0.5 text-[12.5px]">
                This opens WhatsApp with your message already written.
              </p>

              <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  aria-label="Your name"
                  required
                  className={fieldClass}
                />
                <input
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="Mobile number"
                  aria-label="Mobile number"
                  type="tel"
                  inputMode="numeric"
                  required
                  className={fieldClass}
                />
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What would you like to tell us?"
                  aria-label="Message"
                  required
                  rows={4}
                  className={cn(fieldClass, 'h-auto resize-none py-3 leading-relaxed lg:min-h-[180px]')}
                />
                <button
                  type="submit"
                  className="bg-brand hover:bg-brand-600 mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl text-[15px] font-extrabold text-white transition-colors"
                >
                  <Send className="size-4" />
                  Send on WhatsApp
                </button>
              </form>
            </section>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}

const fieldClass =
  'border-hair-1 text-ink-1 placeholder:text-ink-4 h-12 w-full rounded-xl border bg-white px-4 text-[14px] font-medium transition-colors outline-none focus:border-brand-300 focus:ring-[3px] focus:ring-brand/15';

function QuickAction({
  href,
  icon: Icon,
  label,
  sub,
  tone = 'brand',
  external = false,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub: string;
  tone?: 'brand' | 'veg';
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      className="border-hair-1 shadow-store hover:shadow-store-lifted flex items-center gap-3 rounded-2xl border bg-white p-4 transition-shadow active:scale-[0.99]"
    >
      <span
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-xl',
          tone === 'veg' ? 'bg-veg/10 text-veg' : 'bg-brand-50 text-brand-600'
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="text-ink-1 block text-[14px] font-extrabold">{label}</span>
        <span className="text-ink-4 block truncate text-[12px] font-medium">{sub}</span>
      </span>
    </a>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3.5">
      <span className="bg-hair-2 text-ink-3 grid size-9 shrink-0 place-items-center rounded-lg">
        <Icon className="size-[17px]" />
      </span>
      <span className="min-w-0">
        <span className="text-ink-4 block text-[11px] font-bold tracking-wide uppercase">
          {label}
        </span>
        <span className="text-ink-2 mt-0.5 block text-[13.5px] leading-relaxed">{children}</span>
      </span>
    </li>
  );
}
