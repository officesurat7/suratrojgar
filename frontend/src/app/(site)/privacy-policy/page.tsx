import type { Metadata } from "next";
import Link from "next/link";
import { H2, LegalPage } from "@/components/content/Legal";
import { getMeta } from "@/lib/api-server";

export const metadata: Metadata = { title: "Privacy Policy", description: "How SuratRojgar collects, uses, shares and protects your personal data under India's Digital Personal Data Protection Act, 2023.", alternates: { canonical: "/privacy-policy" } };
export const revalidate = 3600;

export default async function Page() {
  const s = (await getMeta())?.settings ?? {};
  return (
    <LegalPage title="Privacy Policy" updated="22 November 2026">
      <p>SuratRojgar (&quot;we&quot;, &quot;us&quot;) runs a job portal for Surat, Gujarat. This policy explains what personal data we collect, why, who sees it and the rights you have under the Digital Personal Data Protection Act, 2023 (&quot;DPDP Act&quot;). We are the Data Fiduciary for the data described here.</p>

      <H2>1. Data we collect</H2>
      <ul>
        <li><strong>Job seekers:</strong> name, email, mobile number, password (stored only as a one-way hash), area and PIN code, education, experience, skills, preferred jobs, expected salary, and optionally gender, date of birth, a short &quot;about&quot; text and resumes you upload.</li>
        <li><strong>Employers:</strong> company name, contact person, email, mobile, business type, address, optional GSTIN, website and logo, and the jobs you post (including contact details for each job).</li>
        <li><strong>Applications:</strong> which jobs you applied to, the resume and answers you sent, cover letters, and status changes.</li>
        <li><strong>Security records:</strong> login attempts (time, IP address, browser), one-time codes (stored hashed and expiring), and an audit log of sensitive actions such as viewing an employer&apos;s contact details.</li>
        <li><strong>Visitor statistics:</strong> pages viewed, device type, browser and the website that referred you. We do not store your IP address for statistics: we keep only a one-way code that changes every day, so we can count visits without identifying you. We do not use advertising or tracking cookies, and we honour &quot;Do Not Track&quot; and &quot;Global Privacy Control&quot; signals.</li>
      </ul>

      <H2>2. Why we use it</H2>
      <ul>
        <li>To create and secure your account, including verifying your email with a one-time code.</li>
        <li>To show jobs, let you apply, and send you emails about your applications and account.</li>
        <li>To let employers post jobs and review the people who apply to them.</li>
        <li>To prevent fraud, fake jobs and misuse, and to keep records the law requires.</li>
        <li>To understand, in aggregate, how the site is used so we can improve it.</li>
      </ul>
      <p>We rely on your consent, which you give when you register, and on the legitimate uses the DPDP Act allows, such as complying with law. You can withdraw consent at any time (see section 6). Withdrawing does not affect processing that already took place.</p>

      <H2>3. Who can see your data</H2>
      <ul>
        <li><strong>Employers you apply to</strong> see your profile, the resume you chose and your contact details, for that application only. Employers cannot browse your contact details unless you apply to them.</li>
        <li><strong>Job seekers</strong> can see an employer&apos;s phone number or address for a job only after logging in with a verified account, and only if the employer has allowed it. Every such view is logged and limited per day to prevent misuse. Employer contact details are never shown publicly.</li>
        <li><strong>Our staff</strong> can see data only for the sections their role allows, and their access is logged.</li>
        <li><strong>Service providers</strong> who host the site and send our emails process data on our behalf under contract.</li>
        <li><strong>Authorities</strong>, when Indian law requires us to share it.</li>
      </ul>
      <p>We do not sell your personal data.</p>

      <H2>4. How long we keep it</H2>
      <p>We keep account data while your account is active. If you ask us to delete your account, we erase your personal data after processing your request, except records we must keep by law. Visitor statistics are currently kept for about 6 months and login history for about 12 months, after which they are deleted automatically. Database backups are kept for a short period (currently 14 days) and then overwritten.</p>

      <H2>5. Security</H2>
      <p>We use encrypted connections (HTTPS), hashed passwords and codes, sign-in tokens that page scripts cannot read, role-based access, rate limits and audit logs. Resumes are stored privately and opened only through short-lived links. No system is completely secure, so if we learn of a breach affecting your data we will inform you and the Data Protection Board of India as the law requires.</p>

      <H2>6. Your rights</H2>
      <ul>
        <li><strong>Access and correction:</strong> you can view and edit most of your data in your dashboard. For anything you cannot change yourself, ask for a correction from <em>Settings → Privacy</em>.</li>
        <li><strong>Erasure:</strong> you can ask us to delete your account and personal data from <em>Settings → Privacy</em>.</li>
        <li><strong>Withdraw consent:</strong> you can deactivate your account or request deletion at any time.</li>
        <li><strong>Grievance:</strong> you can complain to our Grievance Officer (below). If you are not satisfied, you may approach the Data Protection Board of India.</li>
        <li><strong>Nominate:</strong> you may nominate someone to exercise these rights if you die or become unable to; write to the Grievance Officer.</li>
      </ul>

      <H2>7. Children</H2>
      <p>SuratRojgar is meant for people aged 18 and over. We do not knowingly register children. If you believe a child has registered, contact us and we will delete the account.</p>

      <H2>8. Grievance Officer</H2>
      <p>{String(s.grievance_officer_name ?? "Grievance Officer")}<br />Email: <a href={`mailto:${s.grievance_officer_email ?? ""}`}>{String(s.grievance_officer_email ?? "")}</a><br />{String(s.office_address ?? "Surat, Gujarat")}<br />You can also use the <Link href="/grievance">grievance form</Link>.</p>

      <H2>9. Changes</H2>
      <p>If we change this policy in a way that affects how we use your data, we will tell you by email or on the site before the change takes effect.</p>
    </LegalPage>
  );
}
