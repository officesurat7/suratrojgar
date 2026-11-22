"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { StaticJobGrid } from "@/components/jobs/JobGrid";
import { PageHeader } from "@/components/panel/Shell";
import { useApi, useAuth } from "@/components/providers";
import { Alert, Card, EmptyState, PageLoader, StatCard, StatusBadge } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import type { JobCard } from "@/lib/types";

interface Dash {
  profile_completion: number; has_resume: boolean;
  stats: { applied: number; shortlisted: number; selected: number; saved: number; unread_notifications: number };
  recent_applications: { id: number; application_no: string; status: string; status_label: string; applied_at: string; job: { title: string; company: string; url: string; locality: string | null } | null }[];
  recommended_jobs: JobCard[];
}

function Welcome() {
  const sp = useSearchParams();
  return sp.get("welcome") ? <div className="mb-5"><Alert tone="green" title="Your account is ready">Complete your profile and upload a resume so employers can find you.</Alert></div> : null;
}

export default function SeekerDashboard() {
  const { user } = useAuth();
  const { data, loading, error } = useApi<Dash>("seeker/dashboard");
  if (loading) return <PageLoader />;
  if (error || !data) return <Alert tone="red">{error ?? "Could not load your dashboard."}</Alert>;
  const pc = data.profile_completion;
  return (
    <>
      <Suspense><Welcome /></Suspense>
      <PageHeader title={`Namaste, ${user?.name.split(" ")[0]}`} subtitle="Here's what's happening with your job search." />
      {(pc < 80 || !data.has_resume) && (
        <div className="card mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className="relative h-16 w-16 shrink-0">
            <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90"><circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="4" /><circle cx="18" cy="18" r="15.5" fill="none" stroke="#2563eb" strokeWidth="4" strokeDasharray={`${pc * 0.974} 100`} strokeLinecap="round" /></svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-ink">{pc}%</span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-ink">Complete your profile</p>
            <p className="text-sm text-slate-600">{!data.has_resume ? "Upload your resume. " : ""}Profiles above 80% get noticed by more employers.</p>
          </div>
          <div className="flex gap-2">
            {!data.has_resume && <Link href="/seeker/resumes" className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white">Upload resume</Link>}
            <Link href="/seeker/profile" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-800">Edit profile</Link>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Applied" value={data.stats.applied} href="/seeker/applications" />
        <StatCard label="Shortlisted" value={data.stats.shortlisted} tone="amber" href="/seeker/applications?status=shortlisted" />
        <StatCard label="Selected" value={data.stats.selected} tone="green" href="/seeker/applications?status=selected" />
        <StatCard label="Saved jobs" value={data.stats.saved} tone="slate" href="/seeker/saved" />
      </div>
      <Card className="mt-6" title="Recent applications" actions={<Link href="/seeker/applications" className="text-sm font-semibold text-brand-700">View all →</Link>} bodyClass="p-0">
        {!data.recent_applications.length ? (
          <div className="p-6 text-center text-sm text-slate-600">You haven&apos;t applied yet. <Link href="/jobs" className="font-semibold text-brand-700">Browse jobs →</Link></div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.recent_applications.map((a) => (
              <li key={a.id}>
                <Link href={`/seeker/applications/${a.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-slate-50 sm:px-5">
                  <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-ink">{a.job?.title}</span><span className="block truncate text-xs text-slate-500">{a.job?.company} · {a.application_no} · {timeAgo(a.applied_at)}</span></span>
                  <StatusBadge status={a.status} label={a.status_label} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-bold text-ink">Recommended for you</h2>
        {data.recommended_jobs.length ? <StaticJobGrid jobs={data.recommended_jobs} cols="sm:grid-cols-2 xl:grid-cols-3" /> : <EmptyState title="No recommendations yet" text="Set your preferred category and job type in your profile." />}
      </section>
    </>
  );
}
