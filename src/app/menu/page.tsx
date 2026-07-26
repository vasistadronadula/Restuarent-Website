'use client';
import React, { useState, useMemo } from 'react';
import {
  Box, Container, Typography, Grid, Chip, Button, TextField, InputAdornment,
  Slider, ToggleButton, ToggleButtonGroup,
  FormControl, Select, MenuItem as MuiMenuItem, InputLabel, Paper,
} from '@mui/material';
import {
  Search, Tune, Clear, TrendingUp, Star, EggAlt,
  Spa, Restaurant as RestaurantIcon,
} from '@mui/icons-material';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import MenuCard from '@/components/customer/MenuCard';
import { categoryLabels } from '@/data/menuData';
import { useAdmin } from '@/context/AdminContext';
import { Category, VegStatus } from '@/types';

const categories: (Category | 'all')[] = [
  'all', 'combos', 'starters', 'tandoori', 'biryani', 'south-indian', 'north-indian',
  'chinese', 'rice', 'breads', 'desserts', 'beverages',
];

const categoryEmojis: Record<string, string> = {
  all: '🍽️', combos: '🎉', starters: '🥗', 'south-indian': '🥘', 'north-indian': '🍲',
  chinese: '🥡', biryani: '🍚', tandoori: '🔥', rice: '🍚', breads: '🫓',
  desserts: '🍮', beverages: '🥤',
};

type SortOption = 'popular' | 'price-asc' | 'price-desc' | 'rating';

export default function MenuPage() {
  const { menuItems: liveMenuItems } = useAdmin();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [vegFilter, setVegFilter] = useState<VegStatus | 'all'>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let items = [...liveMenuItems];

    // Category
    if (activeCategory !== 'all') {
      items = items.filter((i) => i.category === activeCategory);
    }

    // Veg filter
    if (vegFilter !== 'all') {
      items = items.filter((i) => i.vegStatus === vegFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Price
    items = items.filter((i) => i.price >= priceRange[0] && i.price <= priceRange[1]);

    // Sort
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

  return (
    <>
      <Navbar />

      {/* Hero */}
      <Box sx={{
        background: 'linear-gradient(135deg, #C62828 0%, #1A0A0A 100%)',
        py: { xs: 3, md: 4.5 }, textAlign: 'center',
      }}>
        <Typography variant="h2" sx={{fontWeight: 800, color: 'white', fontSize: { xs: '1.8rem', md: '2.5rem' }, mb: 1}}>
          Our <span style={{ color: '#FF9800' }}>Royal</span> Menu
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.95rem', maxWidth: 520, mx: 'auto' }}>
          Explore 100+ authentic Indian dishes crafted with love and tradition.
        </Typography>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        {/* Search + Sort */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search dishes, ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flex: 1, minWidth: 200 }}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><Search sx={{ color: '#C62828' }} /></InputAdornment>,
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <Clear sx={{ cursor: 'pointer', color: '#616161' }} onClick={() => setSearchQuery('')} />
                  </InputAdornment>
                ) : null,
              },
            }}
          />
          <FormControl sx={{ minWidth: 160 }}>
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
            sx={{ borderRadius: '12px' }}
          >
            Filters
          </Button>
        </Box>

        {/* Filters Panel */}
        {showFilters && (
          <Paper sx={{ p: 3, mb: 3, borderRadius: '16px', border: '1px solid rgba(198,40,40,0.1)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{fontWeight: 700}}>Filters</Typography>
              <Button size="small" onClick={resetFilters} startIcon={<Clear />}>Reset All</Button>
            </Box>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="caption" color="text.secondary" sx={{fontWeight: 600, display: 'block', mb: 1}}>
                  FOOD TYPE
                </Typography>
                <ToggleButtonGroup
                  value={vegFilter}
                  exclusive
                  onChange={(_, v) => v && setVegFilter(v)}
                  size="small"
                >
                  <ToggleButton value="all">All</ToggleButton>
                  <ToggleButton value="veg" sx={{ '&.Mui-selected': { bgcolor: 'rgba(46,125,50,0.15)', color: '#2E7D32' } }}>
                    <Spa sx={{ mr: 0.5, fontSize: 16 }} />Veg
                  </ToggleButton>
                  <ToggleButton value="non-veg" sx={{ '&.Mui-selected': { bgcolor: 'rgba(198,40,40,0.15)', color: '#C62828' } }}>
                    <RestaurantIcon sx={{ mr: 0.5, fontSize: 16 }} />Non-Veg
                  </ToggleButton>
                  <ToggleButton value="egg" sx={{ '&.Mui-selected': { bgcolor: 'rgba(255,152,0,0.15)', color: '#FF9800' } }}>
                    <EggAlt sx={{ mr: 0.5, fontSize: 16 }} />Egg
                  </ToggleButton>
                </ToggleButtonGroup>
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <Typography variant="caption" color="text.secondary" sx={{fontWeight: 600, display: 'block', mb: 1}}>
                  PRICE RANGE: ₹{priceRange[0]} – ₹{priceRange[1]}
                </Typography>
                <Slider
                  value={priceRange}
                  onChange={(_, v) => setPriceRange(v as [number, number])}
                  min={0} max={1000} step={10}
                  sx={{ color: '#C62828' }}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(v) => `₹${v}`}
                />
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Category Tabs */}
        <Box sx={{ mb: 4, overflowX: 'auto' }}>
          <Box sx={{ display: 'flex', gap: 1.5, pb: 1, minWidth: 'max-content' }}>
            {categories.map((cat) => (
              <Chip
                key={cat}
                label={`${categoryEmojis[cat]} ${cat === 'all' ? 'All Items' : categoryLabels[cat as Category]}`}
                onClick={() => setActiveCategory(cat)}
                sx={{
                  px: 1.5, py: 2.5, fontSize: '14px',
                  fontWeight: activeCategory === cat ? 700 : 500,
                  bgcolor: activeCategory === cat ? '#C62828' : 'white',
                  color: activeCategory === cat ? 'white' : '#424242',
                  boxShadow: activeCategory === cat ? '0 4px 16px rgba(198,40,40,0.3)' : '0 2px 8px rgba(0,0,0,0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: '1px solid',
                  borderColor: activeCategory === cat ? '#C62828' : 'transparent',
                  '&:hover': { bgcolor: activeCategory === cat ? '#8E0000' : 'rgba(198,40,40,0.08)' },
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Results Count */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Showing <strong>{filtered.length}</strong> {filtered.length === 1 ? 'dish' : 'dishes'}
            {activeCategory !== 'all' && ` in ${categoryLabels[activeCategory as Category]}`}
          </Typography>
          {(searchQuery || activeCategory !== 'all' || vegFilter !== 'all') && (
            <Button size="small" onClick={resetFilters} startIcon={<Clear />} color="primary">
              Clear Filters
            </Button>
          )}
        </Box>

        {/* Grid */}
        {filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <Typography variant="h2" sx={{ fontSize: '3rem', mb: 2 }}>🍽️</Typography>
            <Typography variant="h5" sx={{fontWeight: 700, mb: 1}}>No dishes found</Typography>
            <Typography color="text.secondary" sx={{mb: 3}}>Try adjusting your filters or search term</Typography>
            <Button variant="contained" color="primary" onClick={resetFilters}>Reset Filters</Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {filtered.map((item) => (
              <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <MenuCard item={item} />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      <Footer />
    </>
  );
}
