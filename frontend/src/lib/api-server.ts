import "server-only";
import { API_INTERNAL_URL } from "./config";
import type { JobCard, JobDetail, Meta, Paginated } from "./types";

/** Server-side fetch of PUBLIC API data (no user token). Cached with ISR-style revalidation. */
export async function apiGet<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetch(`${API_INTERNAL_URL}${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null; // API down: pages render a graceful empty/error state instead of crashing
  }
}

export const getMeta = () => apiGet<Meta>("/meta", 300);
export const getSliders = () => apiGet<{ data: Slider[] }>("/sliders", 120);
export const getJobs = (qs: string) => apiGet<Paginated<JobCard>>(`/jobs${qs ? `?${qs}` : ""}`, 30);
export const getJob = (id: number) => apiGet<{ data: JobDetail }>(`/jobs/${id}`, 60);
export const getSimilar = (id: number) => apiGet<{ data: JobCard[] }>(`/jobs/${id}/similar`, 300);

export interface Slider {
  id: number; title: string; subtitle: string | null; theme: string; image_url: string | null; mobile_image_url: string | null;
  cta_label: string | null; cta_url: string | null;
}

/** Build a query string from Next.js searchParams (arrays preserved as key[]=v). */
export function toQuery(sp: Record<string, string | string[] | undefined>, allow?: string[]): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const key = k.replace(/\[\]$/, "");
    if (allow && !allow.includes(key)) continue;
    if (Array.isArray(v)) v.filter(Boolean).forEach((x) => q.append(`${key}[]`, x));
    else if (v !== undefined && v !== "") q.set(key, v);
  }
  return q.toString();
}
