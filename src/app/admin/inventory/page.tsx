'use client';

/* eslint-disable @typescript-eslint/no-explicit-any -- ColumnDef's first type
   parameter is the table feature set; `any` there is how this codebase spells
   "the default features" at every DataTable call site. */
import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  AlertTriangle, CheckCircle2, Edit2, MinusCircle, Package, Plus, PlusCircle, Trash2,
} from 'lucide-react';

import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { InventoryItem } from '@/types';
import { generateInventoryId } from '@/lib/idGenerator';
import {
  INVENTORY_CATEGORIES, INVENTORY_UNITS, inventoryItemSchema,
  type InventoryFormOutput, type InventoryFormValues,
} from '@/lib/adminSchemas';
import { PageHeader, StatCard, SectionCard } from '@/components/admin/ui';
import {
  ConfirmDeleteDialog, FormDialog, NumberField, SelectField, TextField,
} from '@/components/admin/form-fields';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const CATEGORY_OPTIONS = INVENTORY_CATEGORIES.map((c) => ({ value: c, label: c }));
const UNIT_OPTIONS = INVENTORY_UNITS.map((u) => ({ value: u, label: u }));

const BLANK_FORM: InventoryFormValues = {
  name: '',
  category: 'Poultry & Meat',
  unit: 'Kg',
  currentStock: '' as unknown as number,
  minStockThreshold: 5,
  unitCost: '' as unknown as number,
  supplier: '',
};

const isLow = (i: InventoryItem) => i.currentStock <= i.minStockThreshold;

export default function InventoryPage() {
  const {
    inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, adjustInventoryQuantity,
  } = useAdmin();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'good'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState<InventoryItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: BLANK_FORM,
    mode: 'onTouched',
  });

  const lowStockCount = useMemo(() => inventory.filter(isLow).length, [inventory]);

  const filteredInventory = useMemo(
    () =>
      inventory.filter((item) => {
        const catMatch = selectedCategory === 'All' || item.category === selectedCategory;
        const low = isLow(item);
        const statusMatch =
          statusFilter === 'all' ||
          (statusFilter === 'low' && low) ||
          (statusFilter === 'good' && !low);
        return catMatch && statusMatch;
      }),
    [inventory, selectedCategory, statusFilter]
  );

  const openAdd = () => {
    setEditing(null);
    form.reset(BLANK_FORM);
    setDialogOpen(true);
  };

  /**
   * Opens the full form for editing, not a cut-down one.
   *
   * The edit dialog used to show only name, stock and threshold — so category,
   * unit, unit cost and supplier could be set when an item was created and
   * never corrected afterwards. Fixing a typo in a supplier name meant deleting
   * the item and re-adding it.
   */
  const openEdit = useCallback((item: InventoryItem) => {
    setEditing(item);
    form.reset({
      name: item.name,
      category: (INVENTORY_CATEGORIES as readonly string[]).includes(item.category)
        ? (item.category as InventoryFormValues['category'])
        : 'Poultry & Meat',
      unit: (INVENTORY_UNITS as readonly string[]).includes(item.unit)
        ? (item.unit as InventoryFormValues['unit'])
        : 'Kg',
      currentStock: item.currentStock,
      minStockThreshold: item.minStockThreshold,
      unitCost: item.unitCost,
      supplier: item.supplier ?? '',
    });
    setDialogOpen(true);
  }, [form]);

  const handleSubmit = async (values: InventoryFormOutput) => {
    const today = new Date().toISOString().split('T')[0];

    // Both spellings of every field are written together. The InventoryItem
    // model carries quantity/currentStock and unitCost/costPerUnit as aliases,
    // and the write layer reads the first of each pair — so setting only one
    // of them saved a stale number.
    const payload: InventoryItem = {
      ...(editing ?? {}),
      id: editing?.id ?? generateInventoryId(),
      name: values.name,
      category: values.category,
      unit: values.unit,
      currentStock: values.currentStock,
      quantity: values.currentStock,
      minStockThreshold: values.minStockThreshold,
      minQuantity: values.minStockThreshold,
      unitCost: values.unitCost,
      costPerUnit: values.unitCost,
      supplier: values.supplier,
      // Only a genuine increase counts as a restock; an edit that lowers or
      // leaves the count alone keeps the date it already had.
      lastRestocked:
        !editing || values.currentStock > editing.currentStock
          ? today
          : editing.lastRestocked ?? today,
      lastUpdated: today,
    };

    try {
      if (editing) {
        await updateInventoryItem(payload);
        toast.success(`${payload.name} updated`);
      } else {
        await addInventoryItem(payload);
        toast.success(`${payload.name} added to inventory`);
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error((err as Error).message || 'Could not save this item');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteInventoryItem(deleting.id);
      toast.success(`${deleting.name} deleted`);
      setDeleting(null);
    } catch (err) {
      toast.error((err as Error).message || 'Could not delete this item');
    } finally {
      setDeleteBusy(false);
    }
  };

  const columns = useMemo<ColumnDef<any, InventoryItem>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Item Name',
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="truncate font-extrabold text-stone-900 dark:text-stone-100">
            {row.original.name}
          </div>
          <div className="truncate text-xs font-medium text-stone-400">
            {row.original.supplier || 'No supplier recorded'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px] font-bold">
          {row.original.category}
        </Badge>
      ),
    },
    {
      accessorKey: 'currentStock',
      header: 'Stock Level',
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-black tabular-nums ${isLow(item) ? 'text-rose-600' : 'text-emerald-600'}`}
            >
              {item.currentStock} {item.unit}
            </span>
            {isLow(item) && (
              <Badge className="border-rose-500/20 bg-rose-500/10 text-[10px] font-bold text-rose-600">
                Low
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'unitCost',
      header: 'Unit Cost',
      cell: ({ row }) => (
        <span className="font-bold tabular-nums text-stone-800 dark:text-stone-200">
          ₹{row.original.unitCost} / {row.original.unit}
        </span>
      ),
    },
    {
      id: 'quickAdjust',
      header: 'Adjust Stock',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-7 rounded-md"
            aria-label={`Reduce ${row.original.name} by one ${row.original.unit}`}
            // Nothing to decrement at zero, and the store would clamp it
            // anyway — disabling says so instead of silently ignoring the tap.
            disabled={row.original.currentStock <= 0}
            onClick={() => adjustInventoryQuantity(row.original.id, -1)}
          >
            <MinusCircle className="size-3.5 text-stone-600" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-7 rounded-md"
            aria-label={`Add one ${row.original.unit} of ${row.original.name}`}
            onClick={() => adjustInventoryQuantity(row.original.id, 1)}
          >
            <PlusCircle className="size-3.5 text-stone-600" />
          </Button>
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
  ], [adjustInventoryQuantity, openEdit]);

  const renderMobileCard = useCallback((item: InventoryItem) => (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-extrabold text-stone-900 dark:text-stone-100">
            {item.name}
          </div>
          <div className="mt-0.5 truncate text-[11px] font-medium text-stone-400">
            {item.category}
            {item.supplier ? ` · ${item.supplier}` : ''}
          </div>
        </div>
        {isLow(item) && (
          <Badge className="shrink-0 border-rose-500/20 bg-rose-500/10 text-[10px] font-bold text-rose-600">
            Low stock
          </Badge>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <div
            className={`text-lg font-black tabular-nums ${isLow(item) ? 'text-rose-600' : 'text-emerald-600'}`}
          >
            {item.currentStock}
            <span className="ml-1 text-xs font-bold">{item.unit}</span>
          </div>
          <div className="text-[10.5px] font-semibold text-stone-400">
            Min {item.minStockThreshold} · ₹{item.unitCost}/{item.unit}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="size-9 rounded-lg"
            aria-label={`Reduce ${item.name} by one ${item.unit}`}
            disabled={item.currentStock <= 0}
            onClick={() => adjustInventoryQuantity(item.id, -1)}
          >
            <MinusCircle className="size-4 text-stone-600" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-9 rounded-lg"
            aria-label={`Add one ${item.unit} of ${item.name}`}
            onClick={() => adjustInventoryQuantity(item.id, 1)}
          >
            <PlusCircle className="size-4 text-stone-600" />
          </Button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-stone-100 pt-2.5 dark:border-[#2C2C2E]/60">
        <Button
          variant="outline"
          size="sm"
          className="h-8 flex-1 rounded-lg text-xs font-bold"
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
  ), [adjustInventoryQuantity, openEdit]);

  return (
    <AdminLayout title="Inventory & Stock">
      <div className="w-full max-w-full space-y-4">
        <PageHeader
          title="Inventory & Raw Materials"
          subtitle="Track stock levels, costs and suppliers for every raw material"
          action={
            <Button
              onClick={openAdd}
              className="h-9 w-full rounded-lg bg-amber-600 px-3 text-xs font-extrabold text-white shadow-xs hover:bg-amber-700 sm:w-auto"
            >
              <Plus className="size-3.5" />
              Add Raw Material
            </Button>
          }
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard
            icon={<Package className="size-5" />}
            label="Total Raw Materials"
            value={inventory.length}
            sub="Tracked inventory items"
            accent="#D97706"
          />
          <StatCard
            icon={<AlertTriangle className="size-5" />}
            label="Low Stock Alerts"
            value={lowStockCount}
            sub="At or below minimum"
            accent="#DC2626"
          />
          <StatCard
            icon={<CheckCircle2 className="size-5" />}
            label="Stock Health"
            value={`${Math.round(((inventory.length - lowStockCount) / Math.max(1, inventory.length)) * 100)}%`}
            sub="Sufficient inventory"
            accent="#059669"
          />
        </div>

        <SectionCard noPadding className="p-3 sm:p-4">
          <div className="mb-4 flex flex-col gap-3 border-b border-stone-100 pb-3 dark:border-[#2C2C2E]/60 lg:flex-row lg:items-center lg:justify-between">
            <div className="scrollbar-none flex w-full gap-2 overflow-x-auto lg:w-auto">
              {['All', ...INVENTORY_CATEGORIES].map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 rounded-full whitespace-nowrap text-xs font-bold ${
                    selectedCategory === cat ? 'bg-amber-600 text-white hover:bg-amber-700' : ''
                  }`}
                >
                  {cat}
                </Button>
              ))}
            </div>

            <div className="flex w-full gap-1 rounded-xl bg-stone-100 p-1 dark:bg-stone-800 lg:w-auto">
              {(['all', 'low', 'good'] as const).map((st) => (
                <Button
                  key={st}
                  variant={statusFilter === st ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter(st)}
                  className={`h-7 flex-1 rounded-lg text-xs font-bold capitalize lg:flex-none ${
                    statusFilter === st ? 'bg-amber-600 text-white hover:bg-amber-700' : ''
                  }`}
                >
                  {st}
                </Button>
              ))}
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filteredInventory}
            searchKey="name"
            searchPlaceholder="Search material name or supplier..."
            height="500px"
            rowHeight={56}
            emptyMessage="No materials match this filter."
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
        title={editing ? `Edit ${editing.name}` : 'Add Raw Material'}
        description={
          editing
            ? 'Every field is editable — correct a unit, cost or supplier without deleting the item.'
            : 'Stock below the minimum threshold raises a low-stock alert on the dashboard.'
        }
        submitLabel={editing ? 'Update Material' : 'Save Material'}
      >
        <TextField
          control={form.control}
          name="name"
          label="Item Name"
          placeholder="e.g. Sona Masoori Rice"
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
            name="unit"
            label="Unit"
            options={UNIT_OPTIONS}
          />
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <NumberField
            control={form.control}
            name="currentStock"
            label="Stock"
            placeholder="0"
            step={0.1}
          />
          <NumberField
            control={form.control}
            name="minStockThreshold"
            label="Min Threshold"
            placeholder="5"
            step={0.1}
            hint="Alert below this"
          />
          <NumberField
            control={form.control}
            name="unitCost"
            label="Unit Cost"
            prefix="₹"
            placeholder="0"
            step={0.01}
          />
        </div>

        <TextField
          control={form.control}
          name="supplier"
          label="Supplier"
          placeholder="Who you buy this from"
        />
      </FormDialog>

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={handleDelete}
        busy={deleteBusy}
        title={`Delete ${deleting?.name}?`}
        description="This removes the material and its stock record permanently. This cannot be undone."
      />
    </AdminLayout>
  );
}
