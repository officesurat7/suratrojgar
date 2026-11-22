import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { JobActions, MobileApplyBar, ViewBeacon } from "@/components/jobs/JobActions";
import { StaticJobGrid } from "@/components/jobs/JobGrid";
import { getJob, getSimilar } from "@/lib/api-server";
import { SITE_URL } from "@/lib/config";
import { dateIST, experienceText, salaryText } from "@/lib/format";
import type { JobDetail } from "@/lib/types";

type P = { params: Promise<{ slug: string }> };

function idFrom(slug: string): number | null {
  const m = /-(\d+)$/.exec(slug) ?? /^(\d+)$/.exec(slug);
  return m ? Number(m[1]) : null;
}

async function load(slug: string) {
  const id = idFrom(slug);
  if (!id) return null;
  return (await getJob(id))?.data ?? null;
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const job = await load((await params).slug);
  if (!job) return { title: "Job not found", robots: { index: false } };
  const loc = job.location.locality?.name ?? "Surat";
  return {
    title: `${job.title} – ${job.company}, ${loc}`,
    description: `${job.title} job in ${loc}, Surat. ${salaryText(job.salary)}. ${job.employment_type_label}. ${experienceText(job.experience)}. Apply free on SuratRojgar.`.slice(0, 300),
    alternates: { canonical: job.url },
    robots: job.is_active ? undefined : { index: false, follow: true },
    openGraph: { title: `${job.title} – ${job.company}`, description: job.excerpt, url: job.url, type: "website" },
  };
}

const UNIT: Record<string, string> = { monthly: "MONTH", annual: "YEAR", daily: "DAY", hourly: "HOUR" };
const EMP: Record<string, string> = { full_time: "FULL_TIME", permanent: "FULL_TIME", part_time: "PART_TIME", contract: "CONTRACTOR", freelance: "CONTRACTOR", temporary: "TEMPORARY", internship: "INTERN", daily_wage: "PER_DIEM", shift_based: "OTHER" };

/** Google JobPosting structured data. Uses only public fields: no phone, email or street address. */
function jobPostingLd(job: JobDetail) {
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org/", "@type": "JobPosting",
    title: job.title, description: job.description.replace(/\n/g, "<br>"),
    datePosted: job.posted_at, validThrough: job.expires_at ?? undefined,
    employmentType: EMP[job.employment_type] ?? "OTHER",
    hiringOrganization: { "@type": "Organization", name: job.company, sameAs: job.company_slug ? `${SITE_URL}/companies/${job.company_slug}` : undefined },
    jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: job.location.locality?.name ? `${job.location.locality.name}, Surat` : "Surat", addressRegion: "Gujarat", postalCode: job.location.pincode ?? undefined, addressCountry: "IN" } },
    totalJobOpenings: job.vacancies, directApply: true,
    identifier: { "@type": "PropertyValue", name: "SuratRojgar", value: String(job.id) },
  };
  if (job.work_mode === "remote" || job.work_mode === "work_from_home") {
    ld.jobLocationType = "TELECOMMUTE";
    ld.applicantLocationRequirements = { "@type": "Country", name: "India" };
  }
  if (job.salary.min || job.salary.max) {
    ld.baseSalary = { "@type": "MonetaryAmount", currency: job.salary.currency, value: { "@type": "QuantitativeValue", minValue: job.salary.min ?? undefined, maxValue: job.salary.max ?? undefined, unitText: UNIT[job.salary.period] ?? "MONTH" } };
  }
  if (job.education) ld.educationRequirements = { "@type": "EducationalOccupationalCredential", credentialCategory: job.education };
  if (job.experience.min) ld.experienceRequirements = { "@type": "OccupationalExperienceRequirements", monthsOfExperience: job.experience.min * 12 };
  else ld.experienceRequirements = "no requirements";
  if (job.skills_required.length) ld.skills = job.skills_required.join(", ");
  return ld;
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-0.5 text-sm font-semibold text-ink">{value}</dd></div>;
}

export default async function JobPage({ params }: P) {
  const { slug } = await params;
  const job = await load(slug);
  if (!job) notFound();
  if (`/jobs/${slug}` !== job.url) permanentRedirect(job.url);
  const similar = (await getSimilar(job.id))?.data ?? [];
  const loc = job.location.locality;
  const crumbs = [
    { name: "Home", url: "/" }, { name: "Jobs", url: "/jobs" },
    ...(job.category ? [{ name: job.category.name, url: `/jobs/category/${job.category.slug}` }] : []),
    { name: job.title, url: job.url },
  ];
  const crumbLd = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: SITE_URL + c.url })) };
  const ld = (o: unknown) => ({ __html: JSON.stringify(o).replace(/</g, "\\u003c") });

  return (
    <>
      {job.is_active && <script type="application/ld+json" dangerouslySetInnerHTML={ld(jobPostingLd(job))} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(crumbLd)} />
      <ViewBeacon jobId={job.id} />
      <div className="container-page pb-28 pt-4 sm:pt-6 lg:pb-12">
        <nav aria-label="Breadcrumb" className="mb-4 overflow-hidden text-sm text-slate-500">
          <ol className="flex items-center gap-1.5 whitespace-nowrap">
            {crumbs.slice(0, -1).map((c) => <li key={c.url} className="flex items-center gap-1.5"><Link href={c.url} className="hover:text-brand-700">{c.name}</Link><span aria-hidden="true">›</span></li>)}
            <li className="truncate text-slate-700" aria-current="page">{job.title}</li>
          </ol>
        </nav>

        {!job.is_active && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            This job is {job.status === "expired" ? "expired" : "closed"} and no longer accepts applications. <Link href="/jobs" className="font-semibold underline">See current jobs</Link>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0 space-y-5">
            <section className="card p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-1.5">
                {job.is_priority && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">★ Featured</span>}
                {job.category && <Link href={`/jobs/category/${job.category.slug}`} className="chip">{job.category.name}</Link>}
                {job.role && <Link href={`/jobs/role/${job.role.slug}`} className="chip bg-slate-100 text-slate-700">{job.role.name}</Link>}
              </div>
              <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight text-ink sm:text-3xl">{job.title}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[15px] font-semibold text-slate-700">
                {job.company_slug ? <Link href={`/companies/${job.company_slug}`} className="hover:text-brand-700">{job.company}</Link> : job.company}
                {job.company_verified && <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-xs font-bold text-accent-700">✔ Verified employer</span>}
              </p>
              <p className="mt-4 text-xl font-extrabold text-brand-700">{salaryText(job.salary)}</p>
              <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                <Fact label="Location" value={<>{loc ? <Link href={`/jobs/in/${loc.slug}`} className="hover:text-brand-700">{loc.name}</Link> : job.location.area ?? "Surat"}, Surat{job.location.pincode ? ` ${job.location.pincode}` : ""}</>} />
                <Fact label="Job type" value={job.employment_type_label} />
                <Fact label="Work mode" value={job.work_mode_label} />
                <Fact label="Experience" value={experienceText(job.experience)} />
                <Fact label="Education" value={job.education ?? "Any"} />
                <Fact label="Openings" value={job.vacancies} />
                <Fact label="Shift" value={job.shift ? job.shift.replace(/^\w/, (c) => c.toUpperCase()) : null} />
                <Fact label="Working days" value={job.working_days} />
                <Fact label="Working hours" value={job.working_hours} />
                <Fact label="Weekly off" value={job.weekly_off} />
                <Fact label="Joining" value={job.joining.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())} />
                <Fact label="Open to" value={job.gender_preference === "any" ? "Everyone" : job.gender_preference === "female" ? "Women" : "Men"} />
              </dl>
              <p className="mt-4 text-xs text-slate-500">Posted {dateIST(job.posted_at)}{job.expires_at ? ` · Apply before ${dateIST(job.expires_at)}` : ""} · Job ID {job.id}</p>
            </section>

            <section className="card p-5 sm:p-7">
              <h2 className="text-lg font-bold text-ink">Job description</h2>
              <div className="mt-3 whitespace-pre-line text-[15px] leading-7 text-slate-700">{job.description}</div>
              {(job.skills_required.length > 0 || job.skills_preferred.length > 0) && (
                <div className="mt-6 space-y-3">
                  {job.skills_required.length > 0 && <div><h3 className="text-sm font-bold text-ink">Required skills</h3><div className="mt-2 flex flex-wrap gap-1.5">{job.skills_required.map((s) => <span key={s} className="chip">{s}</span>)}</div></div>}
                  {job.skills_preferred.length > 0 && <div><h3 className="text-sm font-bold text-ink">Good to have</h3><div className="mt-2 flex flex-wrap gap-1.5">{job.skills_preferred.map((s) => <span key={s} className="chip bg-slate-100 text-slate-700">{s}</span>)}</div></div>}
                </div>
              )}
              {job.benefits && <div className="mt-6"><h3 className="text-sm font-bold text-ink">Benefits</h3><p className="mt-2 whitespace-pre-line text-[15px] leading-7 text-slate-700">{job.benefits}</p></div>}
            </section>

            {job.company_about && (
              <section className="card p-5 sm:p-7">
                <h2 className="text-lg font-bold text-ink">About {job.company}</h2>
                <p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-slate-700">{job.company_about}</p>
                {job.company_slug && <Link href={`/companies/${job.company_slug}`} className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">More jobs from this company →</Link>}
              </section>
            )}

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Stay safe</p>
              <p className="mt-1">SuratRojgar never charges job seekers. Never pay a registration, training or interview fee to anyone. <Link href={`/contact-us?report=${job.id}`} className="font-semibold underline">Report this job</Link></p>
            </section>
          </div>

          {/* Single actions panel: sticky sidebar on desktop, below the details on mobile (plus a sticky Apply bar). */}
          <aside className="lg:row-start-1 lg:col-start-2">
            <div className="card p-4 sm:p-5 lg:sticky lg:top-24">
              <JobActions job={job} />
            </div>
          </aside>
        </div>

        {similar.length > 0 && (
          <section className="mt-10" aria-labelledby="similar">
            <h2 id="similar" className="h-section mb-4">Similar jobs</h2>
            <StaticJobGrid jobs={similar.slice(0, 6)} />
          </section>
        )}
      </div>
      <MobileApplyBar active={job.is_active} />
    </>
  );
}
