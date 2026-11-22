"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PageHeader } from "@/components/panel/Shell";
import { useApi, useMeta } from "@/components/providers";
import { EmptyState, PageLoader, Pagination, StatusBadge } from "@/components/ui";
import { dateIST } from "@/lib/format";

interface App { id: number; application_no: string; status: string; status_label: string; applied_at: string; interview_at: string | null; job: { title: string; company: string; url: string; locality: string | null; status: string } | null }

function List() {
  const sp = useSearchParams();
  const router = useRouter();
  const meta = useMeta();
  const status = sp.get("status") ?? "";
  const [page, setPage] = useState(1);
  const { data, loading } = useApi<{ data: App[]; meta: { current_page: number; last_page: number; total: number } }>(`seeker/applications?page=${page}${status ? `&status=${status}` : ""}`);
  return (
    <>
      <PageHeader title="My applications" subtitle={data ? `${data.meta.total} total` : undefined}
        actions={<select className="input w-auto py-2 text-sm" value={status} onChange={(e) => { setPage(1); router.replace(`/seeker/applications${e.target.value ? `?status=${e.target.value}` : ""}`); }} aria-label="Filter by status">
          <option value="">All statuses</option>
          {Object.entries(meta?.options.application_statuses ?? {}).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>} />
      {loading && !data ? <PageLoader /> : !data?.data.length ? (
        <EmptyState icon="📄" title="No applications" text={status ? "No applications with this status." : "Apply to jobs and track them here."} action={<Link href="/jobs" className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white">Find jobs</Link>} />
      ) : (
        <div className="grid gap-3">
          {data.data.map((a) => (
            <Link key={a.id} href={`/seeker/applications/${a.id}`} className="card flex flex-col gap-2 p-4 transition hover:shadow-md sm:flex-row sm:items-center sm:p-5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">{a.job?.title ?? "Job removed"}</p>
                <p className="truncate text-sm text-slate-600">{a.job?.company}{a.job?.locality ? ` · ${a.job.locality}` : ""}</p>
                <p className="mt-1 text-xs text-slate-500">ID <span className="font-mono">{a.application_no}</span> · Applied {dateIST(a.applied_at)}{a.interview_at ? ` · Interview ${dateIST(a.interview_at)}` : ""}</p>
              </div>
              <StatusBadge status={a.status} label={a.status_label} />
            </Link>
          ))}
        </div>
      )}
      {data && <Pagination page={data.meta.current_page} last={data.meta.last_page} onPage={setPage} />}
    </>
  );
}

export default function Page() { return <Suspense><List /></Suspense>; }
