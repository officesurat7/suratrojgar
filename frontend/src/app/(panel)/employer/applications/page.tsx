"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PageHeader, Table } from "@/components/panel/Shell";
import { useApi, useMeta } from "@/components/providers";
import { Button, EmptyState, PageLoader, Pagination, StatusBadge } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { api, download } from "@/lib/api";
import { dateIST } from "@/lib/format";

interface App { id: number; application_no: string; status: string; status_label: string; applied_at: string; job: { id: number; title: string } | null; candidate: { name: string; locality: string | null; experience_years: number | null; education: string | null; expected_salary: number | null } | null; resume: { id: number } | null }
interface JobOpt { id: number; title: string }

function Applications() {
  const sp = useSearchParams();
  const router = useRouter();
  const meta = useMeta();
  const { toast } = useToast();
  const jobId = sp.get("job_id") ?? "";
  const status = sp.get("status") ?? "";
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState<Set<number>>(new Set());
  const query = `${jobId ? `&job_id=${jobId}` : ""}${status ? `&status=${status}` : ""}${search ? `&q=${encodeURIComponent(search)}` : ""}`;
  const { data, loading, reload } = useApi<{ data: App[]; meta: { current_page: number; last_page: number; total: number } }>(`employer/applications?page=${page}${query}`);
  const { data: jobs } = useApi<{ data: JobOpt[] }>("employer/jobs?page=1");
  const setParam = (k: string, v: string) => { const p = new URLSearchParams(sp.toString()); if (v) p.set(k, v); else p.delete(k); setPage(1); setSel(new Set()); router.replace(`/employer/applications?${p}`); };
  const bulk = async (s: string) => {
    try { const r = await api.post<{ message: string }>("employer/applications/bulk", { ids: [...sel], status: s }); toast(r.message); setSel(new Set()); reload(); }
    catch (e) { toast((e as Error).message, "error"); }
  };
  const rows = data?.data ?? [];
  const all = rows.length > 0 && rows.every((r) => sel.has(r.id));

  return (
    <>
      <PageHeader title="Applications" subtitle={data ? `${data.meta.total} candidate(s)` : undefined}
        actions={<Button variant="outline" size="sm" onClick={() => download(`employer/applications/export?${query.slice(1)}`)}>Export CSV</Button>} />
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <select className="input" value={jobId} onChange={(e) => setParam("job_id", e.target.value)} aria-label="Filter by job">
          <option value="">All jobs</option>
          {jobs?.data.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
        <select className="input" value={status} onChange={(e) => setParam("status", e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {Object.entries(meta?.options.application_statuses ?? {}).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q.trim()); }}><input className="input" placeholder="Name or application ID" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search candidates" /></form>
      </div>
      {sel.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-brand-50 px-4 py-2.5 text-sm">
          <strong className="mr-2 text-brand-800">{sel.size} selected</strong>
          <Button size="sm" variant="outline" onClick={() => bulk("under_review")}>Under review</Button>
          <Button size="sm" variant="outline" onClick={() => bulk("shortlisted")}>Shortlist</Button>
          <Button size="sm" variant="outline" onClick={() => bulk("on_hold")}>On hold</Button>
          <Button size="sm" variant="danger" onClick={() => bulk("rejected")}>Reject</Button>
        </div>
      )}
      {loading && !data ? <PageLoader /> : !rows.length ? (
        <EmptyState icon="📥" title="No applications" text="Applications for your jobs appear here." />
      ) : (
        <Table head={[<input key="a" type="checkbox" aria-label="Select all" checked={all} onChange={() => setSel(all ? new Set() : new Set(rows.map((r) => r.id)))} className="accent-brand-600" />, "Candidate", "Job", "Experience", "Expected", "Applied", "Status"]}>
          {rows.map((a) => (
            <tr key={a.id} className="hover:bg-slate-50">
              <td className="px-4 py-3"><input type="checkbox" aria-label={`Select ${a.candidate?.name}`} checked={sel.has(a.id)} onChange={() => setSel((s) => { const n = new Set(s); if (n.has(a.id)) n.delete(a.id); else n.add(a.id); return n; })} className="accent-brand-600" /></td>
              <td className="px-4 py-3"><Link href={`/employer/applications/${a.id}`} className="font-semibold text-ink hover:text-brand-700">{a.candidate?.name}</Link><p className="text-xs text-slate-500">{a.candidate?.locality ?? "–"} · {a.candidate?.education ?? "–"}</p></td>
              <td className="max-w-[200px] truncate px-4 py-3 text-slate-700">{a.job?.title}</td>
              <td className="px-4 py-3">{a.candidate?.experience_years ?? 0} yrs</td>
              <td className="px-4 py-3">{a.candidate?.expected_salary ? `₹${a.candidate.expected_salary.toLocaleString("en-IN")}` : "–"}</td>
              <td className="px-4 py-3 text-slate-600">{dateIST(a.applied_at)}</td>
              <td className="px-4 py-3"><StatusBadge status={a.status} label={a.status_label} /></td>
            </tr>
          ))}
        </Table>
      )}
      {data && <Pagination page={data.meta.current_page} last={data.meta.last_page} onPage={setPage} />}
    </>
  );
}

export default function Page() { return <Suspense><Applications /></Suspense>; }
