"use client";

import Link from "next/link";
import { PageHeader } from "@/components/panel/Shell";
import { useApi, useAuth } from "@/components/providers";
import { Alert, Button, Card, PageLoader, StatCard, StatusBadge } from "@/components/ui";
import { timeAgo } from "@/lib/format";

interface Dash {
  verified: boolean; account_status: string; views_total: number;
  jobs: Record<"total" | "active" | "pending" | "draft" | "paused" | "closed" | "expired" | "rejected", number>;
  applications: { total: number; new: number; shortlisted: number; interviews: number; selected: number; today: number };
  recent_applications: { id: number; application_no: string; status: string; status_label: string; applied_at: string; job: { title: string } | null; candidate: { name: string; locality: string | null; experience_years: number | null } | null }[];
}

export default function EmployerDashboard() {
  const { user } = useAuth();
  const { data, loading, error } = useApi<Dash>("employer/dashboard");
  if (loading) return <PageLoader />;
  if (error || !data) return <Alert tone="red">{error ?? "Could not load dashboard."}</Alert>;
  return (
    <>
      <PageHeader title={user?.employer?.company_name ?? "Dashboard"} subtitle="Your hiring at a glance." actions={<Button href="/employer/jobs/new">+ Post a job</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active jobs" value={data.jobs.active} tone="green" href="/employer/jobs?status=active" hint={`${data.jobs.total} jobs in total`} />
        <StatCard label="Pending approval" value={data.jobs.pending} tone="amber" href="/employer/jobs?status=pending" hint={`${data.jobs.draft} drafts`} />
        <StatCard label="New applications" value={data.applications.new} href="/employer/applications?status=applied" hint={`${data.applications.today} today`} />
        <StatCard label="Job views" value={data.views_total.toLocaleString("en-IN")} tone="slate" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <StatCard label="Shortlisted" value={data.applications.shortlisted} tone="amber" href="/employer/applications?status=shortlisted" />
        <StatCard label="Interviews" value={data.applications.interviews} href="/employer/applications?status=interview_scheduled" />
        <StatCard label="Selected" value={data.applications.selected} tone="green" href="/employer/applications?status=selected" />
      </div>
      {data.jobs.rejected > 0 && <div className="mt-5"><Alert tone="red">{data.jobs.rejected} job(s) were not approved. <Link href="/employer/jobs?status=rejected" className="font-semibold underline">See why and fix them</Link></Alert></div>}
      <Card className="mt-6" title="Latest applications" actions={<Link href="/employer/applications" className="text-sm font-semibold text-brand-700">View all →</Link>} bodyClass="p-0">
        {!data.recent_applications.length ? (
          <p className="p-6 text-center text-sm text-slate-600">No applications yet. Jobs with salary and clear timings get the most responses.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.recent_applications.map((a) => (
              <li key={a.id}>
                <Link href={`/employer/applications/${a.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-slate-50 sm:px-5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">{a.candidate?.name.charAt(0)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{a.candidate?.name}</span>
                    <span className="block truncate text-xs text-slate-500">{a.job?.title} · {a.candidate?.locality ?? "Surat"} · {a.candidate?.experience_years ?? 0} yrs · {timeAgo(a.applied_at)}</span>
                  </span>
                  <StatusBadge status={a.status} label={a.status_label} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
