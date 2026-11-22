import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { RegisterEmployer } from "@/components/auth/RegisterEmployer";

export const metadata: Metadata = { title: "Employer Registration – Hire in Surat", description: "Register your business on SuratRojgar to post jobs and hire verified local candidates.", alternates: { canonical: "/register/employer" } };

export default function Page() {
  return (
    <AuthCard wide title="Employer registration" subtitle="Post jobs and hire from Surat's local talent. Your phone and address stay private."
      footer={<>Already registered? <Link href="/login?as=employer" className="font-semibold text-brand-700 hover:underline">Employer login</Link></>}>
      <RegisterEmployer />
    </AuthCard>
  );
}
