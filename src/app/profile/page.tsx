'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, BookOpen, CheckCircle2, Loader2, Lock, LogOut, Mail, Phone,
  Receipt, Save, Shield, ShoppingBag, User
} from 'lucide-react';

import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { accountDisplayName, formatMobileForDisplay, isInternalPhoneEmail } from '@/lib/phoneIdentity';
import { validateEmail, validateName, validatePhone, normalizePhone } from '@/lib/validation';
import { ROLE_ICONS, ROLE_LABELS } from '@/lib/roleAccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const QUICK_LINKS = [
  {
    href: '/orders',
    icon: <Receipt className="size-5" />,
    tint: 'bg-red-500/10 text-red-600 border-red-500/20',
    title: 'My Orders',
    body: 'Track live deliveries and reorder past favourites',
  },
  {
    href: '/reservation',
    icon: <BookOpen className="size-5" />,
    tint: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    title: 'Table Reservations',
    body: 'Book a table or review an upcoming booking',
  },
  {
    href: '/menu',
    icon: <ShoppingBag className="size-5" />,
    tint: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    title: 'Explore Menu',
    body: 'Browse the full menu and order online',
  },
];

function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}

export default function CustomerProfilePage() {
  const { user, userRole, updateUserProfile, signOutUser } = useAuth();
  const authReady = useAuthStore((s) => s.authReady);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [initial, setInitial] = useState({ fullName: '', email: '', phone: '' });
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isPhoneAccount = isInternalPhoneEmail(user?.email);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      const meta = user.user_metadata || {};
      const realEmail = (candidate?: string | null) =>
        candidate && !isInternalPhoneEmail(candidate) ? candidate : '';

      const loaded = {
        fullName: data?.full_name || meta.full_name || meta.name || '',
        email: realEmail(user.email) || realEmail(data?.email) || realEmail(meta.email) || '',
        phone: normalizePhone(data?.phone || meta.phone || ''),
      };

      setFullName(loaded.fullName);
      setEmail(loaded.email);
      setPhone(loaded.phone);
      setInitial(loaded);
      setLoadedFor(user.id);
    })();

    return () => { cancelled = true; };
  }, [user]);

  const loadingProfile = Boolean(user) && loadedFor !== user?.id;

  const dirty = useMemo(
    () => fullName !== initial.fullName || email !== initial.email || phone !== initial.phone,
    [fullName, email, phone, initial],
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const problem =
      validateName(fullName)
      ?? (email ? validateEmail(email) : null)
      ?? validatePhone(phone);
    if (problem) { setFormError(problem); return; }

    setSaving(true);
    const success = await updateUserProfile(fullName.trim(), email.trim(), normalizePhone(phone));
    setSaving(false);
    if (success) {
      setInitial({ fullName: fullName.trim(), email: email.trim(), phone: normalizePhone(phone) });
    }
  };

  /* ── Still deciding ───────────────────────────────────────────────────── */
  if (!authReady || loadingProfile) {
    return (
      <PageFrame>
        <div className="flex-1 w-full flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium">Loading your profile…</p>
        </div>
      </PageFrame>
    );
  }

  /* ── Signed out ───────────────────────────────────────────────────────── */
  if (!user) {
    return (
      <PageFrame>
        <div className="flex-1 w-full flex items-center justify-center py-16 px-6">
          <Card className="max-w-md w-full p-8 text-center rounded-3xl shadow-xl border-border/80 bg-background">
            <CardContent className="p-0 flex flex-col items-center">
              <div className="size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Lock className="size-8" />
              </div>
              <h2 className="text-2xl font-black text-foreground mb-2">
                Sign in to view your profile
              </h2>
              <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                Log in to manage your details, follow your orders and keep track of table bookings.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                <Button
                  asChild
                  className="font-extrabold px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white"
                >
                  <Link href="/login?redirect=%2Fprofile">Log In</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="font-extrabold px-6 py-2.5 rounded-xl border-primary/30 text-primary hover:bg-primary/5"
                >
                  <Link href="/signup?redirect=%2Fprofile">Create Account</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageFrame>
    );
  }

  /* ── Signed in ────────────────────────────────────────────────────────── */
  const displayName = fullName || accountDisplayName(user) || 'Valued Customer';
  const signInCredential = isPhoneAccount
    ? formatMobileForDisplay(user.user_metadata?.phone || user.email?.split('@')[0]?.replace(/^phone_/, '') || '')
    : user.email || '';
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : null;

  return (
    <PageFrame>
      <div className="flex-1 w-full bg-orange-50/40 dark:bg-zinc-900/40 py-4 md:py-6">
        <div className="w-full px-4 sm:px-8 md:px-12 max-w-none space-y-4">

          {/* Banner - Full Width Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1A0606] via-[#370C0C] to-[#150404] p-4 md:p-5 text-white shadow-lg">
            <div className="pointer-events-none absolute -right-10 -top-20 size-72 rounded-full bg-amber-500/20 blur-3xl" />

            <div className="relative z-10 flex flex-wrap items-center gap-3 md:gap-5">
              <Avatar className="size-14 md:size-16 border-2 border-amber-400 shadow-md">
                <AvatarFallback className="bg-primary text-white text-lg md:text-xl font-black">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <h1 className="text-lg md:text-xl font-black tracking-tight text-white">
                  {displayName}
                </h1>
                <p className="text-xs text-white/70 truncate mt-0.5">
                  {signInCredential}
                </p>

                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <Badge className="bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold px-2 py-0.5 text-[11px] gap-1">
                    <Shield className="size-3" />
                    {userRole ? `${ROLE_ICONS[userRole] || ''} ${ROLE_LABELS[userRole]}` : '👤 Customer'}
                  </Badge>

                  {memberSince && (
                    <Badge variant="outline" className="border-white/20 text-white/80 font-semibold px-2 py-0.5 text-[11px]">
                      Member since {memberSince}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Details Form Column */}
            <div className="lg:col-span-7">
              <Card className="p-6 md:p-8 shadow-sm border-border/80 bg-background rounded-3xl">
                <CardContent className="p-0 space-y-6">
                  <div>
                    <h2 className="text-xl font-extrabold text-foreground">Personal information</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      This is what we put on your orders and use to reach you about a delivery or a booking.
                    </p>
                  </div>

                  <form onSubmit={handleSave} className="space-y-4">
                    {formError && (
                      <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">
                        {formError}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label htmlFor="prof-name">Full name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-primary" />
                        <Input
                          id="prof-name"
                          value={fullName}
                          onChange={(e) => { setFullName(e.target.value); setFormError(null); }}
                          required
                          placeholder="e.g. Rahul Sharma"
                          autoComplete="name"
                          maxLength={80}
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="prof-email">{isPhoneAccount ? 'Email address' : 'Sign-in email'}</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-primary" />
                        <Input
                          id="prof-email"
                          type="email"
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); setFormError(null); }}
                          disabled={!isPhoneAccount}
                          placeholder="e.g. rahul@example.com"
                          autoComplete="email"
                          className="pl-9 pr-9"
                        />
                        {!isPhoneAccount && (
                          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-emerald-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {isPhoneAccount
                          ? 'Where your receipts and booking confirmations are sent.'
                          : 'This is how you sign in, so it can only be changed by our team.'}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="prof-phone">{isPhoneAccount ? 'Verified mobile number' : 'Mobile number'}</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-primary" />
                        <Input
                          id="prof-phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setFormError(null); }}
                          disabled={isPhoneAccount}
                          placeholder="10-digit mobile number"
                          autoComplete="tel-national"
                          maxLength={10}
                          className="pl-9 pr-9"
                        />
                        {isPhoneAccount && (
                          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-emerald-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {isPhoneAccount
                          ? 'This is the number you sign in with, verified by SMS.'
                          : 'So the kitchen can reach you about an order.'}
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={saving || !dirty}
                      className="font-extrabold shadow-md px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white gap-2 transition-all"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <Save className="size-4" />
                          {dirty ? 'Save changes' : 'Saved'}
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Shortcuts Column */}
            <div className="lg:col-span-5 space-y-4">
              {QUICK_LINKS.map((item) => (
                <Card
                  key={item.href}
                  className="group shadow-sm border-border/80 bg-background hover:shadow-md transition-all rounded-2xl overflow-hidden"
                >
                  <Link href={item.href} className="p-4 flex items-center gap-4 block">
                    <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl border ${item.tint}`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold text-foreground group-hover:text-primary transition-colors">{item.title}</p>
                      <p className="text-xs text-muted-foreground leading-snug">{item.body}</p>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                  </Link>
                </Card>
              ))}

              <Button
                variant="outline"
                onClick={signOutUser}
                className="w-full font-extrabold py-3 rounded-2xl border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-500/10 gap-2 mt-4"
              >
                <LogOut className="size-4" />
                Sign Out
              </Button>
            </div>
          </div>

        </div>
      </div>
    </PageFrame>
  );
}
