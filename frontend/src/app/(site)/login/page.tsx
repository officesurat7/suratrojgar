import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Login", robots: { index: false, follow: true }, alternates: { canonical: "/login" } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const employer = (await searchParams).as === "employer";
  return (
    <AuthCard
      title={employer ? "Employer login" : "Log in to SuratRojgar"}
      subtitle={employer ? "Manage your jobs and applications." : "Job seekers and employers use the same login."}
      footer={<>New here? <Link href="/register/job-seeker" className="font-semibold text-brand-700 hover:underline">Register as job seeker</Link> · <Link href="/register/employer" className="font-semibold text-brand-700 hover:underline">Register as employer</Link></>}>
      <Suspense><LoginForm portal="user" /></Suspense>
    </AuthCard>
  );
}
