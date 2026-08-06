import React from 'react';
import Link from 'next/link';
import { ArrowLeft, type LucideIcon } from 'lucide-react';

import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Shared chrome for the privacy, terms and refund pages.
 *
 * All three carried an identical 30-line header and card wrapper, so a change
 * to the back-link or the effective-date line had to be made three times — and
 * twice it wasn't, leaving the pages subtly different.
 *
 * Body copy is styled from here through descendant selectors rather than
 * per-element classes, which keeps each page's file as close to plain prose as
 * possible.
 */
export function LegalPage({
  title,
  icon: Icon,
  effectiveDate = 'January 1, 2026',
  children,
}: {
  title: string;
  icon: LucideIcon;
  effectiveDate?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />

      <main className="min-h-screen py-8 md:py-12">
        <div className="mx-auto w-full max-w-3xl px-5">
          <header className="mb-6">
            <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2">
              <Link href="/">
                <ArrowLeft />
                Back to Home
              </Link>
            </Button>

            <h1 className="font-display text-primary flex items-center gap-3 text-3xl font-black tracking-tight md:text-4xl">
              <Icon className="size-8 shrink-0" aria-hidden="true" />
              {title}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Pala Pitta Ruchulu · Effective {effectiveDate}
            </p>
          </header>

          <Card className="rounded-3xl">
            <CardContent
              className={[
                'grid gap-6 p-6 md:p-10',
                '[&_section]:grid [&_section]:gap-2',
                '[&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:tracking-tight',
                '[&_p]:text-muted-foreground [&_p]:text-sm [&_p]:leading-relaxed',
                '[&_strong]:text-foreground [&_strong]:font-semibold',
                '[&_ul]:text-muted-foreground [&_ul]:grid [&_ul]:gap-1.5 [&_ul]:pl-5 [&_ul]:text-sm [&_ul]:leading-relaxed [&_li]:list-disc',
                '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2',
              ].join(' ')}
            >
              {children}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </>
  );
}
