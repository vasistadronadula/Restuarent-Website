'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowRight, Search, Star, Clock, Phone,
  UtensilsCrossed, ShoppingBag, Copy, Tag,
  ShieldCheck, X, Sparkles, Check, Gift,
} from 'lucide-react';

import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import DishRail from '@/components/customer/DishRail';
import ReviewSlider from '@/components/customer/ReviewSlider';
import { useAdmin } from '@/context/AdminContext';
import { useCoupons } from '@/lib/queries';
import { restaurantInfo } from '@/data/restaurantInfo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=1200&q=80';

const CATEGORY_TILES = [
  { id: 'biryani', label: 'Biryani', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&auto=format&fit=crop&q=80' },
  { id: 'starters', label: 'Starters', image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=300&auto=format&fit=crop&q=80' },
  { id: 'tandoori', label: 'Tandoori', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=300&auto=format&fit=crop&q=80' },
  { id: 'combos', label: 'Combos', image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&auto=format&fit=crop&q=80' },
  { id: 'south-indian', label: 'South', image: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=300&auto=format&fit=crop&q=80' },
  { id: 'north-indian', label: 'North', image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&auto=format&fit=crop&q=80' },
  { id: 'chinese', label: 'Chinese', image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=300&auto=format&fit=crop&q=80' },
  { id: 'rice', label: 'Rice', image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=300&auto=format&fit=crop&q=80' },
  { id: 'breads', label: 'Breads', image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=300&auto=format&fit=crop&q=80' },
  { id: 'desserts', label: 'Desserts', image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80' },
  { id: 'beverages', label: 'Drinks', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=300&auto=format&fit=crop&q=80' },
];

const QUICK_SEARCHES = ['Mutton Biryani', 'Kamju Pitta Fry', 'Natukodi Pulusu', 'Chicken 65', 'Butter Naan', 'Apricot Delight'];
const SEARCH_HINTS = ['Mutton Biryani', 'Kamju Pitta Fry', 'Natukodi Pulusu', 'Chicken 65', 'Apollo Fish'];

const TRUST_POINTS = [
  { icon: '🔥', title: 'Slow-cooked dum biryani', desc: 'Saffron rice, marination overnight, copper handi cooking' },
  { icon: '🌿', title: 'Fresh local ingredients', desc: 'No frozen meat, cold-pressed oil, freshly ground spices' },
  { icon: '⏱️', title: '30-min takeaway pledge', desc: 'Prepared hot to order, sealed spill-proof for travel' },
  { icon: '❤️', title: '25 yrs family recipe', desc: 'Authentic Telangana & Rayalaseema culinary tradition' },
];

const PHONE_HREF = `tel:${restaurantInfo.phone.replace(/\s/g, '')}`;

function SectionHeading({
  title,
  subtitle,
  href,
  cta = 'See all',
}: {
  title: string;
  subtitle?: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="flex justify-between items-end mb-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight leading-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs sm:text-sm text-stone-500 font-medium mt-0.5">{subtitle}</p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="text-amber-600 hover:text-amber-700 font-extrabold text-xs flex items-center gap-1 hover:underline"
        >
          <span>{cta}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { menuItems, isLoadingDB } = useAdmin();
  const { data: coupons = [] } = useCoupons();

  const [query, setQuery] = useState('');
  const [hintIndex, setHintIndex] = useState(0);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [offersOpen, setOffersOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setHintIndex((i) => (i + 1) % SEARCH_HINTS.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  const submitSearch = (term?: string) => {
    const q = (term ?? query).trim();
    if (!q) {
      router.push('/menu');
      return;
    }
    router.push(`/menu?q=${encodeURIComponent(q)}`);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      toast.success(`Coupon ${code} copied! 🎟️`);
      setTimeout(() => setCopiedCode(null), 2500);
    });
  };

  const liveSearchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return menuItems.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.category && m.category.toLowerCase().includes(q)) ||
        (m.description && m.description.toLowerCase().includes(q))
    ).slice(0, 5);
  }, [menuItems, query]);

  const topPicks = useMemo(() => {
    return menuItems.filter((i) => i.isPopular || i.isSpecial).slice(0, 10);
  }, [menuItems]);

  const activeCoupons = useMemo(() => {
    return coupons.filter((c) => c.isActive !== false);
  }, [coupons]);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 w-full max-w-full">
        {/* 1. HERO SECTION */}
        <section className="relative overflow-hidden bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 text-white py-6 lg:py-10 px-4 sm:px-8 md:px-12">
          <div className="max-w-none w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
            <div className="lg:col-span-7 space-y-4">
              {/* Status Pill & Coupon Offer Badge */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-xs font-bold text-stone-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Open Now · 12 PM – 11 PM · Madhapur, Hyderabad</span>
                </div>

                {activeCoupons.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setOffersOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/25 to-orange-500/25 border border-amber-400/40 backdrop-blur-md text-xs font-black text-amber-300 hover:bg-amber-500/35 transition-all cursor-pointer"
                  >
                    <Tag className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                    <span>🎟️ {Math.max(...activeCoupons.map((c) => c.discount))}% OFF Coupons Available</span>
                  </button>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black leading-tight tracking-tight">
                Hungry? Order authentic{' '}
                <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                  Telugu food
                </span>
              </h1>

              <p className="text-stone-300 text-xs sm:text-sm max-w-xl font-medium leading-relaxed">
                25 years of Telangana & Rayalaseema culinary recipes — dum biryani, kamju pitta fry, natukodi pulusu. Freshly made, ready for takeaway.
              </p>

              {/* Search Box */}
              <div className="relative max-w-xl">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitSearch();
                  }}
                  className="flex items-center gap-2 bg-white dark:bg-stone-900 p-1.5 pl-4 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800"
                >
                  <Search className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Search for "${SEARCH_HINTS[hintIndex]}"`}
                    className="border-none shadow-none focus-visible:ring-0 text-sm font-bold text-stone-900 dark:text-stone-100 placeholder:text-stone-400 h-10 flex-1"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="p-1 text-stone-400 hover:text-stone-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <Button
                    type="submit"
                    className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl px-5 h-10 text-xs shadow-md"
                  >
                    Search
                  </Button>
                </form>

                {/* Instant Search Popup */}
                {query.trim().length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden z-50 max-h-80 overflow-y-auto">
                    {liveSearchResults.length > 0 ? (
                      <div>
                        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900 flex justify-between items-center text-xs font-black text-amber-700 dark:text-amber-400">
                          <span>MATCHING DISHES ({liveSearchResults.length})</span>
                          <button type="button" onClick={() => submitSearch()} className="hover:underline">
                            See all →
                          </button>
                        </div>
                        {liveSearchResults.map((dish) => (
                          <Link
                            key={dish.id}
                            href={`/menu?q=${encodeURIComponent(dish.name)}`}
                            onClick={() => setQuery('')}
                            className="flex items-center gap-3 p-3 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors border-b border-stone-100 dark:border-stone-800/60 last:border-none"
                          >
                            <div className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-stone-100 dark:bg-stone-800">
                              <Image
                                src={dish.image || 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=100&q=80'}
                                alt={dish.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-extrabold text-xs text-stone-900 dark:text-stone-100 truncate">
                                {dish.name}
                              </div>
                              <div className="text-[11px] text-stone-400 truncate">
                                {dish.description}
                              </div>
                            </div>
                            <div className="font-black text-amber-600 text-xs">₹{dish.price}</div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-stone-400 text-xs font-bold">
                        No dishes found for &quot;{query}&quot;
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Search Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs font-bold text-stone-400">Popular:</span>
                {QUICK_SEARCHES.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => submitSearch(term)}
                    className="px-3 py-1 rounded-full text-xs font-extrabold bg-white/10 hover:bg-amber-600 text-stone-200 hover:text-white transition-all border border-white/15"
                  >
                    {term}
                  </button>
                ))}
              </div>

              {/* Proof Counters */}
              <div className="grid grid-cols-4 gap-4 pt-4 border-t border-white/10 max-w-xl">
                {[
                  { value: '4.9★', label: '50K+ Diners' },
                  { value: '30 min', label: 'Takeaway' },
                  { value: '100+', label: 'Menu Dishes' },
                  { value: '25 yrs', label: 'Family Recipe' },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div className="font-black text-amber-400 text-base sm:text-lg">{stat.value}</div>
                    <div className="text-[11px] text-stone-400 font-semibold">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Hero Image Card */}
            <div className="lg:col-span-5 hidden lg:block relative">
              <div className="relative w-full aspect-4/3 rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
                <Image
                  src={HERO_IMAGE}
                  alt="Pala Pitta Ruchulu Biryani"
                  fill
                  priority
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute top-4 left-4 bg-amber-600/95 backdrop-blur-md text-white font-black text-xs px-3 py-1.5 rounded-xl shadow-lg border border-white/20 flex items-center gap-1.5">
                  <span>🏆 #1 Dum Biryani in Madhapur</span>
                </div>

                {activeCoupons.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setOffersOpen(true)}
                    className="absolute top-4 right-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs px-3 py-1.5 rounded-xl shadow-lg border border-white/20 flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer z-10"
                  >
                    <Tag className="w-3.5 h-3.5 animate-pulse text-amber-200" />
                    <span>🎟️ {activeCoupons.length} Offers</span>
                  </button>
                )}

                {/* Clean rating badge anchored safely inside the image overlay */}
                <div className="absolute bottom-4 left-4 right-4 bg-stone-950/85 backdrop-blur-md border border-white/15 p-3 rounded-2xl shadow-xl flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black">
                      <Star className="w-5 h-5 fill-stone-950" />
                    </div>
                    <div>
                      <div className="font-black text-sm text-amber-400">4.9 / 5.0 Rating</div>
                      <div className="text-[11px] text-stone-300 font-semibold">50,000+ Happy Diners</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-amber-400/40 text-amber-300 text-[10px] font-bold px-2 py-0.5">
                    Verified Reviews
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. THREE WAYS TO EAT ACTION GRID (Clean & Spacious) */}
        <section className="py-8 max-w-none px-4 sm:px-8 md:px-12 bg-white dark:bg-stone-900/60 border-y border-stone-200/80 dark:border-stone-800">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
            {[
              {
                icon: <ShoppingBag className="w-6 h-6 text-amber-600" />,
                badge: '🛍️ TAKEAWAY',
                label: 'Order Online Takeaway',
                hint: 'Freshly prepared & sealed ready in 30 mins',
                href: '/menu',
              },
              {
                icon: <UtensilsCrossed className="w-6 h-6 text-amber-600" />,
                badge: '🍽️ DINE-IN',
                label: 'Book a Restaurant Table',
                hint: 'Reserve your dining spot at Madhapur',
                href: '/reservation',
              },
              {
                icon: <Phone className="w-6 h-6 text-emerald-600" />,
                badge: '📞 HOTLINE',
                label: 'Direct Phone Order',
                hint: restaurantInfo.phoneDisplay,
                href: PHONE_HREF,
              },
            ].map((act) => (
              <Link
                key={act.label}
                href={act.href}
                className="bg-stone-50 dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800/80 rounded-2xl p-5 shadow-xs hover:shadow-xl hover:border-amber-500/40 transition-all duration-300 flex flex-col justify-between gap-4 group"
              >
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {act.icon}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                    {act.badge}
                  </span>
                </div>
                <div>
                  <div className="font-extrabold text-base text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {act.label}
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400 font-medium mt-1">
                    {act.hint}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform">
                  <span>Proceed</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 3. CATEGORY CRAVINGS (DISH PHOTOS) */}
        <section className="py-10 max-w-none px-4 sm:px-8 md:px-12">
          <SectionHeading
            title="What's on your mind?"
            subtitle="Tap a craving to jump straight to it"
            href="/menu"
            cta="All Categories"
          />
          <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-none justify-start lg:justify-center">
            {CATEGORY_TILES.map((cat) => (
              <Link
                key={cat.id}
                href={`/menu?category=${cat.id}`}
                className="flex flex-col items-center gap-2 flex-shrink-0 group"
              >
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden shadow-md ring-2 ring-amber-500/20 group-hover:ring-amber-500 group-hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1 bg-stone-200 dark:bg-stone-800">
                  <Image
                    src={cat.image}
                    alt={cat.label}
                    fill
                    sizes="(max-width: 640px) 80px, 96px"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 group-hover:opacity-20 transition-opacity" />
                </div>
                <span className="text-xs font-black text-stone-800 dark:text-stone-200 tracking-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* 4. TOP PICKS RAIL */}
        <section className="py-10 max-w-none px-4 sm:px-8 md:px-12">
          <SectionHeading title="🔥 Top Picks Today" subtitle="Bestsellers ordered most by regulars" href="/menu" cta="See All" />
          <DishRail items={topPicks} loading={isLoadingDB && topPicks.length === 0} ariaLabel="Top picks" />
        </section>

        {/* 5. WHY US */}
        <section className="py-12 bg-stone-950 text-white px-4 sm:px-8 md:px-12">
          <div className="max-w-none space-y-6">
            <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-amber-500" /> Why Diners Keep Coming Back
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {TRUST_POINTS.map((pt) => (
                <div key={pt.title} className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="text-3xl">{pt.icon}</div>
                  <div className="font-extrabold text-sm text-stone-100">{pt.title}</div>
                  <div className="text-xs text-stone-400 font-medium">{pt.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. REVIEWS */}
        <section className="py-12 max-w-none px-4 sm:px-8 md:px-12">
          <SectionHeading title="❤️ Diner Reviews" subtitle="Real feedback from authentic food lovers across Hyderabad" />
          <ReviewSlider />
        </section>
      </main>

      {/* Offers & Coupons Dialog */}
      <Dialog open={offersOpen} onOpenChange={setOffersOpen}>
        <DialogContent className="max-w-md p-6 rounded-3xl bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-900 dark:text-white">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2">
              <Gift className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-black">
              Special Offers & Coupons 🎟️
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Copy coupon code and enter it during checkout to claim your discount.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4 max-h-[60vh] overflow-y-auto pr-1">
            {activeCoupons.length > 0 ? (
              activeCoupons.map((coupon) => {
                const copied = copiedCode === coupon.code;
                return (
                  <div
                    key={coupon.code}
                    className="bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/80 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-black text-amber-600 dark:text-amber-400 text-base">
                        {coupon.discount}% OFF
                      </div>
                      <div className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">
                        Code: <code className="font-black text-amber-700 dark:text-amber-300">{coupon.code}</code>
                      </div>
                      {coupon.minOrder > 1 && (
                        <div className="text-[11px] text-stone-400 font-medium mt-0.5">
                          Min. Order ₹{coupon.minOrder}
                        </div>
                      )}
                      {coupon.description && (
                        <div className="text-[11px] text-stone-500 truncate mt-0.5">
                          {coupon.description}
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      onClick={() => copyCode(coupon.code)}
                      className={`h-9 px-4 rounded-xl font-black text-xs transition-all shrink-0 ${
                        copied
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1" /> COPIED
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1" /> COPY CODE
                        </>
                      )}
                    </Button>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-stone-400 text-xs font-bold">
                No active coupon codes right now. Check back soon!
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
