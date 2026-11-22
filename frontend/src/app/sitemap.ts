import type { MetadataRoute } from "next";
import { apiGet } from "@/lib/api-server";
import { SITE_URL } from "@/lib/config";
import { JOB_TYPE_PAGES } from "@/lib/landing";

export const revalidate = 900;

interface SitemapData { jobs: { path: string; updated_at: string | null }[]; localities: string[]; categories: string[]; roles: string[]; companies: string[] }

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const d = await apiGet<SitemapData>("/seo/sitemap", 900);
  const now = new Date();
  const u = (path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "daily", lastModified: Date | string = now) => ({ url: `${SITE_URL}${path}`, lastModified, changeFrequency, priority });
  const fixed = [
    u("/", 1, "hourly"), u("/jobs", 0.9, "hourly"), u("/jobs/search", 0.6), u("/apply", 0.5, "weekly"),
    u("/register/job-seeker", 0.5, "monthly"), u("/register/employer", 0.5, "monthly"),
    u("/about-us", 0.3, "monthly"), u("/contact-us", 0.3, "monthly"), u("/faq", 0.3, "monthly"),
    u("/privacy-policy", 0.2, "yearly"), u("/terms", 0.2, "yearly"), u("/refund-policy", 0.1, "yearly"), u("/cookie-policy", 0.1, "yearly"), u("/grievance", 0.2, "yearly"),
    ...Object.keys(JOB_TYPE_PAGES).map((t) => u(`/jobs/type/${t}`, 0.7)),
  ];
  if (!d) return fixed;
  return [
    ...fixed,
    ...d.localities.map((s) => u(`/jobs/in/${s}`, 0.8)),
    ...d.categories.map((s) => u(`/jobs/category/${s}`, 0.8)),
    ...d.roles.map((s) => u(`/jobs/role/${s}`, 0.6)),
    ...d.companies.map((s) => u(`/companies/${s}`, 0.5, "weekly")),
    ...d.jobs.map((j) => u(j.path, 0.7, "weekly", j.updated_at ?? now)),
  ];
}
