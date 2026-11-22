"use client";

import { useState } from "react";
import { PageHeader } from "@/components/panel/Shell";
import { useApi } from "@/components/providers";
import { THEMES } from "@/components/site/HeroSlider";
import { Alert, Badge, Button, Checkbox, EmptyState, Input, Modal, PageLoader, Select, Textarea } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { cx, dateTimeIST } from "@/lib/format";

interface Slide { id: number; title: string; subtitle: string | null; cta_label: string | null; cta_url: string | null; theme: string | null; is_active: boolean; starts_at: string | null; ends_at: string | null; sort_order: number; image_url: string | null; mobile_image_url: string | null }

const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + 330 * 60000).toISOString().slice(0, 16) : "");

function SlideForm({ slide, onClose, onSaved }: { slide: Slide | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [f, setF] = useState({ title: slide?.title ?? "", subtitle: slide?.subtitle ?? "", cta_label: slide?.cta_label ?? "", cta_url: slide?.cta_url ?? "", theme: slide?.theme ?? "blue", is_active: slide?.is_active ?? true, starts_at: toLocal(slide?.starts_at ?? null), ends_at: toLocal(slide?.ends_at ?? null) });
  const [image, setImage] = useState<File | null>(null);
  const [mobile, setMobile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true); setErr(null);
    const fd = new FormData();
    (["title", "subtitle", "cta_label", "cta_url", "theme"] as const).forEach((k) => fd.append(k, f[k]));
    fd.append("is_active", f.is_active ? "1" : "0");
    // datetime-local values are IST wall-clock times
    if (f.starts_at) fd.append("starts_at", `${f.starts_at}:00+05:30`);
    if (f.ends_at) fd.append("ends_at", `${f.ends_at}:00+05:30`);
    if (image) fd.append("image", image);
    if (mobile) fd.append("mobile_image", mobile);
    if (removeImage) fd.append("remove_image", "1");
    try { const r = await api.post<{ message: string }>(slide ? `admin/sliders/${slide.id}` : "admin/sliders", fd); toast(r.message); onSaved(); onClose(); }
    catch (x) { setErr(x as ApiError); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={slide ? "Edit slide" : "New slide"} size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>Save slide</Button></>}>
      <div className="space-y-3">
        {err && !Object.keys(err.errors).length && <Alert tone="red">{err.message}</Alert>}
        <div className={cx("rounded-xl bg-gradient-to-br p-5 text-white", THEMES[f.theme] ?? THEMES.blue)}>
          <p className="text-lg font-extrabold">{f.title || "Slide title"}</p>
          {f.subtitle && <p className="mt-1 text-sm text-white/85">{f.subtitle}</p>}
          {f.cta_label && <span className="mt-3 inline-block rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-brand-700">{f.cta_label}</span>}
        </div>
        <Input label="Title" required maxLength={150} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} error={err?.field("title")} />
        <Textarea label="Subtitle" rows={2} maxLength={300} value={f.subtitle} onChange={(e) => setF({ ...f, subtitle: e.target.value })} error={err?.field("subtitle")} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Button text" maxLength={50} placeholder="Browse jobs" value={f.cta_label} onChange={(e) => setF({ ...f, cta_label: e.target.value })} error={err?.field("cta_label")} />
          <Input label="Button link" maxLength={255} placeholder="/jobs or https://…" value={f.cta_url} onChange={(e) => setF({ ...f, cta_url: e.target.value })} error={err?.field("cta_url")} />
          <Select label="Colour theme" options={[{ value: "blue", label: "Blue" }, { value: "navy", label: "Navy" }, { value: "emerald", label: "Emerald" }, { value: "sunrise", label: "Sunrise" }]} value={f.theme} onChange={(e) => setF({ ...f, theme: e.target.value })} />
          <div className="flex items-end pb-2"><Checkbox label="Show on homepage" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} /></div>
          <Input label="Show from (IST, optional)" type="datetime-local" value={f.starts_at} onChange={(e) => setF({ ...f, starts_at: e.target.value })} error={err?.field("starts_at")} />
          <Input label="Show until (IST, optional)" type="datetime-local" value={f.ends_at} onChange={(e) => setF({ ...f, ends_at: e.target.value })} error={err?.field("ends_at")} />
        </div>
        <Input label="Background image (optional)" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImage(e.target.files?.[0] ?? null)} error={err?.field("image")} hint="JPG, PNG or WebP, at least 800px wide, up to 2 MB. Leave empty to use the colour theme." />
        <Input label="Phone image (optional)" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setMobile(e.target.files?.[0] ?? null)} error={err?.field("mobile_image")} hint="Up to 1 MB. Used on small screens." />
        {slide?.image_url && <Checkbox label="Remove the current background image" checked={removeImage} onChange={(e) => setRemoveImage(e.target.checked)} />}
      </div>
    </Modal>
  );
}

export default function SlidersPage() {
  const { toast, confirm } = useToast();
  const { data, loading, reload, setData } = useApi<{ data: Slide[] }>("admin/sliders");
  const [edit, setEdit] = useState<Slide | null | "new">(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());
  const slides = data?.data ?? [];
  const move = (i: number, d: number) => {
    const n = [...slides]; const j = i + d; if (j < 0 || j >= n.length) return;
    [n[i], n[j]] = [n[j], n[i]]; setData({ data: n }); setDirty(true);
  };
  const saveOrder = async () => {
    setBusy(true);
    try { const r = await api.post<{ message: string }>("admin/sliders/reorder", { ids: slides.map((s) => s.id) }); toast(r.message); setDirty(false); }
    catch (x) { toast((x as Error).message, "error"); } finally { setBusy(false); }
  };
  const remove = async (s: Slide) => {
    if (!(await confirm({ title: "Delete this slide?", text: `"${s.title}" will be removed from the homepage.`, confirmLabel: "Delete", danger: true }))) return;
    try { const r = await api.del<{ message: string }>(`admin/sliders/${s.id}`); toast(r.message); reload(); }
    catch (x) { toast((x as Error).message, "error"); }
  };
  return (
    <>
      <PageHeader title="Homepage slider" subtitle="Slides show in this order at the top of the homepage."
        actions={<>{dirty && <Button size="sm" variant="success" loading={busy} onClick={saveOrder}>Save order</Button>}<Button size="sm" onClick={() => setEdit("new")}>Add slide</Button></>} />
      {loading && !data ? <PageLoader /> : !slides.length ? <EmptyState icon="🖼️" title="No slides yet" text="The homepage shows a default banner until you add one." action={<Button onClick={() => setEdit("new")}>Add slide</Button>} /> : (
        <ul className="space-y-3">
          {slides.map((s, i) => {
            const scheduled = s.starts_at && new Date(s.starts_at).getTime() > now;
            const ended = s.ends_at && new Date(s.ends_at).getTime() < now;
            return (
              <li key={s.id} className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                <div className={cx("relative h-24 w-full shrink-0 overflow-hidden rounded-lg bg-gradient-to-br sm:w-44", THEMES[s.theme ?? "blue"] ?? THEMES.blue)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {s.image_url && <img src={s.image_url} alt="" className="h-full w-full object-cover" />}
                  <span className="absolute left-2 top-2 rounded bg-black/40 px-1.5 text-xs font-bold text-white">{i + 1}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{s.title}</p>
                  {s.subtitle && <p className="line-clamp-2 text-sm text-slate-600">{s.subtitle}</p>}
                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                    {!s.is_active ? <Badge tone="slate">Hidden</Badge> : ended ? <Badge tone="red">Ended</Badge> : scheduled ? <Badge tone="amber">Scheduled</Badge> : <Badge tone="green">Live</Badge>}
                    {s.cta_label && <Badge tone="blue">{s.cta_label} → {s.cta_url}</Badge>}
                    {(s.starts_at || s.ends_at) && <span className="text-slate-500">{s.starts_at ? dateTimeIST(s.starts_at) : "Now"} – {s.ends_at ? dateTimeIST(s.ends_at) : "no end"}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button size="sm" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</Button>
                  <Button size="sm" variant="ghost" aria-label="Move down" disabled={i === slides.length - 1} onClick={() => move(i, 1)}>↓</Button>
                  <Button size="sm" variant="outline" onClick={() => setEdit(s)}>Edit</Button>
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(s)}>Delete</Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {edit && <SlideForm slide={edit === "new" ? null : edit} onClose={() => setEdit(null)} onSaved={reload} />}
    </>
  );
}
