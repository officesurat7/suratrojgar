import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactForm } from "@/components/content/ContactForm";
import { getMeta } from "@/lib/api-server";

export const metadata: Metadata = { title: "Grievance Officer", description: "Contact SuratRojgar's Grievance Officer about your personal data or a decision we made.", alternates: { canonical: "/grievance" } };
export const revalidate = 3600;

export default async function Page() {
  const s = (await getMeta())?.settings ?? {};
  return (
    <div className="container-page max-w-3xl py-8 sm:py-12">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Grievance Officer</h1>
      <p className="mt-2 text-slate-600">Under the Digital Personal Data Protection Act, 2023 and the IT Rules, 2021, you can raise a grievance about how we handle your personal data or about content on SuratRojgar. We acknowledge grievances quickly and aim to resolve them within the time limits set by law.</p>
      <div className="card mt-6 p-5 text-sm">
        <p className="font-bold text-ink">{String(s.grievance_officer_name ?? "Grievance Officer")}</p>
        {s.grievance_officer_email ? <p className="mt-1">Email: <a href={`mailto:${s.grievance_officer_email}`} className="font-semibold text-brand-700">{String(s.grievance_officer_email)}</a></p> : null}
        {s.office_address ? <p className="mt-1 text-slate-600">{String(s.office_address)}</p> : null}
      </div>
      <h2 className="mt-8 text-lg font-bold text-ink">Raise a grievance</h2>
      <div className="card mt-3 p-5 sm:p-6"><Suspense><ContactForm fixedType="grievance" /></Suspense></div>
      <p className="mt-4 text-sm text-slate-500">If you are not satisfied with our response, you may approach the Data Protection Board of India.</p>
    </div>
  );
}
