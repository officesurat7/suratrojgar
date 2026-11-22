import type { NavItem } from "./Shell";

/** One navigation for Admin, Admin Staff and Super Admin. Items are filtered by the user's permissions. */
export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "home", exact: true, perm: "stats.view" },
  { href: "/admin/jobs", label: "Jobs", icon: "briefcase", perm: "jobs.view" },
  { href: "/admin/featured", label: "Priority jobs (1–30)", icon: "star", perm: "jobs.feature" },
  { href: "/admin/employers", label: "Employers", icon: "building", perm: "employers.view" },
  { href: "/admin/candidates", label: "Candidates", icon: "users", perm: "job_seekers.view" },
  { href: "/admin/applications", label: "Applications", icon: "inbox", perm: "applications.view" },
  { href: "/admin/reports", label: "Reports", icon: "chart", perm: "reports.view" },
  { href: "/admin/analytics", label: "Visitor analytics", icon: "chart", perm: "reports.view" },
  { href: "/admin/sliders", label: "Homepage slider", icon: "image", perm: "sliders.manage" },
  { href: "/admin/taxonomy", label: "Categories & areas", icon: "tag", perm: "categories.manage" },
  { href: "/admin/complaints", label: "Complaints", icon: "flag", perm: "complaints.manage" },
  { href: "/admin/data-requests", label: "Data requests", icon: "shield", perm: "data_requests.manage" },
  { href: "/admin/staff", label: "Staff & admins", icon: "users", perm: "staff.manage" },
  { href: "/admin/audit", label: "Audit log", icon: "log", perm: "audit.view" },
  { href: "/super-admin/settings", label: "Site settings", icon: "tool", perm: "settings.manage" },
  { href: "/super-admin/logs", label: "System & security logs", icon: "log", perm: "logs.view" },
  { href: "/super-admin/backups", label: "Backups", icon: "db", perm: "backups.manage" },
  { href: "/admin/notifications", label: "Notifications", icon: "bell" },
  { href: "/admin/settings", label: "My account", icon: "cog" },
];
