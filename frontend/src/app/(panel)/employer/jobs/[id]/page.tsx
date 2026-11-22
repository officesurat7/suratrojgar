"use client";

import Link from "next/link";
import { use } from "react";
import { TrendChart } from "@/components/panel/Charts";
import { PageHeader } from "@/components/panel/Shell";
import { useApi, useMeta } from "@/components/providers";
import { Alert, Button, Card, PageLoader, StatCard, StatusBadge } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { dateIST, salaryText } from "@/lib/format";
import { JOB_ACTIONS } from "@/components/panel/jobActions";

interface Job { id: number; title: string; url: string; status: string; rejection_reason: string | null; posted_at: string | null; expires_at: string | null; created_at: string; salary: { min: number | null; max: number | null; currency: string; period: string; negotiable: boolean }; location: { locality: { name: string } | null }; employment_type_label: string; contact_name: string | null; contact_mobile: string | null; contact_email: string | null; contact_visibility: string; office_address: string | null }
interface Perf { views_total: number; applications_total: number; conversion_rate: number; by_status: Record<string, number>; series: { date: string; views: number; applications: number }[] }

export default function JobManagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const meta = useMeta();
  const { toast, confirm } = useToast();
  const { data, loading, error, reload } = useApi<{ data: Job }>(`employer/jobs/${id}`);
  const { data: perf } = useApi<Perf>(`employer/jobs/${id}/performance`);
  if (loading) return <PageLoader />;
  if (error || !data) return <Alert tone="red">{error ?? "Job not found."}</Alert>;
  const j = data.data;
  const act = async (action: string) => {
    if (action === "close" && !(await confirm({ title: "Close this job?", confirmLabel: "Close job", danger: true }))) return;
    try { const r = await api.post<{ message: string }>(`employer/jobs/${j.id}/${action}`); toast(r.message); reload(); } catch (e) { toast((e as Error).message, "error"); }
  };
  const extend = async () => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    try { const r = await api.post<{ message: string }>(`employer/jobs/${j.id}/extend`, { expires_at: d.toISOString().slice(0, 10) }); toast(r.message); reload(); } catch (e) { toast((e as Error).message, "error"); }
  };
  const del = async () => {
    if (!(await confirm({ title: "Delete this job?", text: "Applications already received stay in your records.", confirmLabel: "Delete", danger: true }))) return;
    try { await api.del(`employer/jobs/${j.id}`); toast("Job deleted."); window.location.href = "/employer/jobs"; } catch (e) { toast((e as Error).message, "error"); }
  };
  const statusLabels = meta?.options.application_statuses ?? {};
  return (
    <>
      <Link href="/employer/jobs" className="mb-3 inline-block text-sm font-semibold text-slate-600 hover:text-ink">← My jobs</Link>
      <PageHeader title={j.title} subtitle={<>#{j.id} · {j.location.locality?.name ?? "Surat"} · {j.employment_type_label} · {salaryText(j.salary)}</>}
        actions={<>
          <StatusBadge status={j.status} />
          {j.status === "active" && <Button size="sm" variant="outline" href={j.url}>View live</Button>}
          {!["closed", "expired"].includes(j.status) && <Button size="sm" variant="outline" href={`/employer/jobs/${j.id}/edit`}>Edit</Button>}
          {(JOB_ACTIONS[j.status] ?? []).map((a) => <Button key={a.action} size="sm" onClick={() => act(a.action)}>{a.label}</Button>)}
        </>} />
      {j.status === "rejected" && <div className="mb-5"><Alert tone="red" title="Not approved">{j.rejection_reason}</Alert></div>}
      {j.status === "pending" && <div className="mb-5"><Alert tone="amber">Waiting for admin approval. You will get an email when it is reviewed.</Alert></div>}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Views" value={perf?.views_total ?? "–"} tone="slate" />
        <StatCard label="Applications" value={perf?.applications_total ?? "–"} href={`/employer/applications?job_id=${j.id}`} />
        <StatCard label="Apply rate" value={perf ? `${perf.conversion_rate}%` : "–"} tone="green" hint="Applications ÷ views" />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card title="Last 30 days">{perf ? <TrendChart data={perf.series} keys={["views", "applications"]} labels={{ views: "Views", applications: "Applications" }} /> : <PageLoader />}</Card>
        <div className="space-y-5">
          <Card title="Applicants by status">
            {perf && Object.keys(perf.by_status).length ? (
              <ul className="space-y-2 text-sm">{Object.entries(perf.by_status).map(([s, n]) => <li key={s} className="flex justify-between"><Link href={`/employer/applications?job_id=${j.id}&status=${s}`} className="text-slate-700 hover:text-brand-700">{statusLabels[s] ?? s}</Link><strong>{n}</strong></li>)}</ul>
            ) : <p className="text-sm text-slate-500">No applications yet.</p>}
          </Card>
          <Card title="Dates">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Created</dt><dd>{dateIST(j.created_at)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Published</dt><dd>{j.posted_at ? dateIST(j.posted_at) : "–"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Expires</dt><dd>{j.expires_at ? dateIST(j.expires_at) : "–"}</dd></div>
            </dl>
            {j.status === "active" && <Button className="mt-3" size="sm" variant="outline" block onClick={extend}>Extend by 30 days</Button>}
          </Card>
          <Card title="Private contact (not public)">
            <dl className="space-y-1 text-sm text-slate-700"><dd>{j.contact_name}</dd><dd>{j.contact_mobile}</dd><dd className="break-all">{j.contact_email}</dd><dd className="text-xs text-slate-500">Visible to: {meta?.options.contact_visibility[j.contact_visibility]}</dd></dl>
          </Card>
          <Button variant="ghost" block className="text-red-600" onClick={del}>Delete job</Button>
        </div>
      </div>
    </>
  );
}
