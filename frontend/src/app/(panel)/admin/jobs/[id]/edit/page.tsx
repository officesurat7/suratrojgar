"use client";

import { useRouter } from "next/navigation";
import { use } from "react";
import { JobForm, type JobFormData } from "@/components/panel/JobForm";
import { PageHeader } from "@/components/panel/Shell";
import { useApi } from "@/components/providers";
import { Alert, PageLoader } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

export default function AdminEditJob({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const { data, loading, error } = useApi<{ data: JobFormData }>(`admin/jobs/${id}`);
  if (loading) return <PageLoader />;
  if (error || !data) return <Alert tone="red">{error ?? "Job not found."}</Alert>;
  return (
    <>
      <PageHeader title={`Edit job #${id}`} subtitle="Admin edits are recorded in the audit log." />
      <JobForm initial={{ ...data.data, status: "active" }} endpoint={`admin/jobs/${id}`} method="put" onSaved={(_, msg) => { toast(msg); router.push(`/admin/jobs/${id}`); }} />
    </>
  );
}
