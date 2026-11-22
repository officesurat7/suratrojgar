"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PageHeader, Table } from "@/components/panel/Shell";
import { useApi, useMeta } from "@/components/providers";
import { Badge, EmptyState, PageLoader, Pagination, StatusBadge, Tabs } from "@/components/ui";
import { dateIST } from "@/lib/format";

interface Emp { user_id: number; name: string; company_name: string; contact_person: string; email: string; mobile: string; locality: string | null; business_category: string | null; verified: boolean; status: string; jobs_count: number; registered_at: string; gstin: string | null }
const TABS = ["", "pending", "active", "suspended", "blocked"] as const;

function Employers() {
  const sp = useSearchParams();
  const router = useRouter();
  const meta = useMeta();
  const status = sp.get("status") ?? "";
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [f, setF] = useState({ q: "", locality_id: "", business_category_id: "", verified: "" });
  const qs = `page=${page}${status ? `&status=${status}` : ""}${Object.entries(f).map(([k, v]) => (v ? `&${k}=${encodeURIComponent(v)}` : "")).join("")}`;
  const { data, loading } = useApi<{ data: Emp[]; meta: { current_page: number; last_page: number; total: number } }>(`admin/employers?${qs}`);
  return (
    <>
      <PageHeader title="Employers" subtitle={data ? `${data.meta.total} employer(s)` : undefined} />
      <Tabs value={status} onChange={(v) => { setPage(1); router.replace(`/admin/employers${v ? `?status=${v}` : ""}`); }} items={TABS.map((t) => ({ value: t, label: t ? t.charAt(0).toUpperCase() + t.slice(1) : "All" }))} />
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); setF({ ...f, q: q.trim() }); }}><input className="input" placeholder="Company, email, mobile, GSTIN" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" /></form>
        <select className="input" value={f.locality_id} onChange={(e) => { setPage(1); setF({ ...f, locality_id: e.target.value }); }} aria-label="Area"><option value="">All areas</option>{meta?.localities.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
        <select className="input" value={f.business_category_id} onChange={(e) => { setPage(1); setF({ ...f, business_category_id: e.target.value }); }} aria-label="Business category"><option value="">All business types</option>{meta?.business_categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select className="input" value={f.verified} onChange={(e) => { setPage(1); setF({ ...f, verified: e.target.value }); }} aria-label="Verification"><option value="">Verified or not</option><option value="1">Verified</option><option value="0">Not verified</option></select>
      </div>
      <div className="mt-4">
        {loading && !data ? <PageLoader /> : !data?.data.length ? <EmptyState icon="🏢" title="No employers found" /> : (
          <Table head={["Company", "Contact", "Area / type", "Jobs", "Status", "Registered"]}>
            {data.data.map((e) => (
              <tr key={e.user_id} className="hover:bg-slate-50">
                <td className="px-4 py-3"><Link href={`/admin/employers/${e.user_id}`} className="font-semibold text-ink hover:text-brand-700">{e.company_name}</Link> {e.verified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Unverified</Badge>}{e.gstin && <p className="font-mono text-xs text-slate-500">{e.gstin}</p>}</td>
                <td className="px-4 py-3"><p>{e.contact_person}</p><p className="text-xs text-slate-500">{e.email} · {e.mobile}</p></td>
                <td className="px-4 py-3"><p>{e.locality ?? "–"}</p><p className="text-xs text-slate-500">{e.business_category}</p></td>
                <td className="px-4 py-3 tabular-nums"><Link href={`/admin/jobs?employer_id=${e.user_id}`} className="hover:text-brand-700">{e.jobs_count}</Link></td>
                <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                <td className="px-4 py-3 text-slate-600">{dateIST(e.registered_at)}</td>
              </tr>
            ))}
          </Table>
        )}
        {data && <Pagination page={data.meta.current_page} last={data.meta.last_page} onPage={setPage} />}
      </div>
    </>
  );
}

export default function Page() { return <Suspense><Employers /></Suspense>; }
