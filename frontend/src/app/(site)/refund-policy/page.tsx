import type { Metadata } from "next";
import { H2, LegalPage } from "@/components/content/Legal";

export const metadata: Metadata = { title: "Refund Policy", description: "SuratRojgar is free for job seekers. Refund terms for any future paid employer services.", alternates: { canonical: "/refund-policy" } };

export default function Page() {
  return (
    <LegalPage title="Refund Policy" updated="22 November 2026">
      <H2>Job seekers</H2>
      <p>SuratRojgar is <strong>free for job seekers</strong>. We never charge you to register, apply or get a job, and no employer on SuratRojgar is allowed to ask you for money. If anyone asks you to pay for a job, do not pay and report it to us.</p>
      <H2>Employers</H2>
      <p>Posting jobs on SuratRojgar is currently free. We do not take any payments on the site at the moment.</p>
      <p>If we introduce paid services for employers (for example, featured job listings), this policy will be updated before they launch with the price, what is included, and when and how refunds are given. Any refund will go back to the original payment method.</p>
    </LegalPage>
  );
}
