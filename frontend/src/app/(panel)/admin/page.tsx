"use client";

import Link from "next/link";
import { useState } from "react";
import { Donut, TrendChart } from "@/components/panel/Charts";
import { RangePicker, rangeQs, type Range } from "@/components/panel/RangePicker";
import { PageHeader } from "@/components/panel/Shell";
import { useApi, useAuth, useMeta } from "@/components/providers";
import { Alert, Card, PageLoader, StatCard } from "@/components/ui";
import { dateTimeIST } from "@/lib/format";

type Stats = Record<string, number | string>;
interface Charts { range: { from: string; to: string }; series: Record<string, string | number>[]; application_status: Record<string, number> }

export default function AdminDashboard() {
  const { can, user } = useAuth();
  const meta = useMeta();
  const [range, setRange] = useState<Range>({ range: "last_30_days" });
  const { data: s, error } = useApi<Stats>(can("stats.view") ? "admin/dashboard/stats" : null);
  const { data: c } = useApi<Charts>(can("stats.view") ? `admin/dashboard/charts?${rangeQs(range)}` : null);

  if (!can("stats.view")) {
    return (
      <>
        <PageHeader title={`Welcome, ${user?.name}`} subtitle="Use the menu to open the sections you have access to." />
        <Alert tone="blue">Your account has limited permissions. Ask an administrator if you need access to more sections.</Alert>
      </>
    );
  }
  if (error) return <Alert tone="red">{error}</Alert>;
  if (!s) return <PageLoader />;
  const n = (k: string) => Number(s[k] ?? 0).toLocaleString("en-IN");
  const statusData = Object.entries(c?.application_status ?? {}).map(([k, v]) => ({ name: meta?.options.application_statuses[k] ?? k, value: v }));

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Updated ${dateTimeIST(String(s.generated_at))} IST`} />
      {(Number(s.jobs_pending) > 0 || Number(s.employers_pending) > 0 || Number(s.complaints_open) > 0 || Number(s.data_requests_pending) > 0) && (
        <div className="mb-5 flex flex-wrap gap-2">
          {Number(s.jobs_pending) > 0 && <Link href="/admin/jobs?status=pending" className="rounded-full bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-900">{n("jobs_pending")} job(s) awaiting approval →</Link>}
          {Number(s.employers_pending) > 0 && <Link href="/admin/employers?status=pending" className="rounded-full bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-900">{n("employers_pending")} employer(s) to verify →</Link>}
          {Number(s.complaints_open) > 0 && <Link href="/admin/complaints" className="rounded-full bg-red-100 px-3 py-1.5 text-sm font-semibold text-red-800">{n("complaints_open")} open complaint(s) →</Link>}
          {Number(s.data_requests_pending) > 0 && <Link href="/admin/data-requests" className="rounded-full bg-red-100 px-3 py-1.5 text-sm font-semibold text-red-800">{n("data_requests_pending")} data request(s) →</Link>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Visitors (est.)" value={n("visitors_total")} hint={`${n("unique_visitors_today")} today · ${n("page_views_total")} page views`} tone="slate" href="/admin/analytics" />
        <StatCard label="Job seekers" value={n("job_seekers_total")} hint={`${n("job_seekers_active")} active`} href="/admin/candidates" />
        <StatCard label="Employers" value={n("employers_total")} hint={`${n("employers_active")} active · ${n("employers_pending")} pending`} href="/admin/employers" />
        <StatCard label="Jobs" value={n("jobs_total")} hint={`${n("jobs_active")} active · ${n("jobs_pending")} pending · ${n("jobs_expired")} expired`} tone="green" href="/admin/jobs" />
        <StatCard label="Applications" value={n("applications_total")} hint={`${n("applications_today")} today`} href="/admin/applications" />
        <StatCard label="This week" value={n("applications_week")} hint="applications" tone="slate" />
        <StatCard label="This month" value={n("applications_month")} hint="applications" tone="slate" />
        <StatCard label="Shortlisted / selected" value={`${n("shortlisted_total")} / ${n("selected_total")}`} tone="amber" />
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-ink">Trends</h2>
        <RangePicker value={range} onChange={setRange} />
      </div>
      <div className="mt-3 grid gap-5 lg:grid-cols-2">
        <Card title="Applications and new jobs">{c ? <TrendChart data={c.series} keys={["applications", "jobs_posted"]} labels={{ applications: "Applications", jobs_posted: "Jobs posted" }} /> : <PageLoader />}</Card>
        <Card title="New registrations">{c ? <TrendChart data={c.series} keys={["job_seekers", "employers"]} labels={{ job_seekers: "Job seekers", employers: "Employers" }} /> : <PageLoader />}</Card>
        <Card title="Visitors (estimated)">{c ? <TrendChart data={c.series} keys={["visitors", "page_views"]} labels={{ visitors: "Visitors", page_views: "Page views" }} /> : <PageLoader />}</Card>
        <Card title="Applications by status">{c ? <Donut data={statusData} /> : <PageLoader />}</Card>
      </div>
      <p className="mt-4 text-xs text-slate-500">Visitor numbers are privacy-friendly estimates (no IP addresses stored) and are updated every few minutes. Registration, job and application numbers are exact.</p>
    </>
  );
}
