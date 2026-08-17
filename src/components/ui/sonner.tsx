'use client';

import { Toaster as Sonner, type ToasterProps } from 'sonner';

/**
 * Toaster — premium in-app notifications.
 *
 * Desktop (≥900 px): bottom-right, 28px from edge. Never covers any fixed
 * chrome — the admin sidebar is on the left, nothing is stuck to the right.
 *
 * Mobile (<900 px): top-center, 72px from top. That clears the admin sticky
 * header (58px) with 14px breathing room, and the position is nowhere near the
 * bottom nav (65px) so toasts never overlap interactive elements.
 *
 * Both variants use `mobileOffset` / `offset` rather than a JS media query so
 * there is never a hydration mismatch between SSR and client.
 */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="bottom-right"
      /* Desktop: 28px padding from each edge. */
      offset={{ bottom: 28, right: 28 }}
      /* Mobile: just below the sticky admin header with equal left/right gutters. */
      mobileOffset={{ top: 72, left: 12, right: 12 }}
      gap={10}
      duration={4500}
      richColors
      closeButton
      expand={false}
      toastOptions={{
        classNames: {
          toast: [
            'group toast',
            'group-[.toaster]:bg-white',
            'group-[.toaster]:text-stone-900',
            'group-[.toaster]:border group-[.toaster]:border-stone-200/80',
            'group-[.toaster]:shadow-[0_8px_30px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)]',
            'group-[.toaster]:rounded-xl',
          ].join(' '),
          title:
            'group-[.toast]:font-semibold group-[.toast]:text-[14px] group-[.toast]:leading-snug',
          description:
            'group-[.toast]:text-stone-500 group-[.toast]:text-[13px] group-[.toast]:leading-snug',
          actionButton: [
            'group-[.toast]:bg-stone-900 group-[.toast]:text-white',
            'group-[.toast]:rounded-md group-[.toast]:text-[12px] group-[.toast]:font-semibold',
          ].join(' '),
          cancelButton: [
            'group-[.toast]:bg-stone-100 group-[.toast]:text-stone-600',
            'group-[.toast]:rounded-md group-[.toast]:text-[12px]',
          ].join(' '),
          closeButton: [
            'group-[.toast]:bg-stone-100 group-[.toast]:border-stone-200',
            'group-[.toast]:text-stone-500',
          ].join(' '),
          // Semantic left-border colour accent per toast type
          success: [
            'group-[.toaster]:border-l-[4px] group-[.toaster]:border-l-emerald-500',
          ].join(' '),
          error: [
            'group-[.toaster]:border-l-[4px] group-[.toaster]:border-l-red-500',
          ].join(' '),
          warning: [
            'group-[.toaster]:border-l-[4px] group-[.toaster]:border-l-amber-500',
          ].join(' '),
          info: [
            'group-[.toaster]:border-l-[4px] group-[.toaster]:border-l-blue-500',
          ].join(' '),
        },
      }}
      style={
        {
          '--normal-bg': '#ffffff',
          '--normal-text': '#1c1917',
          '--normal-border': 'rgba(231,229,228,0.8)',
          '--width': '380px',
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
