import type { NextConfig } from "next";

/**
 * Hosts the app is allowed to optimize images from.
 *
 * This was `hostname: "**"` over both http and https, which turns
 * `/_next/image?url=…` into an open image proxy: anyone could point it at any
 * URL on the internet and have this deployment fetch, transcode and serve the
 * result on its bandwidth. The list below is every host the app actually
 * loads images from — Supabase Storage (menu photos uploaded through
 * /api/upload) and Unsplash (the seed imagery in data/menuItems.json, the
 * hero and the POS dish cards).
 */
const supabaseHostname = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : null;
  } catch {
    return null;
  }
})();

const imageRemotePatterns = [
  { protocol: "https" as const, hostname: "*.supabase.co" },
  { protocol: "https" as const, hostname: "*.supabase.in" },
  { protocol: "https" as const, hostname: "images.unsplash.com" },
  ...(supabaseHostname ? [{ protocol: "https" as const, hostname: supabaseHostname }] : []),
];

/**
 * Content-Security-Policy.
 *
 * Reported, not enforced, unless `CSP_ENFORCE=true` is set. A CSP that is
 * even slightly too tight takes the Razorpay modal or the Firebase reCAPTCHA
 * frame down with it, and both sit directly on the path between a hungry
 * customer and a paid order — so this ships in report-only first, and the
 * switch is flipped once the reports from real traffic are clean.
 *
 * `'unsafe-inline'` in script-src is not optional here: Next.js's App Router
 * bootstraps hydration from inline scripts, and removing it requires the
 * per-request nonce that only middleware can supply. `'unsafe-eval'` is
 * needed in development for React Refresh, and is dropped in production.
 */
const isDev = process.env.NODE_ENV === "development";
const backendGatewayUrl = (process.env.BACKEND_GATEWAY_URL || 'http://127.0.0.1:8085').replace(/\/$/, '');
const backendGatewayWs = backendGatewayUrl.replace(/^http/, 'ws');

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com https://*.razorpay.com https://apis.google.com https://www.google.com https://www.gstatic.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://images.unsplash.com https://*.razorpay.com",
  "font-src 'self' data:",
  `connect-src 'self' ${backendGatewayUrl} ${backendGatewayWs} ws://127.0.0.1:8080 wss://127.0.0.1:8080 ws://127.0.0.1:8085 wss://127.0.0.1:8085 https://*.supabase.co wss://*.supabase.co https://*.supabase.in wss://*.supabase.in https://api.razorpay.com https://lumberjack.razorpay.com https://*.razorpay.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://graph.facebook.com`,
  // Razorpay checkout and Firebase's reCAPTCHA both render in iframes.
  "frame-src 'self' https://api.razorpay.com https://*.razorpay.com https://www.google.com https://*.firebaseapp.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://*.razorpay.com",
  "frame-ancestors 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const cspHeaderKey =
  process.env.CSP_ENFORCE === "true"
    ? "Content-Security-Policy"
    : "Content-Security-Policy-Report-Only";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/api/v1/:path*', destination: `${backendGatewayUrl}/api/v1/:path*` },
        { source: '/ws', destination: `${backendGatewayUrl}/ws` },
      ],
    };
  },
  // dev, which is exactly the signal it exists to give: effects that don't
  // clean up, state mutated during render, stale closures under concurrent
  // rendering. Those are real bugs whether or not anything is reporting them.
  reactStrictMode: true,
  // There is a stray package-lock.json in the user profile directory above
  // this one, and Turbopack picks the outermost lockfile it finds as the
  // workspace root — which put the build's module resolution one level above
  // the app. Pinning it here removes the guess.
  turbopack: {
    root: __dirname,
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@tanstack/react-table",
    ],
  },
  images: {
    minimumCacheTTL: 2592000, // 30-day image caching
    formats: ['image/avif', 'image/webp'],
    remotePatterns: imageRemotePatterns,
    // SVGs are never optimized, so one served through this pipeline would be
    // passed through verbatim from our own origin — script and all.
    dangerouslyAllowSVG: false,
  },
  // Production HTTP caching headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // No feature on this site uses any of these; denying them means a
          // script that does get injected can't quietly reach the camera or
          // location either.
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), interest-cohort=()' },
          { key: cspHeaderKey, value: csp },
        ],
      },
      {
        // Public filenames can be replaced during a deploy. Only Next's
        // content-hashed /_next/static assets are immutable for a year.
        source: '/(.*)\\.(ico|png|jpg|jpeg|svg|webp|avif|woff2|woff|ttf)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' },
        ],
      },
      {
        // The service worker must never be served from a stale cache, or a
        // deploy can't replace the one already installed on a device.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
