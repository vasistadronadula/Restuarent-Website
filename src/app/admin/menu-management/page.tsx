'use client';

/* eslint-disable @typescript-eslint/no-explicit-any -- ColumnDef's first type
   parameter is the table feature set; `any` there is how this codebase spells
   "the default features" at every DataTable call site. */
import { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Edit2, Flame, Plus, Sparkles, Trash2, Utensils,
} from 'lucide-react';

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
import { PageHeader, StatCard, SectionCard } from '@/components/admin/ui';
import {
  ConfirmDeleteDialog, FormDialog, NumberField, SelectField, SwitchField,
  TextAreaField, TextField,
} from '@/components/admin/form-fields';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

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

/** `{}` rather than `{ single: undefined }` — an all-blank portion set means
 *  the dish has no sizes, and the storefront checks for the key's presence. */
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
    // Validate once a field has been touched and left, then live as it is
    // corrected. Validating on every keystroke from the start flags "Dish name
    // is required" on the first character typed, which reads as the form
    // fighting you.
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
      // Blank, not 0 — an empty portion box means "this dish doesn't come in
      // that size", and prefilling 0 would offer a free Large on the menu.
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
    // Spreading the record being edited preserves the fields this form does
    // not show — rating, reviewCount, tags. Rebuilding the object from the
    // form alone reset every dish's rating to 4.5 and wiped its tags on save.
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
        toast.success(`${payload.name} added to the menu`);
      }
      setDialogOpen(false);
    } catch (err) {
      // The server's own words, not "Failed to save menu item" — an RLS
      // rejection and a duplicate id are different problems with different fixes.
      toast.error((err as Error).message || 'Could not save this dish');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteMenuItem(deleting.id);
      toast.success(`${deleting.name} removed from the menu`);
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

  // `ColumnDef` in this version takes the table's feature set first, so the
  // row type is the second argument, not the first.
  const columns = useMemo<ColumnDef<any, MenuItemType>[]>(() => [
    {
      accessorKey: 'image',
      header: 'Image',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="relative size-12 overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800">
          <Image
            src={row.original.image || FALLBACK_DISH_IMAGE}
            alt=""
            fill
            sizes="48px"
            className="object-cover"
          />
        </div>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Dish Name',
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-extrabold text-stone-900 dark:text-stone-100">
            <span className="truncate">{row.original.name}</span>
            {row.original.isSpecial && <Sparkles className="size-3.5 shrink-0 text-amber-500" />}
            {row.original.isPopular && <Flame className="size-3.5 shrink-0 text-rose-500" />}
          </div>
          <div className="line-clamp-1 text-xs font-medium text-stone-400">
            {row.original.description}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px] font-bold uppercase">
          {categoryLabels[row.original.category] || row.original.category}
        </Badge>
      ),
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }) => (
        <div>
          <span className="text-sm font-black text-amber-700 dark:text-amber-500">
            ₹{row.original.price}
          </span>
          {priceLabel(row.original) && (
            <div className="text-[10px] font-semibold tabular-nums text-stone-400">
              {priceLabel(row.original)}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'isAvailable',
      header: 'Availability',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={row.original.isAvailable}
            onCheckedChange={() => toggleMenuItemAvailability(row.original.id)}
            aria-label={`${row.original.name} availability`}
          />
          <span
            className={`text-xs font-bold ${row.original.isAvailable ? 'text-emerald-600' : 'text-stone-400'}`}
          >
            {row.original.isAvailable ? 'In Stock' : 'Out of Stock'}
          </span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={`Edit ${row.original.name}`}
            onClick={() => openEdit(row.original)}
          >
            <Edit2 className="size-4 text-stone-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-rose-600"
            aria-label={`Delete ${row.original.name}`}
            onClick={() => setDeleting(row.original)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ], [toggleMenuItemAvailability, openEdit]);

  /** The same record as a phone card: photo and name first, then the two
   *  things a manager changes from this screen — price and availability. */
  const renderMobileCard = useCallback((item: MenuItemType) => (
    <div className="flex gap-3">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800">
        <Image
          src={item.image || FALLBACK_DISH_IMAGE}
          alt=""
          fill
          sizes="64px"
          className="object-cover"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-extrabold text-stone-900 dark:text-stone-100">
                {item.name}
              </span>
              {item.isSpecial && <Sparkles className="size-3 shrink-0 text-amber-500" />}
              {item.isPopular && <Flame className="size-3 shrink-0 text-rose-500" />}
            </div>
            <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-stone-400">
              {categoryLabels[item.category] || item.category}
            </div>
          </div>
          <span className="shrink-0 text-sm font-black text-amber-700 dark:text-amber-500">
            ₹{item.price}
          </span>
        </div>

        {priceLabel(item) && (
          <div className="mt-1 text-[10px] font-semibold tabular-nums text-stone-400">
            {priceLabel(item)}
          </div>
        )}

        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-stone-100 pt-2.5 dark:border-[#2C2C2E]/60">
          <label className="flex items-center gap-2">
            <Switch
              checked={item.isAvailable}
              onCheckedChange={() => toggleMenuItemAvailability(item.id)}
              aria-label={`${item.name} availability`}
            />
            <span
              className={`text-[11px] font-bold ${item.isAvailable ? 'text-emerald-600' : 'text-stone-400'}`}
            >
              {item.isAvailable ? 'In Stock' : 'Sold out'}
            </span>
          </label>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg px-2.5 text-xs font-bold"
              onClick={() => openEdit(item)}
            >
              <Edit2 className="size-3.5" /> Edit
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-rose-600"
              aria-label={`Delete ${item.name}`}
              onClick={() => setDeleting(item)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  ), [toggleMenuItemAvailability, openEdit]);

  return (
    <AdminLayout title="Menu Management">
      <div className="w-full max-w-full space-y-4">
        <PageHeader
          title="Restaurant Menu Management"
          subtitle="Add dishes, set portion pricing and control what the storefront can sell"
          action={
            <Button
              onClick={openAdd}
              className="h-9 w-full rounded-lg bg-amber-600 px-3 text-xs font-extrabold text-white shadow-xs hover:bg-amber-700 sm:w-auto"
            >
              <Plus className="size-3.5" />
              Add New Dish
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            icon={<Utensils className="size-5" />}
            label="Total Menu Items"
            value={menuItems.length}
            sub="Active catalog count"
            accent="#D97706"
          />
          <StatCard
            icon={<Sparkles className="size-5" />}
            label="Chef Specials"
            value={menuItems.filter((i) => i.isSpecial).length}
            sub="Featured items"
            accent="#059669"
          />
          <StatCard
            icon={<Flame className="size-5" />}
            label="Bestsellers"
            value={menuItems.filter((i) => i.isPopular).length}
            sub="High demand dishes"
            accent="#DC2626"
          />
        </div>

        <SectionCard noPadding className="p-3">
          <div className="scrollbar-none mb-3 flex gap-2 overflow-x-auto border-b border-stone-100 pb-2.5 dark:border-[#2C2C2E]/60">
            <Button
              variant={categoryFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter('all')}
              className={`shrink-0 rounded-full text-xs font-bold ${categoryFilter === 'all' ? 'bg-amber-600 text-white hover:bg-amber-700' : ''}`}
            >
              All Items ({menuItems.length})
            </Button>
            {CATEGORY_OPTIONS.map(({ value, label }) => (
              <Button
                key={value}
                variant={categoryFilter === value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter(value)}
                className={`shrink-0 rounded-full whitespace-nowrap text-xs font-bold ${
                  categoryFilter === value ? 'bg-amber-600 text-white hover:bg-amber-700' : ''
                }`}
              >
                {label} ({menuItems.filter((i) => i.category === value).length})
              </Button>
            ))}
          </div>

          <DataTable
            columns={columns}
            data={filteredItems}
            searchKey="name"
            searchPlaceholder="Search dish name or description..."
            height="550px"
            rowHeight={64}
            emptyMessage="No dishes match this filter."
            renderMobileCard={renderMobileCard}
            getRowId={(item) => item.id}
          />
        </SectionCard>
      </div>

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        onSubmit={handleSubmit}
        title={editing ? 'Edit Dish' : 'Add New Dish'}
        description={
          editing
            ? 'Changes go live on the storefront as soon as you save.'
            : 'This dish becomes orderable the moment it is saved and marked available.'
        }
        submitLabel={editing ? 'Update Dish' : 'Add to Menu'}
        size="lg"
      >
        <TextField
          control={form.control}
          name="name"
          label="Dish Name"
          placeholder="e.g. Hyderabadi Mutton Biryani"
          autoFocus
        />

        <div className="grid gap-3.5 sm:grid-cols-2">
          <SelectField
            control={form.control}
            name="category"
            label="Category"
            options={CATEGORY_OPTIONS}
          />
          <SelectField
            control={form.control}
            name="vegStatus"
            label="Veg Status"
            options={VEG_OPTIONS}
          />
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <NumberField
            control={form.control}
            name="price"
            label="Base Price"
            prefix="₹"
            placeholder="0"
            hint="Charged when no portion is chosen"
          />
          <NumberField
            control={form.control}
            name="prepTime"
            label="Prep Time"
            suffix="min"
            placeholder="20"
          />
        </div>

        <div className="rounded-xl border border-stone-200/60 bg-stone-50/60 p-3 dark:border-[#2C2C2E]/50 dark:bg-stone-900/40">
          <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Portion Pricing
          </p>
          <p className="mt-0.5 mb-3 text-[11px] text-stone-400">
            Leave blank for dishes that come one size. Filling two or more shows
            size pills on the storefront.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <NumberField control={form.control} name="portionSingle" label="Single" prefix="₹" placeholder="—" />
            <NumberField control={form.control} name="portionFull" label="Full" prefix="₹" placeholder="—" />
            <NumberField control={form.control} name="portionLarge" label="Large" prefix="₹" placeholder="—" />
          </div>
        </div>

        <TextField
          control={form.control}
          name="image"
          label="Image URL"
          type="url"
          placeholder="https://..."
          hint="Leave blank to use the default dish photo"
        />

        <TextAreaField
          control={form.control}
          name="description"
          label="Description"
          rows={3}
          placeholder="Ingredients, cooking style, what makes it worth ordering..."
        />

        <SwitchField
          control={form.control}
          name="isAvailable"
          label="Available to order"
          hint="Turn off to keep the dish listed but unorderable"
        />
        <SwitchField
          control={form.control}
          name="isSpecial"
          label="Chef's Special"
          hint="Features the dish in the top showcase"
        />
        <SwitchField
          control={form.control}
          name="isPopular"
          label="Bestseller"
          hint="Adds the popular badge"
        />
      </FormDialog>

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={handleDelete}
        busy={deleteBusy}
        title={`Delete ${deleting?.name}?`}
        description="This permanently removes the dish from the menu catalog. Past orders that included it are not affected."
      />
    </AdminLayout>
  );
}
