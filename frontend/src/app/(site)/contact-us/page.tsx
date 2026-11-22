import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ContactForm } from "@/components/content/ContactForm";
import { getMeta } from "@/lib/api-server";

export const metadata: Metadata = { title: "Contact Us", description: "Contact SuratRojgar for help, to report a suspicious job or employer, or to raise a privacy grievance.", alternates: { canonical: "/contact-us" } };
export const revalidate = 3600;

export default async function Page() {
  const s = (await getMeta())?.settings ?? {};
  return (
    <div className="container-page py-8 sm:py-12">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Contact us</h1>
      <p className="mt-2 max-w-2xl text-slate-600">Ask a question, report a fake or suspicious job, or tell us about a problem. You&apos;ll get a ticket number and a reply by email.</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="card p-5 sm:p-6"><Suspense><ContactForm /></Suspense></div>
        <aside className="space-y-4">
          <div className="card p-5 text-sm">
            <h2 className="font-bold text-ink">Reach us</h2>
            <dl className="mt-3 space-y-3">
              {s.support_email ? <div><dt className="text-xs text-slate-500">Email</dt><dd><a href={`mailto:${s.support_email}`} className="font-semibold text-brand-700">{String(s.support_email)}</a></dd></div> : null}
              {s.support_phone ? <div><dt className="text-xs text-slate-500">Phone</dt><dd><a href={`tel:${String(s.support_phone).replace(/\s/g, "")}`} className="font-semibold text-brand-700">{String(s.support_phone)}</a></dd></div> : null}
              {s.office_address ? <div><dt className="text-xs text-slate-500">Office</dt><dd>{String(s.office_address)}</dd></div> : null}
            </dl>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><strong>Asked to pay for a job?</strong> Don&apos;t pay. SuratRojgar and genuine employers never charge job seekers. Report it here and we&apos;ll investigate.</div>
          <div className="card p-5 text-sm"><h2 className="font-bold text-ink">Privacy requests</h2><p className="mt-1 text-slate-600">To correct or delete your data, use <em>Settings → Privacy</em> in your dashboard, or write to our <Link href="/grievance" className="font-semibold text-brand-700">Grievance Officer</Link>.</p></div>
        </aside>
      </div>
    </div>
  );
}
