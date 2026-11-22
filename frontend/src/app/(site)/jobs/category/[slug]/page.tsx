import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JobsBrowser, jobCount, type SP } from "@/components/jobs/JobsBrowser";
import { getMeta } from "@/lib/api-server";

type P = { params: Promise<{ slug: string }>; searchParams: Promise<SP> };

async function find(slug: string) {
  return (await getMeta())?.categories.find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const c = await find((await params).slug);
  if (!c) return {};
  const n = await jobCount({ category: c.slug });
  return {
    title: `${c.name} Jobs in Surat`,
    description: c.description || `${n} latest ${c.name} jobs in Surat. Apply free on SuratRojgar.`,
    alternates: { canonical: `/jobs/category/${c.slug}` },
    robots: n === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: P) {
  const c = await find((await params).slug);
  if (!c) notFound();
  return (
    <JobsBrowser searchParams={await searchParams} fixedParams={{ category: c.slug }} basePath={`/jobs/category/${c.slug}`}
      heading={`${c.name} jobs in Surat`}
      intro={
        <>
          {c.description && <p>{c.description}</p>}
          {c.roles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {c.roles.slice(0, 14).map((r) => <Link key={r.id} href={`/jobs/role/${r.slug}`} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-brand-300 hover:text-brand-700">{r.name}</Link>)}
            </div>
          )}
        </>
      } />
  );
}
