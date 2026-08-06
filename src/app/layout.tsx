import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
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

import { Providers } from "./providers";

export const viewport: Viewport = {
  // Two entries so the browser chrome follows the active theme instead of
  // pinning a white bar above a dark page.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFF8F2" },
    { media: "(prefers-color-scheme: dark)", color: "#1C1917" },
  ],
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
  icons: {
    icon: [
      { url: "/icon.png?v=2", type: "image/png" },
      { url: "/logo.png?v=2", type: "image/png" },
    ],
    shortcut: "/logo.png?v=2",
    apple: "/logo.png?v=2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning is required by next-themes: it writes the
    // resolved theme class onto <html> in a blocking script before React
    // hydrates, so the server markup and the client markup differ here by
    // design. It suppresses the warning on this element only.
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable}`}
      suppressHydrationWarning
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
