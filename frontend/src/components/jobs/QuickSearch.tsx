"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Category, Locality } from "@/lib/types";

export function QuickSearch({ categories, localities, compact = false }: { categories: Category[]; localities: Locality[]; compact?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const [cat, setCat] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (loc) p.set("locality", loc);
    if (cat) p.set("category", cat);
    router.push(`/jobs${p.toString() ? `?${p}` : ""}`);
  };
  return (
    <form onSubmit={submit} role="search" className={`grid gap-2 rounded-2xl bg-white p-2 shadow-xl shadow-ink/10 ring-1 ring-slate-200 ${compact ? "sm:grid-cols-[1fr_auto]" : "sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto]"}`}>
      <label className="relative block sm:col-span-2 lg:col-span-1">
        <span className="sr-only">Job title, skill or company</span>
        <svg className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" /></svg>
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={100} placeholder="Job title, skill or company" className="h-12 w-full rounded-xl border-0 bg-slate-50 pl-11 pr-3 text-[15px] text-ink placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-200" />
      </label>
      {!compact && (
        <>
          <label className="block"><span className="sr-only">Area in Surat</span>
            <select value={loc} onChange={(e) => setLoc(e.target.value)} className="h-12 w-full rounded-xl border-0 bg-slate-50 px-3 text-[15px] text-ink focus:bg-white focus:ring-2 focus:ring-brand-200">
              <option value="">All areas of Surat</option>
              {localities.map((l) => <option key={l.id} value={l.slug}>{l.name}</option>)}
            </select>
          </label>
          <label className="block"><span className="sr-only">Category</span>
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-12 w-full rounded-xl border-0 bg-slate-50 px-3 text-[15px] text-ink focus:bg-white focus:ring-2 focus:ring-brand-200">
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
          </label>
        </>
      )}
      <button type="submit" className="h-12 rounded-xl bg-brand-600 px-6 text-[15px] font-bold text-white shadow-sm hover:bg-brand-700 sm:col-span-2 lg:col-span-1">Search jobs</button>
    </form>
  );
}
