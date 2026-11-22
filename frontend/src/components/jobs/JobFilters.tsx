"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import type { Meta } from "@/lib/types";
import { cx } from "@/lib/format";

/** Filters that a landing page fixes (e.g. /jobs/in/adajan fixes locality) are hidden from the panel. */
export type FixedFilter = string; // e.g. "locality", "category", "role", "type", "experience", "shift"

export const SORTS = [
  { value: "latest", label: "Latest (featured first)" },
  { value: "relevance", label: "Most relevant" },
  { value: "salary", label: "Highest salary" },
  { value: "location", label: "Nearest to an area" },
  { value: "newest", label: "Newest only" },
];

const POSTED = { "": "Any time", "24h": "Last 24 hours", "7d": "Last 7 days", "30d": "Last 30 days" };

function useParamsState() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const get = (k: string) => sp.get(k) ?? "";
  const getAll = (k: string) => sp.getAll(`${k}[]`).concat(sp.getAll(k)).filter(Boolean);
  const apply = (mut: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(sp.toString());
    mut(p);
    p.delete("page");
    start(() => router.push(`${pathname}${p.toString() ? `?${p}` : ""}`, { scroll: false }));
  };
  const set = (k: string, v: string) => apply((p) => (v ? p.set(k, v) : p.delete(k)));
  const toggle = (k: string, v: string) => apply((p) => {
    const cur = new Set([...p.getAll(`${k}[]`), ...p.getAll(k)]);
    if (cur.has(v)) cur.delete(v); else cur.add(v);
    p.delete(k); p.delete(`${k}[]`);
    cur.forEach((x) => p.append(`${k}[]`, x));
  });
  return { sp, get, getAll, set, toggle, apply, pending, pathname, router };
}

function Section({ title, children, open = true }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-b border-slate-100 py-3 last:border-0">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-ink">
        {title}
        <span className="text-slate-400 transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="mt-2.5 space-y-1.5">{children}</div>
    </details>
  );
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 hover:text-ink">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded border-slate-300 accent-brand-600" />
      {label}
    </label>
  );
}

const selectCls = "input py-2 text-sm";

/** Debounced text box bound to a URL param. */
function TextParam({ name, placeholder, label, type = "text", inputMode }: { name: string; placeholder?: string; label: string; type?: string; inputMode?: "numeric" }) {
  const { get, set } = useParamsState();
  const [v, setV] = useState(get(name));
  const cur = get(name);
  useEffect(() => setV(cur), [cur]);
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <input className={selectCls} type={type} inputMode={inputMode} value={v} placeholder={placeholder} maxLength={100}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== cur && set(name, v.trim())}
        onKeyDown={(e) => e.key === "Enter" && v !== cur && set(name, v.trim())} />
    </label>
  );
}

export function FilterPanel({ meta, fixed = [], advanced = false }: { meta: Meta | null; fixed?: FixedFilter[]; advanced?: boolean }) {
  const { get, getAll, set, toggle } = useParamsState();
  if (!meta) return null;
  const o = meta.options;
  const catSlug = get("category");
  const cat = meta.categories.find((c) => c.slug === catSlug);
  const roles = cat ? cat.roles : [];

  return (
    <div>
      {!fixed.includes("locality") && (
        <Section title="Area in Surat">
          <select className={selectCls} value={get("locality")} onChange={(e) => set("locality", e.target.value)} aria-label="Area in Surat">
            <option value="">All areas</option>
            {meta.localities.map((l) => <option key={l.id} value={l.slug}>{l.name}</option>)}
          </select>
          {advanced && <div className="grid grid-cols-2 gap-2 pt-1"><TextParam name="area" label="Area / landmark" placeholder="e.g. Ring Road" /><TextParam name="pincode" label="PIN code" placeholder="395007" inputMode="numeric" /></div>}
        </Section>
      )}
      {!fixed.includes("category") && (
        <Section title="Category">
          <select className={selectCls} value={catSlug} aria-label="Category" onChange={(e) => {
            const v = e.target.value;
            set("category", v);
          }}>
            <option value="">All categories</option>
            {meta.categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
          {!fixed.includes("role") && roles.length > 0 && (
            <select className={selectCls} value={get("role")} onChange={(e) => set("role", e.target.value)} aria-label="Job role">
              <option value="">All roles in {cat?.name}</option>
              {roles.map((r) => <option key={r.id} value={r.slug}>{r.name}</option>)}
            </select>
          )}
        </Section>
      )}
      {!fixed.includes("type") && (
        <Section title="Job type">
          {Object.entries(o.employment_types).map(([k, l]) => <Check key={k} label={l} checked={getAll("type").includes(k)} onChange={() => toggle("type", k)} />)}
        </Section>
      )}
      <Section title="Work mode">
        {Object.entries(o.work_modes).map(([k, l]) => <Check key={k} label={l} checked={getAll("work_mode").includes(k)} onChange={() => toggle("work_mode", k)} />)}
      </Section>
      <Section title="Experience">
        {Object.entries(o.experience_bands).map(([k, l]) => <Check key={k} label={l} checked={getAll("experience").includes(k)} onChange={() => toggle("experience", k)} />)}
      </Section>
      <Section title="Monthly salary (₹)">
        <div className="grid grid-cols-2 gap-2">
          <TextParam name="salary_min" label="Minimum" placeholder="10000" type="number" inputMode="numeric" />
          <TextParam name="salary_max" label="Maximum" placeholder="50000" type="number" inputMode="numeric" />
        </div>
        {advanced && (
          <>
            <p className="pt-1 text-xs font-medium text-slate-600">Pay stated as</p>
            {Object.entries(o.salary_periods).map(([k, l]) => <Check key={k} label={l.replace(/^per /, "Per ")} checked={getAll("salary_type").includes(k)} onChange={() => toggle("salary_type", k)} />)}
            <Check label="Negotiable salary only" checked={get("negotiable") === "1"} onChange={() => set("negotiable", get("negotiable") === "1" ? "" : "1")} />
          </>
        )}
      </Section>
      <Section title="Education" open={advanced}>
        <select className={selectCls} value={get("education")} onChange={(e) => set("education", e.target.value)} aria-label="Your education">
          <option value="">Any education</option>
          {meta.education_levels.map((e) => <option key={e.id} value={e.slug}>{e.name}</option>)}
        </select>
        <p className="text-xs text-slate-500">Shows jobs you qualify for with this education.</p>
      </Section>
      <Section title="Shift" open={advanced}>
        {Object.entries(o.shifts).map(([k, l]) => <Check key={k} label={l} checked={getAll("shift").includes(k)} onChange={() => toggle("shift", k)} />)}
      </Section>
      <Section title="Date posted" open={advanced}>
        <select className={selectCls} value={get("posted")} onChange={(e) => set("posted", e.target.value)} aria-label="Date posted">
          {Object.entries(POSTED).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </Section>
      {advanced && (
        <Section title="More options">
          <TextParam name="title" label="Job title contains" placeholder="e.g. Accountant" />
          <TextParam name="company" label="Company name" placeholder="e.g. Shree Textiles" />
          <TextParam name="weekly_off" label="Weekly off" placeholder="e.g. Sunday" />
          <TextParam name="min_vacancies" label="Minimum openings" type="number" inputMode="numeric" placeholder="1" />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Open to</span>
            <select className={selectCls} value={get("gender")} onChange={(e) => set("gender", e.target.value)}>
              <option value="">Everyone</option><option value="female">Jobs open to women</option><option value="male">Jobs open to men</option>
            </select>
          </label>
          <Check label="Immediate joining only" checked={get("immediate") === "1"} onChange={() => set("immediate", get("immediate") === "1" ? "" : "1")} />
        </Section>
      )}
    </div>
  );
}

/** Top bar: keyword box, sort, active-filter chips, mobile filter drawer. */
export function SearchToolbar({ meta, fixed = [], advanced = false, total }: { meta: Meta | null; fixed?: FixedFilter[]; advanced?: boolean; total: number }) {
  const { sp, get, set, apply, pending, pathname, router } = useParamsState();
  const [q, setQ] = useState(get("q"));
  const [drawer, setDrawer] = useState(false);
  const curQ = get("q");
  useEffect(() => setQ(curQ), [curQ]);
  useEffect(() => { document.body.style.overflow = drawer ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [drawer]);

  const chips: { key: string; label: string; remove: () => void }[] = [];
  const label = (k: string, v: string): string => {
    if (!meta) return v;
    const o = meta.options;
    switch (k) {
      case "locality": return meta.localities.find((l) => l.slug === v)?.name ?? v;
      case "category": return meta.categories.find((c) => c.slug === v)?.name ?? v;
      case "role": return meta.categories.flatMap((c) => c.roles).find((r) => r.slug === v)?.name ?? v;
      case "type": return o.employment_types[v] ?? o.work_modes[v] ?? v;
      case "work_mode": return o.work_modes[v] ?? v;
      case "experience": return o.experience_bands[v] ?? v;
      case "shift": return o.shifts[v] ?? v;
      case "education": return meta.education_levels.find((e) => e.slug === v)?.name ?? v;
      case "salary_min": return `Min ₹${v}`;
      case "salary_max": return `Max ₹${v}`;
      case "posted": return POSTED[v as keyof typeof POSTED] ?? v;
      case "q": return `"${v}"`;
      case "immediate": return "Immediate joining";
      case "negotiable": return "Negotiable";
      case "salary_type": return o.salary_periods[v] ?? v;
      case "near": return `Near ${meta.localities.find((l) => l.slug === v)?.name ?? v}`;
      default: return v;
    }
  };
  sp.forEach((v, rawK) => {
    const k = rawK.replace(/\[\]$/, "");
    if (["page", "sort", "per_page"].includes(k) || fixed.includes(k) || !v) return;
    chips.push({ key: `${rawK}=${v}`, label: label(k, v), remove: () => apply((p) => {
      const rest = p.getAll(rawK).filter((x) => x !== v);
      p.delete(rawK);
      rest.forEach((x) => p.append(rawK, x));
      if (k === "category") p.delete("role");
    }) });
  });
  const sort = get("sort") || "latest";

  return (
    <div className="space-y-3">
      <form className="flex gap-2" role="search" onSubmit={(e) => { e.preventDefault(); apply((p) => { if (q.trim()) { p.set("q", q.trim()); if (!p.get("sort")) p.set("sort", "relevance"); } else p.delete("q"); }); }}>
        <label className="relative flex-1">
          <span className="sr-only">Search jobs</span>
          <svg className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={100} placeholder="Job title, skill or company" className="input h-12 pl-10" />
        </label>
        <button className="h-12 shrink-0 rounded-xl bg-brand-600 px-4 font-bold text-white hover:bg-brand-700 sm:px-6">Search</button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setDrawer(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 lg:hidden">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" /></svg>
          Filters{chips.length ? ` (${chips.length})` : ""}
        </button>
        <p className="mr-auto text-sm text-slate-600" aria-live="polite">
          {pending ? "Updating…" : <><strong className="text-ink">{total.toLocaleString("en-IN")}</strong> {total === 1 ? "job" : "jobs"} found</>}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <span className="hidden text-slate-600 sm:inline">Sort by</span>
          <select className="input w-auto py-2 text-sm" value={sort} onChange={(e) => apply((p) => { p.set("sort", e.target.value); if (e.target.value !== "location") p.delete("near"); })}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        {sort === "location" && meta && (
          <select className="input w-auto py-2 text-sm" value={get("near")} onChange={(e) => set("near", e.target.value)} aria-label="Near area">
            <option value="">Choose your area…</option>
            {meta.localities.map((l) => <option key={l.id} value={l.slug}>{l.name}</option>)}
          </select>
        )}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <button key={c.key} onClick={c.remove} className="chip hover:bg-brand-100" aria-label={`Remove filter ${c.label}`}>{c.label} <span aria-hidden="true">×</span></button>
          ))}
          <button onClick={() => router.push(pathname, { scroll: false })} className="text-xs font-semibold text-slate-600 underline hover:text-red-600">Clear all</button>
        </div>
      )}

      {/* Mobile drawer */}
      <div className={cx("fixed inset-0 z-[60] lg:hidden", drawer ? "" : "pointer-events-none")} aria-hidden={!drawer}>
        <div className={cx("absolute inset-0 bg-ink/50 transition-opacity", drawer ? "opacity-100" : "opacity-0")} onClick={() => setDrawer(false)} />
        <div role="dialog" aria-modal="true" aria-label="Filters" className={cx("absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col bg-white shadow-2xl transition-transform", drawer ? "translate-x-0" : "translate-x-full")}>
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="font-bold text-ink">Filters</p>
            <button onClick={() => setDrawer(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close filters">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto px-4">{drawer && <FilterPanel meta={meta} fixed={fixed} advanced={advanced} />}</div>
          <div className="border-t p-3"><button onClick={() => setDrawer(false)} className="w-full rounded-xl bg-brand-600 py-3 font-bold text-white">Show {total.toLocaleString("en-IN")} jobs</button></div>
        </div>
      </div>
    </div>
  );
}
