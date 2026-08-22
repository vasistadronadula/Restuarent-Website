'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Eye, EyeOff, Loader2, Lock, Mail, Phone, User, X } from 'lucide-react';

import { useAuthStore } from '@/store/useAuthStore';
import { useAuth, landAfterLogin } from '@/context/AuthContext';
import { isStaffRole } from '@/lib/roleAccess';
import { validateEmail, validateName, validatePhone, validatePassword, normalizePhone } from '@/lib/validation';
import GoogleIcon from './GoogleIcon';
import PhoneOtpAuth from './PhoneOtpAuth';
import AuthMethodToggle, { type AuthMethod } from './AuthMethodToggle';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AuthModal() {
  const pathname = usePathname();
  const isAuthModalOpen = useAuthStore((s) => s.isAuthModalOpen);
  const authModalTab = useAuthStore((s) => s.authModalTab);
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();

  const [authMethod, setAuthMethod] = useState<AuthMethod>('otp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isLogin = authModalTab === 'login';
  const close = () => useAuthStore.getState().closeAuthModal();

  const fullPageHref = (page: 'login' | 'signup') =>
    pathname && pathname !== '/' ? `/${page}?redirect=${encodeURIComponent(pathname)}` : `/${page}`;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const problem = isLogin
      ? validateEmail(email) ?? validatePassword(password, 'login')
      : validateName(name) ?? validatePhone(phone) ?? validateEmail(email) ?? validatePassword(password, 'new');

    if (problem) { setFormError(problem); return; }

    setLoading(true);
    const res = isLogin
      ? await signInWithEmail(email.trim(), password)
      : await signUpWithEmail(email.trim(), password, name.trim(), normalizePhone(phone));

    if (!res?.success) {
      setLoading(false);
      setFormError(
        isLogin
          ? "That email and password don't match an account."
          : 'We could not create that account. The email may already be registered.',
      );
      return;
    }

    if (res.role && isStaffRole(res.role)) {
      landAfterLogin(res.role);
      return;
    }

    setLoading(false);
    close();
  };

  return (
    <Dialog modal={false} open={isAuthModalOpen} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent showCloseButton={false} className="p-0 overflow-hidden max-w-md w-full sm:rounded-2xl border-none">
        {/* Branded Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#1A0606] via-[#370C0C] to-[#1A0606] p-6 text-white">
          <div className="pointer-events-none absolute -right-10 -top-20 size-48 rounded-full bg-amber-500/20 blur-2xl" />
          
          <div className="relative z-10 pr-10">
            <div className="mb-3 inline-flex items-center rounded-xl bg-white/95 px-3 py-1.5 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Pala Pitta Ruchulu"
                className="h-7 w-auto block object-contain"
              />
            </div>
            <DialogTitle className="text-xl font-extrabold tracking-tight text-white">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </DialogTitle>
            <p className="mt-1 text-xs text-white/70">
              {isLogin
                ? 'Sign in to track orders and book tables.'
                : 'One account for ordering, tracking and bookings.'}
            </p>
          </div>

          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 z-20 flex size-8 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="bg-background p-6 space-y-5">
          <AuthMethodToggle value={authMethod} onChange={setAuthMethod} disabled={loading} />

          {authMethod === 'otp' ? (
            <PhoneOtpAuth
              key={isLogin ? 'login' : 'signup'}
              isSignUpMode={!isLogin}
              onSuccess={() => close()}
            />
          ) : (
            <div className="space-y-4">
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {formError && (
                  <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">
                    {formError}
                  </div>
                )}

                {!isLogin && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="modal-name">Full name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-primary" />
                        <Input
                          id="modal-name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          autoComplete="name"
                          placeholder="e.g. Rahul Sharma"
                          maxLength={80}
                          autoFocus
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="modal-phone">Mobile number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-primary" />
                        <Input
                          id="modal-phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          autoComplete="tel"
                          placeholder="9876543210"
                          maxLength={15}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="modal-email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-primary" />
                    <Input
                      id="modal-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      placeholder="rahul@example.com"
                      // Only the login form's first field — signup's name
                      // field above already claims it, and two competing
                      // autoFocus elements in the same tree is undefined
                      // which-one-wins behaviour.
                      autoFocus={isLogin}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="modal-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-primary" />
                    <Input
                      id="modal-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={isLogin ? 'current-password' : 'new-password'}
                      className="pl-9 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {isLogin && (
                  <div className="text-right">
                    <Link
                      href="/login?mode=forgot"
                      onClick={close}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full font-extrabold shadow-md bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white py-2.5 rounded-xl transition-all"
                >
                  {loading ? <Loader2 className="size-5 animate-spin" /> : isLogin ? 'Log in' : 'Create account'}
                </Button>
              </form>

              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
                <span className="relative bg-background px-3 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                  OR
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={signInWithGoogle}
                className="w-full font-bold py-2.5 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-muted gap-2"
              >
                <GoogleIcon />
                Continue with Google
              </Button>
            </div>
          )}

          <div className="border-t pt-4 text-center text-xs space-y-1">
            <div>
              <span className="text-muted-foreground">
                {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
              </span>
              <button
                type="button"
                onClick={() => { setFormError(null); useAuthStore.getState().openAuthModal(isLogin ? 'signup' : 'login'); }}
                className="font-extrabold text-primary hover:underline"
              >
                {isLogin ? 'Sign up' : 'Log in'}
              </button>
            </div>
            <div>
              <Link
                href={fullPageHref(isLogin ? 'login' : 'signup')}
                onClick={close}
                className="text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:underline"
              >
                Open the full page instead
              </Link>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
