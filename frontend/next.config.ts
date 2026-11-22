import type { NextConfig } from "next";

const apiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_ORIGIN || "http://127.0.0.1:8000");
  } catch {
    return new URL("http://127.0.0.1:8000");
  }
})();

// Content Security Policy. Scripts are limited to this origin; 'unsafe-inline' is required for
// Next.js inline bootstrap scripts unless nonce-based CSP is enabled (see docs/SECURITY.md).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${apiOrigin.origin}`,
  "font-src 'self' data:",
  `connect-src 'self'`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Hostinger VPS (run with: node .next/standalone/server.js)
  output: "standalone",
  poweredByHeader: false,
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: apiOrigin.protocol.replace(":", "") as "http" | "https", hostname: apiOrigin.hostname, port: apiOrigin.port, pathname: "/storage/**" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
};

export default nextConfig;
