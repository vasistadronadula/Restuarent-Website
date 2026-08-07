'use client';

import { Toaster as Sonner, type ToasterProps } from 'sonner';

/**
 * Toasts sit bottom-right on desktop and top-centre on phones — where the
 * thumb isn't covering them and they don't collide with the fixed bottom nav
 * or the floating cart bar.
 *
 * The position is chosen with a CSS-driven `mobileOffset`/`offset` pair rather
 * than a JS media query so there's no hydration mismatch between the position
 * the server rendered and the one the client measures.
 */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="bottom-right"
      offset={{ bottom: 24, right: 24 }}
      mobileOffset={{ top: 'calc(70px + env(safe-area-inset-top, 0px))', left: 12, right: 12 }}
      duration={3500}
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-md',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-md',
          success: 'group-[.toaster]:[--toast-icon-color:var(--success)]',
          error: 'group-[.toaster]:[--toast-icon-color:var(--destructive)]',
          warning: 'group-[.toaster]:[--toast-icon-color:var(--warning)]',
          info: 'group-[.toaster]:[--toast-icon-color:var(--info)]',
        },
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
