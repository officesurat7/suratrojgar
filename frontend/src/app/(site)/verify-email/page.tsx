import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";

export const metadata: Metadata = { title: "Verify your email", robots: { index: false } };

export default function Page() {
  return (
    <AuthCard title="Verify your email" subtitle="Enter the 6-digit code we sent to your email address. Check your spam folder if you don't see it.">
      <Suspense><VerifyEmailForm /></Suspense>
    </AuthCard>
  );
}
