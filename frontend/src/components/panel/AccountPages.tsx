"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordStrength } from "@/components/auth/AuthCard";
import { useApi, useAuth } from "@/components/providers";
import { Alert, Badge, Button, Card, Checkbox, EmptyState, Input, Modal, Pagination, Textarea } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { cx, dateIST, dateTimeIST, timeAgo } from "@/lib/format";
import { PageHeader } from "./Shell";

interface Notice { id: string; title: string; body: string; url: string | null; read_at: string | null; created_at: string }

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, loading, reload, setData } = useApi<{ data: Notice[]; meta: { current_page: number; last_page: number }; unread: number }>(`notifications?page=${page}${unreadOnly ? "&unread=1" : ""}`);
  const router = useRouter();
  const open = async (n: Notice) => {
    if (!n.read_at) { api.post(`notifications/${n.id}/read`).catch(() => {}); setData((d) => d && ({ ...d, unread: Math.max(0, d.unread - 1), data: d.data.map((x) => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x) })); }
    if (n.url && n.url.startsWith("/")) router.push(n.url);
  };
  return (
    <>
      <PageHeader title="Notifications" subtitle={data ? `${data.unread} unread` : undefined}
        actions={<>
          <Button size="sm" variant={unreadOnly ? "secondary" : "outline"} onClick={() => { setUnreadOnly(!unreadOnly); setPage(1); }}>{unreadOnly ? "Showing unread" : "Show unread only"}</Button>
          <Button size="sm" variant="outline" onClick={async () => { await api.post("notifications/read-all"); reload(); }}>Mark all read</Button>
        </>} />
      {loading && !data ? <p className="text-sm text-slate-500">Loading…</p> : !data?.data.length ? (
        <EmptyState icon="🔔" title="No notifications" text="Updates about your account, jobs and applications will appear here." />
      ) : (
        <div className="card divide-y divide-slate-100">
          {data.data.map((n) => (
            <button key={n.id} onClick={() => open(n)} className={cx("flex w-full gap-3 px-4 py-4 text-left hover:bg-slate-50 sm:px-5", !n.read_at && "bg-brand-50/50")}>
              <span className={cx("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-brand-600")} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{n.title}</span>
                <span className="mt-0.5 block whitespace-pre-line text-sm text-slate-600">{n.body}</span>
                <span className="mt-1 block text-xs text-slate-400" title={dateTimeIST(n.created_at)}>{timeAgo(n.created_at)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {data && <Pagination page={data.meta.current_page} last={data.meta.last_page} onPage={setPage} />}
    </>
  );
}

const PREF_LABELS: Record<string, { label: string; types: string[] }> = {
  job_alerts: { label: "New jobs matching my preferences", types: ["job_seeker"] },
  application_updates: { label: "Application status updates", types: ["job_seeker", "employer"] },
  job_updates: { label: "Job approval, rejection and expiry reminders", types: ["employer"] },
  admin_alerts: { label: "Admin alerts (new employers, pending jobs, complaints)", types: ["admin", "admin_staff", "super_admin"] },
};

export function SettingsPage({ extra }: { extra?: React.ReactNode }) {
  const { user, refresh, logout } = useAuth();
  const { toast } = useToast();
  const [pw, setPw] = useState({ current_password: "", password: "", password_confirmation: "" });
  const [pwErr, setPwErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState("");
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => Object.fromEntries(Object.keys(PREF_LABELS).map((k) => [k, user?.notification_preferences?.[k]?.mail ?? true])));
  if (!user) return null;
  const isAdmin = ["admin", "admin_staff", "super_admin"].includes(user.user_type);

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy("pw"); setPwErr(null);
    try { const r = await api.post<{ message: string }>("auth/change-password", pw); toast(r.message); setPw({ current_password: "", password: "", password_confirmation: "" }); }
    catch (x) { setPwErr(x as ApiError); } finally { setBusy(""); }
  };
  const savePrefs = async () => {
    setBusy("prefs");
    try {
      const r = await api.put<{ message: string }>("auth/notification-preferences", { preferences: Object.fromEntries(Object.entries(prefs).map(([k, v]) => [k, { mail: v }])) });
      toast(r.message); refresh();
    } catch (x) { toast((x as Error).message, "error"); } finally { setBusy(""); }
  };

  return (
    <>
      <PageHeader title="Account settings" subtitle={`Signed in as ${user.email}`} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Change password">
          <form onSubmit={changePw} className="space-y-4">
            {pwErr && !Object.keys(pwErr.errors).length && <Alert tone="red">{pwErr.message}</Alert>}
            <Input label="Current password" type="password" autoComplete="current-password" required value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} error={pwErr?.field("current_password")} />
            <div><Input label="New password" type="password" autoComplete="new-password" required value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} error={pwErr?.field("password")} /><PasswordStrength value={pw.password} /></div>
            <Input label="Confirm new password" type="password" autoComplete="new-password" required value={pw.password_confirmation} onChange={(e) => setPw({ ...pw, password_confirmation: e.target.value })} />
            <Button type="submit" loading={busy === "pw"}>Update password</Button>
            <p className="text-xs text-slate-500">Changing your password signs you out on all other devices.</p>
          </form>
        </Card>
        <Card title="Email notifications">
          <div className="space-y-3">
            {Object.entries(PREF_LABELS).filter(([, v]) => v.types.includes(user.user_type)).map(([k, v]) => (
              <Checkbox key={k} label={v.label} checked={prefs[k]} onChange={(e) => setPrefs({ ...prefs, [k]: e.target.checked })} />
            ))}
            <p className="text-xs text-slate-500">Security emails (login codes, password resets) are always sent.</p>
            <Button variant="secondary" onClick={savePrefs} loading={busy === "prefs"}>Save preferences</Button>
          </div>
        </Card>
        {isAdmin && <TwoFactorCard />}
        <Card title="Sessions">
          <p className="text-sm text-slate-600">Signed in on a shared or lost device? Log out everywhere.</p>
          <Button className="mt-4" variant="outline" onClick={() => logout(true)}>Log out from all devices</Button>
        </Card>
        {extra}
        {!isAdmin && <PrivacyCard />}
      </div>
    </>
  );
}

function TwoFactorCard() {
  const { user, refresh } = useAuth();
  const { toast } = useToast();
  const [setup, setSetup] = useState<{ secret: string; otpauth_uri: string } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const run = async (fn: () => Promise<void>) => { setBusy(true); setErr(null); try { await fn(); } catch (x) { setErr(x as ApiError); } finally { setBusy(false); } };
  return (
    <Card title={<span className="flex items-center gap-2">Two-step verification {user.two_factor_enabled ? <Badge tone="green">Authenticator on</Badge> : <Badge tone="amber">Email codes</Badge>}</span>}>
      {user.two_factor_enabled ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Your login needs a code from your authenticator app.</p>
          <Input label="Confirm your password to remove it" type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={err?.field("password")} />
          <Button variant="outline" loading={busy} onClick={() => run(async () => { const r = await api.post<{ message: string }>("auth/2fa/disable", { password }); toast(r.message); setPassword(""); await refresh(); })}>Remove authenticator</Button>
        </div>
      ) : !setup ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Use an authenticator app (Google Authenticator, Microsoft Authenticator, Authy) for stronger login protection.</p>
          <Button loading={busy} onClick={() => run(async () => setSetup(await api.post("auth/2fa/setup")))}>Set up authenticator app</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
            <li>Open your authenticator app and choose <em>Add account → Enter a setup key</em>.</li>
            <li>Account: <strong>{user.email}</strong>. Key:</li>
          </ol>
          <p className="break-all rounded-lg bg-slate-100 px-3 py-2 font-mono text-sm tracking-wider text-ink">{setup.secret.replace(/(.{4})/g, "$1 ").trim()}</p>
          <Input label="Enter the 6-digit code shown in the app" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} error={err?.field("code")} />
          <Button loading={busy} disabled={code.length !== 6} onClick={() => run(async () => { const r = await api.post<{ message: string }>("auth/2fa/enable", { code }); toast(r.message); setSetup(null); setCode(""); await refresh(); })}>Turn on</Button>
        </div>
      )}
    </Card>
  );
}

interface DataReq { id: number; type: string; status: string; details: string | null; response: string | null; created_at: string }

/** DPDP Act: correction and erasure requests, and account deactivation. */
function PrivacyCard() {
  const { toast } = useToast();
  const { logout } = useAuth();
  const { data, reload } = useApi<{ data: DataReq[] }>("account/data-requests");
  const [modal, setModal] = useState<"correction" | "deletion" | "deactivate" | null>(null);
  const [details, setDetails] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      if (modal === "deactivate") {
        const r = await api.post<{ message: string }>("account/deactivate", { password });
        toast(r.message); await logout(); return;
      }
      const r = await api.post<{ message: string }>("account/data-requests", { type: modal, details: details || null, password: password || null });
      toast(r.message); setModal(null); setDetails(""); setPassword(""); reload();
    } catch (x) { setErr(x as ApiError); } finally { setBusy(false); }
  };
  return (
    <Card title="Your data and privacy" className="lg:col-span-2">
      <p className="text-sm text-slate-600">Under India&apos;s Digital Personal Data Protection Act you can ask us to correct or erase your personal data. See our <Link href="/privacy-policy" className="font-semibold text-brand-700 underline">Privacy Policy</Link>.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setModal("correction")}>Request a correction</Button>
        <Button variant="outline" size="sm" onClick={() => setModal("deactivate")}>Deactivate account</Button>
        <Button variant="danger" size="sm" onClick={() => setModal("deletion")}>Delete my account and data</Button>
      </div>
      {!!data?.data.length && (
        <ul className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {data.data.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
              <span className="font-semibold capitalize text-ink">{r.type} request</span>
              <Badge tone={r.status === "completed" ? "green" : r.status === "rejected" ? "red" : "amber"}>{r.status}</Badge>
              <span className="ml-auto text-xs text-slate-500">{dateIST(r.created_at)}</span>
              {r.response && <p className="w-full text-xs text-slate-600">Response: {r.response}</p>}
            </li>
          ))}
        </ul>
      )}
      <Modal open={!!modal} onClose={() => setModal(null)} size="sm"
        title={modal === "correction" ? "Request a correction" : modal === "deletion" ? "Delete account and data" : "Deactivate account"}
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button variant={modal === "correction" ? "primary" : "danger"} loading={busy} onClick={submit}>Submit</Button></>}>
        <div className="space-y-4">
          {err && !Object.keys(err.errors).length && <Alert tone="red">{err.message}</Alert>}
          {modal === "correction" && <Textarea label="What should we correct?" rows={4} maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} error={err?.field("details")} />}
          {modal === "deletion" && <Alert tone="amber">Your account will be closed and your personal data erased or anonymised within 30 days, except records we must keep by law. This cannot be undone.</Alert>}
          {modal === "deactivate" && <p className="text-sm text-slate-600">Your profile will be hidden and you will be logged out. Contact support to reactivate.</p>}
          {modal !== "correction" && <Input label="Confirm your password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={err?.field("password")} />}
        </div>
      </Modal>
    </Card>
  );
}

