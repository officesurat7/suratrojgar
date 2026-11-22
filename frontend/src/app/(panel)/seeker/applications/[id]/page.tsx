"use client";

import Link from "next/link";
import { use, useState } from "react";
import { ApplicationTimeline, type AppHistory } from "@/components/panel/ApplicationTimeline";
import { PageHeader } from "@/components/panel/Shell";
import { useApi } from "@/components/providers";
import { Alert, Button, Card, Modal, PageLoader, StatusBadge, Textarea } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { dateTimeIST } from "@/lib/format";

interface App {
  id: number; application_no: string; status: string; status_label: string; applied_at: string; interview_at: string | null; interview_details: string | null;
  cover_letter: string | null; answers: Record<string, string>; resume: { id: number; name: string } | null;
  job: { title: string; company: string; url: string; locality: string | null; status: string } | null; history: AppHistory[];
}

export default function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error, reload } = useApi<{ data: App }>(`seeker/applications/${id}`);
  const [withdraw, setWithdraw] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  if (loading) return <PageLoader />;
  if (error || !data) return <Alert tone="red">{error ?? "Application not found."}</Alert>;
  const a = data.data;
  const canWithdraw = !["selected", "rejected", "withdrawn"].includes(a.status);
  return (
    <>
      <Link href="/seeker/applications" className="mb-3 inline-block text-sm font-semibold text-slate-600 hover:text-ink">← All applications</Link>
      <PageHeader title={a.job?.title ?? "Application"} subtitle={<>{a.job?.company} · Application ID <span className="font-mono font-semibold">{a.application_no}</span></>}
        actions={<><StatusBadge status={a.status} label={a.status_label} />{a.job && <Button size="sm" variant="outline" href={a.job.url}>View job</Button>}</>} />
      {a.interview_at && (
        <div className="mb-5"><Alert tone="blue" title={`Interview: ${dateTimeIST(a.interview_at)}`}>{a.interview_details}</Alert></div>
      )}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card title="Status history"><ApplicationTimeline history={a.history} /></Card>
        <div className="space-y-5">
          <Card title="What you sent">
            <dl className="space-y-3 text-sm">
              <div><dt className="text-xs text-slate-500">Applied on</dt><dd className="font-medium text-ink">{dateTimeIST(a.applied_at)}</dd></div>
              <div><dt className="text-xs text-slate-500">Resume</dt><dd className="font-medium text-ink">{a.resume?.name ?? "No resume attached"}</dd></div>
              {a.cover_letter && <div><dt className="text-xs text-slate-500">Message</dt><dd className="whitespace-pre-line text-slate-700">{a.cover_letter}</dd></div>}
            </dl>
          </Card>
          {canWithdraw && <Button variant="outline" block onClick={() => setWithdraw(true)}>Withdraw application</Button>}
        </div>
      </div>
      <Modal open={withdraw} onClose={() => setWithdraw(false)} title="Withdraw application?" size="sm"
        footer={<><Button variant="ghost" onClick={() => setWithdraw(false)}>Keep it</Button><Button variant="danger" loading={busy} onClick={async () => {
          setBusy(true);
          try { await api.post(`seeker/applications/${a.id}/withdraw`, { reason: reason || null }); toast("Application withdrawn."); setWithdraw(false); reload(); }
          catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); }
        }}>Withdraw</Button></>}>
        <p className="mb-3 text-sm text-slate-600">The employer will see that you withdrew. You may not be able to apply to this job again.</p>
        <Textarea label="Reason (optional)" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Modal>
    </>
  );
}
