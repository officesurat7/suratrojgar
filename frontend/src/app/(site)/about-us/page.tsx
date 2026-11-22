import type { Metadata } from "next";
import Link from "next/link";
import { getMeta } from "@/lib/api-server";

export const metadata: Metadata = { title: "About Us", description: "SuratRojgar is a job portal only for Surat: local jobs from verified Surat employers, free for job seekers.", alternates: { canonical: "/about-us" } };
export const revalidate = 3600;

const POINTS = [
  ["📍", "Only Surat", "Every job is in Surat, sorted by area from Adajan to Udhna, so you can find work close to home."],
  ["✅", "Checked employers", "We review employers and job posts before they go live, and remove anything suspicious."],
  ["🆓", "Free for job seekers", "No registration fee, no agent. Employers are not allowed to ask you for money."],
  ["🔒", "Your data is protected", "Employers see your details only when you apply. Employer phone numbers are shown only to verified job seekers."],
];

export default async function Page() {
  const meta = await getMeta();
  return (
    <div className="container-page py-8 sm:py-12">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-4xl">Jobs in Surat, for people in Surat</h1>
        <p className="mt-4 text-lg text-slate-600">SuratRojgar connects job seekers with employers across Surat: textile and diamond units, shops and showrooms, offices, factories, hospitals, IT companies and more. We focus on one city so every job is local and every employer is reachable.</p>
      </div>
      {meta?.stats && (
        <div className="mt-8 grid max-w-xl grid-cols-2 gap-3">
          <div className="card p-4"><p className="text-2xl font-extrabold text-brand-700">{meta.stats.active_jobs.toLocaleString("en-IN")}</p><p className="text-sm text-slate-600">open jobs right now</p></div>
          <div className="card p-4"><p className="text-2xl font-extrabold text-brand-700">{meta.localities.length}</p><p className="text-sm text-slate-600">Surat areas covered</p></div>
        </div>
      )}
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {POINTS.map(([i, t, d]) => <div key={t} className="card p-5"><p className="text-2xl">{i}</p><h2 className="mt-2 font-bold text-ink">{t}</h2><p className="mt-1 text-sm text-slate-600">{d}</p></div>)}
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/register/job-seeker" className="rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700">Find a job</Link>
        <Link href="/register/employer" className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-ink hover:bg-slate-50">Hire in Surat</Link>
      </div>
    </div>
  );
}
