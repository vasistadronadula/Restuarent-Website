import { redirect } from 'next/navigation';

/**
 * /cashier — a memorable alias for the till, kept because it is the URL
 * staff actually type.
 *
 * It redirects rather than rendering the POS. Importing the page component
 * from '/admin/pos' (as this used to) mounted a second copy of the whole
 * billing screen at a URL *outside* the /admin segment, which meant it
 * skipped `app/admin/layout.tsx` and fell outside the installed app's
 * manifest scope ('/admin') — so a cashier who opened it from the home
 * screen dropped out of their PWA into a plain browser tab.
 *
 * A server redirect resolves before render: one POS, one URL, one layout.
 */
export default function CashierAliasPage() {
  redirect('/admin/pos');
}
