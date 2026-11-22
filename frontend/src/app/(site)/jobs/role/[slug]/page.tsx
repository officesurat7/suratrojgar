import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JobsBrowser, jobCount, type SP } from "@/components/jobs/JobsBrowser";
import { getMeta } from "@/lib/api-server";

type P = { params: Promise<{ slug: string }>; searchParams: Promise<SP> };

async function find(slug: string) {
  const meta = await getMeta();
  for (const c of meta?.categories ?? []) {
    const r = c.roles.find((x) => x.slug === slug);
    if (r) return { role: r, category: c };
  }
  return null;
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const f = await find((await params).slug);
  if (!f) return {};
  const n = await jobCount({ role: f.role.slug });
  return {
    title: `${f.role.name} Jobs in Surat`,
    description: `${n} ${f.role.name} jobs in Surat (${f.category.name}). Check salary, location and apply free on SuratRojgar.`,
    alternates: { canonical: `/jobs/role/${f.role.slug}` },
    robots: n === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function RolePage({ params, searchParams }: P) {
  const f = await find((await params).slug);
  if (!f) notFound();
  return (
    <JobsBrowser searchParams={await searchParams} fixedParams={{ role: f.role.slug }} basePath={`/jobs/role/${f.role.slug}`}
      heading={`${f.role.name} jobs in Surat`}
      intro={<>Part of <Link href={`/jobs/category/${f.category.slug}`} className="font-semibold text-brand-700 hover:underline">{f.category.name}</Link>.</>} />
  );
}
