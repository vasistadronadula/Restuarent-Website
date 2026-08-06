'use client';

import React from 'react';
import { Award, Star, Trophy } from 'lucide-react';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const timeline = [
  { year: '1998', event: 'Pala Pitta Ruchulu opens in Madhapur, Hyderabad, serving traditional rustic flavours.' },
  { year: '2003', event: 'Expanded to a 200-seat restaurant featuring authentic Telangana and Andhra kitchens.' },
  { year: '2008', event: 'Won "Best Traditional South Indian Restaurant in Hyderabad" award.' },
  { year: '2012', event: 'Introduced signature items: Kamju Pitta Fry & Gongura Biryani.' },
  { year: '2016', event: 'Expanded online delivery services across Madhapur, Gachibowli, and HITEC City.' },
  { year: '2020', event: 'Served over 100,000 satisfied foodies across Hyderabad during pandemic.' },
  { year: '2024', event: 'Achieved 4.9-star rating on Google Reviews with over 10,000+ reviews.' },
  { year: '2026', event: 'Celebrating 28 years of culinary excellence in authentic Telugu gastronomy.' },
];

const awards = [
  { title: 'Best Biryani in Hyderabad', org: 'Zomato Gold Award', year: '2024' },
  { title: 'Top South Indian Restaurant', org: 'Times Food Award', year: '2023' },
  { title: 'Hygiene Excellence Award', org: 'FSSAI', year: '2023' },
  { title: 'Customer Choice Award', org: 'Google Reviews', year: '2022' },
];

const values = [
  { icon: '🌿', title: 'Fresh Ingredients', desc: 'Sourced daily from local farmers and markets' },
  { icon: '🍳', title: 'Authentic Recipes', desc: 'Traditional recipes preserved through generations' },
  { icon: '❤️', title: 'Made with Love', desc: 'Every dish crafted with passion and care' },
  { icon: '🏆', title: 'Quality First', desc: 'Uncompromising on taste and hygiene standards' },
  { icon: '🌍', title: 'Sustainable', desc: 'Eco-friendly practices and local sourcing' },
  { icon: '😊', title: 'Guest Delight', desc: 'Your satisfaction is our greatest achievement' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      <Navbar />

      {/* Hero Header - Full Width */}
      <section className="relative w-full h-[380px] md:h-[500px] overflow-hidden flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80"
          alt="Restaurant interior"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-red-950/60" />
        <div className="relative z-10 w-full px-4 sm:px-8 md:px-12 max-w-none">
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1 text-xs mb-4 shadow-md">
            🏛️ Est. 1998 • Hyderabad
          </Badge>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-4 tracking-tight leading-tight">
            Our Story
          </h1>
          <p className="text-base md:text-xl text-white/85 max-w-2xl font-normal leading-relaxed">
            From a humble dream to Hyderabad&apos;s most-loved restaurant — Pala Pitta Ruchulu has been serving authentic Indian flavours since 1998.
          </p>
        </div>
      </section>

      {/* Story Section - Full Width Container */}
      <section className="w-full bg-orange-50/50 dark:bg-zinc-900/50 py-12 md:py-20 border-b">
        <div className="w-full px-4 sm:px-8 md:px-12 max-w-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
            <div>
              <Badge variant="outline" className="border-primary/30 text-primary font-bold px-3 py-1 mb-4 bg-primary/5">
                Our Journey
              </Badge>
              <h2 className="text-2xl md:text-4xl font-extrabold text-foreground mb-6">
                A Legacy of <span className="bg-gradient-to-r from-red-600 to-amber-600 bg-clip-text text-transparent">Authentic Flavours</span>
              </h2>
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-4">
                Pala Pitta Ruchulu was established in Madhapur with a passionate mission to bring authentic, uncompromised Telangana, Andhra, and Rayalaseema home-style culinary traditions to Hyderabad. Starting as a cozy dining destination, it quickly earned acclaim for its signature Kamju Pitta Fry, Gongura Biryanis, and Ragi Sangati with Natukodi Pulusu.
              </p>
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-8">
                Over 25 years, we have served over 500,000 happy customers, won multiple awards, and maintained our commitment to using only the freshest ingredients and time-honoured recipes. Today, Pala Pitta Ruchulu stands as a landmark of Indian culinary excellence in Hyderabad.
              </p>
              <div className="grid grid-cols-3 gap-6 border-t pt-6">
                {[{ n: '25+', l: 'Years' }, { n: '500K+', l: 'Guests' }, { n: '50+', l: 'Awards' }].map((s) => (
                  <div key={s.l}>
                    <p className="text-2xl md:text-3xl font-black text-primary">{s.n}</p>
                    <p className="text-xs text-muted-foreground font-semibold">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80"
                alt="Our kitchen"
                className="w-full rounded-3xl shadow-2xl object-cover aspect-4/3"
              />
              <Card className="absolute -bottom-6 -left-6 md:-left-8 p-4 shadow-xl border-amber-500/20 bg-background/95 backdrop-blur">
                <CardContent className="p-0 flex items-center gap-3">
                  <Star className="size-6 text-amber-500 fill-amber-500 shrink-0" />
                  <div>
                    <p className="text-sm font-extrabold text-foreground">4.8/5 Rating</p>
                    <p className="text-[11px] text-muted-foreground">Based on 10,000+ reviews</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values - Full Width Grid */}
      <section className="w-full py-12 md:py-20 bg-background border-b">
        <div className="w-full px-4 sm:px-8 md:px-12 max-w-none text-center">
          <h2 className="text-2xl md:text-4xl font-extrabold text-foreground mb-3">
            Our <span className="bg-gradient-to-r from-red-600 to-amber-600 bg-clip-text text-transparent">Core Values</span>
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto mb-12">
            The principles that guide every dish we cook and every guest we serve.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((v, i) => (
              <Card key={i} className="group p-6 text-center border-border/60 hover:border-primary/40 hover:shadow-xl transition-all duration-300 bg-orange-50/20 dark:bg-zinc-900/20 hover:-translate-y-1">
                <CardContent className="p-0">
                  <div className="text-4xl mb-4 transform transition-transform group-hover:scale-110">{v.icon}</div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{v.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{v.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Milestones Timeline */}
      <section className="w-full py-12 md:py-20 bg-orange-50/40 dark:bg-zinc-900/40 border-b">
        <div className="w-full px-4 sm:px-8 md:px-12 max-w-none">
          <h2 className="text-2xl md:text-4xl font-extrabold text-foreground text-center mb-12">
            Our <span className="bg-gradient-to-r from-red-600 to-amber-600 bg-clip-text text-transparent">Milestones</span>
          </h2>

          <div className="relative space-y-6">
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-primary/20 -translate-x-1/2" />
            {timeline.map((item, i) => (
              <div
                key={item.year}
                className={`flex flex-col md:flex-row items-center ${i % 2 === 0 ? 'md:justify-start' : 'md:justify-end'} relative`}
              >
                <Card className="w-full md:w-5/12 p-6 shadow-md border-border/80 bg-background hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <Badge className="bg-primary hover:bg-primary/90 text-white font-extrabold mb-3">
                      {item.year}
                    </Badge>
                    <p className="text-sm font-semibold text-foreground leading-relaxed">
                      {item.event}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Awards Section */}
      <section className="w-full py-12 md:py-20 bg-background">
        <div className="w-full px-4 sm:px-8 md:px-12 max-w-none text-center">
          <h2 className="text-2xl md:text-4xl font-extrabold text-foreground mb-12">
            Awards & <span className="bg-gradient-to-r from-red-600 to-amber-600 bg-clip-text text-transparent">Recognition</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {awards.map((award, i) => (
              <Card key={i} className="p-6 text-center border-amber-500/20 bg-amber-500/5 hover:shadow-xl hover:-translate-y-1 transition-all">
                <CardContent className="p-0 flex flex-col items-center">
                  <Trophy className="size-12 text-amber-500 mb-4" />
                  <h3 className="text-base font-bold text-foreground mb-1">{award.title}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{award.org}</p>
                  <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 font-bold">
                    {award.year}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
