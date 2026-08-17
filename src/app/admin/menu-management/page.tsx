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
import { Pill } from '@/components/admin/ui';
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
        <div className="relative size-10 overflow-hidden bg-ad-n200 shrink-0">
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
          <div className="flex items-center gap-1.5 font-semibold">
            <span className="truncate">{row.original.name}</span>
            {row.original.isSpecial && <Sparkles className="size-3.5 shrink-0 text-ad-accent" />}
            {row.original.isPopular && <Flame className="size-3.5 shrink-0 text-ad-accent" />}
          </div>
          <div className="ad-kicker truncate mt-0.5">
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
          <span className="ad-num text-[15px]">₹{row.original.price}</span>
          {priceLabel(row.original) && (
            <div className="ad-kicker tabular-nums mt-0.5">{priceLabel(row.original)}</div>
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
          <span className="ad-tag ad-tag-outline">
            <span
              className="w-2 h-2"
              style={{ background: v === 'veg' ? 'var(--ad-ok)' : v === 'egg' ? 'var(--ad-warn)' : 'var(--ad-accent)' }}
            />
            {v === 'veg' ? 'Veg' : v === 'egg' ? 'Egg' : 'Non-veg'}
          </span>
        );
      },
    },
    {
      accessorKey: 'prepTime',
      header: 'Cook Time',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 tabular-nums ad-muted">
          <Clock className="size-3.5 shrink-0" />
          <span>{row.original.prepTime || 20} min</span>
        </div>
      ),
    },
    {
      accessorKey: 'isAvailable',
      header: 'Available',
      cell: ({ row }) => (
        <Pill
          on={row.original.isAvailable}
          onLabel="On menu"
          offLabel="Out of stock"
          onClick={() => toggleMenuItemAvailability(row.original.id)}
        />
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <button type="button" className="ad-btn ad-btn-secondary ad-btn-icon" onClick={() => openEditItem(row.original)} aria-label={`Edit ${row.original.name}`}>
            <Edit2 className="size-4" />
          </button>
          <button type="button" className="ad-btn ad-btn-secondary ad-btn-icon" style={{ color: 'var(--ad-a700)' }} onClick={() => setDeletingItem(row.original)} aria-label={`Delete ${row.original.name}`}>
            <Trash2 className="size-4" />
          </button>
        </div>
      ),
    },
  ], [toggleMenuItemAvailability, openEditItem, categoryLabelMap]);

  const renderItemMobileCard = useCallback((item: MenuItemType) => (
    <div className="flex gap-3">
      <div className="relative size-14 shrink-0 overflow-hidden bg-ad-n200">
        <Image src={item.image || FALLBACK_DISH_IMAGE} alt="" fill sizes="56px" className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[14px] font-semibold">{item.name}</span>
              {item.isSpecial && <Sparkles className="size-3 shrink-0 text-ad-accent" />}
              {item.isPopular && <Flame className="size-3 shrink-0 text-ad-accent" />}
            </div>
            <div className="ad-kicker mt-0.5">
              {categoryLabelMap[item.category] || item.category} · {item.prepTime || 20}m
            </div>
          </div>
          <span className="ad-num text-[16px] shrink-0">₹{item.price}</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-ad-hairline pt-2.5">
          <Pill
            on={item.isAvailable}
            onLabel="On menu"
            offLabel="Out of stock"
            onClick={() => toggleMenuItemAvailability(item.id)}
          />
          <div className="flex items-center gap-1.5">
            <button type="button" className="ad-btn ad-btn-secondary ad-btn-sm" onClick={() => openEditItem(item)}>Edit</button>
            <button type="button" className="ad-btn ad-btn-secondary ad-btn-sm" style={{ color: 'var(--ad-a700)' }} onClick={() => setDeletingItem(item)} aria-label={`Delete ${item.name}`}>
              <Trash2 className="size-3.5" />
            </button>
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
        <div className="flex items-center gap-1 ad-muted tabular-nums">
          <GripVertical className="size-3.5" />
          <span className="font-semibold">{row.original.sortOrder}</span>
        </div>
      ),
    },
    {
      accessorKey: 'image',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="relative size-10 overflow-hidden bg-ad-n200 shrink-0">
          {row.original.image ? (
            <Image src={row.original.image} alt="" fill sizes="40px" className="object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center bg-ad-ink text-ad-bg ad-num text-[13px]">
              {(row.original.name || 'C')[0].toUpperCase()}
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
          <div className="font-semibold truncate">{row.original.name}</div>
          <div className="ad-kicker truncate mt-0.5">{row.original.slug}</div>
        </div>
      ),
    },
    {
      id: 'itemCount',
      header: 'Dishes',
      cell: ({ row }) => {
        const count = itemCountByCategory[row.original.slug] || 0;
        return (
          <span className={cn('ad-tag', count > 0 ? 'ad-tag-solid' : '')}>{count}</span>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Active',
      cell: ({ row }) => (
        <Pill
          on={row.original.isActive}
          onLabel="Live"
          offLabel="Hidden"
          onClick={async () => {
            try {
              await updateCategory({ ...row.original, isActive: !row.original.isActive });
            } catch (err) {
              toast.error((err as Error).message);
            }
          }}
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
          <div className="flex items-center gap-1.5">
            <button type="button" className="ad-btn ad-btn-secondary ad-btn-icon" onClick={() => openEditCat(row.original)} aria-label={`Edit ${row.original.name}`}>
              <Edit2 className="size-4" />
            </button>
            <button
              type="button"
              className="ad-btn ad-btn-secondary ad-btn-icon"
              style={{ color: count > 0 ? 'var(--ad-n400)' : 'var(--ad-a700)' }}
              disabled={count > 0}
              title={count > 0 ? `${count} dishes assigned — cannot delete` : 'Delete category'}
              onClick={() => setDeletingCat(row.original)}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        );
      },
    },
  ], [itemCountByCategory, openEditCat, updateCategory]);

  const renderCatMobileCard = useCallback((cat: MenuCategory) => {
    const count = itemCountByCategory[cat.slug] || 0;
    return (
      <div className="flex gap-3">
        <div className="relative size-12 shrink-0 overflow-hidden bg-ad-n200">
          {cat.image ? (
            <Image src={cat.image} alt="" fill sizes="48px" className="object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center bg-ad-ink text-ad-bg ad-num text-[14px]">
              {(cat.name || 'C')[0].toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="truncate text-[14px] font-semibold block">{cat.name}</span>
              <div className="ad-kicker mt-0.5">
                {cat.slug} · {count} dish{count !== 1 ? 'es' : ''}
              </div>
            </div>
            <span className="ad-num text-[13px] shrink-0 ad-muted">#{cat.sortOrder}</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-ad-hairline pt-2.5">
            <Pill
              on={cat.isActive}
              onLabel="Live"
              offLabel="Hidden"
              onClick={async () => {
                try {
                  await updateCategory({ ...cat, isActive: !cat.isActive });
                } catch (err) {
                  toast.error((err as Error).message);
                }
              }}
            />
            <div className="flex items-center gap-1.5">
              <button type="button" className="ad-btn ad-btn-secondary ad-btn-sm" onClick={() => openEditCat(cat)}>Edit</button>
              <button
                type="button"
                className="ad-btn ad-btn-secondary ad-btn-sm"
                style={{ color: count > 0 ? 'var(--ad-n400)' : 'var(--ad-a700)' }}
                disabled={count > 0}
                onClick={() => setDeletingCat(cat)}
                aria-label={`Delete ${cat.name}`}
              >
                <Trash2 className="size-3.5" />
              </button>
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
        <div className="ad-section-head">
          <h3 className="ad-h text-[17px]">The menu</h3>
          <span className="text-[12px] ad-muted">
            {menuItems.length} dishes · {categories.length} categories · {menuItems.filter(i => i.isAvailable).length} available
          </span>
          {activeTab === 'items' ? (
            <button type="button" onClick={openAddItem} className="ad-btn ad-btn-primary ml-auto">
              <Plus className="size-4" /> Add dish
            </button>
          ) : (
            <button type="button" onClick={openAddCat} className="ad-btn ad-btn-primary ml-auto">
              <Plus className="size-4" /> Add category
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('items')}
            className="ad-tab flex items-center gap-2"
            data-active={activeTab === 'items'}
          >
            <UtensilsCrossed className="size-4" />
            Dishes
            <span className="tabular-nums opacity-70">{menuItems.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className="ad-tab flex items-center gap-2"
            data-active={activeTab === 'categories'}
          >
            <FolderOpen className="size-4" />
            Categories
            <span className="tabular-nums opacity-70">{categories.length}</span>
          </button>
        </div>

        {/* ── Items Tab ── */}
        {activeTab === 'items' && (
          <>
            {/* Category filter chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setCategoryFilter('all')}
                className="ad-tab shrink-0"
                data-active={categoryFilter === 'all'}
              >
                All ({menuItems.length})
              </button>
              {categoryOptions.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setCategoryFilter(value)}
                  className="ad-tab shrink-0"
                  data-active={categoryFilter === value}
                >
                  {label} ({menuItems.filter(i => i.category === value).length})
                </button>
              ))}
            </div>

            {/* Items table */}
            <div>
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
          <div>
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
        <div className="border border-ad-hairline bg-ad-surface p-3">
          <p className="ad-kicker m-0">Portion pricing</p>
          <p className="text-[12px] ad-muted mt-1 mb-3">Leave blank for single-size dishes.</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <NumberField control={itemForm.control} name="portionSingle" label="Single" prefix="₹" placeholder="—" />
            <NumberField control={itemForm.control} name="portionFull" label="Full" prefix="₹" placeholder="—" />
            <NumberField control={itemForm.control} name="portionLarge" label="Large" prefix="₹" placeholder="—" />
          </div>
        </div>
        <ImageUploadField control={itemForm.control} name="image" label="Dish Photo" folder="dishes" hint="Upload a photo directly from your device" />
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
        <TextField
          control={catForm.control}
          name="slug"
          label="Slug"
          placeholder={autoSlug || 'auto-generated'}
          hint="URL-safe key. Auto-fills from name."
        />
        <NumberField control={catForm.control} name="sortOrder" label="Sort Order" placeholder="1" hint="Lower numbers appear first in the menu" />
        <ImageUploadField control={catForm.control} name="image" label="Category Image" folder="categories" hint="Upload a circular thumbnail for the customer menu sidebar" />
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
