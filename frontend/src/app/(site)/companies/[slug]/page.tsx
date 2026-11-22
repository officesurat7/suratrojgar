import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StaticJobGrid } from "@/components/jobs/JobGrid";
import { apiGet, getJobs } from "@/lib/api-server";

interface Company { name: string; slug: string; company_type: string | null; business_category: string | null; website: string | null; city: string | null; locality: string | null; about: string | null; company_size: string | null; logo_url: string | null; verified: boolean; active_jobs: number }
type P = { params: Promise<{ slug: string }> };

const getCompany = (slug: string) => apiGet<{ data: Company }>(`/companies/${encodeURIComponent(slug)}`, 300);

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const c = (await getCompany(slug))?.data;
  if (!c) return { title: "Company not found", robots: { index: false } };
  return {
    title: `${c.name} jobs in Surat`, description: `${c.active_jobs} open job(s) at ${c.name}${c.locality ? `, ${c.locality}` : ""}, Surat. ${c.about?.slice(0, 120) ?? ""}`.trim(),
    alternates: { canonical: `/companies/${c.slug}` }, robots: c.active_jobs === 0 || !c.verified ? { index: false, follow: true } : undefined,
  };
}

export default async function CompanyPage({ params }: P) {
  const { slug } = await params;
  const c = (await getCompany(slug))?.data;
  if (!c) notFound();
  const jobs = await getJobs(`employer=${encodeURIComponent(c.slug)}&per_page=50`);
  return (
    <div className="container-page py-8 sm:py-12">
      <nav className="mb-4 text-sm text-slate-500"><Link href="/jobs" className="hover:text-ink">Jobs</Link> / <span>{c.name}</span></nav>
      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
        {c.logo_url
          ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.logo_url} alt={`${c.name} logo`} className="h-16 w-16 rounded-xl border border-slate-200 object-contain" />
          : <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-brand-100 text-2xl font-extrabold text-brand-800">{c.name.charAt(0)}</span>}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold text-ink sm:text-2xl">{c.name} {c.verified && <span className="ml-1 rounded-full bg-accent-50 px-2 py-0.5 align-middle text-xs font-semibold text-accent-700">✓ Verified</span>}</h1>
          <p className="mt-1 text-sm text-slate-600">{[c.business_category, c.locality ? `${c.locality}, Surat` : c.city, c.company_size ? `${c.company_size} employees` : null].filter(Boolean).join(" · ")}</p>
          {c.website && <a href={c.website} rel="nofollow noopener noreferrer" target="_blank" className="mt-1 inline-block break-all text-sm font-semibold text-brand-700">{c.website.replace(/^https?:\/\//, "")}</a>}
        </div>
      </div>
      {c.about && <section className="mt-6 max-w-3xl"><h2 className="text-lg font-bold text-ink">About</h2><p className="mt-2 whitespace-pre-line text-slate-700">{c.about}</p></section>}
      <section className="mt-8">
        <h2 className="h-section mb-4">Open jobs ({jobs?.meta.total ?? 0})</h2>
        {jobs?.data.length ? <StaticJobGrid jobs={jobs.data} /> : <p className="text-slate-600">No open jobs right now. <Link href="/jobs" className="font-semibold text-brand-700">See all Surat jobs</Link>.</p>}
      </section>
    </div>
  );
}
