"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/panel/Shell";
import { useApi } from "@/components/providers";
import { Alert, Badge, Button, EmptyState, Modal, PageLoader, Pagination, StatusBadge, Tabs, Textarea } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { dateIST, dateTimeIST } from "@/lib/format";

interface DR { id: number; type: string; details: string | null; status: string; response: string | null; created_at: string; processed_at: string | null; user: { id: number; name: string; email: string; user_type: string; status: string } | null }
const TYPE: Record<string, string> = { deletion: "Delete my account", correction: "Correct my data", export: "Copy of my data" };

function Process({ r, onClose, onDone }: { r: DR; onClose: () => void; onDone: () => void }) {
  const { toast, confirm } = useToast();
  const [response, setResponse] = useState("");
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState("");
  const go = async (decision: "complete" | "reject") => {
    if (decision === "complete" && r.type === "deletion" && !(await confirm({ title: "Erase this person's data?", text: "Their name, email, mobile, profile, resumes and application answers will be permanently removed. This cannot be undone.", confirmLabel: "Erase data", danger: true }))) return;
    setBusy(decision); setErr(null);
    try { const x = await api.post<{ message: string }>(`admin/data-requests/${r.id}`, { decision, response }); toast(x.message); onDone(); onClose(); }
    catch (x) { setErr(x as ApiError); } finally { setBusy(""); }
  };
  return (
    <Modal open onClose={onClose} title={TYPE[r.type] ?? r.type}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="ghost" loading={busy === "reject"} onClick={() => go("reject")}>Reject</Button><Button variant={r.type === "deletion" ? "danger" : "success"} loading={busy === "complete"} onClick={() => go("complete")}>{r.type === "deletion" ? "Erase & complete" : "Mark completed"}</Button></>}>
      <div className="space-y-3 text-sm">
        <p>From <strong>{r.user?.name}</strong> ({r.user?.email}) on {dateTimeIST(r.created_at)}.</p>
        {r.details && <p className="whitespace-pre-line rounded-lg bg-slate-50 p-3 text-slate-700">{r.details}</p>}
        {r.type === "deletion" && <Alert tone="amber">Completing erases personal data and keeps only anonymous records (for example, job and application counts). Records the law requires you to keep are not affected.</Alert>}
        {r.type === "correction" && <Alert tone="blue">Make the correction in the person&apos;s profile first (or ask them to), then mark this completed.</Alert>}
        {err && !Object.keys(err.errors).length && <Alert tone="red">{err.message}</Alert>}
        <Textarea label="Reply to the person (sent by email)" required rows={3} maxLength={2000} value={response} onChange={(e) => setResponse(e.target.value)} error={err?.field("response")} />
      </div>
    </Modal>
  );
}

export default function DataRequestsPage() {
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<DR | null>(null);
  const { data, loading, reload } = useApi<{ data: DR[]; meta: { current_page: number; last_page: number; total: number } }>(`admin/data-requests?page=${page}${status ? `&status=${status}` : ""}`);
  const profile = (u: DR["user"]) => !u ? null : u.user_type === "employer" ? `/admin/employers/${u.id}` : u.user_type === "job_seeker" ? `/admin/candidates/${u.id}` : null;
  return (
    <>
      <PageHeader title="Data requests" subtitle="Requests under India's DPDP Act to correct or delete personal data. Respond within the time your privacy policy promises." />
      <Tabs value={status} onChange={(v) => { setStatus(v); setPage(1); }} items={[{ value: "pending", label: "Pending" }, { value: "completed", label: "Completed" }, { value: "rejected", label: "Rejected" }, { value: "", label: "All" }]} />
      <div className="mt-4">
        {loading && !data ? <PageLoader /> : !data?.data.length ? <EmptyState icon="🛡️" title="No requests here" /> : (
          <ul className="space-y-2">
            {data.data.map((r) => {
              const href = profile(r.user);
              return (
                <li key={r.id} className="card flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2"><Badge tone={r.type === "deletion" ? "red" : "blue"}>{TYPE[r.type] ?? r.type}</Badge><span className="text-xs text-slate-500">{dateIST(r.created_at)}</span></p>
                    <p className="mt-1 font-semibold text-ink">{href ? <Link href={href} className="hover:text-brand-700">{r.user?.name}</Link> : r.user?.name}<span className="ml-2 text-xs font-normal text-slate-500">{r.user?.email}</span></p>
                    {r.details && <p className="line-clamp-2 text-sm text-slate-600">{r.details}</p>}
                    {r.response && <p className="mt-1 text-xs text-slate-500">Reply: {r.response}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">{r.status === "pending" ? <Button size="sm" onClick={() => setOpen(r)}>Process</Button> : <StatusBadge status={r.status} />}</div>
                </li>
              );
            })}
          </ul>
        )}
        {data && <Pagination page={data.meta.current_page} last={data.meta.last_page} onPage={setPage} />}
      </div>
      {open && <Process r={open} onClose={() => setOpen(null)} onDone={reload} />}
    </>
  );
}
