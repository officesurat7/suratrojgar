import type { Metadata } from "next";
import Link from "next/link";
import { JobsBrowser, type SP } from "@/components/jobs/JobsBrowser";

export const metadata: Metadata = {
  title: "All Jobs in Surat – Latest Openings",
  description: "Browse the latest jobs in Surat. Filter by area, category, salary, experience and job type. Apply free on SuratRojgar.",
  alternates: { canonical: "/jobs" },
};

export default async function JobsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  return (
    <JobsBrowser searchParams={sp} basePath="/jobs" heading="Jobs in Surat"
      intro={<>Featured jobs appear first, then the newest openings. Need more options? Use <Link href="/jobs/search" className="font-semibold text-brand-700 hover:underline">Advanced search</Link>.</>} />
  );
}
