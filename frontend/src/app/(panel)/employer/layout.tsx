"use client";

import Link from "next/link";
import { Shell, type NavItem } from "@/components/panel/Shell";
import { useAuth } from "@/components/providers";

const NAV: NavItem[] = [
  { href: "/employer", label: "Dashboard", icon: "home", exact: true },
  { href: "/employer/jobs/new", label: "Post a job", icon: "plus", exact: true },
  { href: "/employer/jobs", label: "My jobs", icon: "briefcase" },
  { href: "/employer/applications", label: "Applications", icon: "inbox" },
  { href: "/employer/profile", label: "Company profile", icon: "building" },
  { href: "/employer/notifications", label: "Notifications", icon: "bell" },
  { href: "/employer/settings", label: "Settings", icon: "cog" },
];

function PendingBanner() {
  const { user } = useAuth();
  if (!user || user.employer?.verified) return null;
  return (
    <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <strong>Verification pending.</strong> Our team is verifying your business (usually within 1 working day). You can complete your <Link href="/employer/profile" className="font-semibold underline">company profile</Link> and save job drafts; jobs go live after verification.
    </div>
  );
}

export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  return <Shell allow={["employer"]} nav={NAV} title="Employer"><PendingBanner />{children}</Shell>;
}
