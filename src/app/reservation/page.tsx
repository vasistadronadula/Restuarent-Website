'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft, ArrowRight, Calendar, CheckCircle2, Clock, Loader2, Mail,
  MapPin, Phone, User, Users, UtensilsCrossed, MessageCircle
} from 'lucide-react';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import toast from 'react-hot-toast';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { generateReservationId } from '@/lib/idGenerator';
import { triggerNewReservationPush } from '@/lib/triggerPush';
import { accountDisplayName, isInternalPhoneEmail } from '@/lib/phoneIdentity';
import {
  useTables,
  useBookedTableSlots,
  useBookTableSlot,
} from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const timeSlots = [
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM',
];

const getMinDate = () => new Date().toISOString().split('T')[0];

const STEPS = ['Date & Time', 'Choose Table', 'Your Details'];

export default function ReservationPage() {
  const { addReservationLocallyAndDB } = useAdmin();
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);

  // Step 1 state
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [guests, setGuests] = useState('2');
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});

  // Step 2 state
  const [selectedTableId, setSelectedTableId] = useState('');
  const [selectedTableNumber, setSelectedTableNumber] = useState(0);

  // Step 3 state
  const [form, setForm] = useState({ name: '', phone: '', email: '', request: '' });
  const [step3Errors, setStep3Errors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      const name = accountDisplayName(user);
      const phone = user.user_metadata?.phone || user.phone || '';
      const email = isInternalPhoneEmail(user.email) ? '' : (user.email || '');
      setForm((f) => ({
        ...f,
        name: f.name || name,
        phone: f.phone || phone,
        email: f.email || email,
      }));
    }
  }, [user]);

  // Result state
  const [loading, setLoading] = useState(false);
  const [confirmId, setConfirmId] = useState('');
  const [success, setSuccess] = useState(false);

  const { data: tables = [], isLoading: tablesLoading } = useTables();
  const { data: bookedTableIds = [], isLoading: slotsLoading } = useBookedTableSlots(date, time);
  const bookTableSlot = useBookTableSlot();

  const guestCount = Number(guests) || 2;
  const activeTables = useMemo(
    () => tables.filter((t) => t.isActive),
    [tables]
  );

  const getTableStatus = (tableId: string, capacity: number) => {
    if (bookedTableIds.includes(tableId)) return 'occupied';
    if (capacity < guestCount) return 'too-small';
    return 'available';
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!date) e.date = 'Please select a date';
    else {
      const today = new Date().toISOString().split('T')[0];
      if (date < today) e.date = 'Date cannot be in the past';
    }
    if (!time) e.time = 'Please select a time slot';
    setStep1Errors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name required';
    if (!form.phone.trim()) e.phone = 'Phone required';
    setStep3Errors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (activeStep === 0 && !validateStep1()) return;
    if (activeStep === 1 && !selectedTableId) {
      toast.error('Please select an available table');
      return;
    }
    setActiveStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;
    setLoading(true);

    const id = generateReservationId();
    const slotId = `SLOT-${id}`;
    const newResObj = {
      id,
      customerName: form.name,
      customerPhone: form.phone,
      email: form.email,
      guests: guestCount,
      date,
      time,
      specialRequest: form.request,
      status: 'confirmed' as const,
      createdAt: new Date().toISOString(),
      tableId: selectedTableId,
      tableNumber: selectedTableNumber,
      userId: user?.id || null,
    };

    try {
      await addReservationLocallyAndDB(newResObj);
      await bookTableSlot.mutateAsync({
        id: slotId,
        tableId: selectedTableId,
        reservationId: id,
        date,
        timeSlot: time,
      });
    } catch {
      toast.error('We could not confirm your reservation. Please try again or call us directly.');
      setLoading(false);
      return;
    }

    triggerNewReservationPush(id);

    setConfirmId(id);
    setSuccess(true);
    setLoading(false);
    toast.success('🎉 Table reserved & confirmed!');
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      <Navbar />

      {/* Hero Header - Full Width */}
      <section className="relative w-full bg-gradient-to-br from-[#2D0000] via-[#4F0909] to-[#C62828] py-4 md:py-5 text-center text-white overflow-hidden px-4 sm:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,152,0,0.15),transparent_70%)] pointer-events-none" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black mb-1 tracking-tight relative z-10">
          📅 Reserve Your Table
        </h1>
        <p className="text-xs md:text-sm text-white/80 max-w-md mx-auto font-medium relative z-10">
          Book your royal dining experience — choose your table and we&apos;ll hold it just for you.
        </p>
      </section>

      {/* Main Container - Full Width */}
      <section className="w-full bg-orange-50/40 dark:bg-zinc-900/40 py-8 md:py-14 flex-1">
        <div className="w-full px-4 sm:px-8 md:px-12 max-w-none space-y-6">

          {/* Stepper */}
          <div className="flex items-center justify-between relative max-w-xl mx-auto px-4 mb-8">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2 -z-0" />
            {STEPS.map((label, idx) => {
              const isCompleted = activeStep > idx;
              const isCurrent = activeStep === idx;
              return (
                <div key={label} className="relative z-10 flex flex-col items-center gap-1.5 bg-orange-50/40 dark:bg-zinc-900/40 px-2">
                  <div
                    className={cn(
                      'size-9 rounded-full flex items-center justify-center text-xs font-black transition-all shadow-sm',
                      isCompleted && 'bg-emerald-600 text-white',
                      isCurrent && 'bg-primary text-white ring-4 ring-primary/20',
                      !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isCompleted ? <CheckCircle2 className="size-5" /> : idx + 1}
                  </div>
                  <span className={cn('text-xs font-bold', isCurrent ? 'text-primary' : 'text-muted-foreground')}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          <Card className="p-6 md:p-10 shadow-xl border-border/80 bg-background rounded-3xl">
            <CardContent className="p-0">

              {/* ── STEP 1: Date, Time, Guests ──────────────────────────────── */}
              {activeStep === 0 && (
                <div className="space-y-6">
                  <h2 className="text-xl md:text-2xl font-black text-primary">
                    📅 When would you like to visit?
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="res-date">Preferred Date *</Label>
                      <Input
                        id="res-date"
                        type="date"
                        min={getMinDate()}
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="font-medium"
                      />
                      {step1Errors.date && <p className="text-xs text-destructive font-medium">{step1Errors.date}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label>Number of Guests *</Label>
                      <Select
                        value={guests}
                        onValueChange={(val) => { setGuests(val); setSelectedTableId(''); setSelectedTableNumber(0); }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select guests" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n} {n === 1 ? 'Guest' : 'Guests'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-foreground">Select Time Slot *</Label>
                    {step1Errors.time && <p className="text-xs text-destructive font-medium">{step1Errors.time}</p>}
                    <div className="flex flex-wrap gap-2">
                      {timeSlots.map((t) => {
                        const selected = time === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => { setTime(t); setSelectedTableId(''); setSelectedTableNumber(0); }}
                            className={cn(
                              'px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shadow-xs',
                              selected
                                ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-105'
                                : 'bg-background text-foreground border-border hover:border-primary/50 hover:bg-primary/5'
                            )}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 2: Table Picker ────────────────────────────────────── */}
              {activeStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-primary mb-1">
                      🪑 Choose Your Table
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Showing tables for <strong className="text-foreground">{date}</strong> at <strong className="text-foreground">{time}</strong> for <strong className="text-foreground">{guests} guests</strong>
                    </p>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 text-xs font-semibold text-muted-foreground border-y py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="size-3.5 rounded bg-emerald-500/20 border-2 border-emerald-600" />
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="size-3.5 rounded bg-red-500/20 border-2 border-red-600" />
                      <span>Occupied</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="size-3.5 rounded bg-slate-200 dark:bg-slate-800 border-2 border-slate-400" />
                      <span>Too Small</span>
                    </div>
                  </div>

                  {(tablesLoading || slotsLoading) ? (
                    <div className="text-center py-12 space-y-3">
                      <Loader2 className="size-8 animate-spin text-primary mx-auto" />
                      <p className="text-xs text-muted-foreground">Checking table availability...</p>
                    </div>
                  ) : activeTables.length === 0 ? (
                    <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-xs text-blue-800 dark:text-blue-200">
                      No tables have been set up yet. Please contact the restaurant directly at <strong>+91 70326 82089</strong>.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {activeTables.map((table) => {
                        const status = getTableStatus(table.id, table.capacity);
                        const isSelected = selectedTableId === table.id;
                        const isAvailable = status === 'available';

                        return (
                          <div
                            key={table.id}
                            onClick={() => {
                              if (!isAvailable) return;
                              setSelectedTableId(table.id);
                              setSelectedTableNumber(table.tableNumber);
                            }}
                            className={cn(
                              'p-4 rounded-2xl text-center border-2 transition-all cursor-pointer relative flex flex-col items-center justify-between',
                              isSelected && 'border-primary bg-primary/10 shadow-lg scale-102',
                              !isSelected && isAvailable && 'border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500 hover:shadow-md',
                              status === 'occupied' && 'border-red-500/40 bg-red-500/5 cursor-not-allowed opacity-80',
                              status === 'too-small' && 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 opacity-60 cursor-not-allowed'
                            )}
                          >
                            <UtensilsCrossed className={cn('size-8 mb-2', isSelected ? 'text-primary' : isAvailable ? 'text-emerald-600' : 'text-muted-foreground')} />
                            
                            <div>
                              <p className="text-sm font-extrabold text-foreground">Table {table.tableNumber}</p>
                              <p className="text-[11px] text-muted-foreground font-medium">👥 {table.capacity} seats</p>
                              {table.description && (
                                <p className="text-[10px] text-muted-foreground/80 line-clamp-1 mt-0.5">{table.description}</p>
                              )}
                            </div>

                            <Badge
                              className={cn(
                                'mt-2 text-[10px] font-bold px-2 py-0.5',
                                isAvailable && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-none',
                                status === 'occupied' && 'bg-red-500/15 text-red-700 dark:text-red-300 border-none',
                                status === 'too-small' && 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-none'
                              )}
                            >
                              {status === 'occupied' ? '🔴 Taken' : status === 'too-small' ? `Max ${table.capacity}` : 'Available'}
                            </Badge>

                            {isSelected && (
                              <div className="absolute top-2 right-2 text-primary">
                                <CheckCircle2 className="size-5" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {selectedTableId && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-800 dark:text-emerald-200 font-semibold">
                      🎯 <strong>Table {selectedTableNumber}</strong> selected for {guests} guests on {date} at {time}
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 3: Guest Details ───────────────────────────────────── */}
              {activeStep === 2 && (
                <div className="space-y-6">
                  <h2 className="text-xl md:text-2xl font-black text-primary">
                    👤 Your Details
                  </h2>

                  <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 text-xs text-blue-900 dark:text-blue-200 font-medium">
                    Table <strong className="font-extrabold">{selectedTableNumber}</strong> · {guests} guests · {date} at {time}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="res-name">Full Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-primary" />
                        <Input
                          id="res-name"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="pl-9"
                        />
                      </div>
                      {step3Errors.name && <p className="text-xs text-destructive font-medium">{step3Errors.name}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="res-phone">Phone Number *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-primary" />
                        <Input
                          id="res-phone"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          className="pl-9"
                        />
                      </div>
                      {step3Errors.phone && <p className="text-xs text-destructive font-medium">{step3Errors.phone}</p>}
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <Label htmlFor="res-email">Email Address (optional)</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-primary" />
                        <Input
                          id="res-email"
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <Label htmlFor="res-request">Special Requests (Optional)</Label>
                      <textarea
                        id="res-request"
                        rows={3}
                        value={form.request}
                        onChange={(e) => setForm({ ...form, request: e.target.value })}
                        placeholder="e.g. Anniversary, vegetarian only, high chair needed..."
                        className="w-full rounded-xl border border-input bg-background p-3 text-xs md:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full font-black text-base py-6 rounded-2xl shadow-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white mt-4"
                  >
                    {loading ? <Loader2 className="size-6 animate-spin" /> : '🎉 Confirm Reservation'}
                  </Button>
                </div>
              )}

              {/* Navigation Buttons */}
              {activeStep < 3 && (
                <div className="flex items-center justify-between mt-8 pt-4 border-t">
                  <Button
                    variant="ghost"
                    onClick={() => setActiveStep((s) => s - 1)}
                    disabled={activeStep === 0}
                    className="text-xs font-bold gap-1 text-muted-foreground"
                  >
                    <ArrowLeft className="size-4" />
                    Back
                  </Button>
                  {activeStep < 2 && (
                    <Button
                      onClick={handleNext}
                      className="font-bold text-xs rounded-xl px-5 gap-1 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white"
                    >
                      {activeStep === 0 ? 'View Available Tables' : 'Enter Your Details'}
                      <ArrowRight className="size-4" />
                    </Button>
                  )}
                </div>
              )}

            </CardContent>
          </Card>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: '📍', title: 'Location', content: 'Madhapur, Hyderabad, TS – 500081' },
              { icon: '🕐', title: 'Hours', content: 'Lunch: 12PM–3:30PM\nDinner: 7PM–11PM' },
              { icon: '📞', title: 'Call Us', content: '+91 70326 82089' },
            ].map((info) => (
              <Card key={info.title} className="p-4 shadow-sm border-border/80 bg-background">
                <CardContent className="p-0 flex gap-3 items-center">
                  <span className="text-2xl">{info.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-foreground">{info.title}</p>
                    <p className="text-[11px] text-muted-foreground whitespace-pre-line mt-0.5">{info.content}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

        </div>
      </section>

      {/* Success Modal */}
      <Dialog open={success} onOpenChange={(open) => { if (!open) setSuccess(false); }}>
        <DialogContent className="p-6 text-center max-w-md w-full rounded-3xl">
          <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
            <CheckCircle2 className="size-8" />
          </div>
          <DialogTitle className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
            Table Reserved! 🎉
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Your reservation is confirmed. We look forward to serving you, <strong className="text-foreground">{form.name}</strong>!
          </p>

          <div className="bg-orange-50/60 dark:bg-zinc-900/60 rounded-2xl p-4 text-left border space-y-2 mb-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">BOOKING DETAILS</p>
            <p className="text-lg font-black text-primary">{confirmId}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Name:</span> <strong className="block text-foreground">{form.name}</strong></div>
              <div><span className="text-muted-foreground">Table:</span> <strong className="block text-foreground">Table {selectedTableNumber}</strong></div>
              <div><span className="text-muted-foreground">Date:</span> <strong className="block text-foreground">{date}</strong></div>
              <div><span className="text-muted-foreground">Time:</span> <strong className="block text-foreground">{time}</strong></div>
              <div><span className="text-muted-foreground">Guests:</span> <strong className="block text-foreground">{guests} people</strong></div>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              className="w-full font-bold py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white"
              onClick={() => {
                setSuccess(false);
                setActiveStep(0);
                setDate('');
                setTime('');
                setGuests('2');
                setSelectedTableId('');
                setSelectedTableNumber(0);
                setForm({ name: '', phone: '', email: '', request: '' });
              }}
            >
              Make Another Reservation
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full font-bold py-2.5 rounded-xl border-emerald-500 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 gap-1.5"
            >
              <a
                href={`https://wa.me/917032682089?text=Hello Pala Pitta Ruchulu! I have a reservation (${confirmId}) — Table ${selectedTableNumber} for ${guests} guests on ${date} at ${time}.`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="size-4" />
                Share on WhatsApp
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
