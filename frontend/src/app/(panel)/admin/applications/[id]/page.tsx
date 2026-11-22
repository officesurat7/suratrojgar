"use client";

import Link from "next/link";
import { use } from "react";
import { ApplicationReview, type ReviewApp } from "@/components/panel/ApplicationReview";
import { PageHeader } from "@/components/panel/Shell";
import { useApi, useAuth } from "@/components/providers";
import { Alert, PageLoader } from "@/components/ui";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { can } = useAuth();
  const { data, loading, error, reload } = useApi<{ data: ReviewApp }>(`admin/applications/${id}`);
  if (loading && !data) return <PageLoader />;
  if (error || !data) return <Alert tone="red">{error ?? "Application not found."}</Alert>;
  const a = data.data;
  return (
    <>
      <Link href="/admin/applications" className="mb-3 inline-block text-sm font-semibold text-slate-600 hover:text-ink">← Applications</Link>
      <PageHeader title={a.candidate?.name ?? "Candidate"}
        subtitle={<>For {a.job ? <Link href={`/admin/jobs/${a.job.id}`} className="font-semibold hover:text-brand-700">{a.job.title}</Link> : "a removed job"}{a.job ? ` at ${a.job.company}` : ""} · ID <span className="font-mono">{a.application_no}</span>{a.candidate && can("job_seekers.view") && <> · <Link href={`/admin/candidates/${a.candidate.id}`} className="font-semibold text-brand-700">Candidate profile</Link></>}</>} />
      <ApplicationReview app={a} base="admin/applications" onChanged={reload} notesMode="read" canChange={can("applications.manage")}
        resumePath={a.resume && a.candidate ? `admin/candidates/${a.candidate.id}/resumes/${a.resume.id}` : undefined} />
    </>
  );
}
