"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Meta, SessionUser } from "@/lib/types";
import { ToastProvider } from "./ui/toast";

// ---------------- Auth ----------------
interface AuthCtx {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<SessionUser | null>;
  setUser: (u: SessionUser | null) => void;
  logout: (all?: boolean) => Promise<void>;
  can: (permission: string) => boolean;
}
const AuthContext = createContext<AuthCtx | null>(null);

function hasSessionHint() {
  return typeof document !== "undefined" && document.cookie.split("; ").some((c) => c.startsWith("sr_role=") && c.length > 8);
}

export function homeFor(u: Pick<SessionUser, "user_type"> | null): string {
  if (!u) return "/login";
  return { job_seeker: "/seeker", employer: "/employer", super_admin: "/super-admin", admin: "/admin", admin_staff: "/admin" }[u.user_type];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    if (!hasSessionHint()) { setUser(null); setLoading(false); return null; }
    try {
      const res = await api.get<{ data: SessionUser }>("auth/me");
      setUser(res.data);
      return res.data;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const onUnauth = () => { setUser(null); };
    window.addEventListener("sr:unauthorized", onUnauth);
    return () => window.removeEventListener("sr:unauthorized", onUnauth);
  }, []);

  const logout = useCallback(async (all = false) => {
    try { await api.auth(all ? "logout-all" : "logout"); } catch { /* cookie is cleared regardless */ }
    setUser(null);
    router.push("/");
    router.refresh();
  }, [router]);

  const can = useCallback((p: string) => !!user && (user.user_type === "super_admin" || user.permissions.includes(p)), [user]);

  return <AuthContext.Provider value={{ user, loading, refresh, setUser, logout, can }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(AuthContext);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}

// ---------------- Meta (lookups) ----------------
let metaCache: Meta | null = null;
let metaPromise: Promise<Meta> | null = null;
export function useMeta(): Meta | null {
  const [meta, setMeta] = useState<Meta | null>(metaCache);
  useEffect(() => {
    if (metaCache) return;
    metaPromise ??= api.get<Meta>("meta").then((m) => (metaCache = m));
    metaPromise.then(setMeta).catch(() => { metaPromise = null; });
  }, []);
  return meta;
}

// ---------------- Data fetching hook ----------------
export function useApi<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!!path);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!path) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    api.get<T>(path)
      .then((d) => { if (alive) { setData(d); setError(null); } })
      .catch((e) => { if (alive) setError(e.message); })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick, ...deps]);
  return { data, error, loading, reload: () => setTick((t) => t + 1), setData };
}

// ---------------- Analytics beacon ----------------
function PageTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || /^\/(admin|super-admin|api)/.test(pathname)) return;
    const params = new URLSearchParams(window.location.search);
    const page_type = pathname === "/" ? "home" : pathname.startsWith("/jobs/") && /-\d+$/.test(pathname) ? "job_detail" : pathname.startsWith("/jobs") ? "job_list" : pathname.split("/")[1]?.replace(/[^a-z_-]/g, "") || "other";
    const body = JSON.stringify({ path: pathname.slice(0, 250), page_type: page_type.slice(0, 30), referrer: document.referrer || null, utm_source: params.get("utm_source") });
    fetch("/api/backend/analytics/track", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body, keepalive: true }).catch(() => {});
  }, [pathname]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <PageTracker />
        {children}
      </AuthProvider>
    </ToastProvider>
  );
}
