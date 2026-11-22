"use client";

import { useState } from "react";
import { PageHeader, Table } from "@/components/panel/Shell";
import { useApi } from "@/components/providers";
import { Badge, Button, Card, EmptyState, PageLoader, Pagination, Tabs } from "@/components/ui";
import { dateTimeIST } from "@/lib/format";

interface Login { id: number; email: string | null; success: boolean; ip: string | null; reason: string | null; user_agent: string | null; created_at: string; user: { id: number; name: string; user_type: string } | null }
interface Sec { data: Login[]; meta: { current_page: number; last_page: number; total: number }; failed_by_ip_24h: { ip: string; c: number }[]; top_contact_viewers_24h: { user_id: number; c: number; user: { name: string; email: string } | null }[] }

function Security() {
  const [page, setPage] = useState(1);
  const [success, setSuccess] = useState("");
  const [q, setQ] = useState({ email: "", ip: "" });
  const [draft, setDraft] = useState(q);
  const { data, loading } = useApi<Sec>(`super/logs/security?page=${page}${success ? `&success=${success}` : ""}${q.email ? `&email=${encodeURIComponent(q.email)}` : ""}${q.ip ? `&ip=${encodeURIComponent(q.ip)}` : ""}`);
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <div>
        <form className="mb-3 grid gap-2 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(draft); }}>
          <input className="input" placeholder="Email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} aria-label="Email" />
          <input className="input" placeholder="IP address" value={draft.ip} onChange={(e) => setDraft({ ...draft, ip: e.target.value })} aria-label="IP" />
          <select className="input" value={success} onChange={(e) => { setSuccess(e.target.value); setPage(1); }} aria-label="Result"><option value="">All logins</option><option value="1">Successful</option><option value="0">Failed</option></select>
          <Button type="submit" variant="outline">Filter</Button>
        </form>
        {loading && !data ? <PageLoader /> : !data?.data.length ? <EmptyState icon="🔐" title="No login records" /> : (
          <Table head={["When (IST)", "Account", "Result", "IP"]}>
            {data.data.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap px-4 py-2 text-slate-600">{dateTimeIST(l.created_at)}</td>
                <td className="px-4 py-2">{l.user?.name ?? "–"}<p className="text-xs text-slate-500">{l.email}{l.user ? ` · ${l.user.user_type.replace("_", " ")}` : ""}</p></td>
                <td className="px-4 py-2">{l.success ? <Badge tone="green">OK</Badge> : <Badge tone="red">Failed</Badge>}{l.reason && <p className="text-xs text-slate-500">{l.reason}</p>}</td>
                <td className="px-4 py-2 font-mono text-xs text-slate-500">{l.ip}</td>
              </tr>
            ))}
          </Table>
        )}
        {data && <Pagination page={data.meta.current_page} last={data.meta.last_page} onPage={setPage} />}
      </div>
      <div className="space-y-5">
        <Card title="Failed logins by IP (24 h)" bodyClass="p-0">
          <ul className="divide-y divide-slate-100 text-sm">{data?.failed_by_ip_24h.map((r) => <li key={r.ip} className="flex justify-between px-4 py-2"><span className="font-mono text-xs">{r.ip}</span><span className="font-semibold tabular-nums">{r.c}</span></li>)}{!data?.failed_by_ip_24h.length && <li className="px-4 py-3 text-slate-500">None</li>}</ul>
        </Card>
        <Card title="Most employer-contact views (24 h)" bodyClass="p-0">
          <ul className="divide-y divide-slate-100 text-sm">{data?.top_contact_viewers_24h.map((r) => <li key={r.user_id} className="flex justify-between gap-2 px-4 py-2"><span className="truncate">{r.user?.name ?? `User ${r.user_id}`}<span className="block truncate text-xs text-slate-500">{r.user?.email}</span></span><span className="font-semibold tabular-nums">{r.c}</span></li>)}{!data?.top_contact_viewers_24h.length && <li className="px-4 py-3 text-slate-500">None</li>}</ul>
          <p className="px-4 pb-3 text-xs text-slate-500">A very high count can mean someone is collecting phone numbers.</p>
        </Card>
      </div>
    </div>
  );
}

function System() {
  const [file, setFile] = useState("");
  const { data, loading } = useApi<{ files: string[]; file: string | null; lines: string[] }>(`super/logs/system${file ? `?file=${encodeURIComponent(file)}` : ""}`);
  if (loading && !data) return <PageLoader />;
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select className="input max-w-xs" value={file || data?.file || ""} onChange={(e) => setFile(e.target.value)} aria-label="Log file">{data?.files.map((f) => <option key={f} value={f}>{f}</option>)}</select>
        <span className="text-xs text-slate-500">Newest first, last 200 entries. Secrets are hidden.</span>
      </div>
      {!data?.lines.length ? <EmptyState icon="📄" title="Log is empty" /> : (
        <div className="space-y-1.5">{data.lines.map((l, i) => {
          const lvl = /\.(ERROR|CRITICAL|ALERT|EMERGENCY):/.test(l) ? "border-red-300 bg-red-50" : /\.WARNING:/.test(l) ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white";
          return <pre key={i} className={`max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg border p-2 text-xs ${lvl}`}>{l}</pre>;
        })}</div>
      )}
    </>
  );
}

export default function LogsPage() {
  const [tab, setTab] = useState<"security" | "system">("security");
  return (
    <>
      <PageHeader title="System & security logs" />
      <Tabs value={tab} onChange={setTab} items={[{ value: "security", label: "Logins & security" }, { value: "system", label: "Application log" }]} />
      <div className="mt-4">{tab === "security" ? <Security /> : <System />}</div>
    </>
  );
}
