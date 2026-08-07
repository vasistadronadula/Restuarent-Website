import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * The one width/gutter recipe for every customer-facing section, so the left
 * and right edges of the navbar, footer, and every page section line up as
 * you scroll instead of drifting between one-off px-* values.
 *
 * 1600px mirrors the cap AdminLayout already ships with — reusing a value
 * that's proven out on very wide monitors rather than the narrower max-w-7xl
 * (1280px) that made the site feel boxed-in and was reverted.
 */
export function Container({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('mx-auto w-full max-w-[1600px] px-4 sm:px-8 md:px-12', className)}
      {...props}
    />
  );
}
