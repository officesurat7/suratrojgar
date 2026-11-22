"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PageHeader, Table } from "@/components/panel/Shell";
import { useApi, useMeta } from "@/components/providers";
import { EmptyState, PageLoader, Pagination, StatusBadge } from "@/components/ui";
import { dateIST } from "@/lib/format";

interface App { id: number; application_no: string; status: string; status_label: string; applied_at: string; job: { id: number; title: string; company: string; locality: string | null } | null; candidate: { id: number; name: string; locality: string | null; experience_years: number | null } | null }

function Applications() {
  const sp = useSearchParams();
  const meta = useMeta();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [f, setF] = useState({ q: "", status: sp.get("status") ?? "", job_id: sp.get("job_id") ?? "", user_id: sp.get("user_id") ?? "" });
  const qs = `page=${page}${Object.entries(f).map(([k, v]) => (v ? `&${k}=${encodeURIComponent(v)}` : "")).join("")}`;
  const { data, loading } = useApi<{ data: App[]; meta: { current_page: number; last_page: number; total: number } }>(`admin/applications?${qs}`);
  return (
    <>
      <PageHeader title="Applications" subtitle={data ? `${data.meta.total.toLocaleString("en-IN")} application(s)${f.job_id ? " for this job" : ""}${f.user_id ? " by this candidate" : ""}` : undefined} />
      <div className="grid gap-2 sm:grid-cols-3">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); setF({ ...f, q: q.trim() }); }}><input className="input" placeholder="Application ID or candidate name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" /></form>
        <select className="input" value={f.status} onChange={(e) => { setPage(1); setF({ ...f, status: e.target.value }); }} aria-label="Status">
          <option value="">All statuses</option>{Object.entries(meta?.options.application_statuses ?? {}).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {(f.job_id || f.user_id) && <button type="button" className="text-left text-sm font-semibold text-brand-700" onClick={() => setF({ ...f, job_id: "", user_id: "" })}>Show all applications ×</button>}
      </div>
      <div className="mt-4">
        {loading && !data ? <PageLoader /> : !data?.data.length ? <EmptyState icon="📥" title="No applications found" /> : (
          <Table head={["Candidate", "Job", "Applied", "Status"]}>
            {data.data.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-4 py-3"><Link href={`/admin/applications/${a.id}`} className="font-semibold text-ink hover:text-brand-700">{a.candidate?.name ?? "Deleted user"}</Link><p className="text-xs text-slate-500"><span className="font-mono">{a.application_no}</span>{a.candidate?.locality ? ` · ${a.candidate.locality}` : ""}</p></td>
                <td className="px-4 py-3">{a.job ? <><Link href={`/admin/jobs/${a.job.id}`} className="hover:text-brand-700">{a.job.title}</Link><p className="text-xs text-slate-500">{a.job.company}</p></> : "–"}</td>
                <td className="px-4 py-3 text-slate-600">{dateIST(a.applied_at)}</td>
                <td className="px-4 py-3"><StatusBadge status={a.status} label={a.status_label} /></td>
              </tr>
            ))}
          </Table>
        )}
        {data && <Pagination page={data.meta.current_page} last={data.meta.last_page} onPage={setPage} />}
      </div>
    </>
  );
}

export default function Page() { return <Suspense><Applications /></Suspense>; }
