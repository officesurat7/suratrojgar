"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/panel/Shell";
import { useApi } from "@/components/providers";
import { Alert, Badge, Button, Card, PageLoader } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { cx, dateIST, dateTimeIST } from "@/lib/format";

interface Item { job_id: number; priority: number; starts_at: string | null; ends_at: string | null; job: { id: number; title: string; company: string; status: string; expires_at: string | null; is_live: boolean; url: string } | null }
interface Cand { id: number; title: string; company: string; published_at: string | null; expires_at: string | null }
interface Hist { id: number; action: string; old_values: unknown; new_values: unknown; created_at: string; user: { name: string } | null }

const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + 5.5 * 3600e3).toISOString().slice(0, 16) : "");
const fromLocal = (v: string) => (v ? `${v}:00+05:30` : null);

export default function FeaturedPage() {
  const { toast } = useToast();
  const { data, loading, reload } = useApi<{ max: number; data: Item[] }>("admin/featured");
  const { data: hist, reload: reloadHist } = useApi<{ data: Hist[] }>("admin/featured/history");
  const [list, setList] = useState<Item[]>([]);
  const [dirty, setDirty] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [cands, setCands] = useState<Cand[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const max = data?.max ?? 30;

  const [synced, setSynced] = useState<typeof data>(null);
  if (data && data !== synced) { setSynced(data); setList([...data.data].sort((a, b) => a.priority - b.priority)); setDirty(false); }
  useEffect(() => {
    const t = setTimeout(() => api.get<{ data: Cand[] }>(`admin/featured/candidates?q=${encodeURIComponent(q)}`).then((r) => setCands(r.data)).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q, data]);

  const renumber = (l: Item[]) => l.map((x, i) => ({ ...x, priority: i + 1 }));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= list.length || from === to) return;
    const l = [...list]; const [it] = l.splice(from, 1); l.splice(to, 0, it);
    setList(renumber(l)); setDirty(true);
  };
  const setNumber = (idx: number, n: number) => { if (n >= 1 && n <= list.length) move(idx, n - 1); };
  const add = (c: Cand) => {
    if (list.length >= max) { toast(`The priority list holds at most ${max} jobs.`, "error"); return; }
    setList(renumber([...list, { job_id: c.id, priority: list.length + 1, starts_at: null, ends_at: null, job: { id: c.id, title: c.title, company: c.company, status: "active", expires_at: c.expires_at, is_live: true, url: "" } }]));
    setCands((cs) => cs.filter((x) => x.id !== c.id)); setDirty(true);
  };
  const remove = (idx: number) => { setList(renumber(list.filter((_, i) => i !== idx))); setDirty(true); };
  const setWindow = (idx: number, k: "starts_at" | "ends_at", v: string) => { setList(list.map((x, i) => (i === idx ? { ...x, [k]: fromLocal(v) } : x))); setDirty(true); };
  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await api.put<{ message: string }>("admin/featured", { items: list.map((x) => ({ job_id: x.job_id, priority: x.priority, starts_at: x.starts_at, ends_at: x.ends_at })) });
      toast(r.message); reload(); reloadHist();
    } catch (x) { const ae = x as ApiError; setErr(Object.values(ae.errors)[0]?.[0] ?? ae.message); } finally { setBusy(false); }
  };

  if (loading && !data) return <PageLoader />;
  return (
    <>
      <PageHeader title="Priority jobs" subtitle={`Up to ${max} jobs shown first on the homepage and job listings, in this order. After them, the newest jobs follow.`}
        actions={<><Button variant="ghost" disabled={!dirty} onClick={() => data && setList([...data.data].sort((a, b) => a.priority - b.priority))}>Undo changes</Button><Button disabled={!dirty} loading={busy} onClick={save}>Save order</Button></>} />
      {err && <div className="mb-4"><Alert tone="red">{err}</Alert></div>}
      {dirty && <div className="mb-4"><Alert tone="amber">You have unsaved changes. Click <strong>Save order</strong> to publish them.</Alert></div>}
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card title={`Priority list (${list.length}/${max})`} bodyClass="p-0">
          {!list.length ? <p className="p-6 text-center text-sm text-slate-500">No priority jobs. Add active jobs from the right.</p> : (
            <ol className="divide-y divide-slate-100">
              {list.map((it, i) => (
                <li key={it.job_id} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag !== null) move(drag, i); setDrag(null); }} onDragEnd={() => setDrag(null)}
                  className={cx("flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:px-4", drag === i && "bg-brand-50 opacity-60")}>
                  <div className="flex items-center gap-2">
                    <span className="hidden cursor-grab select-none text-slate-400 sm:inline" aria-hidden="true" title="Drag to reorder">⠿</span>
                    <input type="number" min={1} max={list.length} value={it.priority} aria-label={`Priority for ${it.job?.title}`}
                      onChange={(e) => setNumber(i, Number(e.target.value))} className="w-14 rounded-lg border border-slate-300 px-2 py-1.5 text-center text-sm font-bold text-brand-700" />
                    <div className="flex flex-col">
                      <button className="px-1 text-xs text-slate-500 hover:text-ink disabled:opacity-30" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Move up">▲</button>
                      <button className="px-1 text-xs text-slate-500 hover:text-ink disabled:opacity-30" disabled={i === list.length - 1} onClick={() => move(i, i + 1)} aria-label="Move down">▼</button>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink"><Link href={`/admin/jobs/${it.job_id}`} className="hover:text-brand-700">{it.job?.title ?? `Job #${it.job_id}`}</Link></p>
                    <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">{it.job?.company} · #{it.job_id}{it.job?.expires_at ? ` · expires ${dateIST(it.job.expires_at)}` : ""}
                      {it.job && !it.job.is_live && <Badge tone="red">Not live: hidden</Badge>}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <label className="flex flex-col gap-0.5 text-slate-500">Show from<input type="datetime-local" className="rounded-md border border-slate-300 px-2 py-1 text-ink" value={toLocal(it.starts_at)} onChange={(e) => setWindow(i, "starts_at", e.target.value)} /></label>
                      <label className="flex flex-col gap-0.5 text-slate-500">Until<input type="datetime-local" className="rounded-md border border-slate-300 px-2 py-1 text-ink" value={toLocal(it.ends_at)} onChange={(e) => setWindow(i, "ends_at", e.target.value)} /></label>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="self-end text-red-600 sm:self-center" onClick={() => remove(i)}>Remove</Button>
                </li>
              ))}
            </ol>
          )}
        </Card>
        <div className="space-y-5">
          <Card title="Add active jobs">
            <input className="input" placeholder="Search title, company or job ID" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search jobs to add" />
            <ul className="mt-3 max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {cands.filter((c) => !list.some((x) => x.job_id === c.id)).map((c) => (
                <li key={c.id} className="flex items-center gap-2 py-2">
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{c.title}</p><p className="truncate text-xs text-slate-500">{c.company} · #{c.id}</p></div>
                  <Button size="sm" variant="secondary" onClick={() => add(c)} disabled={list.length >= max}>Add</Button>
                </li>
              ))}
              {!cands.length && <li className="py-3 text-sm text-slate-500">No matching active jobs.</li>}
            </ul>
          </Card>
          <Card title="Rules">
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>Priority 1 shows first, then 2, and so on up to {max}.</li>
              <li>Each number can be used once. Saving replaces the whole list.</li>
              <li>Paused, closed, expired or deleted jobs are hidden automatically and removed from this list.</li>
              <li>Every change is recorded below.</li>
            </ul>
          </Card>
        </div>
      </div>
      <Card className="mt-5" title="Change history" bodyClass="p-0">
        <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto text-sm">
          {hist?.data.map((h) => (
            <li key={h.id} className="flex flex-wrap gap-x-3 px-4 py-2.5"><span className="text-slate-500">{dateTimeIST(h.created_at)}</span><span className="font-semibold">{h.user?.name ?? "System"}</span><span className="text-slate-700">{h.action.replace("featured_jobs.", "").replace(/_/g, " ")}</span></li>
          ))}
          {!hist?.data.length && <li className="px-4 py-3 text-slate-500">No changes yet.</li>}
        </ul>
      </Card>
    </>
  );
}
