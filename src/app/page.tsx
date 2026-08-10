'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowRight, Search, Star, Clock, Phone,
  UtensilsCrossed, ShoppingBag, Copy, Tag,
  ShieldCheck, X, Check, Gift, Leaf, Flame,
} from 'lucide-react';

import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import { Container } from '@/components/customer/Container';
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

const HERO_IMAGE = 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=1400&q=85';

const CATEGORY_TILES = [
  { id: 'biryani', label: 'Biryani', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200&auto=format&fit=crop&q=80' },
  { id: 'starters', label: 'Starters', image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=200&auto=format&fit=crop&q=80' },
  { id: 'tandoori', label: 'Tandoori', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=200&auto=format&fit=crop&q=80' },
  { id: 'combos', label: 'Combos', image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=200&auto=format&fit=crop&q=80' },
  { id: 'south-indian', label: 'South Indian', image: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=200&auto=format&fit=crop&q=80' },
  { id: 'north-indian', label: 'North Indian', image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200&auto=format&fit=crop&q=80' },
  { id: 'chinese', label: 'Chinese', image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=200&auto=format&fit=crop&q=80' },
  { id: 'rice', label: 'Rice', image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=200&auto=format&fit=crop&q=80' },
  { id: 'breads', label: 'Breads', image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=200&auto=format&fit=crop&q=80' },
  { id: 'desserts', label: 'Desserts', image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=200&auto=format&fit=crop&q=80' },
  { id: 'beverages', label: 'Drinks', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=200&auto=format&fit=crop&q=80' },
];

const QUICK_SEARCHES = ['Biryani', 'Starters', 'Tandoori', 'Combos'];

const TRUST_POINTS = [
  { icon: Flame, label: 'Slow-cooked dum biryani', desc: 'Copper handi, saffron, overnight marination' },
  { icon: Leaf, label: 'Fresh local ingredients', desc: 'No frozen meat, cold-pressed oil, freshly ground spices' },
  { icon: Clock, label: '30-min takeaway', desc: 'Prepared hot to order, sealed for travel' },
  { icon: ShieldCheck, label: '25 yrs family recipe', desc: 'Authentic Telangana & Rayalaseema tradition' },
];

const PHONE_HREF = `tel:${restaurantInfo.phone.replace(/\s/g, '')}`;

import { useAuthStore } from '@/store/useAuthStore';
import { getRoleHome, isStaffRole } from '@/lib/roleAccess';

export default function HomePage() {
  const router = useRouter();
  const { menuItems, isLoadingDB } = useAdmin();
  const { data: coupons = [] } = useCoupons();

  const user = useAuthStore((s) => s.user);
  const userRole = useAuthStore((s) => s.userRole);
  const authReady = useAuthStore((s) => s.authReady);
  const signingOut = useAuthStore((s) => s.signingOut);

  useEffect(() => {
    if (authReady && !signingOut && user && isStaffRole(userRole)) {
      router.replace(getRoleHome(userRole));
    }
  }, [authReady, signingOut, user, userRole, router]);

  const [query, setQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [offersOpen, setOffersOpen] = useState(false);

  const submitSearch = (term?: string) => {
    const q = (term ?? query).trim();
    if (!q) { router.push('/menu'); return; }
    router.push(`/menu?q=${encodeURIComponent(q)}`);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      toast.success(`Coupon ${code} copied!`);
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
    <div className="min-h-screen bg-white text-stone-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 w-full">

        {/* ── HERO ─────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-stone-900">
          {/* Full-bleed food photo */}
          <div className="absolute inset-0">
            <Image
              src={HERO_IMAGE}
              alt="Pala Pitta Ruchulu — Authentic Telugu Food"
              fill
              priority
              className="object-cover object-center"
            />
            {/* Warm dark overlay — left heavy for text, fades to transparent on right */}
            <div className="absolute inset-0 bg-gradient-to-r from-stone-950/85 via-stone-950/60 to-stone-950/25" />
          </div>

          <Container className="relative z-10 py-16 lg:py-24">
            <div className="max-w-xl space-y-6">

              {/* Status pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-medium text-stone-200">
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                Open Now · 12 PM – 11 PM · Madhapur
              </div>

              {/* H1 */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
                Authentic Telugu Food,<br className="hidden sm:block" /> Made Fresh Today
              </h1>

              {/* Social proof — compact inline row */}
              <div className="flex items-center gap-4 text-sm text-stone-300">
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-white">4.9</span>
                  <span>· 50K+ diners</span>
                </span>
                <span className="text-stone-500">·</span>
                <span>25 yrs family recipe</span>
                <span className="text-stone-500">·</span>
                <span>100+ dishes</span>
              </div>

              {/* Search box */}
              <div className="relative max-w-md">
                <form
                  onSubmit={(e) => { e.preventDefault(); submitSearch(); }}
                  className="flex items-center gap-2 bg-white rounded-xl px-4 h-12 shadow-lg"
                >
                  <Search className="w-4 h-4 text-stone-400 flex-shrink-0" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search dishes…"
                    className="border-none shadow-none focus-visible:ring-0 text-sm text-stone-900 placeholder:text-stone-400 h-full flex-1 p-0"
                  />
                  {query && (
                    <button type="button" onClick={() => setQuery('')} className="text-stone-400 hover:text-stone-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <Button
                    type="submit"
                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg px-4 h-8 text-sm"
                  >
                    Search
                  </Button>
                </form>

                {/* Instant search dropdown */}
                {query.trim().length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden z-50 max-h-72 overflow-y-auto">
                    {liveSearchResults.length > 0 ? (
                      <>
                        <div className="px-4 py-2 border-b border-stone-100 flex justify-between items-center">
                          <span className="text-xs font-medium text-stone-500">{liveSearchResults.length} results</span>
                          <button type="button" onClick={() => submitSearch()} className="text-xs font-medium text-amber-600 hover:underline">
                            See all →
                          </button>
                        </div>
                        {liveSearchResults.map((dish) => (
                          <Link
                            key={dish.id}
                            href={`/menu?q=${encodeURIComponent(dish.name)}`}
                            onClick={() => setQuery('')}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors border-b border-stone-50 last:border-none"
                          >
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-stone-100">
                              <Image
                                src={dish.image || 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=80&q=60'}
                                alt={dish.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-stone-900 truncate">{dish.name}</div>
                              <div className="text-xs text-stone-400 truncate">{dish.description}</div>
                            </div>
                            <div className="font-semibold text-stone-900 text-sm">₹{dish.price}</div>
                          </Link>
                        ))}
                      </>
                    ) : (
                      <div className="px-4 py-6 text-center text-stone-400 text-sm">
                        No dishes found for &quot;{query}&quot;
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quick search chips */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-stone-400 font-medium">Popular:</span>
                {QUICK_SEARCHES.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => submitSearch(term)}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 hover:bg-amber-600 text-stone-200 hover:text-white transition-colors border border-white/15"
                  >
                    {term}
                  </button>
                ))}
              </div>

              {/* Coupon offer — static banner, no pulse */}
              {user && activeCoupons.length > 0 && (
                <button
                  type="button"
                  onClick={() => setOffersOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-400/30 text-sm font-medium text-amber-200 hover:bg-amber-500/30 transition-colors"
                >
                  <Tag className="w-4 h-4 text-amber-400" />
                  Up to {Math.max(...activeCoupons.map((c) => c.discount))}% OFF — View Coupons
                </button>
              )}
            </div>
          </Container>
        </section>

        {/* ── 3 WAYS TO ORDER ─────────────────────────────────── */}
        <section className="bg-white border-b border-stone-100">
          <Container className="py-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  icon: <ShoppingBag className="w-5 h-5 text-amber-600" />,
                  label: 'Order Online Takeaway',
                  desc: 'Fresh & sealed, ready in 30 mins',
                  href: '/menu',
                  tag: 'Takeaway',
                },
                {
                  icon: <UtensilsCrossed className="w-5 h-5 text-amber-600" />,
                  label: 'Book a Table',
                  desc: 'Reserve your dining spot at Madhapur',
                  href: '/reservation',
                  tag: 'Dine-In',
                },
                {
                  icon: <Phone className="w-5 h-5 text-emerald-600" />,
                  label: 'Call to Order',
                  desc: restaurantInfo.phoneDisplay,
                  href: PHONE_HREF,
                  tag: 'Phone',
                },
              ].map((act) => (
                <Link
                  key={act.label}
                  href={act.href}
                  className="flex items-center gap-4 p-4 rounded-xl border border-stone-200 hover:border-amber-300 hover:bg-stone-50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-50 transition-colors">
                    {act.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-stone-900 group-hover:text-amber-700 transition-colors">{act.label}</div>
                    <div className="text-xs text-stone-500 mt-0.5">{act.desc}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-amber-600 transition-colors flex-shrink-0" />
                </Link>
              ))}
            </div>
          </Container>
        </section>

        {/* ── BROWSE BY CATEGORY ──────────────────────────────── */}
        <section className="py-12 bg-stone-50">
          <Container>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-stone-900">Browse by Category</h2>
                <p className="text-sm text-stone-500 mt-0.5">Tap a category to explore dishes</p>
              </div>
              <Link href="/menu" className="text-sm font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1">
                All dishes <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {CATEGORY_TILES.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/menu?category=${cat.id}`}
                  className="flex flex-col items-center gap-2 flex-shrink-0 group"
                >
                  <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-transparent group-hover:border-amber-500 transition-colors bg-stone-200">
                    <Image
                      src={cat.image}
                      alt={cat.label}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <span className="text-xs font-medium text-stone-700 group-hover:text-amber-700 transition-colors text-center leading-tight max-w-[72px]">
                    {cat.label}
                  </span>
                </Link>
              ))}
            </div>
          </Container>
        </section>

        {/* ── TOP PICKS ───────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <Container>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-stone-900">Top Picks</h2>
                <p className="text-sm text-stone-500 mt-0.5">Bestsellers ordered most by regulars</p>
              </div>
              <Link href="/menu" className="text-sm font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1">
                See all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <DishRail items={topPicks} loading={isLoadingDB && topPicks.length === 0} ariaLabel="Top picks" />
          </Container>
        </section>

        {/* ── WHY US — Clean 4-column icon row ───────────────── */}
        <section className="py-12 bg-stone-50 border-y border-stone-100">
          <Container>
            <h2 className="text-xl font-semibold text-stone-900 mb-8">Why Diners Keep Coming Back</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {TRUST_POINTS.map((pt) => {
                const Icon = pt.icon;
                return (
                  <div key={pt.label} className="flex flex-col gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-stone-900">{pt.label}</div>
                      <div className="text-xs text-stone-500 mt-1 leading-relaxed">{pt.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Container>
        </section>

        {/* ── REVIEWS ─────────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <Container>
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-stone-900">What Diners Say</h2>
              <p className="text-sm text-stone-500 mt-0.5">Real feedback from our guests across Hyderabad</p>
            </div>
            <ReviewSlider />
          </Container>
        </section>
      </main>

      {/* Coupons Dialog */}
      <Dialog modal={false} open={Boolean(user && offersOpen)} onOpenChange={setOffersOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl bg-white border-stone-200">
          <DialogHeader>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <Gift className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-semibold">Special Offers & Coupons</DialogTitle>
            <DialogDescription className="text-sm text-stone-500">
              Copy a coupon code and enter it at checkout to claim your discount.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4 max-h-[60vh] overflow-y-auto">
            {activeCoupons.length > 0 ? (
              activeCoupons.map((coupon) => {
                const copied = copiedCode === coupon.code;
                return (
                  <div
                    key={coupon.code}
                    className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-amber-600 text-base">{coupon.discount}% OFF</div>
                      <div className="text-sm text-stone-700 mt-0.5">
                        Code: <code className="font-mono font-semibold text-stone-900 bg-stone-100 px-1.5 py-0.5 rounded">{coupon.code}</code>
                      </div>
                      {coupon.minOrder > 1 && (
                        <div className="text-xs text-stone-400 mt-1">Min. order ₹{coupon.minOrder}</div>
                      )}
                      {coupon.description && (
                        <div className="text-xs text-stone-500 mt-0.5 truncate">{coupon.description}</div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      onClick={() => copyCode(coupon.code)}
                      className={`h-9 px-4 rounded-lg font-medium text-sm transition-all shrink-0 ${
                        copied
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-amber-600 hover:bg-amber-700 text-white'
                      }`}
                    >
                      {copied ? (
                        <><Check className="w-3.5 h-3.5 mr-1.5" /> Copied</>
                      ) : (
                        <><Copy className="w-3.5 h-3.5 mr-1.5" /> Copy</>
                      )}
                    </Button>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-stone-400 text-sm">
                No active coupons right now. Check back soon!
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
