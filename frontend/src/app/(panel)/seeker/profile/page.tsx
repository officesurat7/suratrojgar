"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/panel/Shell";
import { useApi, useAuth, useMeta } from "@/components/providers";
import { Alert, Button, Card, Input, PageLoader, Select, TagInput, Textarea, toOptions } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";

type Profile = Record<string, string | number | null | string[]> & { skills: string[]; profile_completion: number; email: string };

const FIELDS = ["name", "mobile", "headline", "locality_id", "area", "pincode", "gender", "date_of_birth", "education_level_id", "employment_status", "experience_years",
  "preferred_category_id", "preferred_role_id", "expected_salary", "preferred_job_type", "preferred_locality_id", "preferred_work_mode", "availability", "about"];

export default function ProfilePage() {
  const meta = useMeta();
  const { refresh } = useAuth();
  const { toast } = useToast();
  const { data, loading, setData } = useApi<{ data: Profile }>("seeker/profile");
  const [f, setF] = useState<Record<string, string>>({});
  const [skills, setSkills] = useState<string[]>([]);
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setF(Object.fromEntries(FIELDS.map((k) => [k, data.data[k] == null ? "" : String(data.data[k])])));
    setSkills(data.data.skills);
  }, [data]);
  const roles = useMemo(() => meta?.categories.find((c) => String(c.id) === f.preferred_category_id)?.roles ?? [], [meta, f.preferred_category_id]);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const fe = (k: string) => err?.field(k);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    const body: Record<string, unknown> = { skills };
    for (const k of FIELDS) body[k] = f[k] === "" ? null : f[k];
    try {
      const r = await api.put<{ data: Profile }>("seeker/profile", body);
      setData(r); toast("Profile saved."); refresh();
    } catch (x) { setErr(x as ApiError); toast("Please check the highlighted fields.", "error"); } finally { setBusy(false); }
  };

  if (loading || !meta || !data) return <PageLoader />;
  const o = meta.options;
  const pc = data.data.profile_completion;
  return (
    <form onSubmit={save}>
      <PageHeader title="My profile" subtitle={`Profile ${pc}% complete · ${data.data.email}`} actions={<Button type="submit" loading={busy}>Save changes</Button>} />
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${pc}%` }} /></div>
      {err && !Object.keys(err.errors).length && <div className="mb-4"><Alert tone="red">{err.message}</Alert></div>}
      <div className="grid gap-5">
        <Card title="Basic details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" required maxLength={120} value={f.name ?? ""} onChange={set("name")} error={fe("name")} />
            <Input label="Mobile number" required inputMode="numeric" maxLength={10} value={f.mobile ?? ""} onChange={(e) => setF((s) => ({ ...s, mobile: e.target.value.replace(/\D/g, "") }))} error={fe("mobile")} hint="Shared only with employers you apply to." />
            <Input className="sm:col-span-2" label="Headline" maxLength={150} placeholder="e.g. Tally accountant with 3 years in textile trading" value={f.headline ?? ""} onChange={set("headline")} error={fe("headline")} />
            <Select label="Gender (optional)" options={toOptions(o.genders)} value={f.gender ?? ""} onChange={set("gender")} error={fe("gender")} />
            <Input label="Date of birth (optional)" type="date" value={f.date_of_birth ?? ""} onChange={set("date_of_birth")} error={fe("date_of_birth")} />
            <Select label="Area / locality" options={toOptions(meta.localities)} value={f.locality_id ?? ""} onChange={set("locality_id")} error={fe("locality_id")} />
            <Input label="PIN code" inputMode="numeric" maxLength={6} value={f.pincode ?? ""} onChange={(e) => setF((s) => ({ ...s, pincode: e.target.value.replace(/\D/g, "") }))} error={fe("pincode")} />
            <Input className="sm:col-span-2" label="Street / landmark" maxLength={120} value={f.area ?? ""} onChange={set("area")} error={fe("area")} />
          </div>
        </Card>
        <Card title="Education and experience">
          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Highest education" options={toOptions(meta.education_levels)} value={f.education_level_id ?? ""} onChange={set("education_level_id")} error={fe("education_level_id")} />
            <Select label="Current status" options={toOptions(o.employment_statuses)} value={f.employment_status ?? ""} onChange={set("employment_status")} error={fe("employment_status")} />
            <Input label="Experience (years)" type="number" min={0} max={50} step={0.5} value={f.experience_years ?? "0"} onChange={set("experience_years")} error={fe("experience_years")} />
            <div className="sm:col-span-3"><TagInput label="Skills" value={skills} onChange={setSkills} error={fe("skills")} /></div>
            <Textarea className="sm:col-span-3" label="About me" rows={4} maxLength={2000} value={f.about ?? ""} onChange={set("about")} error={fe("about")} hint="A few lines about your work, strengths and languages you speak." />
          </div>
        </Card>
        <Card title="Job preferences">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select label="Preferred category" options={toOptions(meta.categories)} value={f.preferred_category_id ?? ""} onChange={(e) => setF((s) => ({ ...s, preferred_category_id: e.target.value, preferred_role_id: "" }))} error={fe("preferred_category_id")} />
            <Select label="Preferred role" options={toOptions(roles)} disabled={!roles.length} value={f.preferred_role_id ?? ""} onChange={set("preferred_role_id")} error={fe("preferred_role_id")} />
            <Select label="Job type" options={toOptions(o.employment_types)} value={f.preferred_job_type ?? ""} onChange={set("preferred_job_type")} error={fe("preferred_job_type")} />
            <Select label="Work mode" options={toOptions(o.work_modes)} value={f.preferred_work_mode ?? ""} onChange={set("preferred_work_mode")} error={fe("preferred_work_mode")} />
            <Select label="Preferred work area" placeholder="Anywhere in Surat" options={toOptions(meta.localities)} value={f.preferred_locality_id ?? ""} onChange={set("preferred_locality_id")} error={fe("preferred_locality_id")} />
            <Input label="Expected salary (₹/month)" type="number" min={0} value={f.expected_salary ?? ""} onChange={set("expected_salary")} error={fe("expected_salary")} />
            <Select label="Can join" options={toOptions(o.availability)} value={f.availability ?? ""} onChange={set("availability")} error={fe("availability")} />
          </div>
        </Card>
      </div>
      <div className="mt-5 flex justify-end"><Button type="submit" size="lg" loading={busy}>Save changes</Button></div>
    </form>
  );
}
