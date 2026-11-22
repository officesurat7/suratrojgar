"use client";

import { useState } from "react";
import { PageHeader, Table } from "@/components/panel/Shell";
import { useApi, useMeta } from "@/components/providers";
import { Alert, Badge, Button, Checkbox, EmptyState, Input, Modal, PageLoader, Select, Tabs, Textarea, toOptions } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";

type T = "categories" | "roles" | "skills" | "localities" | "education" | "business-categories";
type Item = Record<string, unknown> & { id: number; name: string; slug: string };
const TYPES: { value: T; label: string; one: string }[] = [
  { value: "categories", label: "Job categories", one: "category" },
  { value: "roles", label: "Job roles", one: "role" },
  { value: "localities", label: "Surat areas", one: "area" },
  { value: "skills", label: "Skills", one: "skill" },
  { value: "education", label: "Education", one: "education level" },
  { value: "business-categories", label: "Business types", one: "business type" },
];

/** Which extra fields each type has: [key, label, input kind]. */
const FIELDS: Record<T, [string, string, "text" | "number" | "textarea" | "bool" | "category"][]> = {
  categories: [["icon", "Icon (emoji or icon name)", "text"], ["description", "Description", "textarea"], ["sort_order", "Display order", "number"]],
  roles: [["job_category_id", "Category", "category"]],
  skills: [],
  localities: [["zone", "Zone (e.g. South West)", "text"], ["pincode", "PIN code", "text"], ["latitude", "Latitude", "number"], ["longitude", "Longitude", "number"], ["sort_order", "Display order", "number"]],
  education: [["rank", "Rank (higher = more advanced)", "number"]],
  "business-categories": [["requires_job_approval", "Jobs from this business type need admin approval", "bool"]],
};

function ItemForm({ type, item, onClose, onSaved }: { type: T; item: Item | null; onClose: () => void; onSaved: () => void }) {
  const meta = useMeta();
  const { toast } = useToast();
  const fields = FIELDS[type];
  const init: Record<string, unknown> = { name: item?.name ?? "", is_active: item ? item.is_active !== false : true };
  fields.forEach(([k, , kind]) => { init[k] = item?.[k] ?? (kind === "bool" ? false : ""); });
  const [f, setF] = useState(init);
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true); setErr(null);
    const body: Record<string, unknown> = { name: f.name };
    if (type !== "skills") body.is_active = f.is_active;
    fields.forEach(([k, , kind]) => { const v = f[k]; body[k] = kind === "bool" ? !!v : v === "" ? null : kind === "number" || kind === "category" ? Number(v) : v; });
    try { const r = await api[item ? "put" : "post"]<{ message: string }>(`admin/taxonomy/${type}${item ? `/${item.id}` : ""}`, body); toast(r.message); onSaved(); onClose(); }
    catch (x) { setErr(x as ApiError); } finally { setBusy(false); }
  };
  const one = TYPES.find((t) => t.value === type)!.one;
  return (
    <Modal open onClose={onClose} title={item ? `Edit ${one}` : `Add ${one}`}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>Save</Button></>}>
      <div className="space-y-3">
        {err && !Object.keys(err.errors).length && <Alert tone="red">{err.message}</Alert>}
        <Input label="Name" required maxLength={100} value={String(f.name)} onChange={(e) => setF({ ...f, name: e.target.value })} error={err?.field("name")} hint={item ? "Changing the name also changes the page address (slug) for this item." : undefined} />
        {fields.map(([k, label, kind]) => kind === "textarea" ? <Textarea key={k} label={label} rows={2} maxLength={500} value={String(f[k] ?? "")} onChange={(e) => setF({ ...f, [k]: e.target.value })} error={err?.field(k)} />
          : kind === "bool" ? <Checkbox key={k} label={label} checked={!!f[k]} onChange={(e) => setF({ ...f, [k]: e.target.checked })} />
          : kind === "category" ? <Select key={k} label={label} required options={toOptions(meta?.categories)} value={String(f[k] ?? "")} onChange={(e) => setF({ ...f, [k]: e.target.value })} error={err?.field(k)} />
          : <Input key={k} label={label} type={kind} step={kind === "number" ? "any" : undefined} value={String(f[k] ?? "")} onChange={(e) => setF({ ...f, [k]: e.target.value })} error={err?.field(k)} />)}
        {type !== "skills" && <Checkbox label="Active (shown on the website and in forms)" checked={!!f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} />}
      </div>
    </Modal>
  );
}

export default function TaxonomyPage() {
  const meta = useMeta();
  const { toast, confirm } = useToast();
  const [type, setType] = useState<T>("categories");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("");
  const [edit, setEdit] = useState<Item | null | "new">(null);
  const { data, loading, reload } = useApi<{ data: Item[] }>(`admin/taxonomy/${type}?q=${encodeURIComponent(search)}${type === "roles" && cat ? `&category_id=${cat}` : ""}`);
  const one = TYPES.find((t) => t.value === type)!.one;
  const remove = async (it: Item) => {
    if (!(await confirm({ title: `Delete "${it.name}"?`, text: "If it is in use, deactivating is safer than deleting.", confirmLabel: "Delete", danger: true }))) return;
    try { const r = await api.del<{ message: string }>(`admin/taxonomy/${type}/${it.id}`); toast(r.message); reload(); }
    catch (x) { toast((x as Error).message, "error"); }
  };
  const extra = (it: Item): string => {
    switch (type) {
      case "categories": return `${it.jobs_count ?? 0} active job(s) · order ${it.sort_order ?? "–"}`;
      case "roles": return (it.category as { name: string } | null)?.name ?? "";
      case "localities": return [it.zone, it.pincode].filter(Boolean).join(" · ");
      case "education": return `Rank ${it.rank}`;
      case "business-categories": return it.requires_job_approval ? "Jobs need approval" : "";
      default: return "";
    }
  };
  return (
    <>
      <PageHeader title="Categories & areas" subtitle="Lists used in job forms, filters and SEO pages. Changes show on the website within a few minutes."
        actions={<Button size="sm" onClick={() => setEdit("new")}>Add {one}</Button>} />
      <Tabs value={type} onChange={(v) => { setType(v); setSearch(""); setQ(""); setCat(""); }} items={TYPES.map(({ value, label }) => ({ value, label }))} />
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <form onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()); }}><input className="input" placeholder={`Search ${TYPES.find((t) => t.value === type)!.label.toLowerCase()}`} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" /></form>
        {type === "roles" && <select className="input" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category"><option value="">All categories</option>{meta?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
      </div>
      <div className="mt-4">
        {loading && !data ? <PageLoader /> : !data?.data.length ? <EmptyState icon="🏷️" title="Nothing here yet" /> : (
          <Table head={["Name", "Details", "Status", ""]}>
            {data.data.map((it) => (
              <tr key={it.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5"><p className="font-medium text-ink">{type === "categories" && it.icon ? <span className="mr-1">{String(it.icon).length <= 3 ? String(it.icon) : ""}</span> : null}{it.name}</p><p className="font-mono text-xs text-slate-400">{it.slug}</p></td>
                <td className="px-4 py-2.5 text-slate-600">{extra(it) || "–"}</td>
                <td className="px-4 py-2.5">{type === "skills" ? "–" : it.is_active === false ? <Badge tone="slate">Inactive</Badge> : <Badge tone="green">Active</Badge>}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right"><Button size="sm" variant="outline" onClick={() => setEdit(it)}>Edit</Button> <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(it)}>Delete</Button></td>
              </tr>
            ))}
          </Table>
        )}
        {data && data.data.length >= 1000 && <p className="mt-2 text-xs text-slate-500">Showing the first 1,000. Use search to narrow down.</p>}
      </div>
      {edit && <ItemForm key={`${type}-${edit === "new" ? "new" : edit.id}`} type={type} item={edit === "new" ? null : edit} onClose={() => setEdit(null)} onSaved={reload} />}
    </>
  );
}
