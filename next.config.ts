import withSerwistInit from "@serwist/next";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  turbopack: {},
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      {
        source: '/manifest.json',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=3600' }],
      },
    ];
  },
  images: {
    remotePatterns: [
      // Firebase-hosted user/content images
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.firebasestorage.app', pathname: '/**' },
      // Google account photos (Auth)
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      // Local Storage emulator
      { protocol: 'http', hostname: 'localhost', port: '9199', pathname: '/**' },
    ],
  },
};

// Only create Sentry releases + upload source maps on production Vercel builds.
// Preview deploys reuse the prod release, avoiding one spurious release per PR.
const isProductionBuild =
  process.env.VERCEL_ENV === "production" ||
  (process.env.NODE_ENV === "production" && !process.env.VERCEL);

const hasSentry = !!process.env.NEXT_PUBLIC_SENTRY_DSN;

const wrapped = withSerwist(nextConfig);

export default hasSentry
  ? withSentryConfig(wrapped, {
      // TODO: update org and project when you wire up a Sentry project.
      org: "your-sentry-org",
      project: "your-sentry-project",
      authToken: isProductionBuild ? process.env.SENTRY_AUTH_TOKEN : undefined,
      widenClientFileUpload: true,
      tunnelRoute: "/monitoring",
      silent: !process.env.CI,
      telemetry: false,
      sourcemaps: { disable: !isProductionBuild },
      release: { create: isProductionBuild },
    })
  : wrapped;
