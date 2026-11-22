"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { PageHeader, Table } from "@/components/panel/Shell";
import { useApi, useAuth, useMeta } from "@/components/providers";
import { Badge, Button, EmptyState, PageLoader, Pagination, StatusBadge } from "@/components/ui";
import { download } from "@/lib/api";
import { dateIST, money } from "@/lib/format";

interface Cand {
  user_id: number; name: string; email: string | null; mobile: string | null; headline: string | null;
  locality: string | null; area: string | null; pincode: string | null; education: string | null;
  experience_years: number; preferred_category: string | null; preferred_role: string | null; preferred_locality: string | null;
  expected_salary: number | null; preferred_job_type: string | null; availability: string | null; skills: string[];
  profile_completion: number; status: string; registered_at: string; deletion_requested: boolean;
}

const EMPTY = {
  q: "", locality_id: "", preferred_locality_id: "", education_level_id: "", preferred_category_id: "", preferred_job_type: "",
  preferred_work_mode: "", availability: "", employment_status: "", pincode: "", area: "", experience_min: "", experience_max: "",
  salary_min: "", salary_max: "", skill: "", has_resume: "", status: "", sort: "latest",
};
type Filters = typeof EMPTY;

function Candidates() {
  const meta = useMeta();
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [f, setF] = useState<Filters>(EMPTY);
  const [more, setMore] = useState(false);
  const filterQs = useMemo(() => Object.entries(f).filter(([, v]) => v !== "").map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&"), [f]);
  const { data, loading } = useApi<{ data: Cand[]; meta: { current_page: number; last_page: number; total: number } }>(`admin/candidates?page=${page}&${filterQs}`);
  const o = meta?.options;
  const set = (k: keyof Filters, v: string, apply = false) => { const n = { ...draft, [k]: v }; setDraft(n); if (apply) { setPage(1); setF(n); } };
  const sel = (k: keyof Filters, label: string, opts: { value: string | number; label: string }[]) => (
    <select className="input" value={draft[k]} onChange={(e) => set(k, e.target.value, true)} aria-label={label}>
      <option value="">{label}</option>{opts.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
    </select>
  );
  const ent = (r?: Record<string, string>) => Object.entries(r ?? {}).map(([value, label]) => ({ value, label }));
  const ids = (r?: { id: number; name: string }[]) => (r ?? []).map((x) => ({ value: x.id, label: x.name }));
  const active = Object.entries(f).filter(([k, v]) => v !== "" && k !== "sort").length;

  return (
    <>
      <PageHeader title="Candidates" subtitle={data ? `${data.meta.total.toLocaleString("en-IN")} job seeker(s), area-wise database` : undefined}
        actions={can("reports.export") ? <Button variant="outline" size="sm" onClick={() => download(`admin/candidates/export?${filterQs}`)}>Export CSV</Button> : undefined} />
      <form className="card grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(e) => { e.preventDefault(); setPage(1); setF(draft); }}>
        <input className="input lg:col-span-2" placeholder="Name, email or mobile" value={draft.q} onChange={(e) => set("q", e.target.value)} aria-label="Search" />
        {sel("locality_id", "Lives in: any area", ids(meta?.localities))}
        {sel("preferred_locality_id", "Wants work in: any area", ids(meta?.localities))}
        {sel("preferred_category_id", "Any category", ids(meta?.categories))}
        {sel("education_level_id", "Any education", ids(meta?.education_levels))}
        {sel("preferred_job_type", "Any job type", ent(o?.employment_types))}
        {sel("sort", "Sort", [{ value: "latest", label: "Newest first" }, { value: "oldest", label: "Oldest first" }, { value: "name", label: "Name A–Z" }, { value: "experience", label: "Most experience" }, { value: "salary", label: "Highest expected salary" }, { value: "completion", label: "Most complete profile" }].map((x) => x))}
        {more && <>
          {sel("preferred_work_mode", "Any work mode", ent(o?.work_modes))}
          {sel("availability", "Any availability", ent(o?.availability))}
          {sel("employment_status", "Any employment status", ent(o?.employment_statuses))}
          {sel("status", "Any account status", ["active", "pending", "suspended", "blocked", "deactivated"].map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })))}
          <input className="input" placeholder="PIN code" inputMode="numeric" maxLength={6} value={draft.pincode} onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))} aria-label="PIN code" />
          <input className="input" placeholder="Area / landmark text" value={draft.area} onChange={(e) => set("area", e.target.value)} aria-label="Area text" />
          <input className="input" placeholder="Skill (e.g. Tally)" value={draft.skill} onChange={(e) => set("skill", e.target.value)} aria-label="Skill" />
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm"><input type="checkbox" checked={draft.has_resume === "1"} onChange={(e) => set("has_resume", e.target.checked ? "1" : "", true)} /> Has a resume</label>
          <div className="flex gap-2"><input className="input" type="number" min={0} max={50} placeholder="Exp. min (yrs)" value={draft.experience_min} onChange={(e) => set("experience_min", e.target.value)} aria-label="Minimum experience" /><input className="input" type="number" min={0} max={50} placeholder="Exp. max" value={draft.experience_max} onChange={(e) => set("experience_max", e.target.value)} aria-label="Maximum experience" /></div>
          <div className="flex gap-2"><input className="input" type="number" min={0} placeholder="Salary min ₹" value={draft.salary_min} onChange={(e) => set("salary_min", e.target.value)} aria-label="Minimum expected salary" /><input className="input" type="number" min={0} placeholder="Salary max ₹" value={draft.salary_max} onChange={(e) => set("salary_max", e.target.value)} aria-label="Maximum expected salary" /></div>
        </>}
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-4">
          <Button type="submit" size="sm">Apply filters</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setMore(!more)}>{more ? "Fewer filters" : "More filters"}</Button>
          {active > 0 && <Button type="button" size="sm" variant="ghost" onClick={() => { setDraft(EMPTY); setF(EMPTY); setPage(1); }}>Clear {active} filter(s)</Button>}
        </div>
      </form>
      <div className="mt-4">
        {loading && !data ? <PageLoader /> : !data?.data.length ? <EmptyState icon="👥" title="No candidates match" text="Try removing a filter." /> : (
          <Table head={["Candidate", "Lives in", "Looking for", "Experience / salary", "Profile", "Status"]}>
            {data.data.map((c) => (
              <tr key={c.user_id} className="align-top hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/candidates/${c.user_id}`} className="font-semibold text-ink hover:text-brand-700">{c.name}</Link>
                  {c.headline && <p className="max-w-56 truncate text-xs text-slate-600">{c.headline}</p>}
                  {(c.email || c.mobile) && <p className="text-xs text-slate-500">{[c.email, c.mobile].filter(Boolean).join(" · ")}</p>}
                </td>
                <td className="px-4 py-3"><p>{c.locality ?? "–"}</p><p className="text-xs text-slate-500">{[c.area, c.pincode].filter(Boolean).join(", ")}</p></td>
                <td className="px-4 py-3"><p>{c.preferred_role ?? c.preferred_category ?? "–"}</p><p className="text-xs text-slate-500">{[c.preferred_job_type && (o?.employment_types[c.preferred_job_type] ?? c.preferred_job_type), c.preferred_locality].filter(Boolean).join(" · ")}</p></td>
                <td className="px-4 py-3 tabular-nums"><p>{c.experience_years ? `${c.experience_years} yrs` : "Fresher"}</p><p className="text-xs text-slate-500">{c.expected_salary ? `${money(c.expected_salary)}/month` : "Salary not set"}</p></td>
                <td className="px-4 py-3"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-brand-600" style={{ width: `${c.profile_completion}%` }} /></div><p className="mt-1 text-xs text-slate-500">{c.profile_completion}% · {dateIST(c.registered_at)}</p></td>
                <td className="px-4 py-3"><StatusBadge status={c.status} />{c.deletion_requested && <div className="mt-1"><Badge tone="red">Deletion requested</Badge></div>}</td>
              </tr>
            ))}
          </Table>
        )}
        {data && <Pagination page={data.meta.current_page} last={data.meta.last_page} onPage={setPage} />}
      </div>
    </>
  );
}

export default function Page() { return <Suspense><Candidates /></Suspense>; }
