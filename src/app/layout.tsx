import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

import Script from "next/script";
import { Providers } from "./providers";
import { RECAPTCHA_SITE_KEY } from "@/lib/recaptcha";

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
    <html lang="en" className={inter.variable} style={{ colorScheme: 'light' }}>
      <body>
        <Script
          src={`https://www.google.com/recaptcha/enterprise.js?render=${RECAPTCHA_SITE_KEY}`}
          strategy="lazyOnload"
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
