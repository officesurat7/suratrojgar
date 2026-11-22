import Link from "next/link";
import type { ReactNode } from "react";

/** Wrapper for policy pages. Every policy is a draft until a qualified lawyer has reviewed it. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="container-page max-w-3xl py-8 sm:py-12">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">Last updated: {updated}</p>
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        This document is a working draft written to match how SuratRojgar actually works. It must be reviewed by a qualified lawyer before the site goes live.
      </div>
      <article className="prose-legal mt-6">{children}</article>
      <p className="mt-10 border-t border-slate-200 pt-4 text-sm text-slate-500">Questions? See <Link href="/contact-us" className="font-semibold text-brand-700">Contact us</Link> or write to our <Link href="/grievance" className="font-semibold text-brand-700">Grievance Officer</Link>.</p>
    </div>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="mt-8 text-lg font-bold text-ink">{children}</h2>;
}
