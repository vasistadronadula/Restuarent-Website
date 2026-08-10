'use client';

import React, { useState, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { Customer } from '@/types';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Star, Phone, Mail, Eye } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function CustomersPage() {
  const { customers, orders } = useAdmin();
  const [selected, setSelected] = useState<Customer | null>(null);

  const vipCount = useMemo(() => customers.filter((c) => c.isVip).length, [customers]);
  const totalRevenue = useMemo(() => customers.reduce((s, c) => s + c.totalSpent, 0), [customers]);

  const getCustomerOrders = (phoneOrId: string) =>
    orders.filter((o) => o.customerPhone === phoneOrId || o.customerId === phoneOrId);

  const columns = useMemo<ColumnDef<any, Customer>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Customer',
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className="bg-amber-100 text-amber-800 text-xs font-semibold">
                {c.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium text-sm text-stone-900 flex items-center gap-1.5">
                {c.name}
                {c.isVip && <Badge className="bg-amber-100 text-amber-800 text-xs font-medium px-1.5 py-0 border-none">VIP</Badge>}
              </div>
              <div className="text-xs text-stone-400">{c.phone}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <span className="text-sm text-stone-600">{row.original.email || '—'}</span>
      ),
    },
    {
      accessorKey: 'totalOrders',
      header: 'Orders',
      cell: ({ row }) => (
        <span className="text-sm text-stone-700 tabular-nums">{row.original.totalOrders}</span>
      ),
    },
    {
      accessorKey: 'totalSpent',
      header: 'Total Spent',
      cell: ({ row }) => (
        <span className="font-semibold text-sm text-stone-900 tabular-nums">
          ₹{row.original.totalSpent.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      accessorKey: 'loyaltyPoints',
      header: 'Points',
      cell: ({ row }) => (
        <span className="text-sm text-emerald-700 tabular-nums">{row.original.loyaltyPoints || 0}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => setSelected(row.original)} className="h-8 px-2.5 text-xs">
          <Eye className="w-3.5 h-3.5 mr-1" /> View
        </Button>
      ),
    },
  ], []);

  return (
    <AdminLayout title="Customers">
      <div className="space-y-4 w-full max-w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-stone-900">Customers</h1>
            <p className="text-sm text-stone-500 mt-0.5">
              {customers.length} total · {vipCount} VIP · ₹{totalRevenue.toLocaleString('en-IN')} lifetime spend
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-stone-200">
          <DataTable
            columns={columns}
            data={customers}
            searchKey="name"
            searchPlaceholder="Search name or phone…"
            height="520px"
            rowHeight={60}
            enableVirtualization={true}
            getRowId={(c) => c.phone || c.id}
            renderMobileCard={(c) => (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="w-9 h-9 flex-shrink-0">
                    <AvatarFallback className="bg-amber-100 text-amber-800 text-xs font-semibold">{c.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-stone-900 flex items-center gap-1.5">
                      <span className="truncate">{c.name}</span>
                      {c.isVip && <Badge className="bg-amber-100 text-amber-800 text-xs font-medium px-1.5 py-0 border-none shrink-0">VIP</Badge>}
                    </div>
                    <div className="text-xs text-stone-400">{c.phone}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="font-semibold text-sm text-stone-900 tabular-nums">₹{c.totalSpent.toLocaleString('en-IN')}</span>
                  <span className="text-xs text-stone-400">{c.totalOrders} orders</span>
                  <Button variant="outline" size="sm" onClick={() => setSelected(c)} className="h-7 px-2.5 text-xs mt-0.5">View</Button>
                </div>
              </div>
            )}
          />
        </div>
      </div>

      {/* Customer Profile Dialog */}
      <Dialog open={!!selected} onOpenChange={(val) => { if (!val) setSelected(null); }}>
        {selected && (
          <DialogContent className="max-w-md rounded-xl bg-white border border-stone-200">
            <DialogHeader className="pb-3 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-amber-100 text-amber-800 font-semibold">{selected.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-base font-semibold text-stone-900">{selected.name}</DialogTitle>
                  <p className="text-xs text-stone-400 mt-0.5">{selected.phone}</p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto py-1">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-stone-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-stone-400 mb-1">Total Spent</div>
                  <div className="text-base font-bold text-stone-900">₹{selected.totalSpent.toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-stone-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-stone-400 mb-1">Loyalty Points</div>
                  <div className="text-base font-bold text-emerald-700">{selected.loyaltyPoints || 0} pts</div>
                </div>
              </div>

              {/* Contact info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <Mail className="w-4 h-4 text-stone-400" />
                  {selected.email || 'No email'}
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <Phone className="w-4 h-4 text-stone-400" />
                  {selected.phone}
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <Users className="w-4 h-4 text-stone-400" />
                  {selected.totalOrders} orders · {selected.isVip ? '⭐ VIP' : 'Regular'}
                </div>
              </div>

              {/* Order history */}
              <div>
                <div className="text-xs font-medium text-stone-500 mb-2">Recent Orders</div>
                <div className="border border-stone-100 rounded-lg divide-y divide-stone-100 max-h-48 overflow-y-auto">
                  {getCustomerOrders(selected.phone).length === 0 ? (
                    <div className="text-sm text-stone-400 text-center py-4">No order records</div>
                  ) : (
                    getCustomerOrders(selected.phone).map((o) => (
                      <div key={o.id} className="flex justify-between items-center px-3 py-2 text-sm">
                        <div>
                          <div className="font-medium text-stone-900">{o.id}</div>
                          <div className="text-xs text-stone-400">{new Date(o.createdAt || o.orderDate || Date.now()).toLocaleDateString()}</div>
                        </div>
                        <span className="font-medium text-stone-900 tabular-nums">₹{o.grandTotal}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </AdminLayout>
  );
}
