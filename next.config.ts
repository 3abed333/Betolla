import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isProduction = process.env.NODE_ENV === "production";
const publicAppUsesHttps = process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ?? false;
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://picsum.photos https://fastly.picsum.photos",
  "media-src 'self' blob:",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  `connect-src 'self'${isProduction ? "" : " ws: http:"}`,
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProduction && publicAppUsesHttps ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig: NextConfig = {
  // The development server initializes itself as "localhost", while local QA and the
  // in-app browser use 127.0.0.1. Allow that loopback host so Next's HMR WebSocket is
  // not rejected and the dev issue overlay does not appear on every account layout.
  allowedDevOrigins: ["127.0.0.1"],
  // Shares unstable_cache/Data Cache entries across all PM2 process instances via
  // Redis, instead of each process keeping its own private in-memory copy (Next's
  // built-in file-system handler only persists to disk when flushToDisk is set, which
  // a plain `next start` deployment does not do). Gated on REDIS_URL rather than
  // isProduction since `next build` always sets NODE_ENV=production internally, even
  // for local builds where Redis isn't running.
  ...(process.env.REDIS_URL ? { cacheHandler: require.resolve("./cache-handler.js") } : {}),
  images: {
    remotePatterns: [{ protocol: "https", hostname: "picsum.photos" }],
  },
  async headers() {
    const securityHeaders = [
      { key: "Content-Security-Policy", value: contentSecurityPolicy },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(self), payment=()",
      },
      ...(isProduction && publicAppUsesHttps
        ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
        : []),
    ];
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
