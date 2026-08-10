'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Calendar, CheckCircle2, Edit2, Plus, Trash2, Users, Utensils, X } from 'lucide-react';

import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { ReservationStatus, Reservation } from '@/types';
import {
  useTables, useAddTable, useUpdateTable, useDeleteTable, useReleaseTableSlot,
  type RestaurantTable,
} from '@/lib/queries';
import { generateTableId } from '@/lib/idGenerator';
import { diningTableSchema, type DiningTableFormValues } from '@/lib/adminSchemas';
import { PageHeader, StatusChip, reservationStatusColors } from '@/components/admin/ui';
import {
  ConfirmDeleteDialog, FormDialog, NumberField, SwitchField, TextField,
} from '@/components/admin/form-fields';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { z } from 'zod';
import { cn } from '@/lib/utils';

const BLANK_TABLE: DiningTableFormValues = {
  tableNumber: 1,
  capacity: 4,
  description: '',
  isActive: true,
};

export default function ReservationsPage() {
  const { reservations, updateReservationStatus } = useAdmin();
  const { data: tables = [] } = useTables();
  const addTable = useAddTable();
  const updateTable = useUpdateTable();
  const deleteTable = useDeleteTable();
  const releaseSlot = useReleaseTableSlot();

  const [activeTab, setActiveTab] = useState<'bookings' | 'tables'>('bookings');
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'all'>('all');
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [deletingTable, setDeletingTable] = useState<RestaurantTable | null>(null);

  const form = useForm<DiningTableFormValues>({
    resolver: zodResolver(diningTableSchema),
    defaultValues: BLANK_TABLE,
    mode: 'onTouched',
  });

  const filtered = useMemo(
    () => reservations.filter((r) => statusFilter === 'all' || r.status === statusFilter),
    [reservations, statusFilter]
  );

  const confirmedCount = useMemo(
    () => reservations.filter((r) => r.status === 'confirmed').length,
    [reservations]
  );
  const seatedCount = useMemo(
    () => reservations.filter((r) => r.status === 'seated').length,
    [reservations]
  );

  const occupiedTableNumbers = useMemo(
    () => new Set(
      reservations.filter((r) => r.status === 'seated' && r.tableNumber).map((r) => r.tableNumber)
    ),
    [reservations]
  );

  const openAddTable = () => {
    setEditingTable(null);
    const used = new Set(tables.map((t) => t.tableNumber));
    let next = 1;
    while (used.has(next)) next += 1;
    form.reset({ ...BLANK_TABLE, tableNumber: next });
    setTableDialogOpen(true);
  };

  const openEditTable = (t: RestaurantTable) => {
    setEditingTable(t);
    form.reset({
      tableNumber: t.tableNumber,
      capacity: t.capacity,
      description: t.description,
      isActive: t.isActive,
    });
    setTableDialogOpen(true);
  };

  const handleSaveTable = async (values: z.output<typeof diningTableSchema>) => {
    try {
      if (editingTable) {
        await updateTable.mutateAsync({
          ...editingTable,
          capacity: values.capacity,
          description: values.description,
          isActive: values.isActive,
        });
        toast.success(`Table ${editingTable.tableNumber} updated`);
      } else {
        if (tables.some((t) => t.tableNumber === values.tableNumber)) {
          form.setError('tableNumber', { message: `Table ${values.tableNumber} already exists` });
          return;
        }
        await addTable.mutateAsync({
          id: generateTableId(values.tableNumber),
          tableNumber: values.tableNumber,
          capacity: values.capacity,
          description: values.description,
        });
        toast.success(`Table ${values.tableNumber} created`);
      }
      setTableDialogOpen(false);
    } catch (err) {
      const message = (err as Error).message || 'Could not save this table';
      if (/already exists/i.test(message)) {
        form.setError('tableNumber', { message });
        return;
      }
      toast.error(message);
    }
  };

  const handleDeleteTable = async () => {
    if (!deletingTable) return;
    try {
      await deleteTable.mutateAsync(deletingTable.id);
      toast.success(`Table ${deletingTable.tableNumber} removed`);
      setDeletingTable(null);
    } catch (err) {
      toast.error((err as Error).message || 'Could not remove this table');
    }
  };

  const closeReservation = useCallback(
    async (res: Reservation, status: 'completed' | 'cancelled') => {
      const ok = await updateReservationStatus(res.id, status);
      if (!ok) return;
      try {
        await releaseSlot.mutateAsync(res.id);
      } catch {
        toast.warning(`Table slot for ${res.id} may still be held — check floor plan`);
      }
    },
    [updateReservationStatus, releaseSlot]
  );

  const columns = useMemo<ColumnDef<any, Reservation>[]>(() => [
    {
      accessorKey: 'customerName',
      header: 'Guest',
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="font-medium text-sm text-stone-900">{row.original.customerName}</div>
          <div className="text-xs text-stone-400">{row.original.customerPhone}</div>
        </div>
      ),
    },
    {
      accessorKey: 'date',
      header: 'Date & Time',
      cell: ({ row }) => (
        <div>
          <div className="text-sm text-stone-950 font-medium">{row.original.date}</div>
          <div className="text-xs text-amber-700 mt-0.5">{row.original.time}</div>
        </div>
      ),
    },
    {
      accessorKey: 'guests',
      header: 'Guests',
      cell: ({ row }) => (
        <span className="text-sm text-stone-700 tabular-nums">
          {row.original.guests} Pax
        </span>
      ),
    },
    {
      accessorKey: 'tableNumber',
      header: 'Table',
      cell: ({ row }) => (
        <span className="text-xs font-medium text-stone-600">
          {row.original.tableNumber ? `Table ${row.original.tableNumber}` : 'Unassigned'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusChip status={row.original.status} palette={reservationStatusColors} />
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => {
        const res = row.original;
        return (
          <div className="flex items-center gap-1.5">
            {res.status === 'confirmed' && (
              <>
                <Button size="sm" onClick={() => updateReservationStatus(res.id, 'seated')} className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs">
                  Seat
                </Button>
                <Button variant="ghost" size="icon" className="size-8 text-rose-600" onClick={() => closeReservation(res, 'cancelled')}>
                  <X className="size-4" />
                </Button>
              </>
            )}
            {res.status === 'seated' && (
              <Button size="sm" onClick={() => closeReservation(res, 'completed')} className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                Complete
              </Button>
            )}
          </div>
        );
      },
    },
  ], [updateReservationStatus, closeReservation]);

  const renderMobileCard = useCallback((res: Reservation) => (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-stone-900">{res.customerName}</div>
          <a href={`tel:${res.customerPhone}`} className="text-xs text-stone-400 underline">{res.customerPhone}</a>
        </div>
        <StatusChip status={res.status} palette={reservationStatusColors} />
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
        <span className="text-stone-800">{res.date}</span>
        <span className="text-amber-700">{res.time}</span>
        <span className="inline-flex items-center gap-1"><Users className="size-3" /> {res.guests}</span>
        <span>{res.tableNumber ? `Table ${res.tableNumber}` : 'Unassigned'}</span>
      </div>
      {res.specialRequest && <p className="mt-1.5 text-xs text-stone-400 italic">“{res.specialRequest}”</p>}
      {(res.status === 'confirmed' || res.status === 'seated') && (
        <div className="mt-3 flex items-center gap-2 border-t border-stone-100 pt-2.5">
          {res.status === 'confirmed' ? (
            <>
              <Button size="sm" onClick={() => updateReservationStatus(res.id, 'seated')} className="h-8 flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs">Seat</Button>
              <Button variant="outline" size="sm" onClick={() => closeReservation(res, 'cancelled')} className="h-8 text-xs text-rose-600">Cancel</Button>
            </>
          ) : (
            <Button size="sm" onClick={() => closeReservation(res, 'completed')} className="h-8 flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs">Complete</Button>
          )}
        </div>
      )}
    </div>
  ), [updateReservationStatus, closeReservation]);

  return (
    <AdminLayout title="Bookings & Tables">
      <div className="w-full max-w-full space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-stone-900">Bookings & Tables</h1>
            <p className="text-sm text-stone-500 mt-0.5">
              {confirmedCount} confirmed bookings · {seatedCount} seated now
            </p>
          </div>
          {activeTab === 'tables' && (
            <Button onClick={openAddTable} className="h-9 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4">
              <Plus className="size-4 mr-1.5" /> Add Table
            </Button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 border-b border-stone-200">
          <button
            onClick={() => setActiveTab('bookings')}
            className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors', activeTab === 'bookings' ? 'border-amber-600 text-amber-700' : 'border-transparent text-stone-500 hover:text-stone-700')}
          >
            Reservations ({filtered.length})
          </button>
          <button
            onClick={() => setActiveTab('tables')}
            className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors', activeTab === 'tables' ? 'border-amber-600 text-amber-700' : 'border-transparent text-stone-500 hover:text-stone-700')}
          >
            Floor Plan ({tables.length})
          </button>
        </div>

        {activeTab === 'bookings' ? (
          <div className="space-y-3">
            {/* Status switcher pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {(['all', 'confirmed', 'seated', 'completed', 'cancelled'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap capitalize',
                    statusFilter === st
                      ? 'border-amber-600 bg-amber-600 text-white'
                      : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                  )}
                >
                  {st} ({reservations.filter((r) => st === 'all' || r.status === st).length})
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-stone-200">
              <DataTable
                columns={columns}
                data={filtered}
                searchKey="customerName"
                searchPlaceholder="Search guest name…"
                height="500px"
                rowHeight={56}
                emptyMessage="No bookings match this filter."
                renderMobileCard={renderMobileCard}
                getRowId={(r) => r.id}
              />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-5">
            {tables.length === 0 ? (
              <p className="py-10 text-center text-sm text-stone-400">
                No dining tables yet. Add one to view floor layout.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {tables.map((t) => {
                  const available = t.isActive && !occupiedTableNumbers.has(t.tableNumber);
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        'rounded-xl border p-4 text-center transition-all flex flex-col justify-between min-h-[140px]',
                        !t.isActive
                          ? 'border-stone-200 bg-stone-50'
                          : available
                            ? 'border-emerald-200 bg-emerald-50/30'
                            : 'border-rose-200 bg-rose-50/30'
                      )}
                    >
                      <div>
                        <div className="text-sm font-semibold text-stone-900">Table {t.tableNumber}</div>
                        <div className="text-xs text-stone-500 mt-1 flex items-center justify-center gap-1"><Users className="size-3" /> {t.capacity} Seats</div>
                        {t.description && <div className="text-xs text-stone-400 mt-1 truncate">{t.description}</div>}
                      </div>

                      <div className="mt-3">
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', !t.isActive ? 'bg-stone-200 text-stone-600' : available ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800')}>
                          {!t.isActive ? 'Inactive' : available ? 'Available' : 'Occupied'}
                        </span>
                        <div className="mt-2 flex items-center justify-center gap-1.5 border-t border-stone-100/60 pt-2">
                          <Button variant="ghost" size="icon" className="size-7" onClick={() => openEditTable(t)}>
                            <Edit2 className="size-3.5 text-stone-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-7 text-rose-600" onClick={() => setDeletingTable(t)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <FormDialog
        open={tableDialogOpen}
        onOpenChange={setTableDialogOpen}
        form={form}
        onSubmit={handleSaveTable}
        title={editingTable ? `Edit Table ${editingTable.tableNumber}` : 'Add Dining Table'}
        description={editingTable ? 'The table number is fixed.' : 'Tables appear in the floor plan and booking slots.'}
        submitLabel={editingTable ? 'Update Table' : 'Create Table'}
        size="sm"
      >
        <NumberField control={form.control} name="tableNumber" label="Table Number" disabled={!!editingTable} hint={editingTable ? 'Fixed once created' : undefined} />
        <NumberField control={form.control} name="capacity" label="Seating Capacity" hint="Guests this table seats" />
        <TextField control={form.control} name="description" label="Note" placeholder="e.g. Window side, AC section" />
        <SwitchField control={form.control} name="isActive" label="In service" hint="Turn off to temporarily stop booking" />
      </FormDialog>

      <ConfirmDeleteDialog
        open={!!deletingTable}
        onOpenChange={(open) => !open && setDeletingTable(null)}
        onConfirm={handleDeleteTable}
        busy={deleteTable.isPending}
        title={`Delete Table ${deletingTable?.tableNumber}?`}
        description="The table is removed from the floor plan and can no longer be booked."
      />
    </AdminLayout>
  );
}
