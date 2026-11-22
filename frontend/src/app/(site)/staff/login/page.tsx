import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Admin staff login", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <AuthCard title="Admin staff login" subtitle="Staff accounts are created by an administrator."
      badge={<span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">Restricted area</span>}>
      <Suspense><LoginForm portal="staff" /></Suspense>
    </AuthCard>
  );
}
