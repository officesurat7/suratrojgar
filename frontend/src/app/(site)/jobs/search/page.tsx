import type { Metadata } from "next";
import { JobsBrowser, type SP } from "@/components/jobs/JobsBrowser";

export const metadata: Metadata = {
  title: "Advanced Job Search in Surat",
  description: "Search Surat jobs by keyword, area, PIN code, salary, shift, education, experience, weekly off and more.",
  alternates: { canonical: "/jobs/search" },
  robots: { index: true, follow: true },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  return <JobsBrowser searchParams={sp} basePath="/jobs/search" advanced heading="Search jobs" intro="Use any combination of filters. Results update as you choose." />;
}
