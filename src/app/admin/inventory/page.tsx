'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { AlertTriangle, Edit2, MinusCircle, Plus, PlusCircle, Trash2 } from 'lucide-react';

import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { InventoryItem } from '@/types';
import { generateInventoryId } from '@/lib/idGenerator';
import {
  INVENTORY_CATEGORIES, INVENTORY_UNITS, inventoryItemSchema,
  type InventoryFormOutput, type InventoryFormValues,
} from '@/lib/adminSchemas';
import { PageHeader } from '@/components/admin/ui';
import {
  ConfirmDeleteDialog, FormDialog, NumberField, SelectField, TextField,
} from '@/components/admin/form-fields';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, adjustInventoryQuantity } = useAdmin();

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
    () => inventory.filter((item) => {
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

  const openAdd = () => { setEditing(null); form.reset(BLANK_FORM); setDialogOpen(true); };

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
      lastRestocked: !editing || values.currentStock > editing.currentStock ? today : editing.lastRestocked ?? today,
      lastUpdated: today,
    };

    try {
      if (editing) { await updateInventoryItem(payload); toast.success(`${payload.name} updated`); }
      else { await addInventoryItem(payload); toast.success(`${payload.name} added`); }
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
      toast.error((err as Error).message || 'Could not delete');
    } finally {
      setDeleteBusy(false);
    }
  };

  const columns = useMemo<ColumnDef<any, InventoryItem>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Item',
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className={cn('font-medium text-sm truncate', isLow(row.original) ? 'text-rose-700' : 'text-stone-900')}>
            {row.original.name}
            {isLow(row.original) && <AlertTriangle className="inline ml-1.5 size-3.5 text-rose-500" />}
          </div>
          <div className="text-xs text-stone-400 truncate">{row.original.supplier || 'No supplier'}</div>
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <span className="text-xs text-stone-600">{row.original.category}</span>
      ),
    },
    {
      accessorKey: 'currentStock',
      header: 'Stock',
      cell: ({ row }) => {
        const item = row.original;
        return (
          <span className={cn('text-sm font-semibold tabular-nums', isLow(item) ? 'text-rose-600' : 'text-emerald-700')}>
            {item.currentStock} <span className="font-normal text-stone-400 text-xs">{item.unit}</span>
          </span>
        );
      },
    },
    {
      accessorKey: 'minStockThreshold',
      header: 'Min',
      cell: ({ row }) => (
        <span className="text-xs text-stone-500 tabular-nums">{row.original.minStockThreshold} {row.original.unit}</span>
      ),
    },
    {
      accessorKey: 'unitCost',
      header: 'Cost/Unit',
      cell: ({ row }) => (
        <span className="text-sm text-stone-700 tabular-nums">₹{row.original.unitCost}</span>
      ),
    },
    {
      id: 'quickAdjust',
      header: 'Adjust',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="size-7" disabled={row.original.currentStock <= 0}
            onClick={() => adjustInventoryQuantity(row.original.id, -1)}>
            <MinusCircle className="size-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="size-7"
            onClick={() => adjustInventoryQuantity(row.original.id, 1)}>
            <PlusCircle className="size-3.5" />
          </Button>
        </div>
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
  ], [adjustInventoryQuantity, openEdit]);

  const renderMobileCard = useCallback((item: InventoryItem) => (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={cn('text-sm font-medium truncate', isLow(item) ? 'text-rose-700' : 'text-stone-900')}>
            {item.name}
          </div>
          <div className="text-xs text-stone-400">{item.category}{item.supplier ? ` · ${item.supplier}` : ''}</div>
        </div>
        {isLow(item) && <span className="text-xs bg-rose-50 text-rose-600 border border-rose-200 rounded px-1.5 py-0.5 shrink-0">Low</span>}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <div className={cn('text-lg font-bold tabular-nums', isLow(item) ? 'text-rose-600' : 'text-emerald-700')}>
            {item.currentStock}<span className="ml-1 text-xs font-normal">{item.unit}</span>
          </div>
          <div className="text-xs text-stone-400">Min {item.minStockThreshold} · ₹{item.unitCost}/{item.unit}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="size-9" disabled={item.currentStock <= 0} onClick={() => adjustInventoryQuantity(item.id, -1)}>
            <MinusCircle className="size-4" />
          </Button>
          <Button variant="outline" size="icon" className="size-9" onClick={() => adjustInventoryQuantity(item.id, 1)}>
            <PlusCircle className="size-4" />
          </Button>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-stone-100 pt-2.5">
        <Button variant="outline" size="sm" className="h-8 flex-1 text-xs" onClick={() => openEdit(item)}>Edit</Button>
        <Button variant="ghost" size="icon" className="size-8 text-rose-600" onClick={() => setDeleting(item)}><Trash2 className="size-4" /></Button>
      </div>
    </div>
  ), [adjustInventoryQuantity, openEdit]);

  return (
    <AdminLayout title="Inventory & Stock">
      <div className="w-full max-w-full space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-stone-900">Inventory & Stock</h1>
            <p className="text-sm text-stone-500 mt-0.5">
              {inventory.length} items ·{' '}
              {lowStockCount > 0
                ? <span className="text-rose-600 font-medium">{lowStockCount} low stock</span>
                : <span className="text-emerald-600 font-medium">All stocked</span>
              }
            </p>
          </div>
          <Button onClick={openAdd} className="h-9 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4">
            <Plus className="size-4 mr-1.5" /> Add Item
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none flex-1">
            {(['All', ...INVENTORY_CATEGORIES]).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn('shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap', selectedCategory === cat ? 'border-amber-600 bg-amber-600 text-white' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50')}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-stone-100 rounded-lg p-1 shrink-0">
            {(['all', 'low', 'good'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={cn('px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors', statusFilter === st ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700')}
              >
                {st === 'all' ? 'All' : st === 'low' ? '⚠ Low' : '✓ Good'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-stone-200">
          <DataTable
            columns={columns}
            data={filteredInventory}
            searchKey="name"
            searchPlaceholder="Search item or supplier…"
            height="500px"
            rowHeight={56}
            emptyMessage="No items match this filter."
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
        title={editing ? `Edit ${editing.name}` : 'Add Raw Material'}
        description={editing ? 'Correct unit, cost or supplier without deleting the item.' : 'Stock below the minimum will raise a low-stock alert.'}
        submitLabel={editing ? 'Update Material' : 'Save Material'}
      >
        <TextField control={form.control} name="name" label="Item Name" placeholder="e.g. Sona Masoori Rice" autoFocus />
        <div className="grid gap-3.5 sm:grid-cols-2">
          <SelectField control={form.control} name="category" label="Category" options={CATEGORY_OPTIONS} />
          <SelectField control={form.control} name="unit" label="Unit" options={UNIT_OPTIONS} />
        </div>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <NumberField control={form.control} name="currentStock" label="Stock" placeholder="0" step={0.1} />
          <NumberField control={form.control} name="minStockThreshold" label="Min Threshold" placeholder="5" step={0.1} hint="Alert below this" />
          <NumberField control={form.control} name="unitCost" label="Unit Cost" prefix="₹" placeholder="0" step={0.01} />
        </div>
        <TextField control={form.control} name="supplier" label="Supplier" placeholder="Who you buy this from" />
      </FormDialog>

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={handleDelete}
        busy={deleteBusy}
        title={`Delete ${deleting?.name}?`}
        description="This removes the material and its stock record permanently."
      />
    </AdminLayout>
  );
}
