import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { RegisterJobSeeker } from "@/components/auth/RegisterJobSeeker";

export const metadata: Metadata = { title: "Job Seeker Registration – Free", description: "Create your free SuratRojgar profile and apply to jobs across Surat.", alternates: { canonical: "/register/job-seeker" } };

export default function Page() {
  return (
    <AuthCard wide title="Job seeker registration" subtitle="Free forever. Takes about 2 minutes."
      footer={<>Already registered? <Link href="/login" className="font-semibold text-brand-700 hover:underline">Log in</Link> · Hiring? <Link href="/register/employer" className="font-semibold text-brand-700 hover:underline">Employer registration</Link></>}>
      <RegisterJobSeeker />
    </AuthCard>
  );
}
