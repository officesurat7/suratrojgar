import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JobsBrowser, jobCount, type SP } from "@/components/jobs/JobsBrowser";
import { getMeta } from "@/lib/api-server";

type P = { params: Promise<{ locality: string }>; searchParams: Promise<SP> };

async function find(slug: string) {
  return (await getMeta())?.localities.find((l) => l.slug === slug) ?? null;
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const l = await find((await params).locality);
  if (!l) return {};
  const n = await jobCount({ locality: l.slug });
  return {
    title: `Jobs in ${l.name}, Surat`,
    description: `${n} latest jobs in ${l.name}, Surat${l.pincode ? ` (${l.pincode})` : ""}. Find work near home and apply free on SuratRojgar.`,
    alternates: { canonical: `/jobs/in/${l.slug}` },
    robots: n === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function LocalityPage({ params, searchParams }: P) {
  const l = await find((await params).locality);
  if (!l) notFound();
  return (
    <JobsBrowser searchParams={await searchParams} fixedParams={{ locality: l.slug }} basePath={`/jobs/in/${l.slug}`}
      heading={`Jobs in ${l.name}, Surat`}
      intro={`Openings in and around ${l.name}${l.zone ? ` (${l.zone} zone)` : ""}${l.pincode ? `, PIN ${l.pincode}` : ""}. Working close to home saves time and travel cost.`} />
  );
}
