'use client';

import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Edit2, Plus, Trash2, Users, Clock } from 'lucide-react';

import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import {
  useTables, useAddTable, useUpdateTable, useDeleteTable, type RestaurantTable,
} from '@/lib/queries';
import { diningTableSchema, type DiningTableFormOutput, type DiningTableFormValues } from '@/lib/adminSchemas';
import { generateTableId } from '@/lib/idGenerator';
import { formatCurrency } from '@/lib/utils';
import { useNow } from '@/hooks/useNow';
import { Pill } from '@/components/admin/ui';
import { ConfirmDeleteDialog, FormDialog, NumberField, SwitchField, TextField } from '@/components/admin/form-fields';
import type { Order } from '@/types';

const BLANK_FORM: DiningTableFormValues = {
  tableNumber: 1,
  capacity: 4,
  description: '',
  isActive: true,
};

type Occupancy = {
  status: 'available' | 'ordered' | 'waiting_payment';
  activeOrder?: Order;
  runningBill?: number;
  elapsedMinutes?: number;
};

export default function TablesPage() {
  const { orders } = useAdmin();
  const { data: tables = [] } = useTables();
  const addTable = useAddTable();
  const updateTable = useUpdateTable();
  const deleteTable = useDeleteTable();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RestaurantTable | null>(null);
  const [deleting, setDeleting] = useState<RestaurantTable | null>(null);
  const now = useNow(30_000);

  const form = useForm<DiningTableFormValues>({
    resolver: zodResolver(diningTableSchema),
    defaultValues: BLANK_FORM,
    mode: 'onTouched',
  });

  // Live occupancy, straight off the same `orders` feed RealtimeProvider
  // keeps current everywhere else — a table flips the moment POS/KDS
  // changes the order sitting on it, no separate polling.
  const occupancyMap = useMemo(() => {
    const map = new Map<number, Occupancy>();
    tables.forEach((t) => map.set(t.tableNumber, { status: 'available' }));

    orders.forEach((o) => {
      if (
        typeof o.tableNumber === 'number' &&
        o.status !== 'delivered' &&
        o.status !== 'cancelled'
      ) {
        const orderTime = o.createdAt ? new Date(o.createdAt).getTime() : now;
        const elapsedMinutes = Math.max(1, Math.floor((now - orderTime) / 60000));
        map.set(o.tableNumber, {
          status: o.paymentStatus === 'paid' ? 'ordered' : 'waiting_payment',
          activeOrder: o,
          runningBill: o.grandTotal,
          elapsedMinutes,
        });
      }
    });

    return map;
  }, [tables, orders, now]);

  const stats = useMemo(() => {
    let available = 0, occupied = 0, waitingPayment = 0;
    tables.forEach((t) => {
      const status = occupancyMap.get(t.tableNumber)?.status;
      if (status === 'waiting_payment') waitingPayment++;
      else if (status === 'ordered') occupied++;
      else available++;
    });
    return { available, occupied, waitingPayment, total: tables.length };
  }, [tables, occupancyMap]);

  const nextTableNumber = useMemo(
    () => tables.reduce((max, t) => Math.max(max, t.tableNumber), 0) + 1,
    [tables]
  );

  const openAdd = () => {
    setEditing(null);
    form.reset({ ...BLANK_FORM, tableNumber: nextTableNumber });
    setDialogOpen(true);
  };

  const openEdit = useCallback((t: RestaurantTable) => {
    setEditing(t);
    form.reset({
      tableNumber: t.tableNumber,
      capacity: t.capacity,
      description: t.description,
      isActive: t.isActive,
    });
    setDialogOpen(true);
  }, [form]);

  const handleSubmit = async (values: DiningTableFormOutput) => {
    try {
      if (editing) {
        await updateTable.mutateAsync({
          ...editing,
          capacity: values.capacity,
          description: values.description,
          isActive: values.isActive,
        });
        toast.success(`Table ${editing.tableNumber} updated`);
      } else {
        await addTable.mutateAsync({
          id: generateTableId(values.tableNumber),
          tableNumber: values.tableNumber,
          capacity: values.capacity,
          description: values.description,
        });
        toast.success(`Table ${values.tableNumber} added`);
      }
      setDialogOpen(false);
    } catch (err) {
      const message = (err as Error).message || 'Could not save this table';
      if (/already exists/i.test(message)) {
        form.setError('tableNumber', { message });
        return;
      }
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteTable.mutateAsync(deleting.id);
      toast.success(`Table ${deleting.tableNumber} deleted`);
      setDeleting(null);
    } catch (err) {
      toast.error((err as Error).message || 'Could not delete this table');
    }
  };

  const toggleActive = useCallback((t: RestaurantTable, next: boolean) => {
    updateTable.mutate(
      { ...t, isActive: next },
      { onError: (err) => toast.error((err as Error).message || `Could not update table ${t.tableNumber}`) }
    );
  }, [updateTable]);

  return (
    <AdminLayout title="Table management">
      <div className="w-full max-w-full space-y-4">
        <div className="ad-section-head">
          <h3 className="ad-h text-[17px]">Floor plan</h3>
          <span className="text-[12px] ad-muted">
            {stats.total} tables · {stats.available} free · {stats.occupied} cooking · {stats.waitingPayment} bill due
          </span>
          <button type="button" onClick={openAdd} className="ad-btn ad-btn-primary ml-auto">
            <Plus className="size-4" /> Add table
          </button>
        </div>

        {tables.length === 0 ? (
          <div className="py-20 text-center border-2 border-ad-line">
            <p className="ad-h text-[16px]">No tables configured</p>
            <p className="text-[13px] ad-muted mt-1.5">Add a table to start seating dine-in guests.</p>
          </div>
        ) : (
          <div className="ad-grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {tables.map((table) => {
              const info = occupancyMap.get(table.tableNumber);
              const status = info?.status || 'available';
              const isAvailable = status === 'available';
              const isOrdered = status === 'ordered';
              const isWaitingPayment = status === 'waiting_payment';

              return (
                <div
                  key={table.id}
                  className="p-4 flex flex-col justify-between min-h-40"
                  style={{
                    opacity: table.isActive ? 1 : 0.5,
                    boxShadow: isWaitingPayment ? 'inset 4px 0 0 var(--ad-warn)' : undefined,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="ad-num text-[22px] block leading-tight">T{table.tableNumber}</span>
                      <span className="ad-kicker flex items-center gap-1 mt-0.5">
                        <Users className="size-3" /> {table.capacity} seats
                      </span>
                    </div>
                    <span className={`ad-tag ${isAvailable ? 'ad-tag-outline' : isOrdered ? 'ad-tag-info' : 'ad-tag-warn'}`}>
                      {!table.isActive ? 'Disabled' : isAvailable ? 'Free' : isOrdered ? 'Cooking' : 'Bill due'}
                    </span>
                  </div>

                  {table.description && (
                    <p className="text-[12px] ad-muted mt-1.5 truncate">{table.description}</p>
                  )}

                  <div className="mt-3 pt-2.5 border-t border-ad-hairline min-h-10 flex flex-col justify-end">
                    {info?.activeOrder ? (
                      <div>
                        <div className="flex items-center justify-between gap-2 text-[13px]">
                          <span className="truncate">#{info.activeOrder.id.slice(-4)}</span>
                          <span className="ad-num text-[14px]">{formatCurrency(info.runningBill || 0)}</span>
                        </div>
                        <span className="ad-kicker flex items-center gap-1 mt-0.5">
                          <Clock className="size-2.5" /> {info.elapsedMinutes}m
                        </span>
                      </div>
                    ) : (
                      <span className="ad-kicker">Ready to seat</span>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-ad-hairline flex items-center justify-between gap-1.5">
                    <Pill on={table.isActive} onLabel="Active" offLabel="Off" onClick={() => toggleActive(table, !table.isActive)} />
                    <div className="flex items-center gap-1">
                      <button type="button" className="ad-btn ad-btn-secondary ad-btn-icon" onClick={() => openEdit(table)} aria-label={`Edit table ${table.tableNumber}`}>
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        className="ad-btn ad-btn-secondary ad-btn-icon"
                        onClick={() => setDeleting(table)}
                        aria-label={`Delete table ${table.tableNumber}`}
                        style={{ color: 'var(--ad-a700)' }}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        onSubmit={handleSubmit}
        title={editing ? `Edit table ${editing.tableNumber}` : 'Add a table'}
        description={editing ? 'The table number itself cannot change — remove and re-add the table for that.' : 'Shows up immediately on POS and the guest table picker.'}
        submitLabel={editing ? 'Update table' : 'Add table'}
      >
        <NumberField control={form.control} name="tableNumber" label="Table number" placeholder="1" disabled={!!editing} hint={editing ? 'Numbers are permanent once created' : undefined} />
        <NumberField control={form.control} name="capacity" label="Capacity" suffix="seats" placeholder="4" />
        <TextField control={form.control} name="description" label="Description" placeholder="e.g. Window side, near the bar" />
        <SwitchField control={form.control} name="isActive" label="Active" hint="Inactive tables are hidden from POS and booking" />
      </FormDialog>

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={handleDelete}
        busy={deleteTable.isPending}
        title={`Delete table ${deleting?.tableNumber}?`}
        description="Any table with existing bookings can't be deleted until they're released."
      />
    </AdminLayout>
  );
}
