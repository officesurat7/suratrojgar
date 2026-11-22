"use client";

import Link from "next/link";
import { experienceText, salaryText, timeAgo } from "@/lib/format";
import type { JobCard as Job } from "@/lib/types";

const ICON = "h-4 w-4 shrink-0 text-slate-400";

export function JobCard({ job, saved, applied, onToggleSave }: { job: Job; saved?: boolean; applied?: boolean; onToggleSave?: (job: Job) => void }) {
  const isNew = job.posted_at && Date.now() - new Date(job.posted_at).getTime() < 86400000 * 2;
  return (
    <article className={`card group relative flex h-full flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-lg sm:p-5 ${job.is_priority ? "ring-2 ring-brand-200" : ""}`}>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {job.is_priority && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">★ Featured</span>}
        {isNew && <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-accent-700">New</span>}
        {job.category && <span className="truncate text-xs font-medium text-slate-500">{job.category.name}</span>}
      </div>
      <h3 className="text-[17px] font-bold leading-snug text-ink">
        <Link href={job.url} className="after:absolute after:inset-0 hover:text-brand-700">{job.title}</Link>
      </h3>
      <p className="mt-1 flex items-center gap-1 text-sm font-medium text-slate-600">
        <span className="truncate">{job.company}</span>
        {job.company_verified && <span title="Verified employer" className="text-accent-600">✔</span>}
      </p>
      {job.role && <p className="mt-0.5 text-xs text-slate-500">Role: {job.role.name}</p>}

      <p className="mt-3 text-[15px] font-bold text-brand-700">{salaryText(job.salary)}</p>

      <ul className="mt-3 grid grid-cols-1 gap-x-3 gap-y-1.5 text-[13px] text-slate-600 min-[420px]:grid-cols-2">
        <li className="flex items-center gap-1.5"><svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg><span className="truncate">{job.location.locality?.name ?? job.location.area ?? "Surat"}, {job.location.city}</span></li>
        <li className="flex items-center gap-1.5"><svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>{job.employment_type_label}{job.work_mode !== "onsite" ? ` · ${job.work_mode_label}` : ""}</li>
        <li className="flex items-center gap-1.5"><svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 8v4l3 2" /><circle cx="12" cy="12" r="9" /></svg>{experienceText(job.experience)}</li>
        <li className="flex items-center gap-1.5"><svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m3 9 9-5 9 5-9 5-9-5Z" /><path d="M7 11.5V16c0 1 2.2 2.5 5 2.5s5-1.5 5-2.5v-4.5" /></svg><span className="truncate">{job.education ?? "Any qualification"}</span></li>
      </ul>

      <p className="mt-3 line-clamp-2 text-[13px] leading-5 text-slate-500">{job.excerpt}</p>

      <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs text-slate-500">
        <span>{job.vacancies} {job.vacancies === 1 ? "opening" : "openings"} · {timeAgo(job.posted_at)}</span>
      </div>
      <div className="relative z-10 mt-3 grid grid-cols-[1fr_auto] gap-2">
        {applied ? (
          <span className="flex items-center justify-center rounded-xl bg-accent-50 px-3 py-2.5 text-sm font-semibold text-accent-700">✓ Applied</span>
        ) : (
          <Link href={`${job.url}#apply`} className="rounded-xl bg-brand-600 px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-700">Apply Now</Link>
        )}
        <button type="button" onClick={() => onToggleSave?.(job)} aria-pressed={!!saved} aria-label={saved ? "Remove from saved jobs" : "Save job"}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${saved ? "border-brand-200 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}><path d="M6 3h12v18l-6-4-6 4V3Z" /></svg>
          <span className="hidden min-[380px]:inline">{saved ? "Saved" : "Save"}</span>
        </button>
      </div>
    </article>
  );
}

export function JobCardSkeleton() {
  return (
    <div className="card animate-pulse p-5">
      <div className="h-3 w-24 rounded bg-slate-200" />
      <div className="mt-3 h-5 w-3/4 rounded bg-slate-200" />
      <div className="mt-2 h-4 w-1/2 rounded bg-slate-100" />
      <div className="mt-4 h-4 w-1/3 rounded bg-slate-200" />
      <div className="mt-4 grid grid-cols-2 gap-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-3 rounded bg-slate-100" />)}</div>
      <div className="mt-6 h-10 rounded-xl bg-slate-100" />
    </div>
  );
}
