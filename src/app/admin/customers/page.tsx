'use client';

import React, { useState, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { Customer } from '@/types';
import { PageHeader, StatCard, SectionCard } from '@/components/admin/ui';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Star, Phone, Mail, Eye, X, DollarSign } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function CustomersPage() {
  const { customers, orders } = useAdmin();
  const [selected, setSelected] = useState<Customer | null>(null);

  const vipCount = useMemo(() => customers.filter((c) => c.isVip).length, [customers]);
  const totalRevenue = useMemo(() => customers.reduce((s, c) => s + c.totalSpent, 0), [customers]);

  const getCustomerOrders = (phoneOrId: string) =>
    orders.filter((o) => o.customerPhone === phoneOrId || o.customerId === phoneOrId || o.customerName === phoneOrId);

  const columns = useMemo<ColumnDef<any, Customer>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Customer Name',
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="w-9 h-9 border border-amber-500/30">
              <AvatarFallback className="bg-amber-600 text-white font-black text-xs">
                {c.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <span>{c.name}</span>
                {c.isVip && (
                  <Badge className="bg-amber-500 text-white font-extrabold text-[9px] px-1.5 py-0">
                    VIP
                  </Badge>
                )}
              </div>
              <div className="text-xs text-stone-400 font-medium">{c.phone}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <span className="text-xs text-stone-600 dark:text-stone-300 font-medium">
          {row.original.email || 'N/A'}
        </span>
      ),
    },
    {
      accessorKey: 'totalOrders',
      header: 'Total Orders',
      cell: ({ row }) => (
        <Badge variant="outline" className="font-bold text-xs">
          {row.original.totalOrders} orders
        </Badge>
      ),
    },
    {
      accessorKey: 'totalSpent',
      header: 'Total Spent',
      cell: ({ row }) => (
        <span className="font-black text-amber-700 dark:text-amber-500">
          ₹{row.original.totalSpent.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      accessorKey: 'loyaltyPoints',
      header: 'Loyalty Points',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 font-bold text-emerald-600 text-xs">
          <Star className="w-3.5 h-3.5 fill-emerald-600" />
          <span>{row.original.loyaltyPoints || 0} pts</span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelected(row.original)}
          className="h-8 px-2.5 text-xs font-bold"
        >
          <Eye className="w-3.5 h-3.5 mr-1" /> Profile
        </Button>
      ),
    },
  ], []);

  return (
    <AdminLayout title="Customers Directory">
      <div className="space-y-4 w-full max-w-full">
        <PageHeader
          title="Customer Directory & Loyalty"
          subtitle="Diner spend history, VIP status, and order tracking"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Total Diners"
            value={customers.length}
            sub="Registered customers"
            accent="#2563EB"
          />
          <StatCard
            icon={<Star className="w-5 h-5" />}
            label="VIP Customers"
            value={vipCount}
            sub="Frequent diners"
            accent="#D97706"
          />
          <StatCard
            icon={<DollarSign className="w-5 h-5" />}
            label="Lifetime Customer Spend"
            value={`₹${totalRevenue.toLocaleString('en-IN')}`}
            sub="Total gross spend"
            accent="#059669"
          />
        </div>

        <SectionCard noPadding className="p-3">
          <DataTable
            columns={columns}
            data={customers}
            searchKey="name"
            searchPlaceholder="Search customer name or phone..."
            height="550px"
            rowHeight={60}
            enableVirtualization={true}
          />
        </SectionCard>
      </div>

      {/* Customer Profile Modal */}
      <Dialog open={!!selected} onOpenChange={(val) => { if (!val) setSelected(null); }}>
        {selected && (
          <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl bg-white dark:bg-[#1C1C1E] border border-stone-200/50 dark:border-[#2C2C2E]/60 shadow-2xl">
            <DialogHeader className="p-6 bg-white dark:bg-[#1C1C1E] text-stone-900 dark:text-white flex flex-row items-center justify-between border-b border-stone-100 dark:border-[#2C2C2E]/60">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 border border-amber-500/30">
                  <AvatarFallback className="bg-amber-600 text-white font-black text-xs">
                    {selected.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-stone-900 dark:text-white font-black text-base leading-tight">
                    {selected.name}
                  </DialogTitle>
                  <p className="text-[10px] text-stone-400 font-semibold mt-0.5">{selected.phone}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelected(null)} className="text-stone-500 hover:bg-stone-100 dark:hover:bg-[#2C2C2E] rounded-xl">
                <X className="w-5 h-5" />
              </Button>
            </DialogHeader>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-stone-50/50 dark:bg-stone-900/40 border border-stone-200/30 dark:border-[#2C2C2E]/40 rounded-xl text-center">
                <div>
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Total Spent</div>
                  <div className="text-base font-black text-amber-700 dark:text-amber-500 mt-0.5">
                    ₹{selected.totalSpent.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Loyalty Points</div>
                  <div className="text-base font-black text-emerald-600 mt-0.5">
                    {selected.loyaltyPoints || 0} pts
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-stone-600 dark:text-stone-300">
                  <Mail className="w-4 h-4 text-stone-400 dark:text-stone-500" />
                  <span className="font-semibold">{selected.email || 'No email registered'}</span>
                </div>
                <div className="flex items-center gap-2 text-stone-600 dark:text-stone-300">
                  <Phone className="w-4 h-4 text-stone-400 dark:text-stone-500" />
                  <span className="font-semibold">{selected.phone}</span>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black uppercase tracking-wider text-stone-400 mb-2">Recent Order History</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-stone-200/50 dark:border-[#2C2C2E]/65 rounded-xl p-3 bg-stone-50/20 dark:bg-[#1C1C1E]/40">
                  {getCustomerOrders(selected.phone).length === 0 ? (
                    <div className="text-xs text-stone-400 text-center py-3">No past order records</div>
                  ) : (
                    getCustomerOrders(selected.phone).map((o) => (
                      <div key={o.id} className="flex justify-between items-center text-xs pb-2 border-b border-stone-100/60 dark:border-stone-800 last:border-0 last:pb-0 last:border-b-0">
                        <div>
                          <span className="font-extrabold text-stone-850 dark:text-stone-100">{o.id}</span>
                          <div className="text-[9px] text-stone-400">{new Date(o.createdAt || o.orderDate || Date.now()).toLocaleDateString()}</div>
                        </div>
                        <div className="font-black text-amber-700 dark:text-amber-500">
                          ₹{o.grandTotal}
                        </div>
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
