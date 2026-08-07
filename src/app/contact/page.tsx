'use client';

import React from 'react';
import { Clock, ExternalLink, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const contactInfo = [
  { icon: <MapPin className="size-5" />, label: 'Address', value: '1/90/2/E/A, Sri Sai Nilayam, Vinayaka Nagar Colony,\nCircle 20, Madhapur, Hyderabad, TS – 500081', color: 'text-red-600 bg-red-500/10 border-red-500/20' },
  { icon: <Phone className="size-5" />, label: 'Phone / Orders', value: '+91 70326 82089', color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' },
  { icon: <Mail className="size-5" />, label: 'Email / Web', value: 'palapittaruchulu@gmail.com\nwww.palapittaruchulu.com', color: 'text-blue-600 bg-blue-500/10 border-blue-500/20' },
  { icon: <MessageCircle className="size-5" />, label: 'WhatsApp Direct', value: '+91 70326 82089\nInstant Customer Support', color: 'text-green-600 bg-green-500/10 border-green-500/20' },
];

const hours = [
  { day: 'Monday – Friday', time: '7:00 AM – 11:00 PM' },
  { day: 'Saturday – Sunday', time: '7:00 AM – 11:30 PM' },
  { day: 'Public Holidays', time: '8:00 AM – 10:30 PM' },
];

export default function ContactPage() {
  const whatsappUrl = 'https://wa.me/917032682089';

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      <Navbar />

      {/* Hero Header - Full Width */}
      <section className="w-full bg-gradient-to-br from-[#1A0A0A] via-[#2A0C0C] to-[#C62828] py-4 md:py-5 text-center text-white px-4 sm:px-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black mb-1 tracking-tight">
          📞 Contact Us
        </h1>
        <p className="text-xs md:text-sm text-white/80 max-w-md mx-auto font-medium">
          Connect with Pala Pitta Ruchulu instantly on WhatsApp for orders, inquiries & reservations!
        </p>
      </section>

      {/* Main Container - Full Width */}
      <section className="w-full bg-orange-50/40 dark:bg-zinc-900/40 py-10 md:py-16">
        <div className="w-full px-4 sm:px-8 md:px-12 max-w-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column – Contact Info + Map */}
            <div className="lg:col-span-5 space-y-5">
              {/* Info Cards */}
              {contactInfo.map((info, i) => (
                <Card key={i} className="p-4 shadow-sm hover:shadow-md transition-shadow border-border/80 bg-background">
                  <CardContent className="p-0 flex gap-4 items-start">
                    <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl border ${info.color}`}>
                      {info.icon}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">{info.label}</p>
                      <p className="text-sm font-semibold text-foreground whitespace-pre-line mt-0.5">{info.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Hours Card */}
              <Card className="p-5 shadow-sm border-border/80 bg-background">
                <CardContent className="p-0">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="size-5 text-primary" />
                    <h3 className="text-base font-bold text-foreground">Opening Hours</h3>
                  </div>
                  <div className="space-y-2">
                    {hours.map((h, i) => (
                      <div key={i} className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">{h.day}</span>
                        <span className="font-semibold text-foreground">{h.time}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Map Embed Card */}
              <Card className="overflow-hidden shadow-sm border-border/80 h-56 relative group">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3806.267578789453!2d78.4189!3d17.4159!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTfCsDI0JzU3LjIiTiA3OMKwMjUnMDQuMCJF!5e0!3m2!1sen!2sin!4v1626000000000!5m2!1sen!2sin"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={false}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full"
                />
                <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 p-4 text-center">
                  <MapPin className="size-10 text-primary" />
                  <p className="text-sm font-extrabold text-foreground">Madhapur, Hyderabad</p>
                  <Button
                    asChild
                    size="sm"
                    className="font-bold rounded-xl shadow-sm text-xs"
                  >
                    <a
                      href="https://maps.google.com/?q=Pala+Pitta+Ruchulu+Madhapur+Hyderabad"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open in Google Maps
                      <ExternalLink className="size-3.5 ml-1" />
                    </a>
                  </Button>
                </div>
              </Card>
            </div>

            {/* Right Column – WhatsApp Support Box */}
            <div className="lg:col-span-7">
              <Card className="p-8 md:p-12 text-center rounded-3xl shadow-xl border-2 border-emerald-500/30 bg-gradient-to-b from-background to-emerald-500/5 min-h-[520px] flex flex-col items-center justify-center">
                <CardContent className="p-0 flex flex-col items-center">
                  <div className="size-24 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/30 transform transition-transform hover:scale-105">
                    <MessageCircle className="size-12" />
                  </div>

                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-black tracking-widest text-[11px] uppercase mb-3 px-3 py-1">
                    ⚡ FASTEST SUPPORT
                  </Badge>

                  <h2 className="text-2xl md:text-3xl font-black text-emerald-950 dark:text-emerald-100 mb-3">
                    Chat Direct on WhatsApp 💬
                  </h2>

                  <p className="text-xs md:text-sm text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
                    Skip the contact form! Click below to message Pala Pitta Ruchulu directly on WhatsApp for instant food orders, table bookings, catering queries & fast support.
                  </p>

                  <Button
                    asChild
                    size="lg"
                    className="w-full sm:w-auto font-black text-base md:text-lg bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-6 rounded-2xl shadow-xl shadow-emerald-500/30 transition-all hover:-translate-y-0.5 gap-2"
                  >
                    <a href={whatsappUrl} target="_blank" rel="noreferrer">
                      <MessageCircle className="size-6" />
                      Chat on WhatsApp (+91 70326 82089)
                      <ExternalLink className="size-5" />
                    </a>
                  </Button>

                  <div className="w-full my-8 border-t border-border/60" />

                  <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase mb-4">
                    Quick Action Links
                  </p>

                  <div className="flex flex-wrap justify-center gap-3">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="rounded-full border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-500/10 gap-1.5"
                    >
                      <a href="https://wa.me/917032682089?text=Hi%20Pala%20Pitta%20Ruchulu,%20I%20want%20to%20place%20an%20order" target="_blank" rel="noreferrer">
                        <MessageCircle className="size-3.5" />
                        🍲 Place Food Order
                      </a>
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="rounded-full border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-500/10 gap-1.5"
                    >
                      <a href="https://wa.me/917032682089?text=Hi%20Pala%20Pitta%20Ruchulu,%20I%20want%20to%20reserve%20a%20table" target="_blank" rel="noreferrer">
                        <MessageCircle className="size-3.5" />
                        🪑 Book Table
                      </a>
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="rounded-full border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-500/10 gap-1.5"
                    >
                      <a href="https://wa.me/917032682089?text=Hi%20Pala%20Pitta%20Ruchulu,%20I%20have%20a%20catering%20inquiry" target="_blank" rel="noreferrer">
                        <MessageCircle className="size-3.5" />
                        🎉 Party / Catering Inquiry
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
