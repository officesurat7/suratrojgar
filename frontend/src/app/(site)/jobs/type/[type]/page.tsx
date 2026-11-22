import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JobsBrowser, jobCount, type SP } from "@/components/jobs/JobsBrowser";
import { JOB_TYPE_PAGES } from "@/lib/landing";

type P = { params: Promise<{ type: string }>; searchParams: Promise<SP> };

export function generateStaticParams() {
  return Object.keys(JOB_TYPE_PAGES).map((type) => ({ type }));
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { type } = await params;
  const d = JOB_TYPE_PAGES[type];
  if (!d) return {};
  const n = await jobCount(d.param);
  return { title: d.title, description: `${d.intro} ${n} open jobs on SuratRojgar.`, alternates: { canonical: `/jobs/type/${type}` }, robots: n === 0 ? { index: false, follow: true } : undefined };
}

export default async function TypePage({ params, searchParams }: P) {
  const { type } = await params;
  const d = JOB_TYPE_PAGES[type];
  if (!d) notFound();
  return <JobsBrowser searchParams={await searchParams} fixedParams={d.param} basePath={`/jobs/type/${type}`} heading={d.h1} intro={d.intro} />;
}
