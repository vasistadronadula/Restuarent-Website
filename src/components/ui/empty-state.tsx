import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * The one place an empty list, a failed search, or an error gets rendered.
 *
 * Every screen in this app used to invent its own — a bare "No orders" in grey
 * 12px on one page, a full-bleed illustration on another — which meant the
 * user could not tell "nothing here yet" apart from "something went wrong".
 * `variant` makes that distinction the caller's explicit choice.
 */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = 'default',
  className,
  ...props
}: React.ComponentProps<'div'> & {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'error';
}) {
  return (
    <div
      data-slot="empty-state"
      role={variant === 'error' ? 'alert' : undefined}
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl px-6 py-14 text-center',
        className
      )}
      {...props}
    >
      {Icon && (
        <div
          className={cn(
            'grid size-14 place-items-center rounded-2xl',
            variant === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
          )}
        >
          <Icon className="size-7" aria-hidden="true" />
        </div>
      )}
      <div className="grid gap-1.5">
        <h3 className="font-display text-base font-bold tracking-tight">{title}</h3>
        {description && (
          <p className="text-muted-foreground mx-auto max-w-sm text-sm">{description}</p>
        )}
      </div>
      {action && <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export { EmptyState };
