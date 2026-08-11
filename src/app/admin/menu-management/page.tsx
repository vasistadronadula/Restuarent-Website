'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Edit2, Flame, Plus, Sparkles, Trash2, Clock, FolderOpen, UtensilsCrossed,
  GripVertical, AlertTriangle,
} from 'lucide-react';

import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { MenuItem as MenuItemType, PortionPrices, MenuCategory } from '@/types';
import { categoryLabels as fallbackCategoryLabels } from '@/data/menuData';
import { generateMenuItemId, generateCategoryId } from '@/lib/idGenerator';
import { FALLBACK_DISH_IMAGE } from '@/lib/utils';
import {
  VEG_STATUS_VALUES, menuItemSchema, categorySchema,
  type MenuItemFormOutput, type MenuItemFormValues,
  type CategoryFormValues, type CategoryFormOutput,
} from '@/lib/adminSchemas';
import {
  ConfirmDeleteDialog, FormDialog, ImageUploadField, NumberField, SelectField,
  SwitchField, TextAreaField, TextField,
} from '@/components/admin/form-fields';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

const VEG_OPTIONS: { value: (typeof VEG_STATUS_VALUES)[number]; label: string }[] = [
  { value: 'veg', label: '🟢 Veg' },
  { value: 'non-veg', label: '🔴 Non-Veg' },
  { value: 'egg', label: '🟡 Egg' },
];

const BLANK_ITEM_FORM: MenuItemFormValues = {
  name: '',
  category: '',
  vegStatus: 'non-veg',
  price: '' as unknown as number,
  portionSingle: '',
  portionFull: '',
  portionLarge: '',
  prepTime: 20,
  image: '',
  description: '',
  isAvailable: true,
  isSpecial: false,
  isPopular: false,
};

const BLANK_CATEGORY_FORM: CategoryFormValues = {
  name: '',
  slug: '',
  icon: '🍽️',
  image: '',
  sortOrder: 0,
  isActive: true,
};

function toPortionPrices(v: MenuItemFormOutput): PortionPrices | undefined {
  const portions: PortionPrices = {};
  if (v.portionSingle !== undefined) portions.single = v.portionSingle;
  if (v.portionFull !== undefined) portions.full = v.portionFull;
  if (v.portionLarge !== undefined) portions.large = v.portionLarge;
  return Object.keys(portions).length > 0 ? portions : undefined;
}

/** Auto-generate slug from name */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40);
}

/* ================================================================== */
/*  Tab type                                                           */
/* ================================================================== */
type Tab = 'items' | 'categories';

/* ================================================================== */
/*  Page Component                                                     */
/* ================================================================== */

export default function MenuManagementPage() {
  const {
    menuItems, addMenuItem, updateMenuItem, deleteMenuItem, toggleMenuItemAvailability,
    categories, addCategory, updateCategory, deleteCategory,
  } = useAdmin();

  const [activeTab, setActiveTab] = useState<Tab>('items');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // ── Item dialog state ──
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemType | null>(null);
  const [deletingItem, setDeletingItem] = useState<MenuItemType | null>(null);
  const [deleteItemBusy, setDeleteItemBusy] = useState(false);

  // ── Category dialog state ──
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<MenuCategory | null>(null);
  const [deletingCat, setDeletingCat] = useState<MenuCategory | null>(null);
  const [deleteCatBusy, setDeleteCatBusy] = useState(false);

  // ── Build dynamic category options from DB ──
  const categoryOptions = useMemo(
    () => categories
      .filter((c) => c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({ value: c.slug, label: c.name })),
    [categories]
  );

  // Build a slug→name lookup from live categories (with fallback)
  const categoryLabelMap = useMemo(() => {
    const map: Record<string, string> = { ...fallbackCategoryLabels };
    categories.forEach((c) => { map[c.slug] = c.name; });
    return map;
  }, [categories]);

  /* ================================================================ */
  /*  ITEMS — Forms                                                    */
  /* ================================================================ */

  const itemForm = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: BLANK_ITEM_FORM,
    mode: 'onTouched',
  });

  const filteredItems = useMemo(
    () => menuItems.filter((i) => categoryFilter === 'all' || i.category === categoryFilter),
    [menuItems, categoryFilter]
  );

  const openAddItem = () => {
    setEditingItem(null);
    itemForm.reset(BLANK_ITEM_FORM);
    setItemDialogOpen(true);
  };

  const openEditItem = useCallback((item: MenuItemType) => {
    setEditingItem(item);
    itemForm.reset({
      name: item.name,
      category: item.category,
      vegStatus: item.vegStatus,
      price: item.price,
      portionSingle: item.portionPrices?.single ?? '',
      portionFull: item.portionPrices?.full ?? '',
      portionLarge: item.portionPrices?.large ?? '',
      prepTime: item.prepTime ?? 20,
      image: item.image ?? '',
      description: item.description ?? '',
      isAvailable: item.isAvailable,
      isSpecial: item.isSpecial,
      isPopular: item.isPopular,
    });
    setItemDialogOpen(true);
  }, [itemForm]);

  const handleItemSubmit = async (values: MenuItemFormOutput) => {
    const payload: MenuItemType = {
      ...(editingItem ?? {}),
      id: editingItem?.id ?? generateMenuItemId(),
      name: values.name,
      category: values.category,
      vegStatus: values.vegStatus,
      price: values.price,
      portionPrices: toPortionPrices(values),
      prepTime: values.prepTime,
      image: values.image || FALLBACK_DISH_IMAGE,
      description: values.description,
      isAvailable: values.isAvailable,
      isSpecial: values.isSpecial,
      isPopular: values.isPopular,
      rating: editingItem?.rating ?? 4.5,
      reviewCount: editingItem?.reviewCount ?? 0,
      tags: editingItem?.tags ?? [],
    };

    try {
      if (editingItem) {
        await updateMenuItem(payload);
        toast.success(`${payload.name} updated`);
      } else {
        await addMenuItem(payload);
        toast.success(`${payload.name} added to menu`);
      }
      setItemDialogOpen(false);
    } catch (err) {
      toast.error((err as Error).message || 'Could not save this dish');
    }
  };

  const handleDeleteItem = async () => {
    if (!deletingItem) return;
    setDeleteItemBusy(true);
    try {
      await deleteMenuItem(deletingItem.id);
      toast.success(`${deletingItem.name} removed`);
      setDeletingItem(null);
    } catch (err) {
      toast.error((err as Error).message || 'Could not delete this dish');
    } finally {
      setDeleteItemBusy(false);
    }
  };

  const priceLabel = (item: MenuItemType) => {
    const p = item.portionPrices;
    if (!p) return null;
    return [
      p.single !== undefined && `S ₹${p.single}`,
      p.full !== undefined && `F ₹${p.full}`,
      p.large !== undefined && `L ₹${p.large}`,
    ].filter(Boolean).join('  ');
  };

  /* ================================================================ */
  /*  ITEMS — Columns                                                  */
  /* ================================================================ */

  const itemColumns = useMemo<ColumnDef<any, MenuItemType>[]>(() => [
    {
      accessorKey: 'image',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="relative size-10 overflow-hidden rounded-lg bg-stone-100 flex-shrink-0">
          <Image
            src={row.original.image || FALLBACK_DISH_IMAGE}
            alt=""
            fill
            sizes="40px"
            className="object-cover"
          />
        </div>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Dish',
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-medium text-sm text-stone-900">
            <span className="truncate">{row.original.name}</span>
            {row.original.isSpecial && <Sparkles className="size-3.5 shrink-0 text-amber-500" />}
            {row.original.isPopular && <Flame className="size-3.5 shrink-0 text-rose-500" />}
          </div>
          <div className="text-xs text-stone-400 truncate mt-0.5">
            {categoryLabelMap[row.original.category] || row.original.category}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }) => (
        <div>
          <span className="text-sm font-semibold text-stone-900 tabular-nums">₹{row.original.price}</span>
          {priceLabel(row.original) && (
            <div className="text-xs text-stone-400 tabular-nums mt-0.5">{priceLabel(row.original)}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'vegStatus',
      header: 'Type',
      cell: ({ row }) => {
        const v = row.original.vegStatus;
        return (
          <span className={cn('text-xs font-medium', v === 'veg' ? 'text-emerald-700' : v === 'egg' ? 'text-yellow-700' : 'text-rose-700')}>
            {v === 'veg' ? '🟢 Veg' : v === 'egg' ? '🟡 Egg' : '🔴 Non-veg'}
          </span>
        );
      },
    },
    {
      accessorKey: 'prepTime',
      header: 'Cook Time',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-xs font-semibold text-stone-700 tabular-nums">
          <Clock className="size-3.5 text-amber-600 shrink-0" />
          <span>{row.original.prepTime || 20} min</span>
        </div>
      ),
    },
    {
      accessorKey: 'isAvailable',
      header: 'Available',
      cell: ({ row }) => (
        <Switch
          checked={row.original.isAvailable}
          onCheckedChange={() => toggleMenuItemAvailability(row.original.id)}
          aria-label={`${row.original.name} availability`}
        />
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEditItem(row.original)}>
            <Edit2 className="size-4 text-stone-500" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8 text-rose-600" onClick={() => setDeletingItem(row.original)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ], [toggleMenuItemAvailability, openEditItem, categoryLabelMap]);

  const renderItemMobileCard = useCallback((item: MenuItemType) => (
    <div className="flex gap-3">
      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-stone-100">
        <Image src={item.image || FALLBACK_DISH_IMAGE} alt="" fill sizes="56px" className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-medium text-stone-900">{item.name}</span>
              {item.isSpecial && <Sparkles className="size-3 shrink-0 text-amber-500" />}
              {item.isPopular && <Flame className="size-3 shrink-0 text-rose-500" />}
            </div>
            <div className="text-xs text-stone-400 flex items-center gap-2 mt-0.5">
              <span>{categoryLabelMap[item.category] || item.category}</span>
              <span>·</span>
              <span className="flex items-center gap-0.5 font-semibold text-amber-700">
                <Clock className="size-3" /> {item.prepTime || 20}m
              </span>
            </div>
          </div>
          <span className="text-sm font-semibold text-stone-900 tabular-nums shrink-0">₹{item.price}</span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-stone-100 pt-2">
          <Switch checked={item.isAvailable} onCheckedChange={() => toggleMenuItemAvailability(item.id)} aria-label={`${item.name} availability`} />
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs font-bold" onClick={() => openEditItem(item)}>Edit</Button>
            <Button variant="ghost" size="icon" className="size-7 text-rose-600" onClick={() => setDeletingItem(item)}><Trash2 className="size-3.5" /></Button>
          </div>
        </div>
      </div>
    </div>
  ), [toggleMenuItemAvailability, openEditItem, categoryLabelMap]);

  /* ================================================================ */
  /*  CATEGORIES — Forms                                               */
  /* ================================================================ */

  const catForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: BLANK_CATEGORY_FORM,
    mode: 'onTouched',
  });

  // Auto-generate slug when name changes (only for new categories)
  const watchCatName = catForm.watch('name');
  const autoSlug = useMemo(() => toSlug(watchCatName || ''), [watchCatName]);

  const openAddCat = () => {
    setEditingCat(null);
    const nextSortOrder = categories.length > 0
      ? Math.max(...categories.map((c) => c.sortOrder)) + 1
      : 1;
    catForm.reset({ ...BLANK_CATEGORY_FORM, sortOrder: nextSortOrder });
    setCatDialogOpen(true);
  };

  const openEditCat = useCallback((cat: MenuCategory) => {
    setEditingCat(cat);
    catForm.reset({
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon || '🍽️',
      image: cat.image || '',
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
    });
    setCatDialogOpen(true);
  }, [catForm]);

  const handleCatSubmit = async (values: CategoryFormOutput) => {
    const slug = values.slug || autoSlug;
    const payload: MenuCategory = {
      id: editingCat?.id ?? generateCategoryId(slug),
      name: values.name,
      slug,
      icon: values.icon || '🍽️',
      image: values.image || '',
      sortOrder: values.sortOrder,
      isActive: values.isActive,
      createdAt: editingCat?.createdAt,
    };

    try {
      if (editingCat) {
        await updateCategory(payload);
        toast.success(`Category "${payload.name}" updated`);
      } else {
        await addCategory(payload);
        toast.success(`Category "${payload.name}" added`);
      }
      setCatDialogOpen(false);
    } catch (err) {
      toast.error((err as Error).message || 'Could not save category');
    }
  };

  // Count items per category (for blocking delete)
  const itemCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    menuItems.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [menuItems]);

  const handleDeleteCat = async () => {
    if (!deletingCat) return;
    const count = itemCountByCategory[deletingCat.slug] || 0;
    if (count > 0) {
      toast.error(`Cannot delete "${deletingCat.name}" — ${count} dish${count > 1 ? 'es' : ''} still assigned to it. Move or delete them first.`);
      setDeletingCat(null);
      return;
    }
    setDeleteCatBusy(true);
    try {
      await deleteCategory(deletingCat.id);
      toast.success(`Category "${deletingCat.name}" removed`);
      setDeletingCat(null);
    } catch (err) {
      toast.error((err as Error).message || 'Could not delete category');
    } finally {
      setDeleteCatBusy(false);
    }
  };

  /* ================================================================ */
  /*  CATEGORIES — Columns                                             */
  /* ================================================================ */

  const catColumns = useMemo<ColumnDef<any, MenuCategory>[]>(() => [
    {
      accessorKey: 'sortOrder',
      header: '#',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-xs text-stone-400 tabular-nums">
          <GripVertical className="size-3.5 text-stone-300" />
          <span className="font-bold">{row.original.sortOrder}</span>
        </div>
      ),
    },
    {
      accessorKey: 'image',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="relative size-10 overflow-hidden rounded-full bg-stone-100 flex-shrink-0 border-2 border-stone-200">
          {row.original.image ? (
            <Image
              src={row.original.image}
              alt=""
              fill
              sizes="40px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg">
              {row.original.icon || '🍽️'}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Category',
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-medium text-sm text-stone-900">
            <span className="text-base">{row.original.icon}</span>
            <span className="truncate">{row.original.name}</span>
          </div>
          <div className="text-xs text-stone-400 font-mono truncate mt-0.5">
            {row.original.slug}
          </div>
        </div>
      ),
    },
    {
      id: 'itemCount',
      header: 'Dishes',
      cell: ({ row }) => {
        const count = itemCountByCategory[row.original.slug] || 0;
        return (
          <span className={cn(
            'text-xs font-bold tabular-nums px-2 py-0.5 rounded-md',
            count > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-400'
          )}>
            {count}
          </span>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Active',
      cell: ({ row }) => (
        <Switch
          checked={row.original.isActive}
          onCheckedChange={async () => {
            try {
              await updateCategory({ ...row.original, isActive: !row.original.isActive });
            } catch (err) {
              toast.error((err as Error).message);
            }
          }}
          aria-label={`${row.original.name} active`}
        />
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => {
        const count = itemCountByCategory[row.original.slug] || 0;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="size-8" onClick={() => openEditCat(row.original)}>
              <Edit2 className="size-4 text-stone-500" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn('size-8', count > 0 ? 'text-stone-300 cursor-not-allowed' : 'text-rose-600')}
              disabled={count > 0}
              title={count > 0 ? `${count} dishes assigned — cannot delete` : 'Delete category'}
              onClick={() => setDeletingCat(row.original)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        );
      },
    },
  ], [itemCountByCategory, openEditCat, updateCategory]);

  const renderCatMobileCard = useCallback((cat: MenuCategory) => {
    const count = itemCountByCategory[cat.slug] || 0;
    return (
      <div className="flex gap-3">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-stone-100 border-2 border-stone-200">
          {cat.image ? (
            <Image src={cat.image} alt="" fill sizes="48px" className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl">
              {cat.icon || '🍽️'}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base">{cat.icon}</span>
                <span className="truncate text-sm font-medium text-stone-900">{cat.name}</span>
              </div>
              <div className="text-xs text-stone-400 flex items-center gap-2 mt-0.5">
                <span className="font-mono">{cat.slug}</span>
                <span>·</span>
                <span className={cn('font-bold', count > 0 ? 'text-emerald-600' : 'text-stone-400')}>
                  {count} dish{count !== 1 ? 'es' : ''}
                </span>
              </div>
            </div>
            <span className="text-xs text-stone-400 tabular-nums font-bold shrink-0">#{cat.sortOrder}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-stone-100 pt-2">
            <Switch
              checked={cat.isActive}
              onCheckedChange={async () => {
                try {
                  await updateCategory({ ...cat, isActive: !cat.isActive });
                } catch (err) {
                  toast.error((err as Error).message);
                }
              }}
              aria-label={`${cat.name} active`}
            />
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs font-bold" onClick={() => openEditCat(cat)}>Edit</Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn('size-7', count > 0 ? 'text-stone-300' : 'text-rose-600')}
                disabled={count > 0}
                onClick={() => setDeletingCat(cat)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }, [itemCountByCategory, openEditCat, updateCategory]);

  /* ================================================================ */
  /*  Sorted categories for table                                      */
  /* ================================================================ */
  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <AdminLayout title="Menu Management">
      <div className="w-full max-w-full space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-stone-900">Menu Management</h1>
            <p className="text-sm text-stone-500 mt-0.5">
              {menuItems.length} dishes · {categories.length} categories · {menuItems.filter(i => i.isAvailable).length} available
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'items' ? (
              <Button onClick={openAddItem} className="h-9 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4">
                <Plus className="size-4 mr-1.5" /> Add Dish
              </Button>
            ) : (
              <Button onClick={openAddCat} className="h-9 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4">
                <Plus className="size-4 mr-1.5" /> Add Category
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('items')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all',
              activeTab === 'items'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            )}
          >
            <UtensilsCrossed className="size-4" />
            Dishes
            <span className={cn(
              'text-[10px] font-black px-1.5 py-0.5 rounded-md tabular-nums',
              activeTab === 'items' ? 'bg-amber-100 text-amber-700' : 'bg-stone-200 text-stone-500'
            )}>
              {menuItems.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all',
              activeTab === 'categories'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            )}
          >
            <FolderOpen className="size-4" />
            Categories
            <span className={cn(
              'text-[10px] font-black px-1.5 py-0.5 rounded-md tabular-nums',
              activeTab === 'categories' ? 'bg-amber-100 text-amber-700' : 'bg-stone-200 text-stone-500'
            )}>
              {categories.length}
            </span>
          </button>
        </div>

        {/* ── Items Tab ── */}
        {activeTab === 'items' && (
          <>
            {/* Category filter chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setCategoryFilter('all')}
                className={cn('shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap', categoryFilter === 'all' ? 'border-amber-600 bg-amber-600 text-white' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50')}
              >
                All ({menuItems.length})
              </button>
              {categoryOptions.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setCategoryFilter(value)}
                  className={cn('shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap', categoryFilter === value ? 'border-amber-600 bg-amber-600 text-white' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50')}
                >
                  {label} ({menuItems.filter(i => i.category === value).length})
                </button>
              ))}
            </div>

            {/* Items table */}
            <div className="bg-white rounded-xl border border-stone-200">
              <DataTable
                columns={itemColumns}
                data={filteredItems}
                searchKey="name"
                searchPlaceholder="Search dish name…"
                height="500px"
                rowHeight={64}
                emptyMessage="No dishes match this filter."
                renderMobileCard={renderItemMobileCard}
                getRowId={(item) => item.id}
              />
            </div>
          </>
        )}

        {/* ── Categories Tab ── */}
        {activeTab === 'categories' && (
          <div className="bg-white rounded-xl border border-stone-200">
            <DataTable
              columns={catColumns}
              data={sortedCategories}
              searchKey="name"
              searchPlaceholder="Search category…"
              height="500px"
              rowHeight={64}
              emptyMessage="No categories yet. Add one to get started."
              renderMobileCard={renderCatMobileCard}
              getRowId={(cat) => cat.id}
            />
          </div>
        )}
      </div>

      {/* ── Item Add/Edit Dialog ── */}
      <FormDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        form={itemForm}
        onSubmit={handleItemSubmit}
        title={editingItem ? 'Edit Dish' : 'Add New Dish'}
        description={editingItem ? 'Changes go live on the storefront when saved.' : 'Dish becomes orderable once saved and marked available.'}
        submitLabel={editingItem ? 'Update Dish' : 'Add to Menu'}
        size="lg"
      >
        <TextField control={itemForm.control} name="name" label="Dish Name" placeholder="e.g. Hyderabadi Mutton Biryani" autoFocus />
        <div className="grid gap-3.5 sm:grid-cols-2">
          <SelectField control={itemForm.control} name="category" label="Category" options={categoryOptions} />
          <SelectField control={itemForm.control} name="vegStatus" label="Veg Status" options={VEG_OPTIONS} />
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <NumberField control={itemForm.control} name="price" label="Base Price" prefix="₹" placeholder="0" hint="Charged when no portion is chosen" />
          <NumberField control={itemForm.control} name="prepTime" label="Prep Time" suffix="min" placeholder="20" />
        </div>
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
          <p className="text-xs font-medium text-stone-600 mb-1">Portion Pricing</p>
          <p className="text-xs text-stone-400 mb-3">Leave blank for single-size dishes.</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <NumberField control={itemForm.control} name="portionSingle" label="Single" prefix="₹" placeholder="—" />
            <NumberField control={itemForm.control} name="portionFull" label="Full" prefix="₹" placeholder="—" />
            <NumberField control={itemForm.control} name="portionLarge" label="Large" prefix="₹" placeholder="—" />
          </div>
        </div>
        <ImageUploadField control={itemForm.control} name="image" label="Dish Photo" hint="Upload a photo from your device" />
        <TextAreaField control={itemForm.control} name="description" label="Description" rows={3} placeholder="Ingredients, cooking style…" />
        <SwitchField control={itemForm.control} name="isAvailable" label="Available to order" hint="Turn off to keep listed but unorderable" />
        <SwitchField control={itemForm.control} name="isSpecial" label="Chef's Special" hint="Features in the top showcase" />
        <SwitchField control={itemForm.control} name="isPopular" label="Bestseller" hint="Adds the popular badge" />
      </FormDialog>

      {/* ── Item Delete Confirm ── */}
      <ConfirmDeleteDialog
        open={!!deletingItem}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        onConfirm={handleDeleteItem}
        busy={deleteItemBusy}
        title={`Delete ${deletingItem?.name}?`}
        description="This permanently removes the dish from the menu. Past orders are not affected."
      />

      {/* ── Category Add/Edit Dialog ── */}
      <FormDialog
        open={catDialogOpen}
        onOpenChange={setCatDialogOpen}
        form={catForm}
        onSubmit={handleCatSubmit}
        title={editingCat ? 'Edit Category' : 'Add New Category'}
        description={editingCat ? 'Category changes are reflected on the storefront immediately.' : 'New categories appear in the customer menu and dish form.'}
        submitLabel={editingCat ? 'Update Category' : 'Add Category'}
        size="md"
      >
        <TextField control={catForm.control} name="name" label="Category Name" placeholder="e.g. Tandoori Specials" autoFocus />
        <div className="grid gap-3.5 sm:grid-cols-2">
          <TextField
            control={catForm.control}
            name="slug"
            label="Slug"
            placeholder={autoSlug || 'auto-generated'}
            hint="URL-safe key. Auto-fills from name."
          />
          <TextField control={catForm.control} name="icon" label="Emoji Icon" placeholder="🍽️" hint="One emoji for the sidebar" />
        </div>
        <NumberField control={catForm.control} name="sortOrder" label="Sort Order" placeholder="1" hint="Lower numbers appear first in the menu" />
        <ImageUploadField control={catForm.control} name="image" label="Category Image" hint="Upload a circular thumbnail for the customer menu sidebar" />
        <SwitchField control={catForm.control} name="isActive" label="Active" hint="Inactive categories are hidden from the customer menu" />
      </FormDialog>

      {/* ── Category Delete Confirm ── */}
      <ConfirmDeleteDialog
        open={!!deletingCat}
        onOpenChange={(open) => !open && setDeletingCat(null)}
        onConfirm={handleDeleteCat}
        busy={deleteCatBusy}
        title={`Delete "${deletingCat?.name}"?`}
        description={
          (itemCountByCategory[deletingCat?.slug || ''] || 0) > 0
            ? `This category has ${itemCountByCategory[deletingCat?.slug || '']} dishes. Move or delete them before removing the category.`
            : 'This permanently removes the category. Menu items are not affected.'
        }
      />
    </AdminLayout>
  );
}
