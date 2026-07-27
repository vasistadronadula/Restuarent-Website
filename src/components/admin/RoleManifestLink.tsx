'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { roleAppFor } from '@/lib/roleApps';

/**
 * Points the page's <link rel="manifest"> at the signed-in role's manifest
 * (/manifest/kitchen, /manifest/billing, …) so the browser's install prompt
 * offers that role's app — name, icon label and start page included.
 *
 * The document ships with the generic manifest from layout.tsx; this swaps
 * the href once the role is known. Chrome re-reads the manifest when the
 * href changes, so an install started afterwards uses the role's app. The
 * theme-color meta is updated alongside it so the installed app's title bar
 * matches its role accent.
 *
 * Mounted inside AdminLayout only — the customer site keeps the default
 * manifest.
 */
export default function RoleManifestLink() {
  const { userRole } = useAuth();

  useEffect(() => {
    const app = roleAppFor(userRole);
    if (!app) return;

    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (link) link.href = `/manifest/${app.slug}`;

    const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeMeta) themeMeta.content = app.themeColor;

    // iOS ignores the manifest entirely and reads this instead, so the
    // "Add to Home Screen" label matches the role's app name there too.
    let appleTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
    if (!appleTitle) {
      appleTitle = document.createElement('meta');
      appleTitle.name = 'apple-mobile-web-app-title';
      document.head.appendChild(appleTitle);
    }
    appleTitle.content = app.shortName;
  }, [userRole]);

  return null;
}
