"use client";

import Link from "next/link";
import { use } from "react";
import { ApplicationReview, type ReviewApp } from "@/components/panel/ApplicationReview";
import { PageHeader } from "@/components/panel/Shell";
import { useApi } from "@/components/providers";
import { Alert, PageLoader } from "@/components/ui";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error, reload } = useApi<{ data: ReviewApp }>(`employer/applications/${id}`);
  if (loading && !data) return <PageLoader />;
  if (error || !data) return <Alert tone="red">{error ?? "Application not found."}</Alert>;
  const a = data.data;
  return (
    <>
      <Link href="/employer/applications" className="mb-3 inline-block text-sm font-semibold text-slate-600 hover:text-ink">← Applications</Link>
      <PageHeader title={a.candidate?.name ?? "Candidate"} subtitle={<>For <strong>{a.job?.title}</strong> · ID <span className="font-mono">{a.application_no}</span></>} />
      <ApplicationReview app={a} base="employer/applications" onChanged={reload} />
    </>
  );
}
