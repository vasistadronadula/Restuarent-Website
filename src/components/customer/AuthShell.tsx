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
  icon?: React.ReactNode;
}

export default function AuthShell({
  title, subtitle, children, footer, icon,
}: Props) {
  return (
    <div className="bg-store relative flex min-h-screen w-full flex-col justify-between overflow-hidden font-sans transition-colors duration-300">
      
      {/* ── Background Glow Accents (Mesh Gradient Style) ───────────────── */}
      <div className="bg-brand/15 pointer-events-none absolute -top-40 -left-40 size-96 rounded-full blur-3xl animate-pulse duration-[6s]" />
      <div className="bg-cobalt-500/25 pointer-events-none absolute -right-40 -bottom-40 size-96 rounded-full blur-3xl animate-pulse duration-[8s]" />

      {/* ── Header Area ─────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between gap-4 px-6 py-5">
        <Link
          href="/"
          className="text-ink-2 hover:text-ink-1 inline-flex items-center gap-1.5 text-xs font-black transition-colors"
        >
          <ArrowLeft className="text-brand-600 size-4" />
          <span>Back to site</span>
        </Link>

        <Link href="/" className="hidden sm:inline-block transition-transform hover:scale-[1.02]">
          <PalaPittaLogo size="small" />
        </Link>

        <a
          href={`tel:${restaurantInfo.phone.replace(/\s/g, '')}`}
          className="text-ink-2 hover:text-ink-1 inline-flex items-center gap-1.5 text-xs font-black transition-colors"
        >
          <Headset className="text-brand-600 size-4" />
          <span>Support</span>
        </a>
      </header>

      {/* ── Main Container (Centered Card) ──────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-8 w-full">
        <div className="border-hair-1 w-full max-w-[440px] space-y-6 rounded-3xl border bg-white/85 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          
          {/* Logo & Intro */}
          <div className="flex flex-col items-center text-center space-y-3">
            <Link href="/" className="inline-block transition-transform hover:scale-[1.03]">
              <PalaPittaLogo size="large" priority />
            </Link>
            {icon && (
              <div className="border-brand-200 bg-brand-50 flex h-12 w-12 items-center justify-center rounded-2xl border shadow-xs">
                {icon}
              </div>
            )}
            <div className="space-y-1">
              <h1 className="text-ink-1 text-xl font-black tracking-tight sm:text-2xl">
                {title}
              </h1>
              <p className="text-ink-3 mx-auto max-w-xs text-xs leading-relaxed font-medium">
                {subtitle}
              </p>
            </div>
          </div>
          <div className="w-full [&_input]:text-base sm:[&_input]:text-sm">
            {children}
          </div>

          {/* Footer Area */}
          {footer && (
            <div className="border-hair-1 border-t pt-4 text-center text-xs">
              {footer}
            </div>
          )}
        </div>
      </main>

      {/* ── Footer Info ─────────────────────────────────────────────────── */}
      <footer className="text-ink-4 relative z-10 px-6 py-5 text-center text-[10px] font-bold">
        © {new Date().getFullYear()} {restaurantInfo.name} · Open 12 PM – 11 PM daily
      </footer>
    </div>
  );
}
