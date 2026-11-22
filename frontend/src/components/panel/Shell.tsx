"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { homeFor, useAuth } from "@/components/providers";
import { Logo } from "@/components/site/Logo";
import { PageLoader } from "@/components/ui";
import { api } from "@/lib/api";
import { cx } from "@/lib/format";
import type { SessionUser } from "@/lib/types";

export interface NavItem { href: string; label: string; icon: string; perm?: string; exact?: boolean }

const ICONS: Record<string, string> = {
  home: "M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0",
  file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Zm0 0v5h5",
  send: "m4 12 16-8-6 16-2-7-8-1Z",
  bookmark: "M6 3h12v18l-6-4-6 4V3Z",
  bell: "M15 17H5l1.4-1.4A2 2 0 0 0 7 14.2V11a5 5 0 0 1 10 0v3.2c0 .5.2 1 .6 1.4L19 17h-4Zm0 0v1a3 3 0 0 1-6 0v-1",
  cog: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2.2-1.3L14.3 3h-4l-.4 2.4a7.5 7.5 0 0 0-2.2 1.3l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.6l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2.2 1.3l.4 2.4h4l.4-2.4a7.5 7.5 0 0 0 2.2-1.3l2.4 1 2-3.4-2-1.6c.1-.4.1-.9.1-1.3Z",
  briefcase: "M3 8h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8Zm5 0V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3",
  plus: "M12 5v14M5 12h14",
  users: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 10a7 7 0 0 1 14 0m1-10a3 3 0 1 0 0-6m3 16a5 5 0 0 0-3-4.6",
  building: "M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16m0-10h4a1 1 0 0 1 1 1v9M8 8h3m-3 4h3m-3 4h3M2 21h20",
  chart: "M4 20V10m6 10V4m6 16v-7m4 7H2",
  star: "m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z",
  image: "M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9h.01",
  tag: "M3 12V4h8l10 10-8 8L3 12Zm5-4h.01",
  flag: "M5 21V4m0 0h11l-2 4 2 4H5",
  shield: "M12 3 4 6v6c0 4.4 3.4 8.4 8 9 4.6-.6 8-4.6 8-9V6l-8-3Z",
  log: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  db: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6m-16 6c0 1.7 3.6 3 8 3s8-1.3 8-3",
  tool: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5 2.5-2.5Z",
  inbox: "M3 13h5l1 3h6l1-3h5M5 5h14l2 8v6H3v-6l2-8Z",
};
export function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[name] ?? ICONS.home} /></svg>;
}

/** Dashboard frame used by all signed-in areas. The API enforces access; this only routes the UX. */
export function Shell({ allow, nav, title, children }: { allow: SessionUser["user_type"][]; nav: NavItem[]; title: string; children: ReactNode }) {
  const { user, loading, logout, can } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (!allow.includes(user.user_type)) router.replace(homeFor(user));
  }, [loading, user, allow, router, pathname]);
  useEffect(() => {
    if (!user) return;
    api.get<{ unread: number }>("notifications/unread-count").then((r) => setUnread(r.unread)).catch(() => {});
  }, [user, pathname]);

  if (loading || !user || !allow.includes(user.user_type)) return <div className="min-h-screen"><PageLoader /></div>;

  const items = nav.filter((n) => !n.perm || can(n.perm));
  const isActive = (n: NavItem) => (n.exact ? pathname === n.href : pathname === n.href || pathname.startsWith(n.href + "/"));
  const base = homeFor(user);

  const NavList = () => (
    <nav className="space-y-0.5" aria-label={`${title} navigation`}>
      {items.map((n) => (
        <Link key={n.href} href={n.href} aria-current={isActive(n) ? "page" : undefined}
          className={cx("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition", isActive(n) ? "bg-brand-600 text-white shadow-sm" : "text-slate-700 hover:bg-slate-100")}>
          <Icon name={n.icon} />
          <span className="flex-1">{n.label}</span>
          {n.icon === "bell" && unread > 0 && <span className={cx("rounded-full px-1.5 text-[11px] font-bold", isActive(n) ? "bg-white text-brand-700" : "bg-red-500 text-white")}>{unread > 99 ? "99+" : unread}</span>}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-slate-200 bg-white px-3 py-4 lg:flex">
        <div className="px-2"><Logo className="h-10 w-auto" /></div>
        <p className="mt-4 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
        <div className="mt-2 flex-1 overflow-y-auto"><NavList /></div>
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-3 px-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">{user.name.charAt(0).toUpperCase()}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{user.name}</p><p className="truncate text-xs text-slate-500">{user.email}</p></div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/" className="rounded-lg border border-slate-200 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50">View site</Link>
            <button onClick={() => logout()} className="rounded-lg border border-red-200 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">Logout</button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-700 hover:bg-slate-100" aria-label="Open menu">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <Logo className="h-8 w-auto" />
          <Link href={`${base}/notifications`} className="relative ml-auto rounded-full p-2 text-slate-600" aria-label="Notifications">
            <Icon name="bell" className="h-6 w-6" />
            {unread > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500" />}
          </Link>
        </header>
        {open && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
            <aside className="absolute inset-y-0 left-0 flex w-[84%] max-w-xs flex-col bg-white px-3 py-4 shadow-2xl">
              <div className="flex items-center justify-between px-2"><Logo className="h-9 w-auto" /><button onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-500" aria-label="Close menu">✕</button></div>
              <p className="mt-4 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
              <div className="mt-2 flex-1 overflow-y-auto"><NavList /></div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                <Link href="/" className="rounded-lg border border-slate-200 py-2.5 text-center text-sm font-semibold text-slate-700">View site</Link>
                <button onClick={() => logout()} className="rounded-lg border border-red-200 py-2.5 text-sm font-semibold text-red-600">Logout</button>
              </div>
            </aside>
          </div>
        )}
        <main id="main" className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Responsive table: horizontal scroll on small screens. */
export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>{head.map((h, i) => <th key={i} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">{children}</tbody>
        </table>
      </div>
      {empty}
    </div>
  );
}
