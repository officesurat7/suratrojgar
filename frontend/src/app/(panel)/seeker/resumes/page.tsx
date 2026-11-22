"use client";

import { useRef, useState } from "react";
import { PageHeader } from "@/components/panel/Shell";
import { useApi } from "@/components/providers";
import { Alert, Badge, Button, EmptyState, PageLoader } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { bytes, dateIST } from "@/lib/format";

interface Resume { id: number; name: string; size: number; mime: string; is_default: boolean; scan_status: string; uploaded_at: string }

export default function ResumesPage() {
  const { data, loading, reload } = useApi<{ data: Resume[] }>("seeker/resumes");
  const { toast, confirm } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | number>("");
  const [replaceId, setReplaceId] = useState<number | null>(null);
  const list = data?.data ?? [];

  const upload = async (file: File) => {
    if (!/\.(pdf|docx)$/i.test(file.name)) { toast("Only PDF or Word (.docx) files are allowed.", "error"); return; }
    if (file.size > 5 * 1024 * 1024) { toast("File is larger than 5 MB.", "error"); return; }
    const fd = new FormData();
    fd.append("resume", file);
    if (replaceId) fd.append("replace_id", String(replaceId));
    setBusy("upload");
    try { const r = await api.post<{ message: string }>("seeker/resumes", fd); toast(r.message); reload(); }
    catch (e) { toast((e as Error).message, "error"); }
    finally { setBusy(""); setReplaceId(null); if (input.current) input.current.value = ""; }
  };
  const view = async (r: Resume) => {
    setBusy(r.id);
    try { const { url } = await api.get<{ url: string }>(`seeker/resumes/${r.id}/download`); window.open(url, "_blank", "noopener"); }
    catch (e) { toast((e as Error).message, "error"); } finally { setBusy(""); }
  };
  const act = async (fn: () => Promise<{ message: string }>) => { try { const r = await fn(); toast(r.message); reload(); } catch (e) { toast((e as Error).message, "error"); } };

  return (
    <>
      <PageHeader title="Resumes" subtitle="Upload up to 5 resumes (PDF or Word, max 5 MB). Your default resume is pre-selected when you apply."
        actions={<Button loading={busy === "upload"} disabled={list.length >= 5} onClick={() => { setReplaceId(null); input.current?.click(); }}>Upload resume</Button>} />
      <input ref={input} type="file" hidden accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      {list.length >= 5 && <div className="mb-4"><Alert tone="amber">You have 5 resumes. Delete or replace one to upload another.</Alert></div>}
      {loading && !data ? <PageLoader /> : !list.length ? (
        <EmptyState icon="📄" title="No resume yet" text="Employers are more likely to shortlist candidates with a resume." action={<Button onClick={() => input.current?.click()}>Upload your first resume</Button>} />
      ) : (
        <ul className="grid gap-3">
          {list.map((r) => (
            <li key={r.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-bold uppercase text-brand-700">{r.name.split(".").pop()}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{r.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  {bytes(r.size)} · Uploaded {dateIST(r.uploaded_at)}
                  {r.is_default && <Badge tone="blue">Default</Badge>}
                  {r.scan_status === "infected" && <Badge tone="red">Blocked by virus scan</Badge>}
                  {r.scan_status === "pending" && <Badge tone="slate">Scanning</Badge>}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" loading={busy === r.id} onClick={() => view(r)}>View</Button>
                {!r.is_default && <Button size="sm" variant="outline" onClick={() => act(() => api.post(`seeker/resumes/${r.id}/default`))}>Make default</Button>}
                <Button size="sm" variant="outline" onClick={() => { setReplaceId(r.id); input.current?.click(); }}>Replace</Button>
                <Button size="sm" variant="ghost" className="text-red-600" onClick={async () => { if (await confirm({ title: "Delete resume?", text: r.name, confirmLabel: "Delete", danger: true })) act(() => api.del(`seeker/resumes/${r.id}`)); }}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
