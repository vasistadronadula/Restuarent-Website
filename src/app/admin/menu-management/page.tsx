'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { MenuItem as MenuItemType, VegStatus } from '@/types';
import {
  Search, Plus, Bell, User, Edit2, Trash2,
  Sparkles, Flame, Clock, Table as TableIcon, X
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const FALLBACK_DISH_IMAGE = 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80';

export default function MenuManagementPage() {
  const { menuItems, addMenuItem, updateMenuItem, deleteMenuItem, toggleMenuItemAvailability } = useAdmin();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  /* Modals */
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemType | null>(null);

  /* Form state */
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Mains');
  const [formPrice, setFormPrice] = useState('320');
  const [formVegStatus, setFormVegStatus] = useState<VegStatus>('veg');
  const [formImage, setFormImage] = useState('');
  const [formAvailable, setFormAvailable] = useState(true);

  const categories = useMemo(() => {
    const set = new Set<string>();
    menuItems.forEach((i) => { if (i.category) set.add(i.category); });
    return ['all', ...Array.from(set)];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    return menuItems.filter((i) => {
      const matchCat = selectedCategory === 'all' || i.category?.toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch = !search.trim() || i.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [menuItems, selectedCategory, search]);

  const openAddItem = () => {
    setEditingItem(null);
    setFormName('');
    setFormCategory('Mains');
    setFormPrice('320');
    setFormVegStatus('veg');
    setFormImage('');
    setFormAvailable(true);
    setEditModalOpen(true);
  };

  const openEditItem = (item: MenuItemType) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category || 'Mains');
    setFormPrice(String(item.price));
    setFormVegStatus(item.vegStatus || 'veg');
    setFormImage(item.image || '');
    setFormAvailable(item.isAvailable !== false);
    setEditModalOpen(true);
  };

  const handleSaveItem = async () => {
    if (!formName.trim()) {
      toast.error('Dish name is required');
      return;
    }

    const priceNum = Number(formPrice) || 0;
    const payload: MenuItemType = {
      ...(editingItem || {}),
      id: editingItem?.id || `item_${Date.now()}`,
      name: formName.trim(),
      category: formCategory,
      price: priceNum,
      vegStatus: formVegStatus,
      image: formImage.trim() || FALLBACK_DISH_IMAGE,
      isAvailable: formAvailable,
      rating: editingItem?.rating || 4.8,
      description: editingItem?.description || '',
      reviewCount: editingItem?.reviewCount || 0,
      isPopular: editingItem?.isPopular || false,
      isSpecial: editingItem?.isSpecial || false,
      tags: editingItem?.tags || [],
    };

    try {
      if (editingItem) {
        await updateMenuItem(payload);
        toast.success(`Updated "${payload.name}"`);
      } else {
        await addMenuItem(payload);
        toast.success(`Added "${payload.name}" to menu`);
      }
      setEditModalOpen(false);
    } catch {
      toast.error('Could not save dish');
    }
  };

  return (
    <AdminLayout title="Menu Management">
      <div className="space-y-6 max-w-full font-sans">

        {/* ── Top Bar with Search & Table View ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-1">
          {/* Search Pill Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9.5 pr-8 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Right Action Icons & Table View Link */}
          <div className="flex items-center gap-3 self-end sm:self-center">
            <button
              type="button"
              className="size-8.5 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
            >
              <Bell className="size-4" />
            </button>

            <Link
              href="/admin/profile"
              className="size-8.5 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
            >
              <User className="size-4" />
            </Link>

            <Link
              href="/admin/tables"
              className="px-3.5 h-9 rounded-full border border-slate-300 hover:border-slate-400 bg-white text-slate-800 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all"
            >
              <span>Table View</span>
            </Link>
          </div>
        </div>

        {/* ── Header Title & Add New Item CTA ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Menu Management
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              Manage your dishes, categories, and availability.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddItem}
            className="h-10 px-4.5 rounded-xl bg-[#065F46] hover:bg-[#047857] active:scale-[0.98] text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all shrink-0"
          >
            <Plus className="size-4 stroke-[2.5]" />
            <span>Add New Item</span>
          </button>
        </div>

        {/* ── Category Filter Pills (Exact match to Image 2) ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            const label = cat === 'all' ? 'All Items' : cat;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-4 py-2 rounded-full text-xs font-bold transition-all border whitespace-nowrap',
                  isSelected
                    ? 'bg-[#059669] text-white border-[#059669] shadow-2xs font-black'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* ── Dishes Table Card ── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-semibold">
                  <th className="py-3 px-4 font-medium w-16">Image</th>
                  <th className="py-3 px-4 font-medium">Item Name</th>
                  <th className="py-3 px-4 font-medium">Category</th>
                  <th className="py-3 px-4 font-medium">Price</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredItems.map((dish) => {
                  const isAvailable = dish.isAvailable !== false;
                  const isVeg = dish.vegStatus === 'veg';
                  const isEgg = dish.vegStatus === 'egg';

                  return (
                    <tr key={dish.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Image Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="relative size-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200/60 shadow-2xs">
                          <Image
                            src={dish.image || FALLBACK_DISH_IMAGE}
                            alt={dish.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>
                      </td>

                      {/* Item Name with Veg/Non-Veg Dot */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 font-bold text-slate-900 text-[13.5px]">
                          <span
                            className={cn(
                              'size-2 rounded-full shrink-0',
                              isVeg ? 'bg-emerald-600' : isEgg ? 'bg-amber-500' : 'bg-rose-600'
                            )}
                          />
                          <span className="truncate">{dish.name}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {dish.category || 'Mains'}
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 font-black font-mono text-slate-950 text-sm">
                        ₹{Number(dish.price).toFixed(2)}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => toggleMenuItemAvailability(dish.id)}
                          className={cn(
                            'px-2.5 py-1 rounded-full text-[11px] font-bold transition-all',
                            isAvailable
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          )}
                          title="Click to toggle availability"
                        >
                          {isAvailable ? 'Available' : 'Out of Stock'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditItem(dish)}
                            className="size-7.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
                            title="Edit dish"
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMenuItem(dish.id)}
                            className="size-7.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors"
                            title="Delete dish"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ── Add / Edit Dish Dialog ── */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              {editingItem ? 'Edit Dish' : 'Add New Dish'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div>
              <label className="font-bold text-slate-600 block mb-1">Dish Name</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Paneer Tikka"
                className="rounded-xl font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Category</label>
                <Input
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="e.g. Tandoor"
                  className="rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Price (₹)</label>
                <Input
                  type="number"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="320"
                  className="rounded-xl font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-600 block mb-1">Dietary Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: 'veg' as VegStatus, label: '🟢 Veg' },
                  { type: 'non-veg' as VegStatus, label: '🔴 Non-Veg' },
                  { type: 'egg' as VegStatus, label: '🟡 Egg' },
                ].map((d) => (
                  <button
                    key={d.type}
                    type="button"
                    onClick={() => setFormVegStatus(d.type)}
                    className={cn(
                      'h-9 rounded-xl font-bold border transition-all',
                      formVegStatus === d.type
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-600 block mb-1">Image URL</label>
              <Input
                value={formImage}
                onChange={(e) => setFormImage(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="sm:justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              className="rounded-xl border-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveItem}
              className="rounded-xl bg-[#065F46] hover:bg-[#047857] text-white font-bold px-5"
            >
              Save Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
