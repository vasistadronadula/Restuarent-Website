'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, Check, Loader2, Lock, LogOut, Mail, Phone, Receipt, Save,
  ShoppingBag, User,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import { Container } from '@/components/customer/Container';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { accountDisplayName, formatMobileForDisplay, isInternalPhoneEmail } from '@/lib/phoneIdentity';
import { validateEmail, validateName, validatePhone, normalizePhone } from '@/lib/validation';
import { ROLE_LABELS, isStaffRole } from '@/lib/roleAccess';

const QUICK_LINKS = [
  {
    href: '/orders',
    icon: Receipt,
    title: 'My orders',
    body: 'Track what is cooking and reorder a favourite',
  },
  {
    href: '/menu',
    icon: ShoppingBag,
    title: 'Browse the menu',
    body: 'Biryanis, vepudus and the day’s specials',
  },
];

function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-store flex min-h-screen w-full flex-col">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}

export default function CustomerProfilePage() {
  const router = useRouter();
  const { user, userRole, updateUserProfile, signOutUser } = useAuth();
  const authReady = useAuthStore((s) => s.authReady);

  useEffect(() => {
    if (authReady && user && isStaffRole(userRole)) {
      router.replace('/admin/profile');
    }
  }, [authReady, user, userRole, router]);

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
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-3 py-24">
          <div className="border-brand/25 border-t-brand size-9 animate-spin rounded-full border-[3px]" />
          <p className="text-ink-4 text-[13px] font-semibold">Loading your profile…</p>
        </div>
      </PageFrame>
    );
  }

  /* ── Signed out ───────────────────────────────────────────────────────── */
  if (!user) {
    return (
      <PageFrame>
        <div className="flex flex-1 items-center justify-center px-4 py-16">
          <div className="border-hair-1 shadow-store w-full max-w-md rounded-2xl border bg-white p-7 text-center sm:p-8">
            <span className="bg-brand-50 text-brand-500 mx-auto mb-5 grid size-16 place-items-center rounded-full">
              <Lock className="size-8" />
            </span>
            <h1 className="text-ink-1 font-display text-[21px] font-black tracking-tight">
              Sign in to see your profile
            </h1>
            <p className="text-ink-3 mx-auto mt-2 max-w-[320px] text-[13.5px] leading-relaxed">
              Your saved details, coupons and full order history all live behind your account.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <Link
                href="/login?redirect=%2Fprofile"
                className="bg-brand hover:bg-brand-600 flex h-12 items-center justify-center rounded-xl px-7 text-[15px] font-extrabold text-white transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup?redirect=%2Fprofile"
                className="border-hair-1 text-ink-2 hover:bg-hair-2 flex h-12 items-center justify-center rounded-xl border px-7 text-[15px] font-bold transition-colors"
              >
                Create account
              </Link>
            </div>
          </div>
        </div>
      </PageFrame>
    );
  }

  /* ── Signed in ────────────────────────────────────────────────────────── */
  const displayName = fullName || accountDisplayName(user) || 'Valued customer';
  const signInCredential = isPhoneAccount
    ? formatMobileForDisplay(user.user_metadata?.phone || user.email?.split('@')[0]?.replace(/^phone_/, '') || '')
    : user.email || '';
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : null;

  return (
    <PageFrame>
      <main className="flex-1 py-5 sm:py-7">
        <Container className="max-w-[1200px]">
          {/* ── Identity ─────────────────────────────────────────────── */}
          <section className="border-hair-1 shadow-store flex items-center gap-4 rounded-2xl border bg-white p-5 sm:p-6">
            <span className="bg-brand grid size-14 shrink-0 place-items-center rounded-full text-[22px] font-black text-white sm:size-16 sm:text-[26px]">
              {displayName.charAt(0).toUpperCase()}
            </span>

            <div className="min-w-0">
              <h1 className="text-ink-1 font-display truncate text-[20px] font-black tracking-tight sm:text-[24px]">
                {displayName}
              </h1>
              <p className="text-ink-3 mt-0.5 truncate text-[13px] font-medium">
                {signInCredential}
              </p>
              <p className="text-ink-4 mt-1.5 text-[11.5px] font-bold tracking-wide uppercase">
                {userRole ? ROLE_LABELS[userRole] : 'Customer'}
                {memberSince && ` · Member since ${memberSince}`}
              </p>
            </div>
          </section>

          <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_22rem]">
            {/* ── Details form ───────────────────────────────────────── */}
            <section className="border-hair-1 shadow-store rounded-2xl border bg-white p-5 sm:p-6">
              <h2 className="text-ink-1 text-[16px] font-extrabold">Personal information</h2>
              <p className="text-ink-4 mt-0.5 text-[12.5px]">
                What we put on your bill and use to reach you about an order.
              </p>

              <form onSubmit={handleSave} className="mt-5 grid gap-4">
                {formError && (
                  <p
                    role="alert"
                    className="border-nonveg/25 bg-nonveg/8 text-nonveg rounded-xl border px-3.5 py-2.5 text-[12.5px] font-semibold"
                  >
                    {formError}
                  </p>
                )}

                <ProfileField
                  id="prof-name"
                  label="Full name"
                  icon={User}
                  value={fullName}
                  onChange={(v) => { setFullName(v); setFormError(null); }}
                  placeholder="e.g. Rahul Sharma"
                  autoComplete="name"
                  maxLength={80}
                  required
                />

                <ProfileField
                  id="prof-email"
                  label={isPhoneAccount ? 'Email address' : 'Sign-in email'}
                  icon={Mail}
                  type="email"
                  value={email}
                  onChange={(v) => { setEmail(v); setFormError(null); }}
                  disabled={!isPhoneAccount}
                  verified={!isPhoneAccount}
                  placeholder="e.g. rahul@example.com"
                  autoComplete="email"
                  hint={
                    isPhoneAccount
                      ? 'Where receipts and confirmations are sent.'
                      : 'This is how you sign in, so only our team can change it.'
                  }
                />

                <ProfileField
                  id="prof-phone"
                  label={isPhoneAccount ? 'Verified mobile number' : 'Mobile number'}
                  icon={Phone}
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(v) => { setPhone(v.replace(/\D/g, '').slice(0, 10)); setFormError(null); }}
                  disabled={isPhoneAccount}
                  verified={isPhoneAccount}
                  placeholder="10-digit mobile number"
                  autoComplete="tel-national"
                  maxLength={10}
                  hint={
                    isPhoneAccount
                      ? 'The number you sign in with, verified by SMS.'
                      : 'So the kitchen can reach you about an order.'
                  }
                />

                <button
                  type="submit"
                  disabled={saving || !dirty}
                  className={cn(
                    'mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-extrabold transition-colors sm:w-auto sm:px-8',
                    dirty
                      ? 'bg-brand hover:bg-brand-600 text-white'
                      : 'bg-hair-2 text-ink-4 cursor-default'
                  )}
                >
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="size-4" />
                      {dirty ? 'Save changes' : 'All saved'}
                    </>
                  )}
                </button>
              </form>
            </section>

            {/* ── Shortcuts ──────────────────────────────────────────── */}
            <aside className="grid gap-3">
              {QUICK_LINKS.map(({ href, icon: Icon, title, body }) => (
                <Link
                  key={href}
                  href={href}
                  className="group border-hair-1 shadow-store hover:shadow-store-lifted flex items-center gap-3.5 rounded-2xl border bg-white p-4 transition-shadow"
                >
                  <span className="bg-brand-50 text-brand-600 grid size-11 shrink-0 place-items-center rounded-xl">
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-ink-1 group-hover:text-brand-700 block text-[14px] font-extrabold transition-colors">
                      {title}
                    </span>
                    <span className="text-ink-3 block text-[12.5px] leading-snug">{body}</span>
                  </span>
                  <ArrowRight className="text-ink-4 group-hover:text-brand size-4 shrink-0 transition-all group-hover:translate-x-0.5" />
                </Link>
              ))}

              <button
                type="button"
                onClick={signOutUser}
                className="border-hair-1 text-nonveg hover:border-nonveg/30 hover:bg-nonveg/6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border bg-white text-[14px] font-extrabold transition-colors"
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </aside>
          </div>
        </Container>
      </main>
    </PageFrame>
  );
}

/**
 * A profile field. `verified` marks the credential the account signs in with —
 * that one is read-only by design, and a lock with no explanation reads as a
 * bug, so the green tick plus the hint underneath say why.
 */
function ProfileField({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  hint,
  verified,
  ...input
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  verified?: boolean;
} & Omit<React.ComponentProps<'input'>, 'id' | 'value' | 'onChange'>) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-ink-2 text-[13px] font-bold">
        {label}
      </label>
      <div className="relative">
        <Icon className="text-ink-4 pointer-events-none absolute top-1/2 left-3.5 size-[17px] -translate-y-1/2" />
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={cn(
            'border-hair-1 text-ink-1 placeholder:text-ink-4 h-12 w-full rounded-xl border bg-white pr-10 pl-11 text-[14px] font-medium',
            'transition-colors outline-none focus:border-brand-300 focus:ring-[3px] focus:ring-brand/15',
            'disabled:bg-hair-2/60 disabled:text-ink-3'
          )}
          {...input}
        />
        {verified && (
          <span
            className="bg-veg absolute top-1/2 right-3.5 grid size-[18px] -translate-y-1/2 place-items-center rounded-full text-white"
            title="Verified"
          >
            <Check className="size-3" strokeWidth={3} />
          </span>
        )}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="text-ink-4 text-[12px]">
          {hint}
        </p>
      )}
    </div>
  );
}
