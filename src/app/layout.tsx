import type { Metadata, Viewport } from "next";
import { Inter, Fraunces, Archivo } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

// Headings only. Fraunces is a variable optical-size serif — it holds its
// warmth at a 48px hero and stays readable at a 16px card title, which is why
// it carries the display role rather than a second sans.
// No `weight`: naming axes requires the variable cut, which carries the whole
// weight range anyway. Pinning weights here is what made the build fail with
// "Axes can only be defined for variable fonts".
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

// Admin console only — the Modernist design system leans on Archivo's 800 for
// every heading, stat and uppercase label. `preload: false` keeps diners off
// the hook for it: the @font-face ships in the shared stylesheet, but the file
// itself is only ever requested by a browser that actually renders `/admin`.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

import { Providers } from "./providers";

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
  title: "Pala Pitta Ruchulu | Authentic Telugu & South Indian Restaurant",
  description: "Experience authentic Telangana, Andhra, and Hyderabadi flavours at Pala Pitta Ruchulu. Complete Restaurant Admin & POS Mobile Application.",
  manifest: "/manifest.json",
  applicationName: "PalaPitta Admin",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pala Pitta Admin",
  },
  // Purpose-built square icons, not the wide wordmark. `/logo.png` was
  // being served as the favicon, the shortcut icon and the Apple touch icon
  // at once — an 803KB 1364x828 image squeezed into a 16px tab slot on every
  // page load. It stays the on-page wordmark; these are the icon set.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
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
      className={`${inter.variable} ${fraunces.variable} ${archivo.variable}`}
    >
      <body>
        {/* No global reCAPTCHA script: the only thing on this site that needs
            one is Firebase phone sign-in, and it injects its own on demand from
            the auth screens. Loading Enterprise reCAPTCHA site-wide cost every
            visitor a third-party request on a page that never called it. */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
