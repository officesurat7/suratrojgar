"use client";

import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/panel/Shell";
import { useApi, useAuth, useMeta } from "@/components/providers";
import { Alert, Badge, Button, Card, Input, PageLoader, Select, Textarea, toOptions } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";

type P = Record<string, string | number | boolean | null>;
const FIELDS = ["company_name", "contact_person", "company_type", "business_category_id", "website", "gstin", "locality_id", "area", "address", "pincode", "about", "company_size"];

export default function CompanyProfilePage() {
  const meta = useMeta();
  const { refresh } = useAuth();
  const { toast } = useToast();
  const { data, loading, setData } = useApi<{ data: P }>("employer/profile");
  const [f, setF] = useState<Record<string, string>>({});
  const [logo, setLogo] = useState<File | null>(null);
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => { if (data) setF(Object.fromEntries(FIELDS.map((k) => [k, data.data[k] == null ? "" : String(data.data[k])]))); }, [data]);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const fe = (k: string) => err?.field(k);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    const fd = new FormData();
    for (const k of FIELDS) fd.append(k, f[k] ?? "");
    if (logo) fd.append("logo", logo);
    try { const r = await api.post<{ data: P }>("employer/profile", fd); setData(r); setLogo(null); toast("Company profile saved."); refresh(); }
    catch (x) { setErr(x as ApiError); toast("Please check the highlighted fields.", "error"); } finally { setBusy(false); }
  };

  if (loading || !meta || !data) return <PageLoader />;
  const p = data.data;
  return (
    <form onSubmit={save}>
      <PageHeader title="Company profile" subtitle={<span className="flex flex-wrap items-center gap-2">Public name: <strong>{String(p.name)}</strong> {p.verified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Verification pending</Badge>}</span>}
        actions={<Button type="submit" loading={busy}>Save</Button>} />
      {err && !Object.keys(err.errors).length && <div className="mb-4"><Alert tone="red">{err.message}</Alert></div>}
      <div className="grid gap-5">
        <Card title="Public details" actions={p.slug ? <a href={`/companies/${p.slug}`} target="_blank" rel="noopener" className="text-sm font-semibold text-brand-700">View public page ↗</a> : null}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-4 sm:col-span-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {logo ? <img src={URL.createObjectURL(logo)} alt="" className="h-16 w-16 rounded-xl object-cover ring-1 ring-slate-200" /> : p.logo_url ? <img src={String(p.logo_url)} alt="" className="h-16 w-16 rounded-xl object-cover ring-1 ring-slate-200" /> : <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-brand-50 text-2xl font-bold text-brand-700">{String(p.company_name).charAt(0)}</span>}
              <div>
                <Button type="button" size="sm" variant="outline" onClick={() => file.current?.click()}>Upload logo</Button>
                <p className="mt-1 text-xs text-slate-500">JPG, PNG or WebP, up to 1 MB.</p>
                {fe("logo") && <p className="text-sm text-red-600">{fe("logo")}</p>}
              </div>
              <input ref={file} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
            </div>
            <Input label="Company name" required maxLength={150} value={f.company_name ?? ""} onChange={set("company_name")} error={fe("company_name")} hint="For verified companies, the public name stays the same until our team reviews the change." />
            <Select label="Company type" required options={toOptions(meta.options.company_types)} value={f.company_type ?? ""} onChange={set("company_type")} error={fe("company_type")} />
            <Select label="Business category" required options={toOptions(meta.business_categories)} value={f.business_category_id ?? ""} onChange={set("business_category_id")} error={fe("business_category_id")} />
            <Select label="Company size" options={[{ value: "1-10", label: "1–10" }, { value: "11-50", label: "11–50" }, { value: "51-200", label: "51–200" }, { value: "201-500", label: "201–500" }, { value: "500+", label: "500+" }]} value={f.company_size ?? ""} onChange={set("company_size")} error={fe("company_size")} />
            <Input label="Website" type="url" maxLength={255} value={f.website ?? ""} onChange={set("website")} error={fe("website")} />
            <Select label="Area" required options={toOptions(meta.localities)} value={f.locality_id ?? ""} onChange={set("locality_id")} error={fe("locality_id")} />
            <Textarea className="sm:col-span-2" label="About the company" rows={5} maxLength={3000} value={f.about ?? ""} onChange={set("about")} error={fe("about")} hint="Shown on your job posts and company page." />
          </div>
        </Card>
        <Card title="Private details (never shown publicly)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Contact person" required maxLength={120} value={f.contact_person ?? ""} onChange={set("contact_person")} error={fe("contact_person")} />
            <Input label="GSTIN" maxLength={15} value={f.gstin ?? ""} onChange={(e) => setF((s) => ({ ...s, gstin: e.target.value.toUpperCase() }))} error={fe("gstin")} />
            <Input label="Landmark / area" maxLength={120} value={f.area ?? ""} onChange={set("area")} error={fe("area")} />
            <Input label="PIN code" required inputMode="numeric" maxLength={6} value={f.pincode ?? ""} onChange={(e) => setF((s) => ({ ...s, pincode: e.target.value.replace(/\D/g, "") }))} error={fe("pincode")} />
            <Textarea className="sm:col-span-2" label="Full address" required rows={2} maxLength={500} value={f.address ?? ""} onChange={set("address")} error={fe("address")} />
          </div>
        </Card>
      </div>
    </form>
  );
}
