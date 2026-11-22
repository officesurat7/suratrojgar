"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PageHeader, Table } from "@/components/panel/Shell";
import { useApi, useAuth, useMeta } from "@/components/providers";
import { Badge, Button, EmptyState, PageLoader, Pagination, StatusBadge, Tabs } from "@/components/ui";
import { dateIST } from "@/lib/format";

interface Job { id: number; title: string; company: string; status: string; created_at: string; expires_at: string | null; views_count: number; applications_count: number; featured_priority: number | null; location: { locality: { name: string } | null }; category: { name: string } | null; employer: { id: number; name: string } | null }
const TABS = ["", "pending", "active", "paused", "draft", "rejected", "closed", "expired", "deleted"] as const;
const LABEL: Record<string, string> = { "": "All", pending: "Pending approval", active: "Active", paused: "Paused", draft: "Drafts", rejected: "Rejected", closed: "Closed", expired: "Expired", deleted: "Deleted" };

function Jobs() {
  const sp = useSearchParams();
  const router = useRouter();
  const meta = useMeta();
  const { can } = useAuth();
  const status = sp.get("status") ?? "";
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [f, setF] = useState({ q: "", category_id: "", locality_id: "", sort: "latest" });
  const qs = `page=${page}${status ? `&status=${status}` : ""}${Object.entries(f).map(([k, v]) => (v ? `&${k}=${encodeURIComponent(v)}` : "")).join("")}`;
  const { data, loading } = useApi<{ data: Job[]; meta: { current_page: number; last_page: number; total: number } }>(`admin/jobs?${qs}`);
  return (
    <>
      <PageHeader title="Jobs" subtitle={data ? `${data.meta.total} job(s)` : undefined} actions={can("jobs.manage") ? <Button href="/admin/jobs/new">+ Post job for employer</Button> : null} />
      <Tabs value={status} onChange={(v) => { setPage(1); router.replace(`/admin/jobs${v ? `?status=${v}` : ""}`); }} items={TABS.map((t) => ({ value: t, label: LABEL[t] }))} />
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <form className="sm:col-span-1" onSubmit={(e) => { e.preventDefault(); setPage(1); setF({ ...f, q: q.trim() }); }}><input className="input" placeholder="Title, company or job ID" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" /></form>
        <select className="input" value={f.category_id} onChange={(e) => { setPage(1); setF({ ...f, category_id: e.target.value }); }} aria-label="Category"><option value="">All categories</option>{meta?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select className="input" value={f.locality_id} onChange={(e) => { setPage(1); setF({ ...f, locality_id: e.target.value }); }} aria-label="Area"><option value="">All areas</option>{meta?.localities.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
        <select className="input" value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value })} aria-label="Sort"><option value="latest">Newest</option><option value="oldest">Oldest</option><option value="applications">Most applications</option><option value="views">Most views</option><option value="expiry">Expiring soon</option></select>
      </div>
      <div className="mt-4">
        {loading && !data ? <PageLoader /> : !data?.data.length ? <EmptyState icon="💼" title="No jobs found" /> : (
          <Table head={["Job", "Employer", "Area", "Status", "Apps / views", "Created", "Expires"]}>
            {data.data.map((j) => (
              <tr key={j.id} className="hover:bg-slate-50">
                <td className="px-4 py-3"><Link href={`/admin/jobs/${j.id}`} className="font-semibold text-ink hover:text-brand-700">{j.title}</Link><p className="text-xs text-slate-500">#{j.id} · {j.category?.name}{j.featured_priority ? <> · <Badge tone="blue">Priority {j.featured_priority}</Badge></> : null}</p></td>
                <td className="px-4 py-3">{j.employer ? <Link href={`/admin/employers/${j.employer.id}`} className="hover:text-brand-700">{j.company}</Link> : j.company}</td>
                <td className="px-4 py-3">{j.location.locality?.name ?? "–"}</td>
                <td className="px-4 py-3"><StatusBadge status={j.status} /></td>
                <td className="px-4 py-3 tabular-nums">{j.applications_count} / {j.views_count}</td>
                <td className="px-4 py-3 text-slate-600">{dateIST(j.created_at)}</td>
                <td className="px-4 py-3 text-slate-600">{j.expires_at ? dateIST(j.expires_at) : "–"}</td>
              </tr>
            ))}
          </Table>
        )}
        {data && <Pagination page={data.meta.current_page} last={data.meta.last_page} onPage={setPage} />}
      </div>
    </>
  );
}

export default function Page() { return <Suspense><Jobs /></Suspense>; }
