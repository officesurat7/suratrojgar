"use client";

import Link from "next/link";
import { use, useState } from "react";
import { StatusControl } from "@/components/panel/StatusControl";
import { PageHeader } from "@/components/panel/Shell";
import { useApi, useAuth } from "@/components/providers";
import { Alert, Badge, Button, Card, Input, PageLoader, StatusBadge, Textarea } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { dateIST, dateTimeIST } from "@/lib/format";

interface Data {
  account: { id: number; name: string; email: string; mobile: string; status: string; status_reason: string | null; registered_at: string; last_login_at: string | null };
  profile: Record<string, string | number | boolean | null>;
  verifications: { id: number; status: string; method: string; notes: string | null; reviewed_at: string | null; created_at: string }[];
  job_stats: Record<string, number>; application_stats: Record<string, number>;
  jobs: { id: number; title: string; status?: string; posted_at: string | null }[];
  activity: { id: number; action: string; created_at: string; ip: string | null }[];
  logins: { id: number; success: boolean; ip: string | null; reason: string | null; created_at: string }[];
  complaints: { id: number; ticket_no: string; subject: string; status: string }[];
}

export default function EmployerAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { can } = useAuth();
  const { toast } = useToast();
  const { data, loading, error, reload } = useApi<{ data: Data }>(`admin/employers/${id}`);
  const [notes, setNotes] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState("");
  if (loading && !data) return <PageLoader />;
  if (error || !data) return <Alert tone="red">{error ?? "Employer not found."}</Alert>;
  const { account: a, profile: p } = data.data;
  const verify = async (decision: "approve" | "reject") => {
    setBusy(decision); setErr(null);
    try { const r = await api.post<{ message: string }>(`admin/employers/${id}/verify`, { decision, notes: notes || null, display_name: displayName || null }); toast(r.message); reload(); }
    catch (x) { setErr(x as ApiError); } finally { setBusy(""); }
  };
  return (
    <>
      <Link href="/admin/employers" className="mb-3 inline-block text-sm font-semibold text-slate-600 hover:text-ink">← Employers</Link>
      <PageHeader title={String(p.company_name)} subtitle={<>Public name: {String(p.name)} · Registered {dateIST(a.registered_at)}</>}
        actions={<><StatusBadge status={a.status} />{p.verified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Not verified</Badge>}{can("employers.manage") && <StatusControl endpoint={`admin/employers/${id}/status`} current={a.status} onDone={reload} />}</>} />
      {a.status_reason && <div className="mb-4"><Alert tone="amber">Status reason: {a.status_reason}</Alert></div>}
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Card title="Business details">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {[["Contact person", p.contact_person], ["Email", a.email], ["Mobile", a.mobile], ["Company type", p.company_type], ["Business category", p.business_category], ["GSTIN", p.gstin], ["Website", p.website], ["Area", p.locality], ["PIN code", p.pincode], ["Address", p.address]].map(([k, v]) => (
                <div key={String(k)} className={k === "Address" ? "sm:col-span-2" : ""}><dt className="text-xs text-slate-500">{k}</dt><dd className="break-words font-medium text-ink">{v ? String(v) : "–"}</dd></div>
              ))}
            </dl>
            {p.about && <p className="mt-4 whitespace-pre-line text-sm text-slate-700">{String(p.about)}</p>}
          </Card>
          <Card title={`Jobs (${data.data.jobs.length})`} actions={<Link href={`/admin/jobs?employer_id=${id}`} className="text-sm font-semibold text-brand-700">All jobs →</Link>} bodyClass="p-0">
            <ul className="divide-y divide-slate-100 text-sm">
              {data.data.jobs.slice(0, 10).map((j) => <li key={j.id} className="flex items-center justify-between gap-2 px-4 py-2.5"><Link href={`/admin/jobs/${j.id}`} className="truncate hover:text-brand-700">{j.title}</Link>{j.status && <StatusBadge status={j.status} />}</li>)}
              {!data.data.jobs.length && <li className="px-4 py-3 text-slate-500">No jobs yet.</li>}
            </ul>
          </Card>
          <Card title="Recent activity" bodyClass="p-0">
            <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto text-sm">
              {data.data.activity.map((x) => <li key={x.id} className="flex flex-wrap gap-x-3 px-4 py-2"><span className="text-slate-500">{dateTimeIST(x.created_at)}</span><span>{x.action}</span></li>)}
              {!data.data.activity.length && <li className="px-4 py-3 text-slate-500">No activity recorded.</li>}
            </ul>
          </Card>
        </div>
        <div className="space-y-5">
          {can("employers.verify") && (
            <Card title="Verification">
              {err && <div className="mb-3"><Alert tone="red">{err.message}</Alert></div>}
              <div className="space-y-3">
                <Input label="Approved public name (optional)" maxLength={150} placeholder={String(p.name)} value={displayName} onChange={(e) => setDisplayName(e.target.value)} hint="Leave blank to use the company name." />
                <Textarea label="Notes" rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} hint="Sent to the employer if rejected." />
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="success" loading={busy === "approve"} onClick={() => verify("approve")}>{p.verified ? "Re-approve" : "Approve"}</Button>
                  <Button variant="danger" loading={busy === "reject"} onClick={() => verify("reject")}>Reject</Button>
                </div>
              </div>
              {data.data.verifications.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                  {data.data.verifications.map((v) => <li key={v.id}><StatusBadge status={v.status} /> {v.method} · {dateIST(v.reviewed_at ?? v.created_at)}{v.notes ? ` · ${v.notes}` : ""}</li>)}
                </ul>
              )}
            </Card>
          )}
          <Card title="Numbers">
            <dl className="space-y-1.5 text-sm">
              {Object.entries(data.data.job_stats).map(([k, v]) => <div key={k} className="flex justify-between"><dt className="capitalize text-slate-500">{k} jobs</dt><dd className="font-semibold">{v}</dd></div>)}
              {Object.entries(data.data.application_stats).map(([k, v]) => <div key={k} className="flex justify-between"><dt className="capitalize text-slate-500">{k.replace(/_/g, " ")} applications</dt><dd className="font-semibold">{v}</dd></div>)}
              <div className="flex justify-between"><dt className="text-slate-500">Last login</dt><dd>{a.last_login_at ? dateTimeIST(a.last_login_at) : "–"}</dd></div>
            </dl>
          </Card>
          <Card title="Login history" bodyClass="p-0">
            <ul className="max-h-60 divide-y divide-slate-100 overflow-y-auto text-xs">
              {data.data.logins.map((l) => <li key={l.id} className="flex justify-between gap-2 px-4 py-2"><span>{dateTimeIST(l.created_at)}</span><span className={l.success ? "text-accent-700" : "text-red-600"}>{l.success ? "OK" : l.reason}</span><span className="text-slate-500">{l.ip}</span></li>)}
              {!data.data.logins.length && <li className="px-4 py-3 text-slate-500">No logins recorded.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
