import type { Metadata } from "next";
import { H2, LegalPage } from "@/components/content/Legal";

export const metadata: Metadata = { title: "Cookie Policy", description: "The few cookies SuratRojgar uses and why.", alternates: { canonical: "/cookie-policy" } };

const COOKIES = [
  ["sr_session", "Keeps you signed in. It cannot be read by page scripts.", "Until you log out, or 7 days (12 hours for admin accounts)"],
  ["sr_role", "Remembers whether you are a job seeker, employer or admin so the right menu shows. Holds no personal data.", "Same as sr_session"],
];

export default function Page() {
  return (
    <LegalPage title="Cookie Policy" updated="22 November 2026">
      <p>SuratRojgar uses only the cookies needed for the site to work. We do <strong>not</strong> use advertising, social media or third-party tracking cookies, so we do not show a cookie consent banner.</p>
      <H2>Cookies we set</H2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-slate-200 text-slate-500"><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Purpose</th><th className="py-2">Duration</th></tr></thead>
          <tbody>{COOKIES.map(([n, p, d]) => <tr key={n} className="border-b border-slate-100 align-top"><td className="py-2 pr-4 font-mono">{n}</td><td className="py-2 pr-4">{p}</td><td className="py-2">{d}</td></tr>)}</tbody>
        </table>
      </div>
      <H2>Visitor statistics</H2>
      <p>We count visits without cookies. See the Privacy Policy for how this works.</p>
      <H2>Your choices</H2>
      <p>You can block or delete cookies in your browser settings. If you block the cookies above, you will not be able to log in.</p>
    </LegalPage>
  );
}
