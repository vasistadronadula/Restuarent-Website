'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowRight, Search, Star, Clock, MapPin, Phone,
  UtensilsCrossed, ShoppingBag, Copy, CheckCircle2, Tag,
  Truck, ShieldCheck, Utensils, X, Sparkles, Flame, Check,
} from 'lucide-react';

import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import DishRail from '@/components/customer/DishRail';
import DishListItem from '@/components/customer/DishListItem';
import ReviewSlider from '@/components/customer/ReviewSlider';
import { useAdmin } from '@/context/AdminContext';
import { useCoupons } from '@/lib/queries';
import { restaurantInfo } from '@/data/restaurantInfo';
import type { Category, VegStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=1200&q=80';

const CATEGORY_TILES = [
  { id: 'biryani', label: 'Biryani', emoji: '🍚', from: '#FFE0B2', to: '#FFCC80' },
  { id: 'starters', label: 'Starters', emoji: '🍗', from: '#FFCDD2', to: '#EF9A9A' },
  { id: 'tandoori', label: 'Tandoori', emoji: '🔥', from: '#FFCCBC', to: '#FFAB91' },
  { id: 'combos', label: 'Combos', emoji: '🎁', from: '#E1BEE7', to: '#CE93D8' },
  { id: 'south-indian', label: 'South', emoji: '🥘', from: '#FFF59D', to: '#FFEE58' },
  { id: 'north-indian', label: 'North', emoji: '🍛', from: '#C8E6C9', to: '#A5D6A7' },
  { id: 'chinese', label: 'Chinese', emoji: '🥡', from: '#B3E5FC', to: '#81D4FA' },
  { id: 'rice', label: 'Rice', emoji: '🍙', from: '#D7CCC8', to: '#BCAAA4' },
  { id: 'breads', label: 'Breads', emoji: '🫓', from: '#FFE082', to: '#FFD54F' },
  { id: 'desserts', label: 'Desserts', emoji: '🍮', from: '#F8BBD0', to: '#F48FB1' },
  { id: 'beverages', label: 'Drinks', emoji: '🥤', from: '#E0F7FA', to: '#B2EBF2' },
];

const PREVIEW_TABS: { id: Category | 'popular'; label: string }[] = [
  { id: 'popular', label: '🔥 Popular' },
  { id: 'biryani', label: 'Biryani' },
  { id: 'starters', label: 'Starters' },
  { id: 'tandoori', label: 'Tandoori' },
  { id: 'south-indian', label: 'South Indian' },
  { id: 'north-indian', label: 'North Indian' },
  { id: 'chinese', label: 'Chinese' },
  { id: 'desserts', label: 'Desserts' },
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
  const [previewTab, setPreviewTab] = useState<Category | 'popular'>('popular');
  const [vegFilter, setVegFilter] = useState<VegStatus | 'all'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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

  const previewDishes = useMemo(() => {
    let pool = menuItems;
    if (vegFilter !== 'all') {
      pool = pool.filter((i) => i.vegStatus === vegFilter);
    }
    if (previewTab === 'popular') {
      return pool.filter((i) => i.isPopular || i.isSpecial).slice(0, 8);
    }
    return pool.filter((i) => i.category === previewTab).slice(0, 8);
  }, [menuItems, previewTab, vegFilter]);

  const previewHref = useMemo(() => {
    const params = new URLSearchParams();
    if (previewTab !== 'popular') params.set('category', previewTab);
    if (vegFilter !== 'all') params.set('veg', vegFilter);
    const qs = params.toString();
    return qs ? `/menu?${qs}` : '/menu';
  }, [previewTab, vegFilter]);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 w-full max-w-full">
        {/* 1. HERO SECTION */}
        <section className="relative overflow-hidden bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 text-white py-10 lg:py-16 px-4 sm:px-8 md:px-12">
          <div className="max-w-none w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-7 space-y-5">
              {/* Status Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-xs font-bold text-stone-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Open Now · 7 AM – 11 PM · Madhapur, Hyderabad</span>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight tracking-tight">
                Hungry? Order authentic{' '}
                <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                  Telugu food
                </span>
              </h1>

              <p className="text-stone-300 text-sm sm:text-base max-w-xl font-medium leading-relaxed">
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
              <div className="relative w-full aspect-4/3 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                <Image
                  src={HERO_IMAGE}
                  alt="Pala Pitta Ruchulu Biryani"
                  fill
                  priority
                  className="object-cover"
                />
                <div className="absolute top-4 left-4 bg-amber-600 text-white font-black text-xs px-3 py-1 rounded-xl shadow-lg">
                  🏆 #1 Dum Biryani in Madhapur
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-3 rounded-2xl shadow-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold">
                  <Star className="w-5 h-5 fill-amber-500" />
                </div>
                <div>
                  <div className="font-black text-stone-900 dark:text-stone-100 text-sm">4.9 / 5.0</div>
                  <div className="text-[11px] text-stone-400 font-semibold">50,000+ Reviews</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. THREE WAYS TO EAT ACTION GRID */}
        <section className="max-w-none px-4 sm:px-8 md:px-12 -mt-6 relative z-20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: <ShoppingBag className="w-5 h-5 text-rose-600" />, label: 'Order Takeaway', hint: 'Ready in 30 mins', href: '/menu' },
              { icon: <UtensilsCrossed className="w-5 h-5 text-amber-600" />, label: 'Book a Table', hint: 'Dine in Madhapur', href: '/reservation' },
              { icon: <Phone className="w-5 h-5 text-emerald-600" />, label: 'Call to Order', hint: restaurantInfo.phoneDisplay, href: PHONE_HREF },
            ].map((act) => (
              <Link
                key={act.label}
                href={act.href}
                className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all flex items-center gap-3.5 group"
              >
                <div className="w-11 h-11 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                  {act.icon}
                </div>
                <div>
                  <div className="font-black text-sm text-stone-900 dark:text-stone-100">{act.label}</div>
                  <div className="text-xs text-stone-400 font-medium">{act.hint}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 3. CATEGORY CRAVINGS */}
        <section className="py-10 max-w-none px-4 sm:px-8 md:px-12">
          <SectionHeading
            title="What's on your mind?"
            subtitle="Tap a craving to jump straight to it"
            href="/menu"
            cta="All Categories"
          />
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none justify-start lg:justify-center">
            {CATEGORY_TILES.map((cat) => (
              <Link
                key={cat.id}
                href={`/menu?category=${cat.id}`}
                className="flex flex-col items-center gap-2 flex-shrink-0 group"
              >
                <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full flex items-center justify-center text-3xl shadow-md transition-transform group-hover:-translate-y-1" style={{ background: `linear-gradient(135deg, ${cat.from}, ${cat.to})` }}>
                  {cat.emoji}
                </div>
                <span className="text-xs font-black text-stone-800 dark:text-stone-200">{cat.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* 4. PROMO OFFERS */}
        {activeCoupons.length > 0 && (
          <section className="py-6 max-w-none px-4 sm:px-8 md:px-12">
            <SectionHeading title="Deals & Promo Offers" subtitle="Tap to copy discount coupon codes" />
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
              {activeCoupons.map((coupon) => {
                const copied = copiedCode === coupon.code;
                return (
                  <div
                    key={coupon.code}
                    className="flex-shrink-0 w-72 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                      <Tag className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-amber-700 dark:text-amber-400 text-sm">
                        {coupon.discount}% OFF
                        {coupon.minOrder > 1 && <span className="text-[10px] text-stone-500 ml-1 font-semibold">above ₹{coupon.minOrder}</span>}
                      </div>
                      <div className="text-xs text-stone-500 font-medium truncate mb-2">{coupon.description || 'Limited offer'}</div>
                      <button
                        type="button"
                        onClick={() => copyCode(coupon.code)}
                        className={`text-xs font-black px-3 py-1 rounded-lg border border-dashed flex items-center gap-1 transition-all ${
                          copied ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-stone-900 border-amber-600 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'COPIED' : coupon.code}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 5. TOP PICKS RAIL */}
        <section className="py-10 max-w-none px-4 sm:px-8 md:px-12">
          <SectionHeading title="🔥 Top Picks Today" subtitle="Bestsellers ordered most by regulars" href="/menu" cta="See All" />
          <DishRail items={topPicks} loading={isLoadingDB && topPicks.length === 0} ariaLabel="Top picks" />
        </section>

        {/* 6. EXPLORE MENU PREVIEW */}
        <section className="py-10 bg-stone-100/70 dark:bg-stone-900/50">
          <div className="max-w-none px-4 sm:px-8 md:px-12 space-y-4">
            <SectionHeading title="Explore Our Menu" subtitle={`${menuItems.length || '100'}+ authentic dishes cooked to order`} />

            <div className="flex flex-wrap gap-2">
              {(['all', 'veg', 'non-veg', 'egg'] as const).map((v) => (
                <Button
                  key={v}
                  variant={vegFilter === v ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVegFilter(v)}
                  className={`rounded-full text-xs font-bold capitalize ${vegFilter === v ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
                >
                  {v}
                </Button>
              ))}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {PREVIEW_TABS.map((tab) => (
                <Button
                  key={tab.id}
                  variant={previewTab === tab.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewTab(tab.id)}
                  className={`rounded-full text-xs font-bold whitespace-nowrap ${previewTab === tab.id ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900' : ''}`}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-4 shadow-sm">
              {previewDishes.map((dish, i) => (
                <DishListItem key={dish.id} item={dish} divider={i < previewDishes.length - 1} />
              ))}
            </div>

            <div className="text-center pt-2">
              <Button asChild className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl px-8 h-11 text-xs shadow-md">
                <Link href={previewHref} className="flex items-center gap-2">
                  See Full Menu <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* 7. WHY US */}
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

        {/* 8. REVIEWS */}
        <section className="py-12 max-w-none px-4 sm:px-8 md:px-12">
          <SectionHeading title="❤️ Diner Reviews" subtitle="Real feedback from authentic food lovers across Hyderabad" />
          <ReviewSlider />
        </section>
      </main>

      <Footer />
    </div>
  );
}
