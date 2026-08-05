'use client';

import React, { Suspense, useMemo, useState } from 'react';
import {
  Box, Container, Typography, Grid, Chip, Button, TextField, InputAdornment,
  Slider, FormControl, Select, MenuItem as MuiMenuItem, InputLabel, Paper,
  CircularProgress, useMediaQuery,
} from '@mui/material';
import { Search, Tune, Clear, TrendingUp, Star, FilterList } from '@mui/icons-material';
import { useSearchParams } from 'next/navigation';

import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import MenuCard from '@/components/customer/MenuCard';
import DishListItem from '@/components/customer/DishListItem';
import { categoryLabels } from '@/data/menuData';
import { useAdmin } from '@/context/AdminContext';
import { Category, VegStatus } from '@/types';

const categories: (Category | 'all')[] = [
  'all', 'combos', 'starters', 'tandoori', 'biryani', 'south-indian',
  'rice', 'breads', 'desserts', 'beverages',
];

const categoryEmojis: Record<string, string> = {
  all: '🍽️', combos: '🎉', starters: '🥗', 'south-indian': '🥘',
  biryani: '🍚', tandoori: '🔥', rice: '🍚', breads: '🫓',
  desserts: '🍮', beverages: '🥤',
};

type SortOption = 'popular' | 'price-asc' | 'price-desc' | 'rating';

const VEG_OPTIONS: VegStatus[] = ['veg', 'non-veg', 'egg'];

const isCategory = (value: string | null): value is Category =>
  value !== null && value !== 'all' && (categories as string[]).includes(value);

const isVegStatus = (value: string | null): value is VegStatus =>
  value !== null && (VEG_OPTIONS as string[]).includes(value);

function MenuBrowser() {
  const { menuItems: liveMenuItems, isLoadingDB } = useAdmin();
  const searchParams = useSearchParams();

  /**
   * The home page's category circles, the hero search box and the footer all
   * link in here with their choice in the query string. Until now none of that
   * arrived: this page opened on "All items" no matter what the link said, so
   * every one of those entry points quietly dropped the thing the customer had
   * just tapped. Params seed the state, and an effect re-seeds it when a link
   * changes them on a page that is already mounted — a Link to the same route
   * does not remount the component, so the initialiser alone is not enough.
   */
  const categoryParam = searchParams.get('category');
  const queryParam = searchParams.get('q');
  const vegParam = searchParams.get('veg');

  const [searchQuery, setSearchQuery] = useState(queryParam ?? '');
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>(
    isCategory(categoryParam) ? categoryParam : 'all',
  );
  const [vegFilter, setVegFilter] = useState<VegStatus | 'all'>(
    isVegStatus(vegParam) ? vegParam : 'all',
  );
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [showFilters, setShowFilters] = useState(false);

  /**
   * Re-seed during render when — and only when — the query string itself
   * changes. This is React's "adjusting state when a prop changes" pattern
   * rather than an effect: an effect would repaint the old filters first and
   * the corrected ones a frame later, and the eslint rule that forbids it is
   * right to. Typing in the search box or tapping a pill moves local state
   * without touching the URL, so none of that trips this.
   */
  const [syncedParams, setSyncedParams] = useState(
    () => ({ categoryParam, queryParam, vegParam }),
  );
  if (
    syncedParams.categoryParam !== categoryParam ||
    syncedParams.queryParam !== queryParam ||
    syncedParams.vegParam !== vegParam
  ) {
    setSyncedParams({ categoryParam, queryParam, vegParam });
    setActiveCategory(isCategory(categoryParam) ? categoryParam : 'all');
    setSearchQuery(queryParam ?? '');
    setVegFilter(isVegStatus(vegParam) ? vegParam : 'all');
  }

  /**
   * Phones get a list, laptops get the card grid.
   *
   * Two cards per row on a 360px screen leaves each dish ~150px — enough for a
   * photo and a truncated name, and nothing else. The list gives the name and
   * description the full width and keeps the photo legible, which is the whole
   * reason delivery apps use rows on phones. `noSsr` picks the layout on the
   * client so the server never renders one and hydrates into the other.
   */
  const isPhone = useMediaQuery('(max-width:899.95px)', { noSsr: true });

  const filtered = useMemo(() => {
    let items = [...liveMenuItems];
    if (activeCategory !== 'all') {
      items = items.filter((i) => i.category === activeCategory);
    }
    if (vegFilter !== 'all') {
      items = items.filter((i) => i.vegStatus === vegFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    items = items.filter((i) => i.price >= priceRange[0] && i.price <= priceRange[1]);
    switch (sortBy) {
      case 'popular':    items.sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0)); break;
      case 'price-asc':  items.sort((a, b) => a.price - b.price); break;
      case 'price-desc': items.sort((a, b) => b.price - a.price); break;
      case 'rating':     items.sort((a, b) => b.rating - a.rating); break;
    }
    return items;
  }, [liveMenuItems, searchQuery, activeCategory, vegFilter, priceRange, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setActiveCategory('all');
    setVegFilter('all');
    setPriceRange([0, 1000]);
    setSortBy('popular');
  };

  const activeFilterCount = [
    searchQuery.trim() ? 1 : 0,
    activeCategory !== 'all' ? 1 : 0,
    vegFilter !== 'all' ? 1 : 0,
    (priceRange[0] > 0 || priceRange[1] < 1000) ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const hasAnyFilter = activeFilterCount > 0;

  return (
    <>
      <Navbar />

      {/* ─── Hero Banner ───────────────────────────────── */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #C62828 0%, #8E0000 50%, #1A0A0A 100%)',
          py: { xs: 3, md: 5 },
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: '-40%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: { xs: 300, md: 600 },
            height: { xs: 300, md: 600 },
            background: 'radial-gradient(circle, rgba(255,152,0,0.22) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Chip
            label={`🍽️ ${liveMenuItems.length || '100'}+ AUTHENTIC DISHES`}
            sx={{
              bgcolor: 'rgba(255,255,255,0.12)',
              color: '#FFD54F',
              fontWeight: 800,
              letterSpacing: 0.8,
              fontSize: '11px',
              mb: 1.5,
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,213,79,0.3)',
            }}
          />
          <Typography
            variant="h1"
            sx={{
              fontWeight: 900,
              color: 'white',
              fontSize: { xs: '1.7rem', md: '2.6rem' },
              mb: 0.75,
              letterSpacing: '-0.02em',
            }}
          >
            Our{' '}
            <Box
              component="span"
              sx={{
                background: 'linear-gradient(90deg, #FFD54F, #FF9800)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Royal
            </Box>{' '}
            Menu
          </Typography>
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.75)',
              fontSize: { xs: '0.85rem', md: '1rem' },
              maxWidth: 520,
              mx: 'auto',
              lineHeight: 1.6,
              px: 2,
            }}
          >
            Every dish cooked to order, with the same recipes we&apos;ve used for 25 years.
          </Typography>
        </Box>
      </Box>

      {/* The background is pinned here rather than inherited from <body>: the
          sticky filter rail below paints its own background to hide the list
          scrolling underneath, and the two have to be the same colour. Which
          rule wins on <body> — globals.css or CssBaseline — is a cascade
          detail, and a sticky bar is not the place to find out. */}
      <Box sx={{ bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 4 }, px: { xs: 2, sm: 3 } }}>

        {/* ─── Search + Sort Row ─────────────────────────── */}
        <Box sx={{ display: 'flex', gap: { xs: 1.5, md: 2 }, mb: 2.5, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search dishes, ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flex: 1, minWidth: { xs: '100%', sm: 200 } }}
            slotProps={{
              htmlInput: { 'aria-label': 'Search the menu', enterKeyHint: 'search' },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: '#C62828' }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <Clear
                      sx={{ cursor: 'pointer', color: '#9E9E9E', '&:hover': { color: '#C62828' }, transition: 'color 0.2s' }}
                      onClick={() => setSearchQuery('')}
                    />
                  </InputAdornment>
                ) : null,
              },
            }}
          />
          <FormControl sx={{ flex: { xs: 1, sm: 'none' }, minWidth: { xs: 0, sm: 160 } }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <MuiMenuItem value="popular"><TrendingUp sx={{ mr: 1, fontSize: 18 }} /> Popular</MuiMenuItem>
              <MuiMenuItem value="rating"><Star sx={{ mr: 1, fontSize: 18 }} /> Top Rated</MuiMenuItem>
              <MuiMenuItem value="price-asc">Price: Low → High</MuiMenuItem>
              <MuiMenuItem value="price-desc">Price: High → Low</MuiMenuItem>
            </Select>
          </FormControl>
          <Button
            variant={showFilters ? 'contained' : 'outlined'}
            color="primary"
            startIcon={<Tune />}
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            sx={{
              borderRadius: '12px',
              fontWeight: 700,
              borderColor: '#C62828',
              color: showFilters ? 'white' : '#C62828',
              position: 'relative',
              flexShrink: 0,
              '&:hover': { borderColor: '#C62828' },
            }}
          >
            Filters
            {activeFilterCount > 0 && (
              <Box
                sx={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  bgcolor: '#FF9800',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {activeFilterCount}
              </Box>
            )}
          </Button>
        </Box>

        {/* ─── Advanced Filters Panel ─────────────────────── */}
        {showFilters && (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, md: 3 },
              mb: 2.5,
              borderRadius: '20px',
              border: '1.5px solid rgba(198,40,40,0.1)',
              background: 'linear-gradient(135deg, #FFF8F2 0%, #FFFFFF 100%)',
              boxShadow: '0 8px 32px rgba(198,40,40,0.06)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterList sx={{ color: '#C62828', fontSize: 20 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#212121' }}>
                  Advanced Filters
                </Typography>
              </Box>
              <Button
                size="small"
                onClick={resetFilters}
                startIcon={<Clear />}
                sx={{ color: '#C62828', fontWeight: 700 }}
              >
                Reset All
              </Button>
            </Box>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 700, display: 'block', mb: 1.5, letterSpacing: 0.5 }}
              >
                PRICE RANGE: ₹{priceRange[0]} – ₹{priceRange[1]}
              </Typography>
              <Slider
                value={priceRange}
                onChange={(_, v) => setPriceRange(v as [number, number])}
                min={0}
                max={1000}
                step={10}
                sx={{
                  color: '#C62828',
                  '& .MuiSlider-thumb': { boxShadow: '0 4px 12px rgba(198,40,40,0.35)' },
                  '& .MuiSlider-track': { background: 'linear-gradient(90deg, #C62828, #FF9800)', border: 'none' },
                }}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `₹${v}`}
                getAriaLabel={(index) => (index === 0 ? 'Minimum price' : 'Maximum price')}
              />
            </Box>
          </Paper>
        )}

        {/* ─── Sticky filter rail ─────────────────────────────
            Veg preference and category, pinned under the navbar. On a 100-dish
            list these are the controls you reach for *after* scrolling, and
            scrolling back to the top to change one is the single most annoying
            thing a long menu can ask of you. */}
        <Box
          sx={{
            position: 'sticky',
            top: { xs: 60, md: 68 },
            zIndex: 5,
            bgcolor: 'background.default',
            mx: { xs: -2, sm: -3 },
            px: { xs: 2, sm: 3 },
            pt: 1.5,
            pb: 1,
            mb: 2,
            borderBottom: '1px solid rgba(198,40,40,0.08)',
          }}
        >
          {/* Veg / non-veg / egg */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25, flexWrap: 'wrap' }}>
            {([
              { id: 'all', label: '🍽️ All', color: '#424242' },
              { id: 'veg', label: 'Veg', color: '#2E7D32', marker: 'veg' },
              { id: 'non-veg', label: 'Non-Veg', color: '#C62828', marker: 'non-veg' },
              { id: 'egg', label: '🥚 Egg', color: '#F57C00' },
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
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.7,
                    px: { xs: 1.5, md: 2 },
                    py: { xs: 0.7, md: 0.85 },
                    borderRadius: '50px',
                    border: '2px solid',
                    borderColor: selected ? option.color : 'rgba(0,0,0,0.12)',
                    bgcolor: selected ? option.color : 'white',
                    color: selected ? 'white' : option.color,
                    fontWeight: 700,
                    fontSize: { xs: '12px', md: '13px' },
                    cursor: 'pointer',
                    font: 'inherit',
                    transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                    boxShadow: selected ? `0 4px 16px ${option.color}45` : '0 1px 4px rgba(0,0,0,0.06)',
                    '&:active': { transform: 'scale(0.97)' },
                  }}
                >
                  {/* The FSSAI square/triangle, inverted when the pill is filled. */}
                  {'marker' in option && option.marker && (
                    <Box
                      sx={{
                        width: 14, height: 14,
                        border: `2px solid ${selected ? 'white' : option.color}`,
                        borderRadius: '3px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {option.marker === 'veg' ? (
                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: selected ? 'white' : option.color }} />
                      ) : (
                        <Box
                          component="span"
                          sx={{
                            display: 'block', width: 0, height: 0,
                            borderLeft: '4px solid transparent',
                            borderRight: '4px solid transparent',
                            borderBottom: `6px solid ${selected ? 'white' : option.color}`,
                          }}
                        />
                      )}
                    </Box>
                  )}
                  {option.label}
                </Box>
              );
            })}
          </Box>

          {/* Category pills */}
          <Box
            sx={{
              overflowX: 'auto',
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            <Box sx={{ display: 'flex', gap: 1, pb: 0.5, minWidth: 'max-content' }}>
              {categories.map((cat) => {
                const active = activeCategory === cat;
                return (
                  <Box
                    key={cat}
                    component="button"
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    aria-pressed={active}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: { xs: 1.5, md: 2 },
                      py: { xs: 0.75, md: 1 },
                      borderRadius: '50px',
                      border: '1.5px solid',
                      borderColor: active ? '#C62828' : 'rgba(0,0,0,0.08)',
                      bgcolor: active ? '#C62828' : 'white',
                      color: active ? 'white' : '#424242',
                      fontWeight: active ? 800 : 600,
                      fontSize: { xs: '12px', md: '13.5px' },
                      cursor: 'pointer',
                      font: 'inherit',
                      whiteSpace: 'nowrap',
                      boxShadow: active ? '0 4px 18px rgba(198,40,40,0.3)' : '0 1px 6px rgba(0,0,0,0.06)',
                      transition: 'all 0.2s ease',
                      '&:active': { transform: 'scale(0.97)' },
                    }}
                  >
                    <span>{categoryEmojis[cat]}</span>
                    <span>{cat === 'all' ? 'All Items' : categoryLabels[cat as Category]}</span>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>

        {/* ─── Results Count + Clear ──────────────────────── */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1,
            mb: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary" aria-live="polite">
            <Box component="strong" sx={{ color: '#212121', fontWeight: 800 }}>
              {filtered.length}
            </Box>{' '}
            {filtered.length === 1 ? 'dish' : 'dishes'}
            {activeCategory !== 'all' && ` in ${categoryLabels[activeCategory as Category]}`}
          </Typography>

          {hasAnyFilter && (
            <Button
              size="small"
              onClick={resetFilters}
              startIcon={<Clear sx={{ fontSize: 14 }} />}
              sx={{ color: '#C62828', fontWeight: 700, fontSize: '12px', flexShrink: 0 }}
            >
              Clear All
            </Button>
          )}
        </Box>

        {/* ─── Dishes ─────────────────────────────────────── */}
        {isLoadingDB && liveMenuItems.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: { xs: 8, md: 12 } }}>
            <CircularProgress />
            <Typography color="text.secondary" sx={{ fontSize: '13.5px' }}>Loading the menu…</Typography>
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: { xs: 7, md: 11 }, px: 2 }}>
            <Typography sx={{ fontSize: '4rem', mb: 2, animation: 'ppr-float 3s ease-in-out infinite' }}>
              🍽️
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: '#212121' }}>
              No dishes found
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 320, mx: 'auto' }}>
              Try adjusting your filters or search term to find what you&apos;re craving.
            </Typography>
            <Button
              variant="contained"
              onClick={resetFilters}
              sx={{ fontWeight: 800, borderRadius: '12px', px: 3, py: 1.2 }}
            >
              Reset Filters
            </Button>
          </Box>
        ) : isPhone ? (
          <Box
            sx={{
              bgcolor: 'white',
              borderRadius: '18px',
              px: 2,
              border: '1px solid rgba(0,0,0,0.05)',
              boxShadow: '0 6px 24px rgba(0,0,0,0.05)',
            }}
          >
            {filtered.map((item, i) => (
              <DishListItem key={item.id} item={item} divider={i < filtered.length - 1} />
            ))}
          </Box>
        ) : (
          <Grid container spacing={{ sm: 2.5, md: 3 }}>
            {filtered.map((item) => (
              <Grid key={item.id} size={{ sm: 6, md: 4, lg: 3 }}>
                <MenuCard item={item} />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
      </Box>

      <Footer />
    </>
  );
}

/**
 * `useSearchParams` opts everything under it out of prerendering, so the
 * boundary is where that stops. See node_modules/next/dist/docs —
 * 01-app/03-api-reference/04-functions/use-search-params.md.
 */
export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      }
    >
      <MenuBrowser />
    </Suspense>
  );
}
