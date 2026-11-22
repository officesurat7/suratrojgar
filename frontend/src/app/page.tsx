import Link from "next/link";
import { LoadMoreJobs } from "@/components/jobs/JobGrid";
import { QuickSearch } from "@/components/jobs/QuickSearch";
import { HeroSlider } from "@/components/site/HeroSlider";
import { getJobs, getMeta, getSliders } from "@/lib/api-server";
import { SITE_URL } from "@/lib/config";

export const revalidate = 60;

export default async function HomePage() {
  const [meta, sliders, jobs] = await Promise.all([getMeta(), getSliders(), getJobs("per_page=12")]);
  const categories = meta?.categories ?? [];
  const localities = meta?.localities ?? [];
  const topLocalities = [...localities].sort((a, b) => (b.job_count ?? 0) - (a.job_count ?? 0)).slice(0, 16);

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SuratRojgar",
    url: SITE_URL,
    potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/jobs?q={search_term_string}`, "query-input": "required name=search_term_string" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd).replace(/</g, "\\u003c") }} />
      <h1 className="sr-only">SuratRojgar: latest jobs in Surat</h1>
      <HeroSlider slides={sliders?.data ?? []}>
        <QuickSearch categories={categories} localities={localities} />
      </HeroSlider>
      {!sliders?.data?.length && (
        <div className="bg-brand-700 py-8"><div className="container-page"><QuickSearch categories={categories} localities={localities} /></div></div>
      )}

      {/* Trust strip */}
      <section className="border-b border-slate-200 bg-white">
        <div className="container-page grid grid-cols-2 gap-4 py-5 text-center sm:grid-cols-4">
          <div><p className="text-2xl font-extrabold text-brand-700">{meta?.stats.active_jobs ?? 0}</p><p className="text-xs text-slate-500">Active jobs</p></div>
          <div><p className="text-2xl font-extrabold text-brand-700">{meta?.stats.employers ?? 0}</p><p className="text-xs text-slate-500">Verified employers</p></div>
          <div><p className="text-2xl font-extrabold text-brand-700">{localities.length}</p><p className="text-xs text-slate-500">Surat areas covered</p></div>
          <div><p className="text-2xl font-extrabold text-accent-600">100%</p><p className="text-xs text-slate-500">Free for job seekers</p></div>
        </div>
      </section>

      {/* Latest jobs (Admin priority jobs first, then newest) */}
      <section className="container-page py-10 sm:py-12" aria-labelledby="latest">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="latest" className="h-section">Latest jobs in Surat</h2>
            <p className="mt-1 text-sm text-slate-600">Newest openings first. Featured jobs are highlighted.</p>
          </div>
          <Link href="/jobs" className="text-sm font-semibold text-brand-700 hover:underline">View all jobs →</Link>
        </div>
        {jobs ? <LoadMoreJobs initial={jobs} query="per_page=12" /> : (
          <div className="card p-8 text-center text-slate-600">Jobs could not be loaded right now. Please refresh in a moment.</div>
        )}
      </section>

      {/* Categories */}
      <section className="bg-white py-10 sm:py-12" aria-labelledby="cats">
        <div className="container-page">
          <h2 id="cats" className="h-section">Browse by category</h2>
          <p className="mt-1 text-sm text-slate-600">From textile looms to IT offices: jobs for every skill.</p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((c) => (
              <Link key={c.id} href={`/jobs/category/${c.slug}`} className="group rounded-2xl border border-slate-200 p-4 transition hover:border-brand-300 hover:bg-brand-50">
                <p className="text-[15px] font-bold leading-snug text-ink group-hover:text-brand-800">{c.name}</p>
                <p className="mt-1 text-xs text-slate-500">{c.job_count ? `${c.job_count} open ${c.job_count === 1 ? "job" : "jobs"}` : "View jobs"}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Localities */}
      <section className="container-page py-10 sm:py-12" aria-labelledby="areas">
        <h2 id="areas" className="h-section">Jobs near you</h2>
        <p className="mt-1 text-sm text-slate-600">Find work close to home and save travel time.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {topLocalities.map((l) => (
            <Link key={l.id} href={`/jobs/in/${l.slug}`} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-brand-300 hover:text-brand-700">
              {l.name}{l.job_count ? <span className="ml-1.5 text-xs text-slate-400">({l.job_count})</span> : null}
            </Link>
          ))}
          <Link href="/jobs/search" className="rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">All areas →</Link>
        </div>
      </section>

      {/* How it works + employer CTA */}
      <section className="container-page pb-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-6 sm:p-8">
            <h2 className="text-xl font-extrabold text-ink">Looking for a job?</h2>
            <ol className="mt-4 space-y-3 text-sm text-slate-700">
              <li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">1</span>Register free with your email and verify it with a code.</li>
              <li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">2</span>Upload your resume (PDF or Word) and set your job preferences.</li>
              <li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">3</span>Apply in one tap and track every application from your dashboard.</li>
            </ol>
            <Link href="/register/job-seeker" className="mt-6 inline-flex rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700">Create free profile</Link>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink to-brand-900 p-6 text-white sm:p-8">
            <h2 className="text-xl font-extrabold">Hiring in Surat?</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-white/80">Post jobs, receive applications, shortlist and select candidates, all from one simple dashboard. Your phone number and address are shown only to verified job seekers.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/employer/jobs/new" className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-brand-800 hover:bg-brand-50">Post a job</Link>
              <Link href="/register/employer" className="rounded-xl px-5 py-3 text-sm font-bold text-white ring-1 ring-white/40 hover:bg-white/10">Employer registration</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
