'use client';

import React, { useState } from 'react';
import { Clock, ExternalLink, Mail, MapPin, Phone, Send } from 'lucide-react';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import { Container } from '@/components/customer/Container';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const PHONE = '+91 70326 82089';
const PHONE_RAW = '917032682089';
const EMAIL = 'palapittaruchulu@gmail.com';
const ADDRESS = '1/90/2/E/A, Sri Sai Nilayam, Vinayaka Nagar Colony, Circle 20, Madhapur, Hyderabad, TS – 500081';
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
    <div className="min-h-screen w-full bg-stone-50 flex flex-col">
      <Navbar />

      <main className="flex-1 py-8 md:py-12">
        <Container className="max-w-2xl">

          {/* Page title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-stone-900">Contact Us</h1>
            <p className="text-sm text-stone-500 mt-1">
              We&apos;d love to hear from you. Reach out anytime!
            </p>
          </div>

          <div className="space-y-6">

            {/* ── Contact Details ───────────────────────────── */}
            <Card className="rounded-2xl border border-stone-200/70 bg-white shadow-sm">
              <CardContent className="p-5 sm:p-6 space-y-4">
                <h2 className="text-sm font-bold text-stone-800 uppercase tracking-wider">
                  Contact Details
                </h2>

                <div className="space-y-3.5">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-600">
                      <MapPin className="size-4.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Address</p>
                      <p className="text-sm font-medium text-stone-700 mt-0.5">{ADDRESS}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-600">
                      <Phone className="size-4.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Phone</p>
                      <a href={`tel:${PHONE_RAW}`} className="text-sm font-semibold text-stone-700 hover:text-primary transition-colors mt-0.5 block">
                        {PHONE}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-600">
                      <Mail className="size-4.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Email</p>
                      <a href={`mailto:${EMAIL}`} className="text-sm font-semibold text-stone-700 hover:text-primary transition-colors mt-0.5 block">
                        {EMAIL}
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Quick Actions ─────────────────────────────── */}
            <div className="grid gap-3">
              <a
                href={`tel:+${PHONE_RAW}`}
                className="flex items-center justify-center gap-2.5 rounded-2xl bg-white border border-stone-200/70 px-5 py-4 text-sm font-bold text-stone-800 shadow-sm transition-all hover:shadow-md hover:border-stone-300 active:scale-[0.98]"
              >
                <span className="text-lg">📞</span>
                Call Now
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2.5 rounded-2xl bg-emerald-500 px-5 py-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-600 hover:shadow-md active:scale-[0.98]"
              >
                <span className="text-lg">💬</span>
                WhatsApp
              </a>
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2.5 rounded-2xl bg-white border border-stone-200/70 px-5 py-4 text-sm font-bold text-stone-800 shadow-sm transition-all hover:shadow-md hover:border-stone-300 active:scale-[0.98]"
              >
                <span className="text-lg">📍</span>
                Get Directions
              </a>
            </div>

            {/* ── Opening Hours ─────────────────────────────── */}
            <Card className="rounded-2xl border border-stone-200/70 bg-white shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="size-4.5 text-amber-600" />
                  <h2 className="text-sm font-bold text-stone-800 uppercase tracking-wider">Opening Hours</h2>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Monday – Sunday</span>
                  <span className="font-semibold text-stone-800">12:00 PM – 11:00 PM</span>
                </div>
              </CardContent>
            </Card>

            {/* ── Google Map ────────────────────────────────── */}
            <Card className="rounded-2xl border border-stone-200/70 overflow-hidden shadow-sm">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3806.267578789453!2d78.4189!3d17.4159!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTfCsDI0JzU3LjIiTiA3OMKwMjUnMDQuMCJF!5e0!3m2!1sen!2sin!4v1626000000000!5m2!1sen!2sin"
                width="100%"
                height="240"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full"
                title="Pala Pitta Ruchulu location"
              />
              <div className="p-3 flex items-center justify-between bg-white">
                <span className="text-xs font-semibold text-stone-600">Madhapur, Hyderabad</span>
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  Open in Maps
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </Card>

            {/* ── Contact Form ─────────────────────────────── */}
            <Card className="rounded-2xl border border-stone-200/70 bg-white shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <h2 className="text-sm font-bold text-stone-800 uppercase tracking-wider mb-4">
                  Send a Message
                </h2>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    required
                    className="rounded-xl border-stone-200 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
                  />
                  <Input
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="Mobile number"
                    type="tel"
                    required
                    className="rounded-xl border-stone-200 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
                  />
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Your message…"
                    required
                    rows={3}
                    className="flex w-full rounded-xl border border-stone-200 bg-transparent px-3 py-2.5 text-sm placeholder:text-stone-400 focus-visible:outline-none focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/20 resize-none"
                  />
                  <Button
                    type="submit"
                    variant="brand"
                    className="w-full rounded-xl h-11 font-bold shadow-xs"
                  >
                    <Send className="size-4 mr-2" />
                    Send via WhatsApp
                  </Button>
                </form>

                <p className="text-[11px] text-stone-400 text-center mt-3">
                  This opens WhatsApp with your message pre-filled.
                </p>
              </CardContent>
            </Card>

          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
