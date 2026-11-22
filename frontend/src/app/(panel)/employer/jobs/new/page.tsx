"use client";

import { useRouter } from "next/navigation";
import { JobForm } from "@/components/panel/JobForm";
import { PageHeader } from "@/components/panel/Shell";
import { useApi, useAuth } from "@/components/providers";
import { PageLoader } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

export default function NewJobPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  // Pre-fill contact and location from the company profile
  const { data, loading } = useApi<{ data: Record<string, string | number | null> }>("employer/profile");
  if (loading) return <PageLoader />;
  const p = data?.data;
  const defaults: Record<string, string> = p ? {
    contact_name: String(p.contact_person ?? ""), contact_mobile: String(user?.mobile ?? ""), contact_email: String(user?.email ?? ""),
    locality_id: p.locality_id ? String(p.locality_id) : "", pincode: String(p.pincode ?? ""), office_address: String(p.address ?? ""),
  } : {};
  return (
    <>
      <PageHeader title="Post a job" subtitle="Fill in the details. You can save a draft any time and submit later." />
      <JobForm initial={null} endpoint="employer/jobs" method="post" defaults={defaults} onSaved={(job, msg) => { toast(msg); router.push(`/employer/jobs/${job.id}`); }} />
    </>
  );
}
