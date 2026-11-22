"use client";

import { Shell, type NavItem } from "@/components/panel/Shell";

const NAV: NavItem[] = [
  { href: "/seeker", label: "Dashboard", icon: "home", exact: true },
  { href: "/seeker/profile", label: "My profile", icon: "user" },
  { href: "/seeker/resumes", label: "Resumes", icon: "file" },
  { href: "/seeker/applications", label: "My applications", icon: "send" },
  { href: "/seeker/saved", label: "Saved jobs", icon: "bookmark" },
  { href: "/jobs", label: "Find jobs", icon: "briefcase" },
  { href: "/seeker/notifications", label: "Notifications", icon: "bell" },
  { href: "/seeker/settings", label: "Settings", icon: "cog" },
];

export default function SeekerLayout({ children }: { children: React.ReactNode }) {
  return <Shell allow={["job_seeker"]} nav={NAV} title="Job seeker">{children}</Shell>;
}
