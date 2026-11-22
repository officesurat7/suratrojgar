"use client";

import { useState } from "react";
import { PageHeader } from "@/components/panel/Shell";
import { useApi } from "@/components/providers";
import { Alert, Badge, Button, Card, Input, PageLoader, Tabs } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";

type V = string | number | boolean;
interface Data { data: Record<string, Record<string, V>>; environment: Record<string, string | boolean> }

const LABELS: Record<string, [string, string?]> = {
  site_name: ["Site name"], site_tagline: ["Tagline"], support_email: ["Support email"], support_phone: ["Support phone"], office_address: ["Office address", "Shown on the Contact page."],
  maintenance_mode: ["Maintenance mode", "Public pages show the message below. Admin panels keep working."], maintenance_message: ["Maintenance message"],
  grievance_officer_name: ["Grievance Officer name", "Required by the DPDP Act and IT Rules. Shown on the Grievance page."], grievance_officer_email: ["Grievance Officer email"],
  job_approval_mode: ["Job approval", "manual: every job is reviewed · auto: jobs go live at once · selected_categories: only business types marked for approval are reviewed"],
  job_default_expiry_days: ["Default job duration (days)"], job_max_expiry_days: ["Maximum job duration (days)"], job_expiry_reminder_days: ["Remind employer before expiry (days)"],
  employer_must_be_verified_to_post: ["Employers must be verified before jobs go live"], employer_auto_activate: ["Activate new employers without review"],
  duplicate_job_window_days: ["Duplicate job check window (days)"], max_jobs_per_employer_per_day: ["Max jobs per employer per day"],
  otp_length: ["OTP length"], otp_ttl_minutes: ["OTP valid for (minutes)"], otp_max_attempts: ["Wrong OTP attempts allowed"], otp_resend_cooldown_seconds: ["Wait before resending OTP (seconds)"], otp_max_per_hour: ["OTPs per email per hour"],
  login_max_attempts: ["Failed logins before lockout"], login_lockout_minutes: ["Lockout time (minutes)"], require_admin_2fa: ["Require two-step verification for Admins and Staff", "Super Admin always needs it."],
  contact_views_per_day: ["Employer contact views per job seeker per day", "Limits scraping of employer phone numbers."], resume_max_kb: ["Max resume size (KB)"],
  mail_from_name: ["Email sender name"], admin_alert_email: ["Admin alert email", "Gets alerts for new reports and failed backups."],
  retention_visitor_analytics_days: ["Keep visitor analytics (days)"], retention_search_logs_days: ["Keep search logs (days)"], retention_login_history_days: ["Keep login history (days)"], retention_deleted_accounts_days: ["Erase deactivated accounts after (days)"],
  backup_enabled: ["Daily database backup"], backup_time: ["Backup time (server time, HH:MM)"], backup_retention_days: ["Keep backups for (days)"],
  analytics_enabled: ["Visitor analytics", "Privacy-friendly: no cookies for tracking, IPs are hashed."], mobile_verification_enabled: ["Mobile OTP verification", "Needs an SMS provider. Not connected yet."], paid_services_enabled: ["Paid services", "Not built yet. Keep off."],
};
const GROUPS: Record<string, string> = { general: "General", compliance: "Compliance", jobs: "Jobs", security: "Security", mail: "Email", retention: "Data retention", backup: "Backups", integrations: "Features" };

export default function SettingsPage() {
  const { toast, confirm } = useToast();
  const { data, loading, reload } = useApi<Data>("super/settings");
  const [tab, setTab] = useState("general");
  const [vals, setVals] = useState<Record<string, V>>({});
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState("");
  const [testTo, setTestTo] = useState("");
  const [synced, setSynced] = useState<Data | null>(null);
  if (data && data !== synced) { setSynced(data); setVals(Object.assign({}, ...Object.values(data.data))); }
  if (loading && !data) return <PageLoader />;
  if (!data) return <Alert tone="red">Could not load settings.</Alert>;
  const group = data.data[tab] ?? {};
  const changed = Object.keys(group).filter((k) => vals[k] !== group[k]);
  const save = async () => {
    setBusy("save"); setErr(null);
    try { const r = await api.put<{ message: string }>("super/settings", { settings: Object.fromEntries(changed.filter((k) => k !== "maintenance_mode").map((k) => [k, vals[k]])) }); toast(r.message); reload(); }
    catch (x) { setErr(x as ApiError); } finally { setBusy(""); }
  };
  const maintenance = async (on: boolean) => {
    if (on && !(await confirm({ title: "Turn on maintenance mode?", text: "Visitors will see the maintenance message instead of the site.", confirmLabel: "Turn on", danger: true }))) return;
    setBusy("m");
    try { const r = await api.post<{ message: string }>("super/maintenance", { enabled: on, message: String(vals.maintenance_message ?? "") }); toast(r.message); reload(); }
    catch (x) { toast((x as Error).message, "error"); } finally { setBusy(""); }
  };
  const testEmail = async () => {
    setBusy("t");
    try { const r = await api.post<{ message: string }>("super/test-email", { to: testTo }); toast(r.message); }
    catch (x) { toast((x as Error).message, "error"); } finally { setBusy(""); }
  };
  const env = data.environment;
  return (
    <>
      <PageHeader title="Site settings" subtitle="Changes apply within a minute and are recorded in the audit log." />
      <Tabs value={tab} onChange={setTab} items={Object.keys(data.data).map((g) => ({ value: g, label: GROUPS[g] ?? g }))} />
      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card>
          {err && !Object.keys(err.errors).length && <div className="mb-3"><Alert tone="red">{err.message}</Alert></div>}
          <div className="space-y-4">
            {Object.entries(group).map(([k, v]) => {
              const [label, hint] = LABELS[k] ?? [k];
              const e = err?.field(`settings.${k}`);
              if (k === "maintenance_mode") return (
                <div key={k} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3">
                  <div><p className="text-sm font-semibold text-ink">{label} {v ? <Badge tone="red">ON</Badge> : <Badge tone="green">OFF</Badge>}</p><p className="text-xs text-slate-500">{hint}</p></div>
                  <Button size="sm" variant={v ? "success" : "danger"} loading={busy === "m"} onClick={() => maintenance(!v)}>{v ? "Turn off" : "Turn on"}</Button>
                </div>
              );
              if (typeof v === "boolean") return (
                <label key={k} className="flex items-start gap-3"><input type="checkbox" className="mt-1" checked={!!vals[k]} onChange={(x) => setVals({ ...vals, [k]: x.target.checked })} /><span><span className="text-sm font-medium text-ink">{label}</span>{hint && <span className="block text-xs text-slate-500">{hint}</span>}</span></label>
              );
              if (k === "job_approval_mode") return (
                <div key={k}><label className="mb-1 block text-sm font-medium text-slate-700" htmlFor={k}>{label}</label>
                  <select id={k} className="input" value={String(vals[k] ?? "")} onChange={(x) => setVals({ ...vals, [k]: x.target.value })}><option value="manual">Manual: review every job</option><option value="auto">Automatic: jobs go live at once</option><option value="selected_categories">Only selected business types need review</option></select>
                  {e && <p className="mt-1 text-sm text-red-600">{e}</p>}</div>
              );
              return <Input key={k} label={label} hint={hint} type={typeof v === "number" ? "number" : k.endsWith("email") ? "email" : "text"} value={String(vals[k] ?? "")} onChange={(x) => setVals({ ...vals, [k]: typeof v === "number" ? (x.target.value === "" ? "" : Number(x.target.value)) : x.target.value })} error={e} />;
            })}
          </div>
          <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
            <Button loading={busy === "save"} disabled={!changed.filter((k) => k !== "maintenance_mode").length} onClick={save}>Save {GROUPS[tab] ?? tab} settings</Button>
            {changed.length > 0 && <span className="text-sm text-amber-700">{changed.length} unsaved change(s)</span>}
          </div>
        </Card>
        <div className="space-y-5">
          <Card title="Server configuration">
            <p className="mb-3 text-xs text-slate-500">Read-only. These come from the server&apos;s .env file. Passwords and keys are never shown here.</p>
            <dl className="space-y-1.5 text-sm">
              {Object.entries(env).map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-slate-500">{k.replace(/_/g, " ")}</dt><dd className="truncate text-right font-mono text-xs">{typeof v === "boolean" ? (v ? "yes" : "no") : v || "–"}</dd></div>)}
            </dl>
            {env.app_debug && env.app_env === "production" && <div className="mt-3"><Alert tone="red">Debug mode is on in production. Set APP_DEBUG=false.</Alert></div>}
            {env.mail_mailer === "log" && <div className="mt-3"><Alert tone="amber">Email is set to &quot;log&quot;, so no real emails are sent. Set the SMTP details in .env on the server.</Alert></div>}
          </Card>
          <Card title="Send a test email">
            <Input label="To" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
            <Button className="mt-3" size="sm" variant="outline" disabled={!testTo} loading={busy === "t"} onClick={testEmail}>Send test</Button>
          </Card>
        </div>
      </div>
    </>
  );
}
