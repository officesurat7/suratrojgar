import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "FAQ", description: "Answers to common questions about finding jobs and hiring on SuratRojgar.", alternates: { canonical: "/faq" } };

const FAQ: { group: string; items: [string, string][] }[] = [
  { group: "Job seekers", items: [
    ["Is SuratRojgar free?", "Yes. Registering, applying and getting a job are completely free for job seekers."],
    ["Do I need a resume to apply?", "No, but it helps. You can upload up to a few PDF or Word resumes and choose which one to send with each application."],
    ["How do I know what happened to my application?", "Every application gets an ID. You can see its status (for example Shortlisted or Interview Scheduled) in your dashboard, and we email you when it changes."],
    ["Why can't I see the employer's phone number?", "To stop misuse, employer contact details are shown only to logged-in job seekers with a verified email, and only if the employer allows it."],
    ["An employer asked me for money. What should I do?", "Do not pay. Report the job using the link on the job page or the Contact page. Genuine employers never charge job seekers."],
  ] },
  { group: "Employers", items: [
    ["How do I post a job?", "Register as an employer, verify your email and post jobs from your dashboard. Your jobs go live once our team has checked your business."],
    ["Why is my job pending?", "Jobs may be reviewed before they go live to keep fake postings off the site. You get an email when your job is approved or if changes are needed."],
    ["Can I hide my phone number?", "Yes. For each job you choose whether job seekers can see your contact details. Your street address is never shown publicly."],
    ["How long does a job stay live?", "Jobs expire automatically after the period you choose (30 days by default). You can extend or close a job from your dashboard."],
  ] },
  { group: "Account and privacy", items: [
    ["I forgot my password.", "Use Forgot password on the login page. We email you a 6-digit code to set a new one."],
    ["How do I delete my account?", "Go to Settings → Privacy in your dashboard and request deletion. You can also deactivate your account there."],
  ] },
];

export default function Page() {
  const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.flatMap((g) => g.items.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } }))) };
  return (
    <div className="container-page max-w-3xl py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Frequently asked questions</h1>
      {FAQ.map((g) => (
        <section key={g.group} className="mt-8">
          <h2 className="text-lg font-bold text-ink">{g.group}</h2>
          <div className="mt-3 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {g.items.map(([q, a]) => (
              <details key={q} className="group px-4 py-3 sm:px-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-ink">{q}<span className="text-slate-400 transition group-open:rotate-45">+</span></summary>
                <p className="mt-2 text-sm text-slate-600">{a}</p>
              </details>
            ))}
          </div>
        </section>
      ))}
      <p className="mt-8 text-sm text-slate-600">Still stuck? <Link href="/contact-us" className="font-semibold text-brand-700">Contact us</Link>.</p>
    </div>
  );
}
