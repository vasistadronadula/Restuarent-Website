import * as React from 'react';

import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground/70 selection:bg-primary selection:text-primary-foreground border-input flex h-11 w-full min-w-0 rounded-lg border bg-card px-3.5 py-2 text-base shadow-xs transition-[color,box-shadow,border-color] outline-none',
        'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        // 16px on mobile, 14px from sm up: iOS Safari zooms the viewport on
        // focus for anything under 16px, and the zoom never fully reverses —
        // that was the checkout form jumping sideways after every field.
        'sm:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/25 aria-invalid:ring-[3px]',
        // Chrome repaints an autofilled field with its own yellow and ignores
        // background-color. The 50000s transition is the standard way to hold
        // it off; the inset shadow paints our surface colour over it.
        'autofill:shadow-[inset_0_0_0_1000px_var(--card)] autofill:[transition:background-color_50000s_ease-in-out_0s] autofill:[-webkit-text-fill-color:var(--foreground)]',
        className
      )}
      {...props}
    />
  );
}

export { Input };
