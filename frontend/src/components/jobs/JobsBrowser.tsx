import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { getJobs, getMeta, toQuery } from "@/lib/api-server";
import { FilterPanel, SearchToolbar, type FixedFilter } from "./JobFilters";
import { StaticJobGrid } from "./JobGrid";

export type SP = Record<string, string | string[] | undefined>;

const ALLOWED = ["q", "title", "company", "category", "role", "locality", "area", "pincode", "salary_min", "salary_max", "salary_type", "negotiable",
  "type", "work_mode", "experience", "education", "gender", "immediate", "min_vacancies", "shift", "weekly_off", "posted", "sort", "near", "page"];

/** Server-rendered job listing with URL-driven filters. Used by /jobs, /jobs/search and all SEO landing pages. */
export async function JobsBrowser({ searchParams, fixedParams = {}, advanced = false, heading, intro, basePath, empty }: {
  searchParams: SP; fixedParams?: Record<string, string>; advanced?: boolean; heading: ReactNode; intro?: ReactNode; basePath: string; empty?: ReactNode;
}) {
  const qsUser = toQuery(searchParams, ALLOWED);
  const q = new URLSearchParams(qsUser);
  for (const [k, v] of Object.entries(fixedParams)) {
    if (k === "type") { q.delete("type[]"); q.append("type[]", v); } else q.set(k, v);
  }
  if (q.get("sort") === "newest") q.set("sort", "date");
  q.set("per_page", "20");
  const [meta, res] = await Promise.all([getMeta(), getJobs(q.toString())]);
  const fixed = Object.keys(fixedParams) as FixedFilter[];
  const page = res?.meta.current_page ?? 1;
  const last = res?.meta.last_page ?? 1;
  const pageHref = (p: number) => {
    const u = new URLSearchParams(qsUser);
    if (p > 1) u.set("page", String(p)); else u.delete("page");
    return `${basePath}${u.toString() ? `?${u}` : ""}`;
  };

  return (
    <div className="container-page py-6 sm:py-8">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{heading}</h1>
        {intro && <div className="mt-1.5 max-w-3xl text-sm text-slate-600 sm:text-[15px]">{intro}</div>}
      </div>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="card sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto px-4 py-2">
            <Suspense><FilterPanel meta={meta} fixed={fixed} advanced={advanced} /></Suspense>
          </div>
        </aside>
        <div className="min-w-0">
          <Suspense><SearchToolbar meta={meta} fixed={fixed} advanced={advanced} total={res?.meta.total ?? 0} /></Suspense>
          <div className="mt-5">
            {!res ? (
              <div className="card p-8 text-center text-slate-600">Jobs could not be loaded right now. Please refresh in a moment.</div>
            ) : res.data.length === 0 ? (
              empty ?? (
                <div className="card flex flex-col items-center px-6 py-12 text-center">
                  <div className="mb-3 text-4xl" aria-hidden="true">🔍</div>
                  <h2 className="text-lg font-bold text-ink">No jobs match these filters</h2>
                  <p className="mt-1 max-w-md text-sm text-slate-600">Try removing a filter or searching a nearby area. New jobs in Surat are added every day.</p>
                  <Link href={basePath} className="mt-5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white">Clear filters</Link>
                </div>
              )
            ) : (
              <>
                <StaticJobGrid jobs={res.data} cols="sm:grid-cols-2 xl:grid-cols-3" />
                {last > 1 && (
                  <nav className="mt-8 flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
                    {page > 1 && <Link rel="prev" href={pageHref(page - 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">‹ Prev</Link>}
                    {Array.from({ length: last }, (_, i) => i + 1).filter((p) => p === 1 || p === last || Math.abs(p - page) <= 1).map((p, i, arr) => (
                      <span key={p} className="flex items-center gap-1.5">
                        {i > 0 && p - arr[i - 1] > 1 && <span className="text-slate-400">…</span>}
                        <Link href={pageHref(p)} aria-current={p === page ? "page" : undefined}
                          className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-semibold ${p === page ? "bg-brand-600 text-white" : "text-slate-700 hover:bg-slate-100"}`}>{p}</Link>
                      </span>
                    ))}
                    {page < last && <Link rel="next" href={pageHref(page + 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Next ›</Link>}
                  </nav>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export async function jobCount(fixedParams: Record<string, string>): Promise<number> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(fixedParams)) k === "type" ? q.append("type[]", v) : q.set(k, v);
  q.set("per_page", "1");
  const r = await getJobs(q.toString());
  return r?.meta.total ?? 0;
}
