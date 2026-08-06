'use client';

/* eslint-disable @typescript-eslint/no-explicit-any -- ColumnDef's first type
   parameter is the table feature set; `any` there is how this codebase spells
   "the default features" at every DataTable call site. */
import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Calendar, CheckCircle2, Edit2, Plus, Trash2, Users, Utensils, X,
} from 'lucide-react';

import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { ReservationStatus, Reservation } from '@/types';
import {
  useTables, useAddTable, useUpdateTable, useDeleteTable, useReleaseTableSlot,
  type RestaurantTable,
} from '@/lib/queries';
import { generateTableId } from '@/lib/idGenerator';
import { diningTableSchema, type DiningTableFormValues } from '@/lib/adminSchemas';
import {
  PageHeader, StatCard, SectionCard, StatusChip, reservationStatusColors,
} from '@/components/admin/ui';
import {
  ConfirmDeleteDialog, FormDialog, NumberField, SwitchField, TextField,
} from '@/components/admin/form-fields';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { z } from 'zod';

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
    () =>
      new Set(
        reservations.filter((r) => r.status === 'seated' && r.tableNumber).map((r) => r.tableNumber)
      ),
    [reservations]
  );

  const openAddTable = () => {
    setEditingTable(null);
    // Next free number rather than `tables.length + 1`, which collides the
    // moment any table has been deleted from the middle of the range.
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
        // Caught here rather than left to the unique constraint, so the
        // manager sees it under the field instead of as a failed insert.
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

  /**
   * Closing out a booking has to free the slot it was holding.
   *
   * `useReleaseTableSlot` was imported here and never called, so the row in
   * `table_reservations` outlived the booking: once a party had been seated
   * and completed, that table stayed unbookable for that date and time for
   * good, and the storefront's slot picker kept refusing it.
   */
  const closeReservation = useCallback(
    async (res: Reservation, status: 'completed' | 'cancelled') => {
      const ok = await updateReservationStatus(res.id, status);
      if (!ok) return;
      try {
        await releaseSlot.mutateAsync(res.id);
      } catch {
        // The booking itself is closed; a stuck slot is recoverable and must
        // not be reported as a failure to close it.
        toast.warning(`Table slot for ${res.id} may still be held — check the floor plan`);
      }
    },
    [updateReservationStatus, releaseSlot]
  );

  const columns = useMemo<ColumnDef<any, Reservation>[]>(() => [
    {
      accessorKey: 'customerName',
      header: 'Guest Name',
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="truncate font-extrabold text-stone-900 dark:text-stone-100">
            {row.original.customerName}
          </div>
          <div className="truncate text-xs font-medium text-stone-400">
            {row.original.customerPhone}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'date',
      header: 'Date & Time',
      cell: ({ row }) => (
        <div>
          <div className="font-bold text-stone-800 dark:text-stone-200">{row.original.date}</div>
          <div className="text-xs font-semibold text-amber-600">{row.original.time}</div>
        </div>
      ),
    },
    {
      accessorKey: 'guests',
      header: 'Party Size',
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs font-bold">
          <Users className="size-3" /> {row.original.guests}
        </Badge>
      ),
    },
    {
      accessorKey: 'tableNumber',
      header: 'Table',
      cell: ({ row }) => (
        <span className="font-extrabold text-stone-900 dark:text-stone-100">
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
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => {
        const res = row.original;
        return (
          <div className="flex items-center gap-1.5">
            {res.status === 'confirmed' && (
              <>
                <Button
                  size="sm"
                  onClick={() => updateReservationStatus(res.id, 'seated')}
                  className="h-8 bg-blue-600 px-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  Seat Guest
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-rose-600"
                  aria-label={`Cancel booking for ${res.customerName}`}
                  onClick={() => closeReservation(res, 'cancelled')}
                >
                  <X className="size-4" />
                </Button>
              </>
            )}
            {res.status === 'seated' && (
              <Button
                size="sm"
                onClick={() => closeReservation(res, 'completed')}
                className="h-8 bg-emerald-600 px-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
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
          <div className="truncate text-sm font-extrabold text-stone-900 dark:text-stone-100">
            {res.customerName}
          </div>
          <a
            href={`tel:${res.customerPhone}`}
            className="text-[11px] font-medium text-stone-400 underline-offset-2 hover:underline"
          >
            {res.customerPhone}
          </a>
        </div>
        <StatusChip status={res.status} palette={reservationStatusColors} />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-bold text-stone-500 dark:text-stone-400">
        <span className="text-stone-800 dark:text-stone-200">{res.date}</span>
        <span className="text-amber-600">{res.time}</span>
        <span className="inline-flex items-center gap-1">
          <Users className="size-3" /> {res.guests}
        </span>
        <span>{res.tableNumber ? `Table ${res.tableNumber}` : 'Unassigned'}</span>
      </div>

      {res.specialRequest && (
        <p className="mt-1.5 line-clamp-2 text-[11px] text-stone-400">“{res.specialRequest}”</p>
      )}

      {(res.status === 'confirmed' || res.status === 'seated') && (
        <div className="mt-3 flex items-center gap-2 border-t border-stone-100 pt-2.5 dark:border-[#2C2C2E]/60">
          {res.status === 'confirmed' ? (
            <>
              <Button
                size="sm"
                onClick={() => updateReservationStatus(res.id, 'seated')}
                className="h-9 flex-1 rounded-lg bg-blue-600 text-xs font-bold text-white hover:bg-blue-700"
              >
                Seat Guest
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => closeReservation(res, 'cancelled')}
                className="h-9 rounded-lg text-xs font-bold text-rose-600"
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => closeReservation(res, 'completed')}
              className="h-9 flex-1 rounded-lg bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
            >
              Complete Booking
            </Button>
          )}
        </div>
      )}
    </div>
  ), [updateReservationStatus, closeReservation]);

  return (
    <AdminLayout title="Table Reservations">
      <div className="w-full max-w-full space-y-4">
        <PageHeader
          title="Table Booking & Floor Layout"
          subtitle="Manage diner reservations and dining room table availability"
          action={
            <Button
              onClick={openAddTable}
              className="h-9 w-full rounded-lg bg-amber-600 px-3 text-xs font-extrabold text-white shadow-xs hover:bg-amber-700 sm:w-auto"
            >
              <Plus className="size-3.5" />
              Add Dining Table
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            icon={<Calendar className="size-5" />}
            label="Total Bookings"
            value={reservations.length}
            sub="All reservation records"
            accent="#D97706"
          />
          <StatCard
            icon={<CheckCircle2 className="size-5" />}
            label="Confirmed"
            value={confirmedCount}
            sub="Upcoming guests"
            accent="#059669"
          />
          <StatCard
            icon={<Utensils className="size-5" />}
            label="Currently Seated"
            value={seatedCount}
            sub="Dining in restaurant"
            accent="#2563EB"
          />
        </div>

        {/* ── Floor plan ─────────────────────────────────────────────────── */}
        <SectionCard>
          <h3 className="mb-3.5 flex items-center gap-2 text-sm font-extrabold text-stone-900 dark:text-stone-100">
            <Utensils className="size-4 text-amber-600" /> Floor Table Availability
          </h3>

          {tables.length === 0 ? (
            <p className="py-6 text-center text-xs font-medium text-stone-400">
              No dining tables yet. Add one to start taking table bookings.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {tables.map((t) => {
                const available = t.isActive && !occupiedTableNumbers.has(t.tableNumber);
                return (
                  <div
                    key={t.id}
                    className={`rounded-xl border p-3 text-center transition-all ${
                      !t.isActive
                        ? 'border-stone-300/60 bg-stone-100/60 dark:border-stone-700/60 dark:bg-stone-900/40'
                        : available
                          ? 'border-emerald-300/60 bg-emerald-50/50 dark:border-emerald-800/65 dark:bg-emerald-950/20'
                          : 'border-rose-300/60 bg-rose-50/50 dark:border-rose-800/65 dark:bg-rose-950/20'
                    }`}
                  >
                    <div className="text-xs font-black text-stone-900 dark:text-stone-100">
                      Table {t.tableNumber}
                    </div>
                    <div className="mt-0.5 text-[10px] font-bold text-stone-500">
                      {t.capacity} Seats
                    </div>
                    {t.description && (
                      <div className="mt-0.5 line-clamp-1 text-[10px] text-stone-400">
                        {t.description}
                      </div>
                    )}
                    <Badge
                      className={`mt-2 border-none px-1.5 py-0 text-[9px] font-black ${
                        !t.isActive
                          ? 'bg-stone-500 text-white'
                          : available
                            ? 'bg-emerald-600 text-white'
                            : 'bg-rose-600 text-white'
                      }`}
                    >
                      {!t.isActive ? 'Out of service' : available ? 'Available' : 'Occupied'}
                    </Badge>

                    {/* The floor plan was read-only: tables could be created
                        but never corrected or retired. */}
                    <div className="mt-2 flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label={`Edit table ${t.tableNumber}`}
                        onClick={() => openEditTable(t)}
                      >
                        <Edit2 className="size-3.5 text-stone-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-rose-600"
                        aria-label={`Delete table ${t.tableNumber}`}
                        onClick={() => setDeletingTable(t)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard noPadding className="p-3">
          <div className="scrollbar-none mb-3 flex gap-2 overflow-x-auto border-b border-stone-100 pb-2.5 dark:border-[#2C2C2E]/60">
            {(['all', 'confirmed', 'seated', 'completed', 'cancelled'] as const).map((st) => (
              <Button
                key={st}
                variant={statusFilter === st ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(st)}
                className={`shrink-0 rounded-full whitespace-nowrap text-xs font-bold capitalize ${
                  statusFilter === st ? 'bg-amber-600 text-white hover:bg-amber-700' : ''
                }`}
              >
                {st} ({reservations.filter((r) => st === 'all' || r.status === st).length})
              </Button>
            ))}
          </div>

          <DataTable
            columns={columns}
            data={filtered}
            searchKey="customerName"
            searchPlaceholder="Search guest name or phone..."
            height="500px"
            rowHeight={56}
            emptyMessage="No bookings match this filter."
            renderMobileCard={renderMobileCard}
            getRowId={(r) => r.id}
          />
        </SectionCard>
      </div>

      <FormDialog
        open={tableDialogOpen}
        onOpenChange={setTableDialogOpen}
        form={form}
        onSubmit={handleSaveTable}
        title={editingTable ? `Edit Table ${editingTable.tableNumber}` : 'Add Dining Table'}
        description={
          editingTable
            ? 'The table number is fixed — it is part of the table’s identity in existing bookings.'
            : 'Tables appear in the floor plan and in the storefront’s booking slots.'
        }
        submitLabel={editingTable ? 'Update Table' : 'Create Table'}
        size="sm"
      >
        <NumberField
          control={form.control}
          name="tableNumber"
          label="Table Number"
          disabled={!!editingTable}
          hint={editingTable ? 'Fixed once created' : undefined}
        />
        <NumberField
          control={form.control}
          name="capacity"
          label="Seating Capacity"
          hint="Guests this table seats"
        />
        <TextField
          control={form.control}
          name="description"
          label="Note"
          placeholder="e.g. Window side, AC section"
        />
        <SwitchField
          control={form.control}
          name="isActive"
          label="In service"
          hint="Turn off to keep the table but stop it being booked"
        />
      </FormDialog>

      <ConfirmDeleteDialog
        open={!!deletingTable}
        onOpenChange={(open) => !open && setDeletingTable(null)}
        onConfirm={handleDeleteTable}
        busy={deleteTable.isPending}
        title={`Delete Table ${deletingTable?.tableNumber}?`}
        description="The table is removed from the floor plan and can no longer be booked. Tables with existing bookings cannot be deleted — take them out of service instead."
      />
    </AdminLayout>
  );
}
