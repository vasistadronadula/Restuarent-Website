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
import { Pill } from '@/components/admin/ui';
import {
  ConfirmDeleteDialog, FormDialog, NumberField, SwitchField, TextField,
} from '@/components/admin/form-fields';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';


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
        <span className="ad-num text-[14px] tracking-[0.04em]">{row.original.code}</span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="ad-muted">{row.original.description || '—'}</span>
      ),
    },
    {
      accessorKey: 'discount',
      header: 'Discount',
      cell: ({ row }) => (
        <span className="ad-num text-[14px]">{row.original.discount}%</span>
      ),
    },
    {
      accessorKey: 'maxDiscount',
      header: 'Max Discount',
      cell: ({ row }) => (
        <span className="ad-muted tabular-nums">₹{row.original.maxDiscount}</span>
      ),
    },
    {
      accessorKey: 'minOrder',
      header: 'Min Order',
      cell: ({ row }) => (
        <span className="ad-muted tabular-nums">₹{row.original.minOrder}</span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Pill
          on={row.original.isActive}
          onLabel="Live"
          offLabel="Paused"
          onClick={() => toggleActive(row.original, !row.original.isActive)}
        />
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button type="button" className="ad-btn ad-btn-secondary ad-btn-icon" onClick={() => openEdit(row.original)} aria-label={`Edit ${row.original.code}`}>
            <Edit2 className="size-4" />
          </button>
          <button type="button" className="ad-btn ad-btn-secondary ad-btn-icon" onClick={() => setDeleting(row.original)} aria-label={`Delete ${row.original.code}`} style={{ color: 'var(--ad-a700)' }}>
            <Trash2 className="size-4" />
          </button>
        </div>
      ),
    },
  ], [toggleActive, openEdit]);

  const renderMobileCard = useCallback((c: Coupon) => (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="ad-num text-[15px] tracking-[0.04em]">{c.code}</span>
          <div className="ad-num text-[20px] mt-1">
            {c.discount}%
            <span className="ad-muted text-[12px] font-normal ml-1.5">up to ₹{c.maxDiscount}</span>
          </div>
          {c.description && <p className="mt-1 text-[12px] ad-muted leading-normal m-0">{c.description}</p>}
        </div>
        <Pill on={c.isActive} onLabel="Live" offLabel="Paused" onClick={() => toggleActive(c, !c.isActive)} />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-ad-hairline pt-2.5">
        <span className="ad-kicker">Min order ₹{c.minOrder}</span>
        <div className="flex items-center gap-1.5">
          <button type="button" className="ad-btn ad-btn-secondary ad-btn-sm" onClick={() => openEdit(c)}>Edit</button>
          <button type="button" className="ad-btn ad-btn-secondary ad-btn-sm" onClick={() => setDeleting(c)} style={{ color: 'var(--ad-a700)' }} aria-label={`Delete ${c.code}`}>
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  ), [toggleActive, openEdit]);

  return (
    <AdminLayout title="Coupons">
      <div className="w-full max-w-full space-y-4">
        <div className="ad-section-head">
          <h3 className="ad-h text-[17px]">Active campaigns</h3>
          <span className="text-[12px] ad-muted">{coupons.length} total · {activeCount} live</span>
          <button type="button" onClick={openAdd} className="ad-btn ad-btn-primary ml-auto">
            <Plus className="size-4" /> Create coupon
          </button>
        </div>

        <div>
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
