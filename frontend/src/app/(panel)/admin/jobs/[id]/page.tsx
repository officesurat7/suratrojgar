"use client";

import Link from "next/link";
import { use, useState } from "react";
import { PageHeader } from "@/components/panel/Shell";
import { useApi, useAuth, useMeta } from "@/components/providers";
import { Alert, Badge, Button, Card, Input, Modal, PageLoader, StatusBadge, Textarea } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { dateIST, dateTimeIST, experienceText, salaryText } from "@/lib/format";
import type { JobDetail } from "@/lib/types";

type Job = JobDetail & { status: string; rejection_reason: string | null; created_at: string; submitted_at: string | null; approved_at: string | null; views_count: number; applications_count: number; featured_priority: number | null; office_address: string | null; contact_name: string | null; contact_mobile: string | null; contact_email: string | null; gender_justification: string | null; employer: { id: number; name: string; email: string; status: string } | null; deleted_at: string | null; allow_reapply: boolean };

const ACTIONS: Record<string, { action: string; label: string; danger?: boolean }[]> = {
  active: [{ action: "pause", label: "Pause" }, { action: "close", label: "Close" }, { action: "expire", label: "Mark expired", danger: true }],
  paused: [{ action: "activate", label: "Activate" }, { action: "close", label: "Close" }],
  closed: [{ action: "reopen", label: "Reopen" }],
  expired: [{ action: "reopen", label: "Reopen" }],
};

export default function AdminJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { can } = useAuth();
  const meta = useMeta();
  const { toast, confirm } = useToast();
  const { data, loading, error, reload } = useApi<{ data: Job }>(`admin/jobs/${id}`);
  const [reject, setReject] = useState(false);
  const [reason, setReason] = useState("");
  const [expiry, setExpiry] = useState("");
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState("");
  if (loading && !data) return <PageLoader />;
  if (error || !data) return <Alert tone="red">{error ?? "Job not found."}</Alert>;
  const j = data.data;
  const run = async (key: string, fn: () => Promise<{ message: string }>) => {
    setBusy(key); setErr(null);
    try { const r = await fn(); toast(r.message); reload(); return true; } catch (x) { setErr(x as ApiError); toast((x as Error).message, "error"); return false; } finally { setBusy(""); }
  };
  return (
    <>
      <Link href="/admin/jobs" className="mb-3 inline-block text-sm font-semibold text-slate-600 hover:text-ink">← Jobs</Link>
      <PageHeader title={j.title} subtitle={<>#{j.id} · {j.company} · {j.location.locality?.name ?? "Surat"}</>}
        actions={<>
          <StatusBadge status={j.deleted_at ? "deleted" : j.status} />
          {j.featured_priority && <Badge tone="blue">Priority {j.featured_priority}</Badge>}
          {j.is_active && <Button size="sm" variant="outline" href={j.url}>View live</Button>}
          {can("jobs.manage") && <Button size="sm" variant="outline" href={`/admin/jobs/${j.id}/edit`}>Edit</Button>}
        </>} />
      {j.status === "pending" && can("jobs.approve") && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="mr-auto text-sm text-amber-900"><strong>Awaiting approval</strong>{j.submitted_at ? ` since ${dateTimeIST(j.submitted_at)}` : ""}. Check the description, salary and gender preference before approving.</p>
          <Button variant="success" loading={busy === "approve"} onClick={() => run("approve", () => api.post(`admin/jobs/${j.id}/approve`))}>Approve and publish</Button>
          <Button variant="danger" onClick={() => setReject(true)}>Reject</Button>
        </div>
      )}
      {j.status === "rejected" && j.rejection_reason && <div className="mb-5"><Alert tone="red" title="Rejected">{j.rejection_reason}</Alert></div>}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Card title="Job details">
            <p className="text-lg font-bold text-brand-700">{salaryText(j.salary)}</p>
            <p className="mt-1 text-sm text-slate-600">{j.employment_type_label} · {j.work_mode_label} · {experienceText(j.experience)} · {j.education ?? "Any education"} · {j.vacancies} opening(s)</p>
            {j.gender_preference !== "any" && <Alert tone="amber" title={`Gender preference: ${meta?.options.gender_preferences[j.gender_preference]}`}>{j.gender_justification ?? "No justification given."}</Alert>}
            <div className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">{j.description}</div>
            {j.skills_required.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{j.skills_required.map((s) => <span key={s} className="chip">{s}</span>)}</div>}
            {j.questions.length > 0 && <div className="mt-4"><p className="text-sm font-bold text-ink">Screening questions</p><ul className="mt-1 list-disc pl-5 text-sm text-slate-700">{j.questions.map((q) => <li key={q.id}>{q.question}{q.is_required ? " (required)" : ""}</li>)}</ul></div>}
          </Card>
          <Card title="Private contact and address">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-slate-500">Contact</dt><dd>{j.contact_name ?? "–"}</dd></div>
              <div><dt className="text-xs text-slate-500">Mobile</dt><dd>{j.contact_mobile ?? "–"}</dd></div>
              <div><dt className="text-xs text-slate-500">Email</dt><dd className="break-all">{j.contact_email ?? "–"}</dd></div>
              <div><dt className="text-xs text-slate-500">Visibility</dt><dd>{meta?.options.contact_visibility[j.contact_visibility]}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-slate-500">Office address</dt><dd>{j.office_address ?? "–"}</dd></div>
            </dl>
          </Card>
        </div>
        <div className="space-y-5">
          <Card title="Employer">
            {j.employer ? <><Link href={`/admin/employers/${j.employer.id}`} className="font-semibold text-brand-700">{j.company}</Link><p className="text-sm text-slate-600">{j.employer.name} · {j.employer.email}</p><StatusBadge status={j.employer.status} /></> : "–"}
          </Card>
          <Card title="Activity">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Applications</dt><dd><Link href={`/admin/applications?job_id=${j.id}`} className="font-semibold text-brand-700">{j.applications_count}</Link></dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Views</dt><dd>{j.views_count}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Created</dt><dd>{dateIST(j.created_at)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Approved</dt><dd>{j.approved_at ? dateIST(j.approved_at) : "–"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Expires</dt><dd>{j.expires_at ? dateIST(j.expires_at) : "–"}</dd></div>
            </dl>
          </Card>
          {can("jobs.manage") && (
            <Card title="Manage">
              <div className="flex flex-wrap gap-2">
                {(ACTIONS[j.status] ?? []).map((a) => <Button key={a.action} size="sm" variant={a.danger ? "danger" : "outline"} loading={busy === a.action} onClick={() => run(a.action, () => api.post(`admin/jobs/${j.id}/${a.action}`))}>{a.label}</Button>)}
              </div>
              <div className="mt-4 flex items-end gap-2">
                <Input className="flex-1" label="Set expiry date" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} error={err?.field("expires_at")} />
                <Button size="sm" variant="outline" disabled={!expiry} loading={busy === "expiry"} onClick={() => run("expiry", () => api.post(`admin/jobs/${j.id}/expiry`, { expires_at: `${expiry}T23:59:00+05:30` }))}>Save</Button>
              </div>
              <Button className="mt-4" size="sm" variant="outline" block loading={busy === "reapply"} onClick={() => run("reapply", () => api.post(`admin/jobs/${j.id}/allow-reapply`, { allow: !j.allow_reapply }))}>{j.allow_reapply ? "Stop allowing re-applications" : "Allow rejected candidates to re-apply"}</Button>
              {!j.deleted_at ? (
                <Button className="mt-2" size="sm" variant="ghost" block onClick={async () => { if (await confirm({ title: "Delete this job?", text: "It is hidden everywhere and removed from priority jobs. It can be restored later.", confirmLabel: "Delete", danger: true })) run("del", () => api.del(`admin/jobs/${j.id}`)); }}><span className="text-red-600">Delete job</span></Button>
              ) : (
                <Button className="mt-2" size="sm" variant="outline" block onClick={() => run("restore", () => api.post(`admin/jobs/${j.id}/restore`))}>Restore job</Button>
              )}
            </Card>
          )}
        </div>
      </div>
      <Modal open={reject} onClose={() => setReject(false)} title="Reject job" size="sm"
        footer={<><Button variant="ghost" onClick={() => setReject(false)}>Cancel</Button><Button variant="danger" loading={busy === "reject"} onClick={async () => { if (await run("reject", () => api.post(`admin/jobs/${j.id}/reject`, { reason }))) setReject(false); }}>Reject job</Button></>}>
        <Textarea label="Reason (sent to the employer)" required rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} error={err?.field("reason")}
          placeholder="e.g. Please mention the salary and remove the phone number from the description." />
      </Modal>
    </>
  );
}
