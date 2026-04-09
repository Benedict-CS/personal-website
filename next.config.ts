import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  serverExternalPackages: [
    "dockerode",
    "@kubernetes/client-node",
    "ssh2",
    "docker-modem",
  ],
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://giscus.app https://challenges.cloudflare.com",
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
    const baseHeaders: { key: string; value: string }[] = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Content-Security-Policy", value: csp },
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
  },
};

export default withSentryConfig(nextConfig, {
  silent: !process.env.SENTRY_DSN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});
