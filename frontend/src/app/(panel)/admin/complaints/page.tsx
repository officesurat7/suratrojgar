"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { PageHeader } from "@/components/panel/Shell";
import { useApi, useAuth, useMeta } from "@/components/providers";
import { Alert, Badge, Button, Checkbox, EmptyState, Modal, PageLoader, Pagination, Select, StatusBadge, Tabs, Textarea } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { dateTimeIST, timeAgo } from "@/lib/format";

interface Ticket {
  id: number; ticket_no: string; type: string; reason: string | null; subject: string; description: string; status: string; resolution: string | null; created_at: string; resolved_at: string | null;
  reporter_name: string | null; reporter_email: string | null; reporter_mobile: string | null;
  reporter: { id: number; name: string; user_type: string } | null; job: { id: number; title: string; company_display_name: string } | null;
  reported_user: { id: number; name: string; user_type: string } | null; assignee: { id: number; name: string } | null; assigned_to: number | null;
}
const STATUSES = ["open", "in_review", "resolved", "dismissed"] as const;
const LABEL: Record<string, string> = { open: "Open", in_review: "In review", resolved: "Resolved", dismissed: "Dismissed", job: "Job report", employer: "Employer report", candidate: "Candidate report", support: "Support", grievance: "Grievance" };

function userLink(u: { id: number; name: string; user_type: string }) {
  const href = u.user_type === "employer" ? `/admin/employers/${u.id}` : u.user_type === "job_seeker" ? `/admin/candidates/${u.id}` : null;
  return href ? <Link href={href} className="font-semibold text-brand-700">{u.name}</Link> : <span>{u.name}</span>;
}

function TicketModal({ t, onClose, onSaved }: { t: Ticket; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const meta = useMeta();
  const { toast } = useToast();
  const [status, setStatus] = useState(t.status);
  const [resolution, setResolution] = useState(t.resolution ?? "");
  const [assign, setAssign] = useState(t.assigned_to);
  const [notify, setNotify] = useState(true);
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const closing = status === "resolved" || status === "dismissed";
  const save = async () => {
    setBusy(true); setErr(null);
    try { const r = await api.put<{ message: string }>(`admin/complaints/${t.id}`, { status, resolution: resolution || null, assigned_to: assign, notify_reporter: closing && notify }); toast(r.message); onSaved(); onClose(); }
    catch (x) { setErr(x as ApiError); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={`Ticket ${t.ticket_no}`} size="lg" footer={<><Button variant="outline" onClick={onClose}>Close</Button><Button loading={busy} onClick={save}>Save</Button></>}>
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-2"><Badge tone="blue">{LABEL[t.type] ?? t.type}</Badge>{t.reason && <Badge tone="amber">{meta?.options.complaint_reasons[t.reason] ?? t.reason}</Badge>}<StatusBadge status={t.status} label={LABEL[t.status]} /></div>
        <div><p className="font-semibold text-ink">{t.subject}</p><p className="mt-1 whitespace-pre-line text-slate-700">{t.description}</p></div>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div><dt className="text-xs text-slate-500">From</dt><dd>{t.reporter ? userLink(t.reporter) : t.reporter_name ?? "Guest"}<p className="text-xs text-slate-500">{[t.reporter_email, t.reporter_mobile].filter(Boolean).join(" · ")}</p></dd></div>
          <div><dt className="text-xs text-slate-500">Received</dt><dd>{dateTimeIST(t.created_at)}</dd></div>
          {t.job && <div><dt className="text-xs text-slate-500">Reported job</dt><dd><Link href={`/admin/jobs/${t.job.id}`} className="font-semibold text-brand-700">{t.job.title}</Link><p className="text-xs text-slate-500">{t.job.company_display_name}</p></dd></div>}
          {t.reported_user && <div><dt className="text-xs text-slate-500">Reported account</dt><dd>{userLink(t.reported_user)}</dd></div>}
        </dl>
        {err && !Object.keys(err.errors).length && <Alert tone="red">{err.message}</Alert>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Status" options={STATUSES.map((s) => ({ value: s, label: LABEL[s] }))} value={status} onChange={(e) => setStatus(e.target.value)} error={err?.field("status")} />
          <div><p className="mb-1 text-sm font-medium text-slate-700">Assigned to</p><p className="flex items-center gap-2">{assign === t.assigned_to && t.assignee ? t.assignee.name : assign === user?.id ? "You" : "Nobody"}{assign !== user?.id ? <Button size="sm" variant="ghost" onClick={() => setAssign(user?.id ?? null)}>Assign to me</Button> : <Button size="sm" variant="ghost" onClick={() => setAssign(null)}>Unassign</Button>}</p></div>
        </div>
        <Textarea label={closing ? "Resolution (required)" : "Resolution / notes"} rows={3} maxLength={3000} value={resolution} onChange={(e) => setResolution(e.target.value)} error={err?.field("resolution")} />
        {closing && (t.reporter_email || t.reporter) && <Checkbox label="Email this resolution to the person who raised the ticket" checked={notify} onChange={(e) => setNotify(e.target.checked)} />}
      </div>
    </Modal>
  );
}

function Complaints() {
  const [status, setStatus] = useState<string>("open");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Ticket | null>(null);
  const { data, loading, reload } = useApi<{ data: Ticket[]; meta: { current_page: number; last_page: number; total: number } }>(`admin/complaints?page=${page}${status ? `&status=${status}` : ""}${type ? `&type=${type}` : ""}${search ? `&q=${encodeURIComponent(search)}` : ""}`);
  return (
    <>
      <PageHeader title="Complaints & support" subtitle="Job reports, support requests and grievances (DPDP grievance officer queue)." />
      <Tabs value={status} onChange={(v) => { setStatus(v); setPage(1); }} items={[...STATUSES.map((s) => ({ value: s as string, label: LABEL[s] })), { value: "", label: "All" }]} />
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q.trim()); }}><input className="input" placeholder="Ticket no, subject or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" /></form>
        <select className="input" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} aria-label="Type"><option value="">All types</option>{["job", "employer", "candidate", "support", "grievance"].map((t) => <option key={t} value={t}>{LABEL[t]}</option>)}</select>
      </div>
      <div className="mt-4">
        {loading && !data ? <PageLoader /> : !data?.data.length ? <EmptyState icon="✅" title="No tickets here" /> : (
          <ul className="space-y-2">
            {data.data.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => setOpen(t)} className="card flex w-full flex-col gap-1 p-3 text-left hover:border-brand-300 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-slate-500">{t.ticket_no}</span><Badge tone={t.type === "grievance" ? "red" : "blue"}>{LABEL[t.type] ?? t.type}</Badge></p>
                    <p className="truncate font-semibold text-ink">{t.subject}</p>
                    <p className="truncate text-xs text-slate-500">{t.reporter?.name ?? t.reporter_name ?? "Guest"}{t.job ? ` · about "${t.job.title}"` : ""}{t.assignee ? ` · assigned to ${t.assignee.name}` : ""}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs text-slate-500"><StatusBadge status={t.status} label={LABEL[t.status]} />{timeAgo(t.created_at)}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
        {data && <Pagination page={data.meta.current_page} last={data.meta.last_page} onPage={setPage} />}
      </div>
      {open && <TicketModal t={open} onClose={() => setOpen(null)} onSaved={reload} />}
    </>
  );
}

export default function Page() { return <Suspense><Complaints /></Suspense>; }
