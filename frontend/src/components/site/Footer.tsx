import Link from "next/link";
import { Logo } from "./Logo";

const POPULAR = ["adajan", "varachha", "vesu", "katargam", "udhna", "sachin", "pandesara", "athwa"];
const label = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function Footer() {
  return (
    <footer className="mt-16 bg-night text-slate-300">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo variant="dark" className="h-11 w-auto" />
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
            SuratRojgar connects job seekers with employers across Surat: textile units, diamond workshops, shops, offices, factories and households.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-white/10 px-3 py-1">🔒 Contact details protected</span>
            <span className="rounded-full bg-white/10 px-3 py-1">✔ Verified employers</span>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-white">Job seekers</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/jobs" className="hover:text-white">Browse all jobs</Link></li>
            <li><Link href="/jobs/search" className="hover:text-white">Advanced search</Link></li>
            <li><Link href="/jobs/type/fresher" className="hover:text-white">Fresher jobs</Link></li>
            <li><Link href="/jobs/type/part-time" className="hover:text-white">Part-time jobs</Link></li>
            <li><Link href="/jobs/type/work-from-home" className="hover:text-white">Work from home</Link></li>
            <li><Link href="/register/job-seeker" className="hover:text-white">Create free profile</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-white">Employers</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/employer/jobs/new" className="hover:text-white">Post a job</Link></li>
            <li><Link href="/register/employer" className="hover:text-white">Employer registration</Link></li>
            <li><Link href="/login?as=employer" className="hover:text-white">Employer login</Link></li>
            <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
            <li><Link href="/contact-us" className="hover:text-white">Contact support</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-white">Jobs by area</h3>
          <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm lg:grid-cols-1">
            {POPULAR.map((s) => <li key={s}><Link href={`/jobs/in/${s}`} className="hover:text-white">Jobs in {label(s)}</Link></li>)}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} SuratRojgar. Made for Surat, Gujarat.</p>
          <nav className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Legal">
            <Link href="/about-us" className="hover:text-white">About</Link>
            <Link href="/privacy-policy" className="hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/refund-policy" className="hover:text-white">Refund Policy</Link>
            <Link href="/cookie-policy" className="hover:text-white">Cookies</Link>
            <Link href="/grievance" className="hover:text-white">Grievance Officer</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
