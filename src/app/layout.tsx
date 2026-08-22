import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

// One Apple-style geometric sans for the whole app — body copy, headings and
// the admin console alike. Replaces the previous Inter/Fraunces/Archivo trio.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

import { Providers } from "./providers";
import RoleManifestLink from "@/components/admin/RoleManifestLink";

export const viewport: Viewport = {
  // Light mode only — no dark theme anymore, so the browser chrome stays
  // cream in every context instead of snapping to a dark bar.
  themeColor: "#FFF8F2",
  width: "device-width",
  initialScale: 1,
  // maximumScale/userScalable are deliberately not set: pinning them blocks
  // pinch-zoom, which is a WCAG 1.4.4 failure and the single most common
  // complaint from diners reading a menu on a small phone.
};

export const metadata: Metadata = {
  metadataBase: new URL("https://pala-pitta-ruchulu.vercel.app"),
  title: "Pala Pitta Ruchulu | Authentic Telugu & South Indian Restaurant",
  description: "Experience authentic Telangana, Andhra, and Hyderabadi flavours at Pala Pitta Ruchulu — order takeaway online or book a table.",
  // This is the document every visitor gets by default, customers included —
  // manifest.json used to be the *admin* PWA (start_url: /admin, named
  // "PalaPitta Admin"), so a customer tapping "Add to Home Screen" installed
  // an app that opened straight into a dashboard they have no access to.
  // RoleManifestLink swaps all of this to the signed-in role's own manifest
  // once staff sign in (see components/admin/RoleManifestLink.tsx) — this is
  // only ever what a customer, or a not-yet-identified staff member, sees.
  manifest: "/manifest.json",
  applicationName: "Pala Pitta Ruchulu",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pala Pitta Ruchulu",
  },
  // Purpose-built square icons, not the wide wordmark. `/logo.png` was
  // being served as the favicon, the shortcut icon and the Apple touch icon
  // at once — an 803KB 1364x828 image squeezed into a 16px tab slot on every
  // page load. It stays the on-page wordmark; these are the icon set.
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/icon-32.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/icon-16.png?v=2", sizes: "16x16", type: "image/png" },
      { url: "/icon-192.png?v=2", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png?v=2", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=2",
    apple: [{ url: "/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Pala Pitta Ruchulu | Authentic Telugu & South Indian Restaurant",
    description: "Experience authentic Telangana, Andhra, and Hyderabadi flavours at Pala Pitta Ruchulu.",
    images: [{ url: "/logo.png", width: 1948, height: 579, alt: "Pala Pitta Ruchulu Logo" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pala Pitta Ruchulu | Authentic Telugu & South Indian Restaurant",
    description: "Experience authentic Telangana, Andhra, and Hyderabadi flavours at Pala Pitta Ruchulu.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={manrope.variable}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png?v=2" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icon-16.png?v=2" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico?v=2" />
        <link rel="shortcut icon" href="/favicon.ico?v=2" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=2" />
      </head>
      <body className="antialiased selection:bg-brand selection:text-white" suppressHydrationWarning>
        <Providers>
          <RoleManifestLink />
          {children}
        </Providers>
      </body>
    </html>
  );
}
