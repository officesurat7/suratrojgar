import type { Metadata } from "next";
import Link from "next/link";
import { H2, LegalPage } from "@/components/content/Legal";

export const metadata: Metadata = { title: "Terms of Use", description: "The rules for using SuratRojgar as a job seeker or employer.", alternates: { canonical: "/terms" } };

export default function Page() {
  return (
    <LegalPage title="Terms of Use" updated="22 November 2026">
      <p>By creating an account or using SuratRojgar you agree to these terms. If you do not agree, please do not use the site.</p>
      <H2>1. Who can use SuratRojgar</H2>
      <p>You must be at least 18 years old and able to enter a contract under Indian law. Employers must be genuine businesses or individuals hiring for real jobs.</p>
      <H2>2. Your account</H2>
      <ul>
        <li>Give true and current information, and keep your password and email account secure.</li>
        <li>One person or business per account. You are responsible for what happens under your account.</li>
        <li>We may suspend or block accounts that break these terms, with a reason shown in the notice we send.</li>
      </ul>
      <H2>3. Rules for employers</H2>
      <ul>
        <li>Post only real, current vacancies with honest salary, location and job details.</li>
        <li><strong>Never ask candidates for money</strong>, including registration, training, uniform or security-deposit fees.</li>
        <li>Do not post discriminatory requirements that the law does not allow.</li>
        <li>Use candidates&apos; data only to assess them for the job they applied to, and delete it when no longer needed.</li>
        <li>Jobs may need approval before they go live, and we may edit, pause or remove any job.</li>
      </ul>
      <H2>4. Rules for job seekers</H2>
      <ul>
        <li>Apply only to jobs you are genuinely interested in, with truthful information and documents.</li>
        <li>Use employer contact details only to ask about the job. Collecting or reselling them is not allowed.</li>
      </ul>
      <H2>5. What we are and are not</H2>
      <p>SuratRojgar is a platform that connects job seekers and employers. We are not the employer, we do not guarantee a job or a candidate, and we are not a party to any job offer or employment contract. We check employers where we can, but you should still verify any employer before sharing documents or visiting. Report anything suspicious on the <Link href="/contact-us">Contact page</Link>.</p>
      <H2>6. Prohibited use</H2>
      <p>Do not scrape the site, try to access accounts or data that are not yours, test our security without written permission, upload malware, or use the site for spam or fraud.</p>
      <H2>7. Content</H2>
      <p>You keep ownership of what you post, and you give us permission to display it on SuratRojgar for the purpose of the service. You must have the right to post it.</p>
      <H2>8. Liability</H2>
      <p>To the extent the law allows, SuratRojgar is not liable for losses arising from dealings between job seekers and employers, or from the service being temporarily unavailable. Nothing in these terms limits rights you have under Indian consumer law.</p>
      <H2>9. Law and disputes</H2>
      <p>These terms are governed by the laws of India. Courts in Surat, Gujarat have jurisdiction, subject to any rights you have to approach consumer forums.</p>
      <H2>10. Changes</H2>
      <p>We may update these terms. We will give notice of material changes on the site or by email.</p>
    </LegalPage>
  );
}
