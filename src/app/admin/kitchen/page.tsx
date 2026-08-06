'use client';

import React, { useEffect, useState, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { StatCard, SectionCard } from '@/components/admin/ui';
import { Order, OrderStatus } from '@/types';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Volume2, VolumeX, Flame, CheckCircle2, Clock, UtensilsCrossed,
  ArrowRight, Check, History, Undo2, AlertCircle,
} from 'lucide-react';

const LANES: { status: OrderStatus; label: string; icon: React.ReactNode; accent: string; border: string; cta: string; next: OrderStatus | null }[] = [
  {
    status: 'pending',
    label: 'New Orders (Queue)',
    icon: <Clock className="w-4 h-4 text-amber-600" />,
    accent: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    border: 'border-amber-500/30',
    cta: 'Start Cooking',
    next: 'preparing',
  },
  {
    status: 'preparing',
    label: 'Cooking Now',
    icon: <Flame className="w-4 h-4 text-orange-600" />,
    accent: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
    border: 'border-orange-500/30',
    cta: 'Mark Ready',
    next: 'ready',
  },
  {
    status: 'ready',
    label: 'Ready for Pickup',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
    accent: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-500/30',
    cta: 'Mark Delivered',
    next: 'delivered',
  },
];

function playKitchenChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio Context not allowed or unsupported
  }
}

export default function KitchenDisplayPage() {
  const { orders, updateOrderStatus } = useAdmin();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [lastOrderCount, setLastOrderCount] = useState(orders.length);

  useEffect(() => {
    if (orders.length > lastOrderCount) {
      if (soundEnabled) playKitchenChime();
      toast.success('New Order Received in Kitchen! 🔔');
    }
    setLastOrderCount(orders.length);
  }, [orders.length, lastOrderCount, soundEnabled]);

  const activeOrders = useMemo(() => {
    return orders.filter((o) => o.orderStatus === 'pending' || o.orderStatus === 'preparing' || o.orderStatus === 'ready');
  }, [orders]);

  const historyOrders = useMemo(() => {
    return orders.filter((o) => o.orderStatus === 'delivered' || o.orderStatus === 'cancelled').slice(0, 10);
  }, [orders]);

  const handleAdvance = async (orderId: string, currentStatus: OrderStatus) => {
    const lane = LANES.find((l) => l.status === currentStatus);
    if (!lane || !lane.next) return;
    try {
      await updateOrderStatus(orderId, lane.next);
      toast.success(`Order ${orderId} moved to ${lane.next}`);
    } catch {
      toast.error('Failed to update order status');
    }
  };

  const handleUndo = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'preparing');
      toast.success(`Order ${orderId} returned to preparing`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <AdminLayout title="Kitchen Display System (KDS)">
      <div className="space-y-6 w-full max-w-full">
        {/* Header Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-stone-900 text-white p-5 rounded-2xl shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight leading-tight">
                Kitchen Display System (KDS)
              </h2>
              <p className="text-xs text-stone-400 font-medium">
                Live order queue for chefs & line cooks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 font-bold text-xs h-9 rounded-xl"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 mr-1.5 text-emerald-400" /> : <VolumeX className="w-4 h-4 mr-1.5 text-stone-400" />}
              {soundEnabled ? 'Chime ON' : 'Mute Chime'}
            </Button>
            <Button
              variant={showHistory ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className={`font-bold text-xs h-9 rounded-xl ${showHistory ? 'bg-amber-600 text-white' : 'bg-white/10 text-white border-white/20'}`}
            >
              <History className="w-4 h-4 mr-1.5" />
              {showHistory ? 'Hide Completed' : 'Completed Log'}
            </Button>
          </div>
        </div>

        {/* 3 Metric Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="Pending in Queue"
            value={orders.filter((o) => o.orderStatus === 'pending').length}
            sub="Orders waiting to start"
            accent="#D97706"
          />
          <StatCard
            icon={<Flame className="w-5 h-5" />}
            label="Currently Cooking"
            value={orders.filter((o) => o.orderStatus === 'preparing').length}
            sub="Dishes on the burners"
            accent="#EA580C"
          />
          <StatCard
            icon={<CheckCircle2 className="w-5 h-5" />}
            label="Ready for Pass"
            value={orders.filter((o) => o.orderStatus === 'ready').length}
            sub="Awaiting pickup / delivery"
            accent="#059669"
          />
        </div>

        {/* Main Kanban Board (Full Width 3 Lanes) */}
        {showHistory ? (
          <SectionCard>
            <h3 className="font-extrabold text-base mb-4 text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <History className="w-5 h-5 text-amber-600" /> Recently Completed Kitchen Orders
            </h3>
            <div className="space-y-3">
              {historyOrders.map((o) => (
                <div key={o.id} className="flex justify-between items-center p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900">
                  <div>
                    <div className="font-extrabold text-sm text-stone-900 dark:text-stone-100">{o.id} · {o.customerName || 'Walk-in'}</div>
                    <div className="text-xs text-stone-500 font-medium">
                      {o.items?.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize text-xs font-bold">
                      {o.orderStatus}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => handleUndo(o.id)} className="text-xs font-bold text-amber-600">
                      <Undo2 className="w-3.5 h-3.5 mr-1" /> Re-open
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {LANES.map((lane) => {
              const laneOrders = activeOrders.filter((o) => o.orderStatus === lane.status);
              return (
                <div key={lane.status} className="space-y-4 flex flex-col h-full">
                  <div className={`p-4 rounded-2xl border ${lane.border} ${lane.accent} flex items-center justify-between shadow-xs`}>
                    <div className="flex items-center gap-2 font-black text-sm">
                      {lane.icon}
                      <span>{lane.label}</span>
                    </div>
                    <Badge className="bg-stone-900 text-white font-extrabold text-xs px-2 py-0.5 rounded-full">
                      {laneOrders.length}
                    </Badge>
                  </div>

                  <div className="space-y-4 flex-1">
                    {laneOrders.length === 0 ? (
                      <div className="p-8 text-center border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl text-stone-400 text-xs font-bold">
                        No orders in this queue
                      </div>
                    ) : (
                      laneOrders.map((o) => (
                        <div
                          key={o.id}
                          className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4 transition-all hover:shadow-md"
                        >
                          <div className="flex justify-between items-start border-b border-stone-100 dark:border-stone-800 pb-3">
                            <div>
                              <h4 className="font-black text-base text-stone-900 dark:text-stone-100">
                                {o.id}
                              </h4>
                              <p className="text-xs text-stone-500 font-bold">
                                {o.customerName || 'Walk-in'} · <span className="uppercase text-amber-600">{o.orderType}</span>
                              </p>
                            </div>
                            <Badge variant="outline" className="font-extrabold text-[10px] uppercase">
                              {o.orderStatus}
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            {o.items?.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs font-bold text-stone-800 dark:text-stone-200">
                                <span>{item.name}</span>
                                <Badge className="bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-black text-xs px-2 py-0.5">
                                  x{item.quantity}
                                </Badge>
                              </div>
                            ))}
                          </div>

                          {lane.next && (
                            <Button
                              onClick={() => handleAdvance(o.id, o.status)}
                              className="w-full bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 text-white dark:text-stone-900 font-extrabold rounded-xl py-2.5 text-xs shadow-md"
                            >
                              {lane.cta}
                              <ArrowRight className="w-4 h-4 ml-1.5" />
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
