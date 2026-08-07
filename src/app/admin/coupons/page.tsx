'use client';

/* eslint-disable @typescript-eslint/no-explicit-any -- ColumnDef's first type
   parameter is the table feature set; `any` there is how this codebase spells
   "the default features" at every DataTable call site. */
import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { CheckCircle2, Edit2, Plus, Tag, Trash2 } from 'lucide-react';

import AdminLayout from '@/components/admin/AdminLayout';
import {
  useCoupons, useAddCoupon, useUpdateCoupon, useDeleteCoupon, type Coupon,
} from '@/lib/queries';
import { couponSchema, type CouponFormOutput, type CouponFormValues } from '@/lib/adminSchemas';
import { PageHeader, StatCard, SectionCard } from '@/components/admin/ui';
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
      // On edit the code comes from the record, not the form. The code is the
      // primary key and the update matches on it, so typing a new one in the
      // edit dialog used to send an UPDATE that matched no row at all —
      // reported as success while nothing changed.
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
      // A duplicate code is a fixable mistake about one field, so it belongs
      // on that field rather than in a toast the manager has to remember.
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
      header: 'Coupon Code',
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className="bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
        >
          {row.original.code}
        </Badge>
      ),
    },
    {
      accessorKey: 'discount',
      header: 'Discount %',
      cell: ({ row }) => (
        <span className="text-sm font-extrabold tabular-nums text-stone-900 dark:text-stone-100">
          {row.original.discount}% OFF
        </span>
      ),
    },
    {
      accessorKey: 'maxDiscount',
      header: 'Max Discount',
      cell: ({ row }) => (
        <span className="text-xs font-bold tabular-nums text-stone-600 dark:text-stone-300">
          Up to ₹{row.original.maxDiscount}
        </span>
      ),
    },
    {
      accessorKey: 'minOrder',
      header: 'Min Order',
      cell: ({ row }) => (
        <span className="text-xs font-bold tabular-nums text-stone-600 dark:text-stone-300">
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
          <span
            className={`text-xs font-bold ${row.original.isActive ? 'text-emerald-600' : 'text-stone-400'}`}
          >
            {row.original.isActive ? 'Active' : 'Disabled'}
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
            aria-label={`Edit ${row.original.code}`}
            onClick={() => openEdit(row.original)}
          >
            <Edit2 className="size-4 text-stone-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-rose-600"
            aria-label={`Delete ${row.original.code}`}
            // Was a bare `deleteCouponMutation.mutate(code)` — one stray tap on
            // a trash icon destroyed a live promo code with no confirmation
            // and no undo.
            onClick={() => setDeleting(row.original)}
          >
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
          <Badge
            variant="outline"
            className="bg-amber-50 px-2 py-0.5 text-xs font-black text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
          >
            {c.code}
          </Badge>
          <div className="mt-1.5 text-sm font-extrabold text-stone-900 dark:text-stone-100">
            {c.discount}% OFF
            <span className="ml-1.5 text-[11px] font-semibold text-stone-400">
              up to ₹{c.maxDiscount}
            </span>
          </div>
          {c.description && (
            <p className="mt-0.5 line-clamp-2 text-[11px] text-stone-400">{c.description}</p>
          )}
        </div>
        <Switch
          checked={c.isActive}
          onCheckedChange={(v) => toggleActive(c, v)}
          aria-label={`${c.code} active`}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-stone-100 pt-2.5 dark:border-[#2C2C2E]/60">
        <span className="text-[11px] font-bold text-stone-400">Min order ₹{c.minOrder}</span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg px-2.5 text-xs font-bold"
            onClick={() => openEdit(c)}
          >
            <Edit2 className="size-3.5" /> Edit
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-rose-600"
            aria-label={`Delete ${c.code}`}
            onClick={() => setDeleting(c)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  ), [toggleActive, openEdit]);

  return (
    <AdminLayout title="Coupons & Offers">
      <div className="w-full max-w-full space-y-4">
        <PageHeader
          title="Promo Coupons & Discount Codes"
          subtitle="Manage customer discount offers and promotional voucher codes"
          action={
            <Button
              onClick={openAdd}
              className="h-9 w-full rounded-lg bg-amber-600 px-3 text-xs font-extrabold text-white shadow-xs hover:bg-amber-700 sm:w-auto"
            >
              <Plus className="size-3.5" />
              Create Promo Code
            </Button>
          }
        />

        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Tag className="size-5" />}
            label="Total Coupons"
            value={coupons.length}
            sub="Registered discount codes"
            accent="#D97706"
          />
          <StatCard
            icon={<CheckCircle2 className="size-5" />}
            label="Active Coupons"
            value={activeCount}
            sub="Currently redeemable"
            accent="#059669"
          />
        </div>

        <SectionCard noPadding className="p-3">
          <DataTable
            columns={columns}
            data={coupons}
            searchKey="code"
            searchPlaceholder="Search coupon code..."
            height="500px"
            rowHeight={56}
            emptyMessage="No coupons yet. Create one to start offering discounts."
            renderMobileCard={renderMobileCard}
            getRowId={(c) => c.code}
          />
        </SectionCard>
      </div>

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        onSubmit={handleSubmit}
        title={editing ? `Edit ${editing.code}` : 'Create New Coupon'}
        description={
          editing
            ? 'The code itself cannot change — create a new coupon if you need a different one.'
            : 'Customers enter this code at checkout to claim the discount.'
        }
        submitLabel={editing ? 'Update Coupon' : 'Create Coupon'}
      >
        <TextField
          control={form.control}
          name="code"
          label="Coupon Code"
          placeholder="e.g. PALAPITTA10"
          autoFocus={!editing}
          disabled={!!editing}
          hint={editing ? 'Codes are permanent once created' : 'Letters and numbers, 3–20 characters'}
        />

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <NumberField
            control={form.control}
            name="discount"
            label="Discount"
            suffix="%"
            placeholder="10"
          />
          <NumberField
            control={form.control}
            name="maxDiscount"
            label="Max Discount"
            prefix="₹"
            placeholder="100"
            hint="Caps the amount"
          />
          <NumberField
            control={form.control}
            name="minOrder"
            label="Min Order"
            prefix="₹"
            placeholder="299"
          />
        </div>

        <TextField
          control={form.control}
          name="description"
          label="Description"
          placeholder="e.g. 10% off on orders above ₹299"
        />

        <SwitchField
          control={form.control}
          name="isActive"
          label="Active"
          hint="Inactive codes are rejected at checkout"
        />
      </FormDialog>

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={handleDelete}
        busy={deleteCoupon.isPending}
        title={`Delete ${deleting?.code}?`}
        description="Customers who have this code saved will no longer be able to redeem it. This cannot be undone."
      />
    </AdminLayout>
  );
}
