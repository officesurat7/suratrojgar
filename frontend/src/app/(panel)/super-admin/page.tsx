"use client";

import Link from "next/link";
import { PageHeader } from "@/components/panel/Shell";
import { useApi } from "@/components/providers";
import { Alert, Card, StatCard } from "@/components/ui";
import { timeAgo } from "@/lib/format";

export default function SuperAdminHome() {
  const { data: s } = useApi<{ data: Record<string, Record<string, string | number | boolean>>; environment: Record<string, string | boolean> }>("super/settings");
  const { data: b } = useApi<{ writable: boolean; data: { created_at: string }[] }>("super/backups");
  const { data: sec } = useApi<{ failed_by_ip_24h: { ip: string; c: number }[] }>("super/logs/security");
  const failed = sec?.failed_by_ip_24h.reduce((n, r) => n + r.c, 0) ?? 0;
  const maint = s?.data.general?.maintenance_mode;
  const env = s?.environment;
  const links = [
    ["/admin", "Admin dashboard", "Stats, jobs, employers, candidates"],
    ["/super-admin/settings", "Site settings", "Approval mode, OTP, limits, retention, maintenance"],
    ["/admin/staff", "Admins & staff", "Create Admins and Staff, set permissions"],
    ["/super-admin/logs", "Security logs", "Logins, failed attempts, contact views"],
    ["/super-admin/backups", "Backups", "Daily MySQL backups"],
    ["/admin/audit", "Audit log", "Every admin action"],
  ];
  return (
    <>
      <PageHeader title="Super Admin" subtitle="Platform health and controls." />
      <div className="mb-4 space-y-2">
        {maint && <Alert tone="red" title="Maintenance mode is ON">Visitors can&apos;t use the site. Turn it off in <Link href="/super-admin/settings" className="font-semibold underline">Site settings</Link>.</Alert>}
        {env?.mail_mailer === "log" && <Alert tone="amber">Emails are only written to the log, not sent. Configure SMTP in the server&apos;s .env before launch.</Alert>}
        {env?.app_env === "production" && env.app_debug && <Alert tone="red">Debug mode is on in production.</Alert>}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Environment" value={String(env?.app_env ?? "…")} hint={env ? `Laravel ${env.laravel} · PHP ${env.php}` : undefined} />
        <StatCard label="Last backup" value={b?.data[0] ? timeAgo(b.data[0].created_at) : b ? "Never" : "…"} tone={b && !b.data[0] ? "amber" : "brand"} href="/super-admin/backups" />
        <StatCard label="Failed logins (24 h)" value={sec ? failed : "…"} tone={failed > 50 ? "amber" : "brand"} href="/super-admin/logs" />
        <StatCard label="Maintenance" value={s ? (maint ? "ON" : "Off") : "…"} tone={maint ? "amber" : "brand"} href="/super-admin/settings" />
      </div>
      <Card title="Controls" className="mt-5" bodyClass="p-0">
        <ul className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-y-0">
          {links.map(([href, t, d]) => <li key={href}><Link href={href} className="block px-4 py-3 hover:bg-slate-50"><p className="font-semibold text-ink">{t}</p><p className="text-sm text-slate-500">{d}</p></Link></li>)}
        </ul>
      </Card>
    </>
  );
}
