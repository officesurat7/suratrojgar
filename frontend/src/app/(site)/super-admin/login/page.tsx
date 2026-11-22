import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Super Admin login", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <AuthCard title="Super Admin login" subtitle="Two-step verification is required for this account."
      badge={<span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">Restricted area</span>}>
      <Suspense><LoginForm portal="super" /></Suspense>
    </AuthCard>
  );
}
