import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  // Only the production domain should be indexed. Set NEXT_PUBLIC_SITE_URL and ALLOW_INDEXING=true there.
  const allow = process.env.ALLOW_INDEXING === "true";
  return allow
    ? {
        rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/seeker", "/employer", "/admin", "/super-admin", "/staff", "/login", "/verify-email", "/forgot-password", "/*?*sort="] }],
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
      }
    : { rules: [{ userAgent: "*", disallow: "/" }] };
}
