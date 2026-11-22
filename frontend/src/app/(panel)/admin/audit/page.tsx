"use client";

import { useState } from "react";
import { PageHeader, Table } from "@/components/panel/Shell";
import { useApi } from "@/components/providers";
import { Button, EmptyState, Modal, PageLoader, Pagination } from "@/components/ui";
import { dateTimeIST } from "@/lib/format";

interface Log { id: number; action: string; auditable_type: string | null; auditable_id: number | null; old_values: unknown; new_values: unknown; ip: string | null; user_agent: string | null; created_at: string; user: { id: number; name: string; user_type: string } | null }

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState({ action: "", from: "", to: "" });
  const [f, setF] = useState(draft);
  const [open, setOpen] = useState<Log | null>(null);
  const qs = `page=${page}${Object.entries(f).map(([k, v]) => (v ? `&${k}=${encodeURIComponent(v)}` : "")).join("")}`;
  const { data, loading } = useApi<{ data: Log[]; meta: { current_page: number; last_page: number; total: number } }>(`admin/audit-logs?${qs}`);
  return (
    <>
      <PageHeader title="Audit log" subtitle="Every admin action, contact view, export and status change. Entries cannot be edited or deleted from the panel." />
      <form className="grid gap-2 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); setPage(1); setF(draft); }}>
        <input className="input" placeholder="Action starts with (e.g. job.)" value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value })} aria-label="Action" />
        <input className="input" type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} aria-label="From date" />
        <input className="input" type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} aria-label="To date" />
        <Button type="submit" variant="outline">Filter</Button>
      </form>
      <div className="mt-4">
        {loading && !data ? <PageLoader /> : !data?.data.length ? <EmptyState icon="📜" title="No entries" /> : (
          <Table head={["When (IST)", "Who", "Action", "Record", "IP", ""]}>
            {data.data.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-2 text-slate-600">{dateTimeIST(l.created_at)}</td>
                <td className="px-4 py-2">{l.user ? <>{l.user.name}<p className="text-xs text-slate-500">{l.user.user_type.replace("_", " ")}</p></> : <span className="text-slate-500">System / guest</span>}</td>
                <td className="px-4 py-2 font-mono text-xs">{l.action}</td>
                <td className="px-4 py-2 text-xs text-slate-600">{l.auditable_type ? `${l.auditable_type.split("\\").pop()} #${l.auditable_id}` : "–"}</td>
                <td className="px-4 py-2 font-mono text-xs text-slate-500">{l.ip ?? "–"}</td>
                <td className="px-4 py-2 text-right">{(l.old_values || l.new_values) ? <Button size="sm" variant="ghost" onClick={() => setOpen(l)}>Details</Button> : null}</td>
              </tr>
            ))}
          </Table>
        )}
        {data && <Pagination page={data.meta.current_page} last={data.meta.last_page} onPage={setPage} />}
      </div>
      {open && (
        <Modal open onClose={() => setOpen(null)} title={open.action} size="lg">
          <div className="grid gap-3 text-xs sm:grid-cols-2">
            <div><p className="mb-1 font-semibold text-slate-600">Before</p><pre className="max-h-80 overflow-auto rounded-lg bg-slate-50 p-3">{JSON.stringify(open.old_values, null, 2) ?? "–"}</pre></div>
            <div><p className="mb-1 font-semibold text-slate-600">After</p><pre className="max-h-80 overflow-auto rounded-lg bg-slate-50 p-3">{JSON.stringify(open.new_values, null, 2) ?? "–"}</pre></div>
          </div>
          {open.user_agent && <p className="mt-3 break-all text-xs text-slate-500">{open.user_agent}</p>}
        </Modal>
      )}
    </>
  );
}
