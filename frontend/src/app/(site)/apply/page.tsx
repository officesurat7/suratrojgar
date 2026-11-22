import type { Metadata } from "next";
import Link from "next/link";
import { StaticJobGrid } from "@/components/jobs/JobGrid";
import { getJobs } from "@/lib/api-server";

export const metadata: Metadata = { title: "Apply for Jobs in Surat", description: "How to apply for jobs on SuratRojgar in three simple steps, plus the latest openings in Surat.", alternates: { canonical: "/apply" } };
export const revalidate = 60;

const STEPS = [
  { t: "Create your free profile", d: "Register with your email and verify it with a 6-digit code.", href: "/register/job-seeker", cta: "Register free" },
  { t: "Upload your resume", d: "Add a PDF or Word resume and your preferred area, job type and salary.", href: "/seeker/resumes", cta: "Upload resume" },
  { t: "Apply and track", d: "Tap Apply Now on any job. You get an Application ID and email updates at every step.", href: "/jobs", cta: "Browse jobs" },
];

export default async function ApplyPage() {
  const jobs = await getJobs("per_page=6");
  return (
    <div className="container-page py-8 sm:py-12">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Apply for jobs in Surat</h1>
      <p className="mt-2 max-w-2xl text-slate-600">Applying is free. No agent, no fee. Employers see your profile and resume only when you apply.</p>
      <ol className="mt-8 grid gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.t} className="card flex flex-col p-5 sm:p-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
            <h2 className="mt-3 text-lg font-bold text-ink">{s.t}</h2>
            <p className="mt-1 flex-1 text-sm text-slate-600">{s.d}</p>
            <Link href={s.href} className="mt-4 text-sm font-bold text-brand-700 hover:underline">{s.cta} →</Link>
          </li>
        ))}
      </ol>
      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Stay safe:</strong> SuratRojgar never asks job seekers for money. If an employer asks for a fee, deposit or training charge, do not pay and <Link href="/contact-us" className="font-semibold underline">report it to us</Link>.
      </div>
      {jobs?.data.length ? (
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between"><h2 className="h-section">Latest openings</h2><Link href="/jobs" className="text-sm font-semibold text-brand-700 hover:underline">All jobs →</Link></div>
          <StaticJobGrid jobs={jobs.data} />
        </section>
      ) : null}
    </div>
  );
}
