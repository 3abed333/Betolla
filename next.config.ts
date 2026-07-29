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
