"use client";

import { useMemo, useState } from "react";
import { useMeta } from "@/components/providers";
import { Alert, Button, Card, Checkbox, Input, Modal, PageLoader, Select, TagInput, Textarea, toOptions } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { experienceText, salaryText } from "@/lib/format";

export type JobFormData = Record<string, unknown>;

const STR = ["title", "job_category_id", "job_role_id", "description", "vacancies", "salary_min", "salary_max", "salary_period", "employment_type", "work_mode", "shift",
  "locality_id", "area", "pincode", "office_address", "experience_min", "experience_max", "education_level_id", "joining", "working_days", "working_hours", "weekly_off",
  "benefits", "gender_preference", "gender_justification", "expires_at", "contact_name", "contact_mobile", "contact_email", "contact_visibility"];

function fromJob(j: JobFormData | null): Record<string, string> {
  const base: Record<string, string> = { salary_period: "monthly", employment_type: "full_time", work_mode: "onsite", joining: "flexible", gender_preference: "any", contact_visibility: "verified_users", vacancies: "1", experience_min: "0" };
  if (!j) return base;
  for (const k of STR) if (j[k] != null) base[k] = k === "expires_at" ? String(j[k]).slice(0, 10) : String(j[k]);
  return base;
}

/** Create/edit job form shared by employers and admins. Private contact fields are clearly marked. */
export function JobForm({ initial, endpoint, method, onSaved, defaults, extraBody }: {
  initial: JobFormData | null; endpoint: string; method: "post" | "put"; onSaved: (job: JobFormData, message: string) => void; defaults?: Record<string, string>; extraBody?: Record<string, unknown>;
}) {
  const meta = useMeta();
  const { toast } = useToast();
  const [f, setF] = useState<Record<string, string>>(() => ({ ...fromJob(initial), ...(initial?.id ? {} : defaults ?? {}) }));
  const [negotiable, setNegotiable] = useState<boolean>(!!initial?.salary_negotiable);
  const [allowReapply, setAllowReapply] = useState<boolean>(!!initial?.allow_reapply);
  const [req, setReq] = useState<string[]>((initial?.skills_required as string[]) ?? []);
  const [pref, setPref] = useState<string[]>((initial?.skills_preferred as string[]) ?? []);
  const [questions, setQuestions] = useState<{ question: string; is_required: boolean }[]>(((initial?.questions as { question: string; is_required: boolean }[]) ?? []).map((q) => ({ question: q.question, is_required: q.is_required })));
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState<"" | "draft" | "submit">("");
  const [preview, setPreview] = useState(false);
  const [dupConfirm, setDupConfirm] = useState(false);

  const roles = useMemo(() => meta?.categories.find((c) => String(c.id) === f.job_category_id)?.roles ?? [], [meta, f.job_category_id]);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const fe = (k: string) => err?.field(k);
  const status = initial?.status as string | undefined;
  const isLive = status && ["active", "pending", "paused"].includes(status);

  const save = async (submit: boolean, confirmDuplicate = dupConfirm) => {
    setBusy(submit ? "submit" : "draft"); setErr(null);
    const body: Record<string, unknown> = { ...extraBody, submit, salary_negotiable: negotiable, allow_reapply: allowReapply, skills_required: req, skills_preferred: pref, questions: questions.filter((q) => q.question.trim()), confirm_duplicate: confirmDuplicate };
    for (const k of STR) body[k] = f[k] === "" || f[k] === undefined ? null : f[k];
    try {
      const r = method === "post" ? await api.post<{ message: string; data: JobFormData }>(endpoint, body) : await api.put<{ message: string; data: JobFormData }>(endpoint, body);
      onSaved(r.data, r.message);
    } catch (x) {
      const ae = x as ApiError;
      setErr(ae);
      if (ae.field("confirm_duplicate")) setDupConfirm(false);
      toast(Object.keys(ae.errors).length ? "Please fix the highlighted fields." : ae.message, "error");
      setTimeout(() => document.querySelector("[aria-invalid=true]")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    } finally { setBusy(""); }
  };

  if (!meta) return <PageLoader />;
  const o = meta.options;
  const loc = meta.localities.find((l) => String(l.id) === f.locality_id);
  const cat = meta.categories.find((c) => String(c.id) === f.job_category_id);
  const salary = { min: f.salary_min ? +f.salary_min : null, max: f.salary_max ? +f.salary_max : null, currency: "INR", period: f.salary_period, negotiable };

  return (
    <div className="space-y-5">
      {err && Object.keys(err.errors).length > 0 && <Alert tone="red" title="Please fix these fields">{Object.values(err.errors).slice(0, 4).map((m) => <p key={m[0]}>{m[0]}</p>)}</Alert>}
      {err?.field("confirm_duplicate") && (
        <Alert tone="amber" title="Possible duplicate">
          {err.field("confirm_duplicate")}
          <div className="mt-2"><Checkbox label="This is a different opening, post it anyway" checked={dupConfirm} onChange={(e) => setDupConfirm(e.target.checked)} /></div>
        </Alert>
      )}
      {status === "rejected" && typeof initial?.rejection_reason === "string" && <Alert tone="red" title="This job was not approved">{initial.rejection_reason as string}. Edit and submit again.</Alert>}

      <Card title="1. Job basics">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input className="sm:col-span-2" label="Job title" required maxLength={150} placeholder="e.g. Embroidery Machine Operator" value={f.title ?? ""} onChange={set("title")} error={fe("title")} />
          <Select label="Category" required options={toOptions(meta.categories)} value={f.job_category_id ?? ""} onChange={(e) => setF((s) => ({ ...s, job_category_id: e.target.value, job_role_id: "" }))} error={fe("job_category_id")} />
          <Select label="Role" options={toOptions(roles)} disabled={!roles.length} value={f.job_role_id ?? ""} onChange={set("job_role_id")} error={fe("job_role_id")} />
          <Select label="Job type" required options={toOptions(o.employment_types)} value={f.employment_type ?? ""} onChange={set("employment_type")} error={fe("employment_type")} />
          <Select label="Work mode" required options={toOptions(o.work_modes)} value={f.work_mode ?? ""} onChange={set("work_mode")} error={fe("work_mode")} />
          <Select label="Shift" options={toOptions(o.shifts)} value={f.shift ?? ""} onChange={set("shift")} error={fe("shift")} />
          <Input label="Number of openings" type="number" min={1} max={5000} required value={f.vacancies ?? "1"} onChange={set("vacancies")} error={fe("vacancies")} />
          <Textarea className="sm:col-span-2" label="Job description" required rows={8} maxLength={10000} value={f.description ?? ""} onChange={set("description")} error={fe("description")}
            hint={`Responsibilities, requirements, timings. ${(f.description ?? "").length}/10000. Do not include phone numbers here; use the contact section.`} />
          <div className="sm:col-span-2"><TagInput label="Required skills" value={req} onChange={setReq} error={fe("skills_required")} /></div>
          <div className="sm:col-span-2"><TagInput label="Preferred skills (optional)" value={pref} onChange={setPref} error={fe("skills_preferred")} /></div>
        </div>
      </Card>

      <Card title="2. Salary">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Minimum (₹)" type="number" min={0} inputMode="numeric" value={f.salary_min ?? ""} onChange={set("salary_min")} error={fe("salary_min")} />
          <Input label="Maximum (₹)" type="number" min={0} inputMode="numeric" value={f.salary_max ?? ""} onChange={set("salary_max")} error={fe("salary_max")} />
          <Select label="Paid" required placeholder="Select…" options={toOptions(o.salary_periods)} value={f.salary_period ?? "monthly"} onChange={set("salary_period")} error={fe("salary_period")} />
          <Checkbox className="sm:col-span-3" label="Salary is negotiable" checked={negotiable} onChange={(e) => setNegotiable(e.target.checked)} />
          <p className="text-xs text-slate-500 sm:col-span-3">Jobs that show salary get more applications. Preview: <strong className="text-brand-700">{salaryText(salary)}</strong></p>
        </div>
      </Card>

      <Card title="3. Location">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="City" value="Surat, Gujarat" disabled readOnly />
          <Select label="Area / locality" required options={toOptions(meta.localities)} value={f.locality_id ?? ""}
            onChange={(e) => { const l = meta.localities.find((x) => String(x.id) === e.target.value); setF((s) => ({ ...s, locality_id: e.target.value, pincode: s.pincode || l?.pincode || "" })); }} error={fe("locality_id")} />
          <Input label="Landmark / area (public)" maxLength={120} placeholder="e.g. Near Ring Road" value={f.area ?? ""} onChange={set("area")} error={fe("area")} />
          <Input label="PIN code" required inputMode="numeric" maxLength={6} value={f.pincode ?? ""} onChange={(e) => setF((s) => ({ ...s, pincode: e.target.value.replace(/\D/g, "") }))} error={fe("pincode")} />
          <Textarea className="sm:col-span-2" rows={2} label={<>Full office address <PrivateTag /></>} maxLength={500} value={f.office_address ?? ""} onChange={set("office_address")} error={fe("office_address")} />
        </div>
      </Card>

      <Card title="4. Requirements and timings">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Experience from (years)" type="number" min={0} max={50} value={f.experience_min ?? "0"} onChange={set("experience_min")} error={fe("experience_min")} hint="0 = freshers welcome" />
          <Input label="Experience up to (years)" type="number" min={0} max={60} value={f.experience_max ?? ""} onChange={set("experience_max")} error={fe("experience_max")} />
          <Select label="Minimum education" placeholder="Any" options={toOptions(meta.education_levels)} value={f.education_level_id ?? ""} onChange={set("education_level_id")} error={fe("education_level_id")} />
          <Select label="Joining" options={toOptions(o.joining)} value={f.joining ?? ""} onChange={set("joining")} error={fe("joining")} />
          <Input label="Working days" maxLength={60} placeholder="Monday to Saturday" value={f.working_days ?? ""} onChange={set("working_days")} error={fe("working_days")} />
          <Input label="Working hours" maxLength={60} placeholder="9:30 AM – 6:30 PM" value={f.working_hours ?? ""} onChange={set("working_hours")} error={fe("working_hours")} />
          <Input label="Weekly off" maxLength={60} placeholder="Sunday" value={f.weekly_off ?? ""} onChange={set("weekly_off")} error={fe("weekly_off")} />
          <Input label="Apply before (optional)" type="date" value={f.expires_at ?? ""} onChange={set("expires_at")} error={fe("expires_at")} hint="Default is 30 days." />
          <Select label="Open to" placeholder="Select…" options={toOptions(o.gender_preferences)} value={f.gender_preference ?? "any"} onChange={set("gender_preference")} error={fe("gender_preference")} />
          {f.gender_preference && f.gender_preference !== "any" && (
            <Textarea className="sm:col-span-3" rows={2} label="Legal reason for gender preference" required maxLength={255} value={f.gender_justification ?? ""} onChange={set("gender_justification")} error={fe("gender_justification")}
              hint="Gender-specific hiring is allowed only where the law requires it (e.g. women security staff for frisking). Jobs without a valid reason are rejected." />
          )}
          <Textarea className="sm:col-span-3" rows={3} label="Benefits (optional)" maxLength={2000} placeholder="PF, ESIC, bonus, canteen, transport…" value={f.benefits ?? ""} onChange={set("benefits")} error={fe("benefits")} />
        </div>
      </Card>

      <Card title={<>5. Contact for candidates <PrivateTag /></>}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Contact person" required maxLength={120} value={f.contact_name ?? ""} onChange={set("contact_name")} error={fe("contact_name")} />
          <Input label="Mobile" required inputMode="numeric" maxLength={10} value={f.contact_mobile ?? ""} onChange={(e) => setF((s) => ({ ...s, contact_mobile: e.target.value.replace(/\D/g, "") }))} error={fe("contact_mobile")} />
          <Input label="Email" type="email" required maxLength={191} value={f.contact_email ?? ""} onChange={set("contact_email")} error={fe("contact_email")} />
          <Select className="sm:col-span-3" label="Who can see these contact details?" placeholder="Select…" options={toOptions(o.contact_visibility)} value={f.contact_visibility ?? "verified_users"} onChange={set("contact_visibility")} error={fe("contact_visibility")}
            hint="Contact details are never shown on public pages or to search engines. Every view is logged." />
        </div>
      </Card>

      <Card title="6. Screening questions (optional, up to 5)">
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center">
              <input className="input flex-1" maxLength={300} placeholder="e.g. Do you have your own two-wheeler?" value={q.question} aria-label={`Question ${i + 1}`}
                onChange={(e) => setQuestions((qs) => qs.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))} />
              <div className="flex items-center gap-3">
                <Checkbox label="Required" checked={q.is_required} onChange={(e) => setQuestions((qs) => qs.map((x, j) => (j === i ? { ...x, is_required: e.target.checked } : x)))} />
                <button type="button" className="text-sm font-semibold text-red-600" onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))}>Remove</button>
              </div>
              {fe(`questions.${i}.question`) && <p className="text-sm text-red-600">{fe(`questions.${i}.question`)}</p>}
            </div>
          ))}
          {questions.length < 5 && <Button type="button" variant="outline" size="sm" onClick={() => setQuestions((qs) => [...qs, { question: "", is_required: false }])}>+ Add question</Button>}
          <Checkbox label="Allow candidates who were rejected or withdrew to apply again" checked={allowReapply} onChange={(e) => setAllowReapply(e.target.checked)} />
        </div>
      </Card>

      <div className="sticky bottom-0 z-30 -mx-4 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <Button type="button" variant="ghost" onClick={() => setPreview(true)}>Preview</Button>
        {!isLive && <Button type="button" variant="outline" loading={busy === "draft"} onClick={() => save(false)}>Save draft</Button>}
        <Button type="button" loading={busy === "submit"} onClick={() => save(true)}>{isLive ? "Save changes" : "Submit job"}</Button>
      </div>

      <Modal open={preview} onClose={() => setPreview(false)} title="Preview: how job seekers see it" size="lg">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{cat?.name ?? "Category"}</p>
          <h3 className="text-2xl font-extrabold text-ink">{f.title || "Job title"}</h3>
          <p className="text-lg font-bold text-brand-700">{salaryText(salary)}</p>
          <p className="text-sm text-slate-600">{loc?.name ?? "Area"}, Surat · {o.employment_types[f.employment_type]} · {o.work_modes[f.work_mode]} · {experienceText({ min: +(f.experience_min || 0), max: f.experience_max ? +f.experience_max : null })} · {f.vacancies} opening(s)</p>
          <div className="whitespace-pre-line rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{f.description || "Description will appear here."}</div>
          {req.length > 0 && <div className="flex flex-wrap gap-1.5">{req.map((s) => <span key={s} className="chip">{s}</span>)}</div>}
          <Alert tone="blue">Contact details and the full office address are hidden in the public view.</Alert>
        </div>
      </Modal>
    </div>
  );
}

function PrivateTag() {
  return <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 align-middle text-[11px] font-bold uppercase tracking-wide text-slate-600">🔒 Private</span>;
}
