"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { homeFor, useAuth } from "@/components/providers";
import { api } from "@/lib/api";
import { cx } from "@/lib/format";
import { Logo } from "./Logo";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/jobs", label: "Jobs" },
  { href: "/jobs/search", label: "Search Jobs" },
  { href: "/apply", label: "Apply for Jobs" },
  { href: "/employer/jobs/new", label: "Post a Job" },
  { href: "/about-us", label: "About Us", wide: true },
  { href: "/contact-us", label: "Contact Us", wide: true },
];

function useClickAway(cb: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cb(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [cb]);
  return ref;
}

export function Header() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [reg, setReg] = useState(false);
  const [menu, setMenu] = useState(false);
  const [more, setMore] = useState(false);
  const [unread, setUnread] = useState(0);
  const regRef = useClickAway(() => setReg(false));
  const menuRef = useClickAway(() => setMenu(false));
  const moreRef = useClickAway(() => setMore(false));

  useEffect(() => { setOpen(false); setMenu(false); setReg(false); setMore(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  useEffect(() => {
    if (!user) return;
    api.get<{ unread: number }>("notifications/unread-count").then((r) => setUnread(r.unread)).catch(() => {});
  }, [user, pathname]);

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname === href || (href !== "/jobs" && pathname.startsWith(href + "/")) || (href === "/jobs" && pathname === "/jobs"));
  const dash = homeFor(user);
  const notifHref = user ? `${dash}/notifications` : "/login";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="container-page flex h-16 items-center gap-3 sm:h-[72px]">
        <Logo className="h-9 w-auto sm:h-11" />

        {/* Desktop navigation */}
        <nav className="ml-4 hidden flex-1 items-center gap-0.5 lg:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={cx("rounded-lg px-2.5 py-2 text-[14px] font-semibold transition xl:px-3", n.wide && "hidden xl:block", active(n.href) ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-100 hover:text-ink")}>
              {n.label}
            </Link>
          ))}
          <div className="relative xl:hidden" ref={moreRef}>
            <button onClick={() => setMore(!more)} className="rounded-lg px-2.5 py-2 text-[14px] font-semibold text-slate-700 hover:bg-slate-100" aria-expanded={more}>More ▾</button>
            {more && (
              <div className="absolute left-0 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                {NAV.filter((n) => n.wide).map((n) => <Link key={n.href} href={n.href} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">{n.label}</Link>)}
              </div>
            )}
          </div>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {!loading && !user && (
            <>
              <Link href="/login" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 sm:inline-flex">Login</Link>
              <div className="relative hidden sm:block" ref={regRef}>
                <button onClick={() => setReg(!reg)} aria-expanded={reg} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">Register ▾</button>
                {reg && (
                  <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    <Link href="/register/job-seeker" className="block px-4 py-3 hover:bg-slate-50"><p className="text-sm font-semibold text-ink">Job Seeker Registration</p><p className="text-xs text-slate-500">Find jobs near you in Surat</p></Link>
                    <Link href="/register/employer" className="block border-t border-slate-100 px-4 py-3 hover:bg-slate-50"><p className="text-sm font-semibold text-ink">Employer Registration</p><p className="text-xs text-slate-500">Hire verified local candidates</p></Link>
                  </div>
                )}
              </div>
            </>
          )}
          {user && (
            <>
              <Link href={notifHref} className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100" aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>
                {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>}
              </Link>
              <div className="relative hidden sm:block" ref={menuRef}>
                <button onClick={() => setMenu(!menu)} className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 hover:bg-slate-50" aria-expanded={menu}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
                  <span className="max-w-[9rem] truncate text-sm font-semibold text-ink">{user.name.split(" ")[0]}</span>
                </button>
                {menu && (
                  <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    <p className="truncate px-4 py-2 text-xs text-slate-500">{user.email}</p>
                    <Link href={dash} className="block px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">My dashboard</Link>
                    <Link href={`${dash}/settings`} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Account settings</Link>
                    <button onClick={() => logout()} className="block w-full px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50">Logout</button>
                  </div>
                )}
              </div>
            </>
          )}
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden" aria-label="Open menu" aria-expanded={open}>
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col bg-white shadow-2xl" aria-label="Mobile menu">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <Logo className="h-9 w-auto" />
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Close menu">✕</button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-3">
              {user && (
                <Link href={dash} className="mb-2 flex items-center gap-3 rounded-xl bg-brand-50 px-3 py-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
                  <span><span className="block text-sm font-bold text-ink">{user.name}</span><span className="text-xs text-brand-700">Go to my dashboard →</span></span>
                </Link>
              )}
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className={cx("block rounded-xl px-3 py-3 text-[15px] font-semibold", active(n.href) ? "bg-brand-50 text-brand-700" : "text-slate-800 hover:bg-slate-50")}>{n.label}</Link>
              ))}
              {!user && (
                <>
                  <Link href="/register/employer" className="block rounded-xl px-3 py-3 text-[15px] font-semibold text-slate-800 hover:bg-slate-50">Employer Registration</Link>
                  <Link href="/register/job-seeker" className="block rounded-xl px-3 py-3 text-[15px] font-semibold text-slate-800 hover:bg-slate-50">Job Seeker Registration</Link>
                </>
              )}
            </nav>
            <div className="border-t border-slate-100 p-4">
              {user ? (
                <button onClick={() => logout()} className="w-full rounded-xl border border-red-200 py-3 text-sm font-semibold text-red-600">Logout</button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/login" className="rounded-xl border border-brand-200 py-3 text-center text-sm font-semibold text-brand-700">Login</Link>
                  <Link href="/register/job-seeker" className="rounded-xl bg-brand-600 py-3 text-center text-sm font-semibold text-white">Register</Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}
