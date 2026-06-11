import type { NextConfig } from "next";
import createBundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-slot",
      "framer-motion",
      "react-markdown",
      "rehype-pretty-code",
      "rehype-katex",
      "rehype-raw",
      "rehype-sanitize",
      "rehype-slug",
      "remark-gfm",
      "remark-math",
      "remark-smartypants",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
      "date-fns",
    ],
  },
  serverExternalPackages: [
    "nodemailer",
    "ioredis",
    "geoip-lite",
    "sharp",
    "@aws-sdk/client-s3",
  ],
  async headers() {
    const isDev = process.env.NODE_ENV !== "production";
    // 'unsafe-eval' is only required in dev for React Refresh / HMR.
    // No eval() or new Function() in src/, so we drop it in production.
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://giscus.app https://challenges.cloudflare.com"
      : "script-src 'self' 'unsafe-inline' https://giscus.app https://challenges.cloudflare.com";
    const csp = [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://giscus.app https://challenges.cloudflare.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https: http:",
      "connect-src 'self' https://giscus.app https://*.github.com https://challenges.cloudflare.com",
      "frame-src https://giscus.app https://www.youtube.com https://youtube.com https://player.vimeo.com https://challenges.cloudflare.com",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ");
    // Restrictive Permissions-Policy: deny features we don't use.
    // interest-cohort opts out of FLoC/Topics tracking.
    const permissionsPolicy = [
      "accelerometer=()",
      "ambient-light-sensor=()",
      "autoplay=()",
      "battery=()",
      "camera=()",
      "display-capture=()",
      "document-domain=()",
      "encrypted-media=()",
      "fullscreen=(self)",
      "geolocation=()",
      "gyroscope=()",
      "interest-cohort=()",
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      "payment=()",
      "picture-in-picture=()",
      "publickey-credentials-get=()",
      "screen-wake-lock=()",
      "serial=()",
      "sync-xhr=()",
      "usb=()",
      "xr-spatial-tracking=()",
    ].join(", ");
    const baseHeaders: { key: string; value: string }[] = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: permissionsPolicy },
      { key: "Content-Security-Policy", value: csp },
      // Isolate this origin from cross-origin window references.
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      // 'credentialless' allows third-party iframes (giscus, youtube) without CORP headers.
      { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
      // Allow the browser to proactively resolve DNS for outbound links.
      { key: "X-DNS-Prefetch-Control", value: "on" },
    ];
    // Set ENABLE_HSTS=true only behind HTTPS in production (avoid HSTS on plain HTTP dev).
    if (process.env.ENABLE_HSTS === "true") {
      baseHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload",
      });
    }
    return [
      {
        source: "/:path*",
        headers: baseHeaders,
      },
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/_next/image",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
    unoptimized: false,
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
  },
};

export default withBundleAnalyzer(nextConfig);
