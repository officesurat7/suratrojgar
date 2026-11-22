"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PageHeader } from "@/components/panel/Shell";
import { useApi } from "@/components/providers";
import { Button, EmptyState, PageLoader, Pagination, StatusBadge, Tabs } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { dateIST } from "@/lib/format";
import { JOB_ACTIONS } from "@/components/panel/jobActions";

interface Job { id: number; title: string; url: string; status: string; posted_at: string | null; expires_at: string | null; created_at: string; views_count: number; applications_count: number; location: { locality: { name: string } | null }; rejection_reason: string | null }
const TABS = ["", "active", "pending", "draft", "paused", "closed", "expired", "rejected"] as const;
const LABEL: Record<string, string> = { "": "All", active: "Active", pending: "Pending", draft: "Drafts", paused: "Paused", closed: "Closed", expired: "Expired", rejected: "Rejected" };


function JobsList() {
  const sp = useSearchParams();
  const router = useRouter();
  const { toast, confirm } = useToast();
  const status = (sp.get("status") ?? "") as (typeof TABS)[number];
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const { data, loading, reload } = useApi<{ data: Job[]; meta: { current_page: number; last_page: number; total: number } }>(`employer/jobs?page=${page}${status ? `&status=${status}` : ""}${search ? `&q=${encodeURIComponent(search)}` : ""}`);

  const act = async (j: Job, action: string) => {
    if (action === "close" && !(await confirm({ title: "Close this job?", text: "It will stop accepting applications. You can reopen it later.", confirmLabel: "Close job", danger: true }))) return;
    try { const r = await api.post<{ message: string }>(`employer/jobs/${j.id}/${action}`); toast(r.message); reload(); }
    catch (e) { toast((e as Error).message, "error"); }
  };

  return (
    <>
      <PageHeader title="My jobs" subtitle={data ? `${data.meta.total} job(s)` : undefined} actions={<Button href="/employer/jobs/new">+ Post a job</Button>} />
      <Tabs value={status} onChange={(v) => { setPage(1); router.replace(`/employer/jobs${v ? `?status=${v}` : ""}`); }} items={TABS.map((t) => ({ value: t, label: LABEL[t] }))} />
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q.trim()); }}>
        <input className="input max-w-sm" placeholder="Search by job title" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search jobs" />
        <Button variant="outline" type="submit">Search</Button>
      </form>
      <div className="mt-4">
        {loading && !data ? <PageLoader /> : !data?.data.length ? (
          <EmptyState icon="💼" title="No jobs here" text="Post a job to start receiving applications." action={<Button href="/employer/jobs/new">Post a job</Button>} />
        ) : (
          <div className="grid gap-3">
            {data.data.map((j) => (
              <div key={j.id} className="card p-4 sm:p-5">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/employer/jobs/${j.id}`} className="font-bold text-ink hover:text-brand-700">{j.title}</Link>
                    <p className="mt-0.5 text-xs text-slate-500">#{j.id} · {j.location.locality?.name ?? "Surat"} · {j.posted_at ? `Posted ${dateIST(j.posted_at)}` : `Created ${dateIST(j.created_at)}`}{j.expires_at ? ` · Expires ${dateIST(j.expires_at)}` : ""}</p>
                    {j.status === "rejected" && j.rejection_reason && <p className="mt-1 text-xs text-red-600">Reason: {j.rejection_reason}</p>}
                  </div>
                  <StatusBadge status={j.status} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-sm">
                  <span className="mr-auto text-slate-600"><strong className="text-ink">{j.applications_count}</strong> applications · <strong className="text-ink">{j.views_count}</strong> views</span>
                  <Button size="sm" variant="ghost" href={`/employer/applications?job_id=${j.id}`}>Applicants</Button>
                  <Button size="sm" variant="ghost" href={`/employer/jobs/${j.id}/edit`}>Edit</Button>
                  {(JOB_ACTIONS[j.status] ?? []).map((a) => <Button key={a.action} size="sm" variant="outline" onClick={() => act(j, a.action)}>{a.label}</Button>)}
                </div>
              </div>
            ))}
          </div>
        )}
        {data && <Pagination page={data.meta.current_page} last={data.meta.last_page} onPage={setPage} />}
      </div>
    </>
  );
}

export default function Page() { return <Suspense><JobsList /></Suspense>; }
