'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Edit2, Flame, Plus, Sparkles, Trash2 } from 'lucide-react';

import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { MenuItem as MenuItemType, PortionPrices } from '@/types';
import { categoryLabels } from '@/data/menuData';
import { generateMenuItemId } from '@/lib/idGenerator';
import { FALLBACK_DISH_IMAGE } from '@/lib/utils';
import {
  CATEGORY_VALUES, VEG_STATUS_VALUES, menuItemSchema,
  type MenuItemFormOutput, type MenuItemFormValues,
} from '@/lib/adminSchemas';
import { PageHeader } from '@/components/admin/ui';
import {
  ConfirmDeleteDialog, FormDialog, ImageUploadField, NumberField, SelectField, SwitchField,
  TextAreaField, TextField,
} from '@/components/admin/form-fields';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const CATEGORY_OPTIONS = CATEGORY_VALUES.map((value) => ({
  value,
  label: categoryLabels[value],
}));

const VEG_OPTIONS: { value: (typeof VEG_STATUS_VALUES)[number]; label: string }[] = [
  { value: 'veg', label: '🟢 Veg' },
  { value: 'non-veg', label: '🔴 Non-Veg' },
  { value: 'egg', label: '🟡 Egg' },
];

const BLANK_FORM: MenuItemFormValues = {
  name: '',
  category: 'biryani',
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

function toPortionPrices(v: MenuItemFormOutput): PortionPrices | undefined {
  const portions: PortionPrices = {};
  if (v.portionSingle !== undefined) portions.single = v.portionSingle;
  if (v.portionFull !== undefined) portions.full = v.portionFull;
  if (v.portionLarge !== undefined) portions.large = v.portionLarge;
  return Object.keys(portions).length > 0 ? portions : undefined;
}

export default function MenuManagementPage() {
  const {
    menuItems, addMenuItem, updateMenuItem, deleteMenuItem, toggleMenuItemAvailability,
  } = useAdmin();

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItemType | null>(null);
  const [deleting, setDeleting] = useState<MenuItemType | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const form = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: BLANK_FORM,
    mode: 'onTouched',
  });

  const filteredItems = useMemo(
    () => menuItems.filter((i) => categoryFilter === 'all' || i.category === categoryFilter),
    [menuItems, categoryFilter]
  );

  const openAdd = () => {
    setEditing(null);
    form.reset(BLANK_FORM);
    setDialogOpen(true);
  };

  const openEdit = useCallback((item: MenuItemType) => {
    setEditing(item);
    form.reset({
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
    setDialogOpen(true);
  }, [form]);

  const handleSubmit = async (values: MenuItemFormOutput) => {
    const payload: MenuItemType = {
      ...(editing ?? {}),
      id: editing?.id ?? generateMenuItemId(),
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
      rating: editing?.rating ?? 4.5,
      reviewCount: editing?.reviewCount ?? 0,
      tags: editing?.tags ?? [],
    };

    try {
      if (editing) {
        await updateMenuItem(payload);
        toast.success(`${payload.name} updated`);
      } else {
        await addMenuItem(payload);
        toast.success(`${payload.name} added to menu`);
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error((err as Error).message || 'Could not save this dish');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteMenuItem(deleting.id);
      toast.success(`${deleting.name} removed`);
      setDeleting(null);
    } catch (err) {
      toast.error((err as Error).message || 'Could not delete this dish');
    } finally {
      setDeleteBusy(false);
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

  const columns = useMemo<ColumnDef<any, MenuItemType>[]>(() => [
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
            {categoryLabels[row.original.category] || row.original.category}
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
          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(row.original)}>
            <Edit2 className="size-4 text-stone-500" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8 text-rose-600" onClick={() => setDeleting(row.original)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ], [toggleMenuItemAvailability, openEdit]);

  const renderMobileCard = useCallback((item: MenuItemType) => (
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
            <div className="text-xs text-stone-400">{categoryLabels[item.category] || item.category}</div>
          </div>
          <span className="text-sm font-semibold text-stone-900 tabular-nums shrink-0">₹{item.price}</span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-stone-100 pt-2">
          <Switch checked={item.isAvailable} onCheckedChange={() => toggleMenuItemAvailability(item.id)} aria-label={`${item.name} availability`} />
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={() => openEdit(item)}>Edit</Button>
            <Button variant="ghost" size="icon" className="size-7 text-rose-600" onClick={() => setDeleting(item)}><Trash2 className="size-3.5" /></Button>
          </div>
        </div>
      </div>
    </div>
  ), [toggleMenuItemAvailability, openEdit]);

  return (
    <AdminLayout title="Menu Management">
      <div className="w-full max-w-full space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-stone-900">Menu Management</h1>
            <p className="text-sm text-stone-500 mt-0.5">
              {menuItems.length} dishes · {menuItems.filter(i => i.isAvailable).length} available
            </p>
          </div>
          <Button onClick={openAdd} className="h-9 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4">
            <Plus className="size-4 mr-1.5" /> Add Dish
          </Button>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setCategoryFilter('all')}
            className={cn('shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap', categoryFilter === 'all' ? 'border-amber-600 bg-amber-600 text-white' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50')}
          >
            All ({menuItems.length})
          </button>
          {CATEGORY_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setCategoryFilter(value)}
              className={cn('shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap', categoryFilter === value ? 'border-amber-600 bg-amber-600 text-white' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50')}
            >
              {label} ({menuItems.filter(i => i.category === value).length})
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-stone-200">
          <DataTable
            columns={columns}
            data={filteredItems}
            searchKey="name"
            searchPlaceholder="Search dish name…"
            height="500px"
            rowHeight={64}
            emptyMessage="No dishes match this filter."
            renderMobileCard={renderMobileCard}
            getRowId={(item) => item.id}
          />
        </div>
      </div>

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        onSubmit={handleSubmit}
        title={editing ? 'Edit Dish' : 'Add New Dish'}
        description={editing ? 'Changes go live on the storefront when saved.' : 'Dish becomes orderable once saved and marked available.'}
        submitLabel={editing ? 'Update Dish' : 'Add to Menu'}
        size="lg"
      >
        <TextField control={form.control} name="name" label="Dish Name" placeholder="e.g. Hyderabadi Mutton Biryani" autoFocus />
        <div className="grid gap-3.5 sm:grid-cols-2">
          <SelectField control={form.control} name="category" label="Category" options={CATEGORY_OPTIONS} />
          <SelectField control={form.control} name="vegStatus" label="Veg Status" options={VEG_OPTIONS} />
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <NumberField control={form.control} name="price" label="Base Price" prefix="₹" placeholder="0" hint="Charged when no portion is chosen" />
          <NumberField control={form.control} name="prepTime" label="Prep Time" suffix="min" placeholder="20" />
        </div>
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
          <p className="text-xs font-medium text-stone-600 mb-1">Portion Pricing</p>
          <p className="text-xs text-stone-400 mb-3">Leave blank for single-size dishes.</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <NumberField control={form.control} name="portionSingle" label="Single" prefix="₹" placeholder="—" />
            <NumberField control={form.control} name="portionFull" label="Full" prefix="₹" placeholder="—" />
            <NumberField control={form.control} name="portionLarge" label="Large" prefix="₹" placeholder="—" />
          </div>
        </div>
        <ImageUploadField control={form.control} name="image" label="Dish Photo" hint="Upload a photo from your device" />
        <TextAreaField control={form.control} name="description" label="Description" rows={3} placeholder="Ingredients, cooking style…" />
        <SwitchField control={form.control} name="isAvailable" label="Available to order" hint="Turn off to keep listed but unorderable" />
        <SwitchField control={form.control} name="isSpecial" label="Chef's Special" hint="Features in the top showcase" />
        <SwitchField control={form.control} name="isPopular" label="Bestseller" hint="Adds the popular badge" />
      </FormDialog>

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={handleDelete}
        busy={deleteBusy}
        title={`Delete ${deleting?.name}?`}
        description="This permanently removes the dish from the menu. Past orders are not affected."
      />
    </AdminLayout>
  );
}
