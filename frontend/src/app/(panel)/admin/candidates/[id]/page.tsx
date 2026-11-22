"use client";

import Link from "next/link";
import { use, useState } from "react";
import { StatusControl } from "@/components/panel/StatusControl";
import { PageHeader } from "@/components/panel/Shell";
import { useApi, useAuth, useMeta } from "@/components/providers";
import { Alert, Badge, Button, Card, PageLoader, StatusBadge } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { bytes, dateIST, dateTimeIST, money } from "@/lib/format";

interface Data {
  account: { id: number; name: string; email: string; mobile: string | null; status: string; status_reason: string | null; email_verified: boolean; registered_at: string; last_login_at: string | null; deletion_requested_at: string | null };
  profile: Record<string, unknown> & { skills: string[] } | null;
  resumes: { id: number; original_name: string; size: number; is_default: boolean; scan_status: string; created_at: string }[];
  applications: { id: number; application_no: string; status: string; status_label: string; applied_at: string; job: { id: number; title: string; company: string; locality: string | null } | null }[];
}

export default function CandidateAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { can } = useAuth();
  const meta = useMeta();
  const { toast } = useToast();
  const { data, loading, error, reload } = useApi<{ data: Data }>(`admin/candidates/${id}`);
  const [busy, setBusy] = useState(0);
  if (loading && !data) return <PageLoader />;
  if (error || !data) return <Alert tone="red">{error ?? "Candidate not found."}</Alert>;
  const { account: a, profile: p, resumes, applications } = data.data;
  const o = meta?.options;
  const s = (v: unknown) => (v === null || v === undefined || v === "" ? "–" : String(v));
  const openResume = async (rid: number) => {
    setBusy(rid);
    try { const r = await api.get<{ url: string }>(`admin/candidates/${id}/resumes/${rid}`); window.open(r.url, "_blank", "noopener"); }
    catch (x) { toast((x as Error).message, "error"); } finally { setBusy(0); }
  };
  const rows: [string, unknown][] = p ? [
    ["Email", a.email], ["Mobile", a.mobile], ["Gender", p.gender && (o?.genders[String(p.gender)] ?? p.gender)], ["Date of birth", p.date_of_birth && dateIST(String(p.date_of_birth))],
    ["Lives in", p.locality], ["Area", p.area], ["PIN code", p.pincode], ["Education", p.education],
    ["Employment status", p.employment_status && (o?.employment_statuses[String(p.employment_status)] ?? p.employment_status)], ["Experience", `${p.experience_years ?? 0} years`],
    ["Preferred category", p.preferred_category], ["Preferred role", p.preferred_role],
    ["Preferred job type", p.preferred_job_type && (o?.employment_types[String(p.preferred_job_type)] ?? p.preferred_job_type)], ["Preferred work mode", p.preferred_work_mode && (o?.work_modes[String(p.preferred_work_mode)] ?? p.preferred_work_mode)],
    ["Wants work in", p.preferred_locality], ["Expected salary", p.expected_salary ? `${money(Number(p.expected_salary))}/month` : null],
    ["Availability", p.availability && (o?.availability[String(p.availability)] ?? p.availability)], ["Profile complete", `${p.profile_completion}%`],
  ] : [["Email", a.email], ["Mobile", a.mobile]];

  return (
    <>
      <Link href="/admin/candidates" className="mb-3 inline-block text-sm font-semibold text-slate-600 hover:text-ink">← Candidates</Link>
      <PageHeader title={a.name} subtitle={<>{p?.headline ? `${String(p.headline)} · ` : ""}Registered {dateIST(a.registered_at)}</>}
        actions={<><StatusBadge status={a.status} />{a.email_verified ? <Badge tone="green">Email verified</Badge> : <Badge tone="amber">Email not verified</Badge>}{can("job_seekers.manage") && <StatusControl endpoint={`admin/candidates/${id}/status`} current={a.status} onDone={reload} />}</>} />
      <div className="mb-4 space-y-2">
        {a.status_reason && <Alert tone="amber">Status reason: {a.status_reason}</Alert>}
        {a.deletion_requested_at && <Alert tone="red" title="Deletion requested">This person asked for their account to be deleted on {dateIST(a.deletion_requested_at)}. Handle it under <Link href="/admin/data-requests" className="font-semibold underline">Data requests</Link>.</Alert>}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Card title="Profile">
            {!p && <p className="mb-3 text-sm text-slate-500">This candidate has not filled in a profile yet.</p>}
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {rows.map(([k, v]) => <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="break-words font-medium text-ink">{s(v)}</dd></div>)}
            </dl>
            {!!p?.skills.length && <div className="mt-4 flex flex-wrap gap-1.5">{p.skills.map((x) => <span key={x} className="chip">{x}</span>)}</div>}
            {p?.about ? <p className="mt-4 whitespace-pre-line text-sm text-slate-700">{String(p.about)}</p> : null}
          </Card>
          <Card title={`Applications (${applications.length})`} bodyClass="p-0">
            <ul className="divide-y divide-slate-100 text-sm">
              {applications.map((x) => (
                <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                  <div className="min-w-0">
                    {can("applications.view") ? <Link href={`/admin/applications/${x.id}`} className="font-medium hover:text-brand-700">{x.job?.title ?? "Job removed"}</Link> : <span className="font-medium">{x.job?.title ?? "Job removed"}</span>}
                    <p className="text-xs text-slate-500">{x.job?.company}{x.job?.locality ? ` · ${x.job.locality}` : ""} · {dateIST(x.applied_at)} · <span className="font-mono">{x.application_no}</span></p>
                  </div>
                  <StatusBadge status={x.status} label={x.status_label} />
                </li>
              ))}
              {!applications.length && <li className="px-4 py-3 text-slate-500">No applications yet.</li>}
            </ul>
          </Card>
        </div>
        <div className="space-y-5">
          <Card title="Account">
            <dl className="space-y-2 text-sm">
              <div><dt className="text-xs text-slate-500">User ID</dt><dd className="font-mono">{a.id}</dd></div>
              <div><dt className="text-xs text-slate-500">Last login</dt><dd>{a.last_login_at ? dateTimeIST(a.last_login_at) : "Never"}</dd></div>
            </dl>
          </Card>
          <Card title="Resumes" bodyClass="p-0">
            {!can("resumes.view") ? <p className="px-4 py-3 text-sm text-slate-500">You don&apos;t have permission to view resumes.</p> : (
              <ul className="divide-y divide-slate-100 text-sm">
                {resumes.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                    <div className="min-w-0"><p className="truncate font-medium">{r.original_name}</p><p className="text-xs text-slate-500">{bytes(r.size)} · {dateIST(r.created_at)}{r.is_default ? " · Default" : ""}{r.scan_status !== "clean" ? ` · Scan: ${r.scan_status}` : ""}</p></div>
                    <Button size="sm" variant="outline" loading={busy === r.id} onClick={() => openResume(r.id)}>View</Button>
                  </li>
                ))}
                {!resumes.length && <li className="px-4 py-3 text-slate-500">No resumes uploaded.</li>}
              </ul>
            )}
          </Card>
          <p className="text-xs text-slate-500">Opening this page and each resume is recorded in the audit log.</p>
        </div>
      </div>
    </>
  );
}
