'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Headset } from 'lucide-react';
import { restaurantInfo } from '@/data/restaurantInfo';
import PalaPittaLogo from './PalaPittaLogo';

interface Props {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  redirectTo?: string;
  icon?: React.ReactNode;
}

export default function AuthShell({
  title, subtitle, children, footer, redirectTo, icon,
}: Props) {
  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden bg-stone-50 dark:bg-stone-950 font-sans transition-colors duration-300">
      
      {/* ── Background Glow Accents (Mesh Gradient Style) ───────────────── */}
      <div className="pointer-events-none absolute -top-40 -left-40 size-96 rounded-full bg-amber-500/10 dark:bg-amber-500/5 blur-3xl animate-pulse duration-[6s]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 size-96 rounded-full bg-red-500/15 dark:bg-red-500/5 blur-3xl animate-pulse duration-[8s]" />

      {/* ── Header Area ─────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between gap-4 px-6 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-black text-stone-600 hover:text-stone-950 dark:text-stone-400 dark:hover:text-stone-100 transition-colors"
        >
          <ArrowLeft className="size-4 text-amber-600" />
          <span>Back to site</span>
        </Link>

        <Link href="/" className="hidden sm:inline-block transition-transform hover:scale-[1.02]">
          <PalaPittaLogo size="small" />
        </Link>

        <a
          href={`tel:${restaurantInfo.phone.replace(/\s/g, '')}`}
          className="inline-flex items-center gap-1.5 text-xs font-black text-stone-600 hover:text-stone-950 dark:text-stone-400 dark:hover:text-stone-100 transition-colors"
        >
          <Headset className="size-4 text-amber-600" />
          <span>Support</span>
        </a>
      </header>

      {/* ── Main Container (Centered Card) ──────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-8 w-full">
        <div className="w-full max-w-[440px] rounded-3xl border border-stone-200/60 dark:border-stone-850 bg-white/80 dark:bg-stone-900/75 backdrop-blur-xl shadow-2xl p-6 sm:p-8 space-y-6">
          
          {/* Logo & Intro */}
          <div className="flex flex-col items-center text-center space-y-3">
            <Link href="/" className="inline-block transition-transform hover:scale-[1.03]">
              <PalaPittaLogo size="large" priority />
            </Link>
            {icon && (
              <div className="w-12 h-12 bg-stone-100/80 dark:bg-stone-950/60 border border-stone-250 dark:border-stone-800 rounded-2xl flex items-center justify-center shadow-xs">
                {icon}
              </div>
            )}
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-stone-900 dark:text-stone-50">
                {title}
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-medium leading-relaxed max-w-xs mx-auto">
                {subtitle}
              </p>
            </div>
          </div>
          <div className="w-full">
            {children}
          </div>

          {/* Footer Area */}
          {footer && (
            <div className="border-t border-stone-200/80 dark:border-stone-800/80 pt-4 text-center text-xs">
              {footer}
            </div>
          )}
        </div>
      </main>

      {/* ── Footer Info ─────────────────────────────────────────────────── */}
      <footer className="relative z-10 py-5 text-center text-[10px] font-bold text-stone-400 dark:text-stone-500 px-6">
        © {new Date().getFullYear()} {restaurantInfo.name} · Open 12 PM – 11 PM daily
      </footer>
    </div>
  );
}
