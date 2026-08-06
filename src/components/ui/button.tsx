'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // `shrink-0` on the icons stops a long label from squashing a leading icon
  // into an ellipse, which is what happened to the cart button at 320px.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-[color,box-shadow,background-color,transform] duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:border-ring active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20',
        brand:
          'text-primary-foreground shadow-sm bg-linear-to-br from-primary to-accent hover:shadow-lg hover:shadow-primary/25',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 focus-visible:ring-destructive/40',
        success:
          'bg-success text-success-foreground shadow-sm hover:bg-success/90 focus-visible:ring-success/40',
        outline:
          'border border-border bg-card text-foreground shadow-xs hover:bg-muted hover:border-foreground/20',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/70',
        ghost: 'hover:bg-muted hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline active:translate-y-0',
      },
      size: {
        // 44px is the smallest reliable touch target; this app is used
        // one-handed on a phone by diners and on a tablet by cashiers, so the
        // default size is deliberately not the 36px shadcn ships.
        default: 'h-11 px-5 py-2 has-[>svg]:px-4',
        sm: 'h-9 rounded-md px-3.5 gap-1.5 has-[>svg]:px-3 text-[13px]',
        lg: 'h-12 rounded-xl px-7 text-base has-[>svg]:px-6',
        xl: 'h-14 rounded-xl px-8 text-base has-[>svg]:px-7',
        icon: 'size-11',
        'icon-sm': 'size-9 rounded-md',
        'icon-lg': 'size-12 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface ButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';

  // A Slot child must stay a single element, so the spinner is only injected
  // for real <button>s. `asChild` callers own their own busy state.
  if (asChild) {
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </Comp>
    );
  }

  return (
    <button
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
