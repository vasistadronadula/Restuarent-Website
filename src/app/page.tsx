'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Box, Container, Typography, Button, IconButton, InputBase, Skeleton } from '@mui/material';
import {
  ArrowForward, Search, Star, Schedule, LocationOn, Phone,
  TableRestaurant, ShoppingBag, ContentCopy, CheckCircle, LocalOffer,
  DeliveryDining, Verified, Restaurant, Close,
} from '@mui/icons-material';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import DishRail from '@/components/customer/DishRail';
import DishListItem from '@/components/customer/DishListItem';
import ReviewSlider from '@/components/customer/ReviewSlider';
import { useAdmin } from '@/context/AdminContext';
import { useGetCouponsQuery } from '@/store/supabaseApi';
import { restaurantInfo } from '@/data/restaurantInfo';
import type { Category, VegStatus } from '@/types';

/**
 * Storefront home page.
 *
 * Laid out the way food apps lay out a home screen, and for the same reason:
 * the job of this page is to get someone from "open" to "dish in cart" without
 * a detour. So the order is search → categories → offers → actual dishes, and
 * a real slice of the menu — with working ADD buttons — appears above the
 * fold-and-a-half rather than behind a link to another page.
 *
 * Everything below the search box reads from the live menu (`useAdmin`) and the
 * live `coupons` table, so nothing here can promise a dish the kitchen has
 * pulled or a discount code the till will reject.
 */

/* ─── Static content ────────────────────────────────────────────────────── */

const PHONE_HREF = 'tel:+917032682089';

/** Desktop hero photo. Unsplash is already allow-listed in next.config.ts. */
const HERO_IMAGE = 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=900&q=85';

/** Cycled through the search box's placeholder. Real dishes only. */
const SEARCH_HINTS = ['Dum Biryani', 'Kamju Pitta Fry', 'Natukodi Pulusu', 'Unlimited Combos', 'Tandoori'];

const QUICK_SEARCHES = ['Biryani', 'Kamju Pitta', 'Combos', 'Tandoori', 'Desserts'];

/**
 * The category circles. Ordered by how often people actually want them.
 *
 * `label` is written out rather than derived from `categoryLabels`: taking the
 * text before the "&" turns "Unlimited & Party Combos" into a circle labelled
 * "Unlimited", which names no food at all, and "Roties & Breads" into a
 * spelling mistake in 40px type on the home page.
 */
const CATEGORY_TILES: { id: Category; label: string; emoji: string; from: string; to: string }[] = [
  { id: 'biryani',       label: 'Biryani',   emoji: '🍚', from: '#FFE0E0', to: '#FFF3F0' },
  { id: 'starters',      label: 'Starters',  emoji: '🍗', from: '#FFE9D6', to: '#FFF6EC' },
  { id: 'combos',        label: 'Combos',    emoji: '🎉', from: '#EDE3FA', to: '#F7F1FE' },
  { id: 'south-indian',  label: 'Curries',   emoji: '🍲', from: '#E1F3E4', to: '#F1FAF2' },
  { id: 'tandoori',      label: 'Tandoori',  emoji: '🔥', from: '#FFE2DA', to: '#FFF2EE' },
  { id: 'breads',        label: 'Breads',    emoji: '🫓', from: '#F5E9DA', to: '#FCF6EF' },
  { id: 'desserts',      label: 'Desserts',  emoji: '🍮', from: '#F3E1F0', to: '#FBF2FA' },
  { id: 'beverages',     label: 'Drinks',    emoji: '🥤', from: '#DFF1F1', to: '#F1FAFA' },
];

/** Filter pills over the home page's menu preview. */
const PREVIEW_TABS: { id: Category | 'popular'; label: string }[] = [
  { id: 'popular',      label: '🔥 Bestsellers' },
  { id: 'biryani',      label: '🍚 Biryani' },
  { id: 'starters',     label: '🍗 Starters' },
  { id: 'combos',       label: '🎉 Combos' },
  { id: 'south-indian', label: '🍲 Curries' },
  { id: 'tandoori',     label: '🔥 Tandoori' },
];

const TRUST_POINTS = [
  { icon: '🏺', title: 'Authentic dum cooking', desc: 'Slow-cooked in brass handis with hand-ground spices.' },
  { icon: '🥛', title: 'Pure cow ghee', desc: 'Farm-fresh ghee in every dish — never a substitute.' },
  { icon: '✅', title: 'FSSAI certified kitchen', desc: 'Audited, hygienic, with traceable ingredients.' },
  { icon: '🛍️', title: '30-minute takeaway', desc: 'Order ahead and collect hot from Madhapur.' },
];

/** How many dishes the home preview lists before handing off to /menu. */
const PREVIEW_LIMIT = 8;

/* ─── Small shared bits ─────────────────────────────────────────────────── */

function SectionHeading({ title, subtitle, href, cta }: {
  title: string; subtitle?: string; href?: string; cta?: string;
}) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      gap: 2, mb: { xs: 2, md: 3 },
    }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="h2"
          sx={{
            fontWeight: 900,
            fontSize: { xs: '1.15rem', sm: '1.4rem', md: '1.65rem' },
            letterSpacing: '-0.02em',
            color: 'text.primary',
            lineHeight: 1.2,
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ color: 'text.secondary', fontSize: { xs: '12.5px', md: '13.5px' }, mt: 0.4 }}>
            {subtitle}
          </Typography>
        )}
      </Box>

      {href && cta && (
        <Button
          component={Link}
          href={href}
          endIcon={<ArrowForward sx={{ fontSize: 16 }} />}
          sx={{
            flexShrink: 0, color: 'primary.main', fontWeight: 800,
            fontSize: { xs: '12.5px', md: '13.5px' }, px: { xs: 1, md: 1.5 },
          }}
        >
          {cta}
        </Button>
      )}
    </Box>
  );
}

/** Shared horizontal-scroll behaviour: edge-to-edge on phones, no scrollbar. */
const railSx = {
  display: 'flex',
  gap: { xs: 1.5, md: 2 },
  overflowX: 'auto',
  overscrollBehaviorX: 'contain',
  scrollSnapType: 'x proximity',
  WebkitOverflowScrolling: 'touch',
  mx: { xs: -2.5, md: 0 },
  px: { xs: 2.5, md: 0 },
  pb: 1,
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': { display: 'none' },
} as const;

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function HomePage() {
  const router = useRouter();
  const { menuItems, isLoadingDB } = useAdmin();
  const { data: coupons = [] } = useGetCouponsQuery();

  const [query, setQuery] = useState('');
  const [hintIndex, setHintIndex] = useState(0);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<Category | 'popular'>('popular');
  const [vegFilter, setVegFilter] = useState<VegStatus | 'all'>('all');

  /* Live search instant matching */
  const liveSearchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return menuItems.filter((i) =>
      i.name.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q) ||
      (i.tags && i.tags.some((t) => t.toLowerCase().includes(q)))
    ).slice(0, 6);
  }, [query, menuItems]);

  /* Rotating placeholder — the one piece of motion that earns its keep, since
     it doubles as a hint about what this kitchen is actually known for. */
  useEffect(() => {
    const timer = setInterval(() => {
      setHintIndex((i) => (i + 1) % SEARCH_HINTS.length);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  const submitSearch = (term?: string) => {
    const q = (term ?? query).trim();
    router.push(q ? `/menu?q=${encodeURIComponent(q)}` : '/menu');
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`Code ${code} copied!`, { icon: '🎟️' });
      setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 2500);
    } catch {
      // Clipboard is blocked on insecure origins and in some in-app browsers —
      // showing the code is still enough to type it in at checkout.
      toast(`Use code ${code} at checkout`, { icon: '🎟️' });
    }
  };

  const activeCoupons = useMemo(
    () => coupons.filter((c) => c.isActive).slice(0, 6),
    [coupons],
  );

  const topPicks = useMemo(() => {
    const picks = menuItems.filter((i) => (i.isPopular || i.isSpecial) && i.isAvailable);
    return (picks.length > 0 ? picks : menuItems).slice(0, 12);
  }, [menuItems]);

  const previewDishes = useMemo(() => {
    let items = previewTab === 'popular'
      ? menuItems.filter((i) => i.isPopular || i.isSpecial)
      : menuItems.filter((i) => i.category === previewTab);

    if (vegFilter !== 'all') items = items.filter((i) => i.vegStatus === vegFilter);

    // Available dishes first — a sold-out row is still worth showing (it tells
    // you the dish exists) but it should never occupy a slot above one you can
    // actually order.
    return [...items]
      .sort((a, b) => Number(b.isAvailable) - Number(a.isAvailable))
      .slice(0, PREVIEW_LIMIT);
  }, [menuItems, previewTab, vegFilter]);

  /** Where "see everything" should land, carrying the filters already chosen. */
  const previewHref = useMemo(() => {
    const params = new URLSearchParams();
    if (previewTab !== 'popular') params.set('category', previewTab);
    if (vegFilter !== 'all') params.set('veg', vegFilter);
    const qs = params.toString();
    return qs ? `/menu?${qs}` : '/menu';
  }, [previewTab, vegFilter]);

  return (
    <>
      <Navbar />

      <Box component="main">

        {/* ═══════════════════════════════════════════════════════════════
            1 · HERO — one job: search, or tap a craving
        ═══════════════════════════════════════════════════════════════ */}
        <Box
          component="section"
          sx={{
            background: 'linear-gradient(160deg, #1A0808 0%, #3D0C0C 45%, #8E1010 100%)',
            color: 'white',
            pt: { xs: 3.5, md: 6 },
            pb: { xs: 4, md: 7 },
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box aria-hidden sx={{
            position: 'absolute', top: -180, right: -120,
            width: 520, height: 520, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,152,0,0.22) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <Container maxWidth="lg" sx={{ px: { xs: 2.5, md: 4 }, position: 'relative' }}>
            {/* Two columns on a wide screen. Left-aligned copy on its own left
                a third of a 1440px hero empty, which reads as a rendering
                fault rather than as breathing room. The photo only exists at
                md and up — on a phone it would push the search box, the one
                thing this section is for, below the fold. */}
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1.05fr 0.95fr' },
              gap: { md: 5 },
              alignItems: 'center',
            }}>
            <Box>
            {/* Status pill */}
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.8,
              bgcolor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: '50px', px: 1.5, py: 0.55, mb: { xs: 2, md: 2.5 },
            }}>
              <Box component="span" sx={{
                width: 7, height: 7, borderRadius: '50%', bgcolor: '#4CAF50',
                flexShrink: 0, boxShadow: '0 0 6px #4CAF50',
              }} />
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>
                Open now · 7 AM – 11 PM · Madhapur, Hyderabad
              </Typography>
            </Box>

            <Typography
              component="h1"
              sx={{
                fontSize: { xs: '1.85rem', sm: '2.4rem', md: '3rem' },
                fontWeight: 900,
                lineHeight: 1.12,
                letterSpacing: '-0.03em',
                mb: { xs: 1, md: 1.5 },
                maxWidth: 620,
              }}
            >
              Hungry? Order authentic{' '}
              <Box component="span" sx={{
                background: 'linear-gradient(90deg, #FFD54F, #FF9800)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Telugu food
              </Box>
            </Typography>

            <Typography sx={{
              color: 'rgba(255,255,255,0.72)',
              fontSize: { xs: '13.5px', md: '15px' },
              mb: { xs: 2.5, md: 3 },
              maxWidth: 520,
              lineHeight: 1.6,
            }}>
              25 years of Telangana &amp; Andhra cooking — dum biryani, kamju pitta fry,
              natukodi pulusu. Freshly made, ready for takeaway.
            </Typography>

            {/* Search. A real form with live instant results overlay */}
            <Box sx={{ position: 'relative', maxWidth: 620, zIndex: 10 }}>
              <Box
                component="form"
                onSubmit={(e: React.FormEvent) => { e.preventDefault(); submitSearch(); }}
                role="search"
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  bgcolor: 'white',
                  borderRadius: '16px',
                  p: { xs: 0.65, md: 0.8 },
                  pl: { xs: 1.75, md: 2.25 },
                  boxShadow: '0 14px 40px rgba(0,0,0,0.28)',
                }}
              >
                <Search sx={{ color: 'primary.main', fontSize: 22, flexShrink: 0 }} />
                <InputBase
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search for "${SEARCH_HINTS[hintIndex]}"`}
                  inputProps={{
                    'aria-label': 'Search the menu for a dish',
                    enterKeyHint: 'search',
                    autoComplete: 'off',
                  }}
                  sx={{
                    flex: 1, minWidth: 0,
                    fontSize: { xs: '14px', md: '15px' },
                    fontWeight: 500,
                    color: 'text.primary',
                  }}
                />
                {query && (
                  <IconButton size="small" onClick={() => setQuery('')} sx={{ color: 'text.secondary', p: 0.5 }}>
                    <Close fontSize="small" />
                  </IconButton>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  sx={{
                    flexShrink: 0,
                    borderRadius: '12px',
                    px: { xs: 2, md: 3 },
                    py: { xs: 1, md: 1.15 },
                    fontWeight: 800,
                    fontSize: { xs: '13px', md: '14px' },
                  }}
                >
                  Search
                </Button>
              </Box>

              {/* Instant Live Search Results Card */}
              {query.trim().length > 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0, right: 0,
                    bgcolor: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
                    border: '1px solid rgba(198,40,40,0.15)',
                    overflow: 'hidden',
                    maxHeight: 380,
                    overflowY: 'auto',
                  }}
                >
                  {liveSearchResults.length > 0 ? (
                    <>
                      <Box sx={{ px: 2, py: 1.2, bgcolor: '#FFF8F2', borderBottom: '1px solid #FFCCBC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#C62828' }}>
                          🎯 MATCHING DISHES ({liveSearchResults.length})
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', cursor: 'pointer', fontWeight: 700 }} onClick={() => submitSearch()}>
                          See all results →
                        </Typography>
                      </Box>
                      {liveSearchResults.map((dish) => (
                        <Box
                          key={dish.id}
                          component={Link}
                          href={`/menu?q=${encodeURIComponent(dish.name)}`}
                          onClick={() => setQuery('')}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            p: 1.5,
                            px: 2,
                            borderBottom: '1px solid rgba(0,0,0,0.05)',
                            textDecoration: 'none',
                            transition: 'background-color .15s ease',
                            '&:hover': { bgcolor: 'rgba(198,40,40,0.04)' },
                          }}
                        >
                          <Box
                            component="img"
                            src={dish.image || 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=100&q=80'}
                            alt={dish.name}
                            sx={{ width: 44, height: 44, borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
                          />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                              <Box className={dish.vegStatus === 'veg' ? 'veg-indicator' : 'non-veg-indicator'} />
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '13.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {dish.name}
                              </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '11.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {dish.description}
                            </Typography>
                          </Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'primary.main', flexShrink: 0 }}>
                            ₹{dish.price}
                          </Typography>
                        </Box>
                      ))}
                    </>
                  ) : (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography sx={{ fontSize: '1.8rem', mb: 0.5 }}>🔍</Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                        No dishes found for &quot;{query}&quot;
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                        Try searching for Biryani, Kamju Pitta, Starters or Tandoori
                      </Typography>
                      <Button size="small" variant="outlined" onClick={() => submitSearch()} sx={{ borderRadius: '10px', fontWeight: 700 }}>
                        Search full menu
                      </Button>
                    </Box>
                  )}
                </Box>
              )}
            </Box>

            {/* Popular searches — one tap straight into a filtered menu. */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
              <Typography sx={{
                fontSize: '12px', color: 'rgba(255,255,255,0.5)',
                fontWeight: 700, alignSelf: 'center', mr: 0.5,
              }}>
                Popular:
              </Typography>
              {QUICK_SEARCHES.map((term) => (
                <Box
                  key={term}
                  component="button"
                  type="button"
                  onClick={() => submitSearch(term)}
                  sx={{
                    font: 'inherit', cursor: 'pointer',
                    px: 1.4, py: 0.5,
                    borderRadius: '50px',
                    fontSize: '12px', fontWeight: 700,
                    color: 'rgba(255,255,255,0.85)',
                    bgcolor: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.16)',
                    transition: 'background-color .2s ease, color .2s ease',
                    '&:hover': { bgcolor: 'rgba(255,152,0,0.2)', color: '#FFD54F' },
                  }}
                >
                  {term}
                </Box>
              ))}
            </Box>

            {/* Proof strip. Four numbers, no cards — it is a caption, not a
                section, and it should not cost a screen of scrolling. */}
            <Box sx={{
              display: 'flex', flexWrap: 'wrap',
              gap: { xs: 2.5, md: 5 },
              mt: { xs: 3, md: 4 },
              pt: { xs: 2.5, md: 3 },
              borderTop: '1px solid rgba(255,255,255,0.1)',
            }}>
              {[
                { value: '4.9★', label: 'Rated by 50K+ diners' },
                { value: '30 min', label: 'Average takeaway' },
                { value: '100+', label: 'Dishes on the menu' },
                { value: '25 yrs', label: 'Of family recipes' },
              ].map((stat) => (
                <Box key={stat.label}>
                  <Typography sx={{
                    fontWeight: 900, color: '#FFD54F', lineHeight: 1,
                    fontSize: { xs: '1.15rem', md: '1.4rem' },
                  }}>
                    {stat.value}
                  </Typography>
                  <Typography sx={{
                    fontSize: { xs: '10.5px', md: '11.5px' },
                    color: 'rgba(255,255,255,0.55)', fontWeight: 600, mt: 0.35,
                  }}>
                    {stat.label}
                  </Typography>
                </Box>
              ))}
            </Box>
            </Box>

            {/* Right column: the food itself. `priority` because on a desktop
                hero this is the largest contentful paint, and unoptimised it
                is the slowest thing on the page. */}
            <Box sx={{ display: { xs: 'none', md: 'block' }, position: 'relative' }}>
              <Box sx={{
                position: 'relative',
                width: '100%',
                aspectRatio: '4 / 3',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <Image
                  src={HERO_IMAGE}
                  alt="Pala Pitta Ruchulu dum biryani"
                  fill
                  priority
                  sizes="(max-width: 900px) 1px, 560px"
                  style={{ objectFit: 'cover' }}
                />
                <Box aria-hidden sx={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(26,8,8,0.45) 0%, transparent 45%)',
                }} />
                <Box sx={{
                  position: 'absolute', top: 16, left: 16,
                  bgcolor: 'secondary.main', color: 'white',
                  px: 1.4, py: 0.5, borderRadius: '9px',
                  fontWeight: 800, fontSize: '11.5px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                }}>
                  🏆 #1 Dum Biryani in Madhapur
                </Box>
              </Box>

              {/* Floating proof card, overlapping the photo's lower-left. */}
              <Box sx={{
                position: 'absolute', bottom: -18, left: -18,
                bgcolor: 'white', borderRadius: '16px',
                px: 1.75, py: 1.25,
                display: 'flex', alignItems: 'center', gap: 1.25,
                boxShadow: '0 12px 34px rgba(0,0,0,0.28)',
              }}>
                <Box sx={{
                  width: 38, height: 38, borderRadius: '11px', flexShrink: 0,
                  bgcolor: 'rgba(255,152,0,0.14)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Star sx={{ color: 'secondary.main', fontSize: 21 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 900, fontSize: '14.5px', color: 'text.primary', lineHeight: 1.1 }}>
                    4.9 / 5.0
                  </Typography>
                  <Typography sx={{ fontSize: '11px', color: 'text.secondary', mt: 0.2 }}>
                    50,000+ reviews
                  </Typography>
                </Box>
              </Box>
            </Box>
            </Box>
          </Container>
        </Box>

        {/* ═══════════════════════════════════════════════════════════════
            2 · THREE WAYS TO EAT — the site's three real actions
        ═══════════════════════════════════════════════════════════════ */}
        <Container maxWidth="lg" sx={{ px: { xs: 2.5, md: 4 }, mt: { xs: -2.5, md: -3.5 }, position: 'relative', zIndex: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: { xs: 1.25, md: 2 } }}>
            {[
              { icon: <ShoppingBag />, label: 'Order takeaway', hint: 'Ready in 30 min', href: '/menu', tint: '#C62828' },
              { icon: <TableRestaurant />, label: 'Book a table', hint: 'Dine with us', href: '/reservation', tint: '#E65100' },
              { icon: <Phone />, label: 'Call to order', hint: restaurantInfo.phoneDisplay, href: PHONE_HREF, tint: '#2E7D32', external: true },
            ].map((action) => (
              <Box
                key={action.label}
                component={action.external ? 'a' : Link}
                href={action.href}
                sx={{
                  display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: 'center', gap: { xs: 0.75, sm: 1.5 },
                  textAlign: { xs: 'center', sm: 'left' },
                  p: { xs: 1.5, md: 2 },
                  bgcolor: 'white',
                  borderRadius: '18px',
                  border: '1px solid rgba(0,0,0,0.05)',
                  boxShadow: '0 8px 28px rgba(0,0,0,0.1)',
                  textDecoration: 'none',
                  transition: 'transform .2s ease, box-shadow .2s ease',
                  '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 14px 34px rgba(0,0,0,0.14)' },
                }}
              >
                <Box sx={{
                  width: { xs: 36, md: 44 }, height: { xs: 36, md: 44 },
                  borderRadius: '12px', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: `${action.tint}14`, color: action.tint,
                  '& .MuiSvgIcon-root': { fontSize: { xs: 19, md: 23 } },
                }}>
                  {action.icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{
                    fontWeight: 800, color: 'text.primary', lineHeight: 1.25,
                    fontSize: { xs: '11.5px', sm: '13.5px', md: '14.5px' },
                  }}>
                    {action.label}
                  </Typography>
                  <Typography sx={{
                    color: 'text.secondary', fontWeight: 600, lineHeight: 1.3,
                    fontSize: { xs: '10px', sm: '11.5px' },
                    display: { xs: 'none', sm: 'block' },
                  }}>
                    {action.hint}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Container>

        {/* ═══════════════════════════════════════════════════════════════
            3 · WHAT'S ON YOUR MIND — category circles
        ═══════════════════════════════════════════════════════════════ */}
        <Box component="section" sx={{ bgcolor: 'white', pt: { xs: 4, md: 6 }, pb: { xs: 2, md: 3 } }}>
          <Container maxWidth="lg" sx={{ px: { xs: 2.5, md: 4 } }}>
            <SectionHeading
              title="What's on your mind?"
              subtitle="Tap a craving to jump straight to it"
              href="/menu"
              cta="All"
            />

            <Box sx={railSx}>
              {CATEGORY_TILES.map((cat) => (
                <Box
                  key={cat.id}
                  component={Link}
                  href={`/menu?category=${cat.id}`}
                  sx={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                    width: { xs: 78, md: 96 }, flexShrink: 0,
                    scrollSnapAlign: 'start',
                    textDecoration: 'none',
                    '&:hover .cat-circle': { transform: 'translateY(-5px)', boxShadow: '0 12px 26px rgba(198,40,40,0.18)' },
                  }}
                >
                  <Box
                    className="cat-circle"
                    sx={{
                      width: { xs: 70, md: 88 }, height: { xs: 70, md: 88 },
                      borderRadius: '50%',
                      background: `linear-gradient(160deg, ${cat.from}, ${cat.to})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: { xs: '2rem', md: '2.5rem' },
                      lineHeight: 1,
                      boxShadow: '0 4px 14px rgba(0,0,0,0.07)',
                      transition: 'transform .25s cubic-bezier(0.34,1.56,0.64,1), box-shadow .25s ease',
                    }}
                  >
                    {cat.emoji}
                  </Box>
                  <Typography sx={{
                    fontWeight: 700, fontSize: { xs: '11px', md: '12.5px' },
                    color: 'text.primary', textAlign: 'center', lineHeight: 1.25,
                  }}>
                    {cat.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Container>
        </Box>

        {/* ═══════════════════════════════════════════════════════════════
            4 · OFFERS — only ever the coupons the till will actually honour
        ═══════════════════════════════════════════════════════════════ */}
        {activeCoupons.length > 0 && (
          <Box component="section" sx={{ bgcolor: 'white', py: { xs: 2, md: 3 } }}>
            <Container maxWidth="lg" sx={{ px: { xs: 2.5, md: 4 } }}>
              <SectionHeading title="Deals for you" subtitle="Tap a code to copy it, then use it at checkout" />

              <Box sx={railSx}>
                {activeCoupons.map((coupon) => {
                  const copied = copiedCode === coupon.code;
                  return (
                    <Box
                      key={coupon.code}
                      sx={{
                        width: { xs: 250, md: 300 }, flexShrink: 0,
                        scrollSnapAlign: 'start',
                        display: 'flex', alignItems: 'center', gap: 1.5,
                        p: { xs: 1.75, md: 2 },
                        borderRadius: '18px',
                        background: 'linear-gradient(135deg, #FFF3E0 0%, #FFF8F2 100%)',
                        border: '1px solid rgba(255,152,0,0.28)',
                      }}
                    >
                      <Box sx={{
                        width: 42, height: 42, flexShrink: 0, borderRadius: '12px',
                        bgcolor: 'secondary.main', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <LocalOffer sx={{ fontSize: 21 }} />
                      </Box>

                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontWeight: 900, fontSize: '15px', color: '#E65100', lineHeight: 1.2 }}>
                          {coupon.discount}% OFF
                          {/* `> 1`, not `> 0`: a ₹1 minimum is how "no minimum"
                              gets stored, and rendering it as "above ₹1" reads
                              like a bug rather than a condition. */}
                          {coupon.minOrder > 1 && (
                            <Box component="span" sx={{ fontSize: '11px', fontWeight: 700, color: 'text.secondary', ml: 0.75 }}>
                              above ₹{coupon.minOrder}
                            </Box>
                          )}
                        </Typography>
                        <Typography sx={{
                          fontSize: '11.5px', color: 'text.secondary', mb: 0.75,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {coupon.description || 'Limited period offer'}
                        </Typography>

                        <Box
                          component="button"
                          type="button"
                          onClick={() => copyCode(coupon.code)}
                          aria-label={`Copy coupon code ${coupon.code}`}
                          sx={{
                            font: 'inherit', cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 0.6,
                            px: 1.2, py: 0.4,
                            borderRadius: '8px',
                            border: '1.5px dashed',
                            borderColor: copied ? 'success.main' : 'rgba(198,40,40,0.5)',
                            bgcolor: copied ? 'rgba(46,125,50,0.08)' : 'white',
                            color: copied ? 'success.main' : 'primary.main',
                            fontWeight: 900, fontSize: '12px', letterSpacing: 0.8,
                            transition: 'all .2s ease',
                          }}
                        >
                          {copied ? <CheckCircle sx={{ fontSize: 13 }} /> : <ContentCopy sx={{ fontSize: 12 }} />}
                          {copied ? 'COPIED' : coupon.code}
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Container>
          </Box>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            5 · TOP PICKS — swipeable, every card can add to the cart
        ═══════════════════════════════════════════════════════════════ */}
        <Box component="section" sx={{ bgcolor: 'white', py: { xs: 3, md: 5 } }}>
          <Container maxWidth="lg" sx={{ px: { xs: 2.5, md: 4 } }}>
            <SectionHeading
              title="🔥 Top picks today"
              subtitle="What our regulars order most"
              href="/menu"
              cta="See all"
            />
            <DishRail items={topPicks} loading={isLoadingDB && topPicks.length === 0} ariaLabel="Top picks today" />
          </Container>
        </Box>

        {/* ═══════════════════════════════════════════════════════════════
            6 · THE MENU, ON THE HOME PAGE

            The section this redesign exists for. A phone previously got a
            one-dish-at-a-time carousel here and had to leave the page to see
            anything else; now it gets the real menu — filterable, with working
            ADD buttons — and only leaves when it wants the whole list.
        ═══════════════════════════════════════════════════════════════ */}
        <Box component="section" sx={{ bgcolor: '#FFF8F2', py: { xs: 4, md: 6 } }}>
          <Container maxWidth="lg" sx={{ px: { xs: 2.5, md: 4 } }}>
            <SectionHeading
              title="Explore the menu"
              subtitle={`${menuItems.length || '100'}+ dishes, cooked to order`}
            />

            {/* Veg / non-veg. Kept as its own row above the category pills
                because it is the filter people reach for first, and in India
                it is often non-negotiable rather than a preference. */}
            <Box sx={{ display: 'flex', gap: 1, mb: 1.75, flexWrap: 'wrap' }}>
              {([
                { id: 'all', label: 'All', color: '#424242' },
                { id: 'veg', label: 'Veg', color: '#2E7D32' },
                { id: 'non-veg', label: 'Non-veg', color: '#C62828' },
                { id: 'egg', label: 'Egg', color: '#F57C00' },
              ] as const).map((option) => {
                const selected = vegFilter === option.id;
                return (
                  <Box
                    key={option.id}
                    component="button"
                    type="button"
                    onClick={() => setVegFilter(option.id)}
                    aria-pressed={selected}
                    sx={{
                      font: 'inherit', cursor: 'pointer',
                      px: 1.75, py: 0.7,
                      borderRadius: '50px',
                      fontSize: '12.5px', fontWeight: 700,
                      border: '1.5px solid',
                      borderColor: selected ? option.color : 'rgba(0,0,0,0.12)',
                      bgcolor: selected ? option.color : 'white',
                      color: selected ? 'white' : option.color,
                      boxShadow: selected ? `0 4px 14px ${option.color}40` : '0 1px 4px rgba(0,0,0,0.05)',
                      transition: 'all .2s ease',
                    }}
                  >
                    {option.label}
                  </Box>
                );
              })}
            </Box>

            {/* Category pills */}
            <Box sx={{ ...railSx, gap: 1, mb: { xs: 1, md: 1.5 } }}>
              {PREVIEW_TABS.map((tab) => {
                const selected = previewTab === tab.id;
                return (
                  <Box
                    key={tab.id}
                    component="button"
                    type="button"
                    onClick={() => setPreviewTab(tab.id)}
                    aria-pressed={selected}
                    sx={{
                      font: 'inherit', cursor: 'pointer', flexShrink: 0,
                      scrollSnapAlign: 'start',
                      px: 1.75, py: 0.75,
                      borderRadius: '50px',
                      fontSize: '12.5px', fontWeight: 700, whiteSpace: 'nowrap',
                      border: '1px solid',
                      borderColor: selected ? 'primary.main' : 'rgba(0,0,0,0.08)',
                      bgcolor: selected ? 'primary.main' : 'white',
                      color: selected ? 'white' : 'text.secondary',
                      boxShadow: selected ? '0 4px 14px rgba(198,40,40,0.3)' : '0 1px 4px rgba(0,0,0,0.05)',
                      transition: 'all .2s ease',
                    }}
                  >
                    {tab.label}
                  </Box>
                );
              })}
            </Box>

            {/* The list itself */}
            <Box sx={{
              bgcolor: 'white',
              borderRadius: '20px',
              px: { xs: 2, sm: 3 },
              py: { xs: 0.5, sm: 1 },
              border: '1px solid rgba(0,0,0,0.05)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.05)',
            }}>
              {isLoadingDB && menuItems.length === 0 ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 2, py: 2.5, borderBottom: i < 3 ? '1px dashed rgba(0,0,0,0.1)' : 'none' }}>
                    <Box sx={{ flex: 1 }}>
                      <Skeleton width="30%" height={16} />
                      <Skeleton width="70%" height={24} />
                      <Skeleton width="25%" height={20} />
                      <Skeleton width="95%" height={16} />
                    </Box>
                    <Skeleton variant="rounded" sx={{ width: { xs: 112, sm: 132 }, aspectRatio: '1 / 1', borderRadius: '16px', flexShrink: 0 }} />
                  </Box>
                ))
              ) : previewDishes.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>🍽️</Typography>
                  <Typography sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
                    Nothing matches that combination
                  </Typography>
                  <Typography sx={{ fontSize: '13px', color: 'text.secondary', mb: 2 }}>
                    Try another category, or clear the veg filter.
                  </Typography>
                  <Button
                    onClick={() => { setPreviewTab('popular'); setVegFilter('all'); }}
                    variant="outlined"
                    sx={{ borderRadius: '12px', fontWeight: 700 }}
                  >
                    Reset filters
                  </Button>
                </Box>
              ) : (
                previewDishes.map((dish, i) => (
                  <DishListItem key={dish.id} item={dish} divider={i < previewDishes.length - 1} />
                ))
              )}
            </Box>

            <Box sx={{ textAlign: 'center', mt: { xs: 2.5, md: 3.5 } }}>
              <Button
                component={Link}
                href={previewHref}
                variant="contained"
                endIcon={<ArrowForward />}
                sx={{
                  borderRadius: '14px',
                  px: { xs: 3, md: 4 }, py: 1.35,
                  fontWeight: 800, fontSize: { xs: '14px', md: '15px' },
                  boxShadow: '0 8px 24px rgba(198,40,40,0.3)',
                }}
              >
                See the full menu
              </Button>
            </Box>
          </Container>
        </Box>

        {/* ═══════════════════════════════════════════════════════════════
            7 · WHY US — four claims, one row, no scrolling tax
        ═══════════════════════════════════════════════════════════════ */}
        <Box component="section" sx={{ bgcolor: '#1A0808', color: 'white', py: { xs: 4, md: 6 } }}>
          <Container maxWidth="lg" sx={{ px: { xs: 2.5, md: 4 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: { xs: 2.5, md: 3.5 } }}>
              <Verified sx={{ color: 'secondary.main', fontSize: 22 }} />
              <Typography component="h2" sx={{
                fontWeight: 900, fontSize: { xs: '1.15rem', md: '1.5rem' },
                letterSpacing: '-0.02em',
              }}>
                Why people keep coming back
              </Typography>
            </Box>

            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
              gap: { xs: 1.5, md: 2.5 },
            }}>
              {TRUST_POINTS.map((point) => (
                <Box
                  key={point.title}
                  sx={{
                    p: { xs: 1.75, md: 2.5 },
                    borderRadius: '18px',
                    bgcolor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    transition: 'background-color .25s ease, border-color .25s ease',
                    '&:hover': { bgcolor: 'rgba(255,152,0,0.08)', borderColor: 'rgba(255,152,0,0.22)' },
                  }}
                >
                  <Typography sx={{ fontSize: { xs: '1.5rem', md: '1.85rem' }, mb: 1 }}>{point.icon}</Typography>
                  <Typography sx={{
                    fontWeight: 800, color: 'white', mb: 0.5,
                    fontSize: { xs: '12.5px', md: '14px' }, lineHeight: 1.3,
                  }}>
                    {point.title}
                  </Typography>
                  <Typography sx={{
                    color: 'rgba(255,255,255,0.6)', lineHeight: 1.5,
                    fontSize: { xs: '11px', md: '12.5px' },
                  }}>
                    {point.desc}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Container>
        </Box>

        {/* ═══════════════════════════════════════════════════════════════
            8 · REVIEWS
        ═══════════════════════════════════════════════════════════════ */}
        <Box component="section" sx={{ bgcolor: 'white', py: { xs: 4, md: 6 } }}>
          <Container maxWidth="lg" sx={{ px: { xs: 2.5, md: 4 } }}>
            <SectionHeading
              title="❤️ What our customers say"
              subtitle="Real reviews from food lovers across Hyderabad"
            />
            <ReviewSlider />
          </Container>
        </Box>

        {/* ═══════════════════════════════════════════════════════════════
            9 · VISIT US — the practical details, then one last way in
        ═══════════════════════════════════════════════════════════════ */}
        <Box component="section" sx={{ bgcolor: '#FFF8F2', py: { xs: 4, md: 6 }, borderTop: '1px solid rgba(198,40,40,0.08)' }}>
          <Container maxWidth="lg" sx={{ px: { xs: 2.5, md: 4 } }}>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' },
              gap: { xs: 3, md: 5 },
              alignItems: 'center',
            }}>
              <Box>
                <Typography component="h2" sx={{
                  fontWeight: 900, letterSpacing: '-0.02em', mb: 1.5,
                  fontSize: { xs: '1.35rem', md: '1.8rem' },
                }}>
                  Come eat with us in Madhapur
                </Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: { xs: '13.5px', md: '14.5px' }, mb: 2.5, lineHeight: 1.65 }}>
                  Family lunches, office orders, late dinners — walk in, book ahead,
                  or order for takeaway and collect it hot.
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mb: 3 }}>
                  {[
                    { icon: <LocationOn />, text: restaurantInfo.addressLine },
                    { icon: <Schedule />, text: 'Open every day, 7 AM – 11 PM' },
                    { icon: <Phone />, text: restaurantInfo.phoneDisplay },
                    { icon: <DeliveryDining />, text: 'Also on Swiggy & Zomato' },
                  ].map((row, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <Box sx={{
                        width: 32, height: 32, borderRadius: '10px', flexShrink: 0,
                        bgcolor: 'rgba(198,40,40,0.08)', color: 'primary.main',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        '& .MuiSvgIcon-root': { fontSize: 17 },
                      }}>
                        {row.icon}
                      </Box>
                      <Typography sx={{ fontSize: { xs: '13px', md: '13.5px' }, fontWeight: 600, color: 'text.primary' }}>
                        {row.text}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
                  <Button
                    component={Link}
                    href="/menu"
                    variant="contained"
                    endIcon={<ArrowForward />}
                    sx={{ borderRadius: '14px', px: 3, py: 1.3, fontWeight: 800 }}
                  >
                    Order online
                  </Button>
                  <Button
                    component={Link}
                    href="/reservation"
                    variant="outlined"
                    startIcon={<TableRestaurant />}
                    sx={{
                      borderRadius: '14px', px: 2.75, py: 1.3, fontWeight: 700,
                      borderColor: 'primary.main', color: 'primary.main',
                    }}
                  >
                    Book a table
                  </Button>
                  <IconButton
                    component="a"
                    href={PHONE_HREF}
                    aria-label={`Call ${restaurantInfo.phoneDisplay}`}
                    sx={{
                      border: '1px solid rgba(198,40,40,0.3)', color: 'primary.main',
                      borderRadius: '14px', px: 2,
                    }}
                  >
                    <Phone />
                  </IconButton>
                </Box>
              </Box>

              {/* Restaurant card — deliberately illustrative rather than a photo
                  slot, so it can never render a broken remote image. */}
              <Box sx={{
                borderRadius: '24px',
                p: { xs: 3, md: 4 },
                background: 'linear-gradient(150deg, #1A0808 0%, #8E1010 100%)',
                color: 'white',
                textAlign: 'center',
                boxShadow: '0 18px 50px rgba(26,8,8,0.35)',
              }}>
                <Restaurant sx={{ fontSize: { xs: 40, md: 52 }, color: 'secondary.main', mb: 1.5 }} />
                <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.2rem', md: '1.5rem' }, mb: 0.75 }}>
                  {restaurantInfo.name}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', mb: 2.5 }}>
                  {restaurantInfo.tagline}
                </Typography>
                <Box sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.75,
                  bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '50px', px: 2, py: 0.75,
                }}>
                  <Star sx={{ color: '#FFD54F', fontSize: 17 }} />
                  <Typography sx={{ fontWeight: 800, fontSize: '13px' }}>
                    4.9 · 50,000+ happy diners
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Container>
        </Box>

      </Box>

      <Footer />
    </>
  );
}
