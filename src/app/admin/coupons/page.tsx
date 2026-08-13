'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Edit2, Plus, Trash2 } from 'lucide-react';

import AdminLayout from '@/components/admin/AdminLayout';
import {
  useCoupons, useAddCoupon, useUpdateCoupon, useDeleteCoupon, type Coupon,
} from '@/lib/queries';
import { couponSchema, type CouponFormOutput, type CouponFormValues } from '@/lib/adminSchemas';
import { PageHeader } from '@/components/admin/ui';
import {
  ConfirmDeleteDialog, FormDialog, NumberField, SwitchField, TextField,
} from '@/components/admin/form-fields';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

const BLANK_FORM: CouponFormValues = {
  code: '',
  discount: 10,
  maxDiscount: 100,
  minOrder: 299,
  description: '',
  isActive: true,
};

export default function CouponsPage() {
  const { data: coupons = [] } = useCoupons();
  const addCoupon = useAddCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState<Coupon | null>(null);

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: BLANK_FORM,
    mode: 'onTouched',
  });

  const activeCount = useMemo(() => coupons.filter((c) => c.isActive).length, [coupons]);

  const openAdd = () => {
    setEditing(null);
    form.reset(BLANK_FORM);
    setDialogOpen(true);
  };

  const openEdit = useCallback((c: Coupon) => {
    setEditing(c);
    form.reset({
      code: c.code,
      discount: c.discount,
      maxDiscount: c.maxDiscount,
      minOrder: c.minOrder,
      description: c.description,
      isActive: c.isActive,
    });
    setDialogOpen(true);
  }, [form]);

  const handleSubmit = async (values: CouponFormOutput) => {
    const payload: Coupon = {
      code: editing ? editing.code : values.code,
      discount: values.discount,
      maxDiscount: values.maxDiscount,
      minOrder: values.minOrder,
      description: values.description,
      isActive: values.isActive,
    };

    try {
      if (editing) {
        await updateCoupon.mutateAsync(payload);
        toast.success(`Coupon ${payload.code} updated`);
      } else {
        await addCoupon.mutateAsync(payload);
        toast.success(`Coupon ${payload.code} created`);
      }
      setDialogOpen(false);
    } catch (err) {
      const message = (err as Error).message || 'Could not save this coupon';
      if (/already exists/i.test(message)) {
        form.setError('code', { message });
        return;
      }
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteCoupon.mutateAsync(deleting.code);
      toast.success(`Coupon ${deleting.code} deleted`);
      setDeleting(null);
    } catch (err) {
      toast.error((err as Error).message || 'Could not delete this coupon');
    }
  };

  const toggleActive = useCallback(
    (c: Coupon, next: boolean) => {
      updateCoupon.mutate(
        { ...c, isActive: next },
        {
          onError: (err) =>
            toast.error((err as Error).message || `Could not update ${c.code}`),
        }
      );
    },
    [updateCoupon]
  );

  const columns = useMemo<ColumnDef<any, Coupon>[]>(() => [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => (
        <span className="font-mono text-sm font-semibold text-stone-900">{row.original.code}</span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-sm text-stone-600">{row.original.description || '—'}</span>
      ),
    },
    {
      accessorKey: 'discount',
      header: 'Discount',
      cell: ({ row }) => (
        <span className="text-sm font-medium text-stone-900 tabular-nums">
          {row.original.discount}% OFF
        </span>
      ),
    },
    {
      accessorKey: 'maxDiscount',
      header: 'Max Discount',
      cell: ({ row }) => (
        <span className="text-xs text-stone-500 tabular-nums">
          Up to ₹{row.original.maxDiscount}
        </span>
      ),
    },
    {
      accessorKey: 'minOrder',
      header: 'Min Order',
      cell: ({ row }) => (
        <span className="text-xs text-stone-500 tabular-nums">
          ₹{row.original.minOrder}
        </span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={row.original.isActive}
            onCheckedChange={(v) => toggleActive(row.original, v)}
            aria-label={`${row.original.code} active`}
          />
          <span className={`text-xs ${row.original.isActive ? 'text-emerald-700' : 'text-stone-400'}`}>
            {row.original.isActive ? 'Active' : 'Disabled'}
          </span>
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
  ], [toggleActive, openEdit]);

  const renderMobileCard = useCallback((c: Coupon) => (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="font-mono text-sm font-semibold text-stone-900">{c.code}</span>
          <div className="mt-1 text-sm font-medium text-stone-900">
            {c.discount}% OFF
            <span className="ml-1.5 text-xs text-stone-400">up to ₹{c.maxDiscount}</span>
          </div>
          {c.description && <p className="mt-1 text-xs text-stone-400 leading-normal">{c.description}</p>}
        </div>
        <Switch checked={c.isActive} onCheckedChange={(v) => toggleActive(c, v)} aria-label={`${c.code} active`} />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-2">
        <span className="text-xs text-stone-400">Min order ₹{c.minOrder}</span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={() => openEdit(c)}>Edit</Button>
          <Button variant="ghost" size="icon" className="size-7 text-rose-600" onClick={() => setDeleting(c)}><Trash2 className="size-3.5" /></Button>
        </div>
      </div>
    </div>
  ), [toggleActive, openEdit]);

  return (
    <AdminLayout title="Coupons">
      <div className="w-full max-w-full space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-stone-900">Coupons & Offers</h1>
            <p className="text-sm text-stone-500 mt-0.5">
              {coupons.length} total · {activeCount} active currently
            </p>
          </div>
          <Button onClick={openAdd} className="h-9 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4">
            <Plus className="size-4 mr-1.5" /> Create Code
          </Button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-stone-200">
          <DataTable
            columns={columns}
            data={coupons}
            searchKey="code"
            searchPlaceholder="Search coupon code…"
            height="500px"
            rowHeight={56}
            emptyMessage="No coupons yet. Create one to start offering discounts."
            renderMobileCard={renderMobileCard}
            getRowId={(c) => c.code}
          />
        </div>
      </div>

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        onSubmit={handleSubmit}
        title={editing ? `Edit ${editing.code}` : 'Create New Coupon'}
        description={editing ? 'The code itself cannot change. Create a new coupon for a different code.' : 'Customers enter this code at checkout.'}
        submitLabel={editing ? 'Update Coupon' : 'Create Coupon'}
      >
        <TextField control={form.control} name="code" label="Coupon Code" placeholder="e.g. PALAPITTA10" autoFocus={!editing} disabled={!!editing} hint={editing ? 'Codes are permanent once created' : 'Letters and numbers, 3–20 characters'} />
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <NumberField control={form.control} name="discount" label="Discount" suffix="%" placeholder="10" />
          <NumberField control={form.control} name="maxDiscount" label="Max Discount" prefix="₹" placeholder="100" hint="Caps the amount" />
          <NumberField control={form.control} name="minOrder" label="Min Order" prefix="₹" placeholder="299" />
        </div>
        <TextField control={form.control} name="description" label="Description" placeholder="e.g. 10% off on orders above ₹299" />
        <SwitchField control={form.control} name="isActive" label="Active" hint="Inactive codes are rejected at checkout" />
      </FormDialog>

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={handleDelete}
        busy={deleteCoupon.isPending}
        title={`Delete ${deleting?.code}?`}
        description="Customers who have this code saved will no longer be able to redeem it."
      />
    </AdminLayout>
  );
}
