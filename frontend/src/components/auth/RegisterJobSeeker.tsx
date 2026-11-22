"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PasswordStrength } from "@/components/auth/AuthCard";
import { useMeta } from "@/components/providers";
import { Alert, Button, Checkbox, Input, PageLoader, Select, TagInput, toOptions } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { cx } from "@/lib/format";

const STEPS = ["Account", "About you", "Job preferences"];

/** Which fields belong to each step, so server errors jump back to the right step. */
const STEP_FIELDS: string[][] = [
  ["name", "mobile", "email", "password"],
  ["locality_id", "area", "pincode", "gender", "date_of_birth", "education_level_id", "employment_status", "experience_years"],
  ["preferred_category_id", "preferred_role_id", "expected_salary", "preferred_job_type", "preferred_locality_id", "preferred_work_mode", "skills", "resume", "consent"],
];

export function RegisterJobSeeker() {
  const meta = useMeta();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Record<string, string>>({ experience_years: "0", employment_status: "", state: "Gujarat", city: "Surat" });
  const [skills, setSkills] = useState<string[]>([]);
  const [resume, setResume] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  const [local, setLocal] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const fe = (k: string) => local[k] ?? err?.field(k);
  const roles = useMemo(() => meta?.categories.find((c) => String(c.id) === f.preferred_category_id)?.roles ?? [], [meta, f.preferred_category_id]);

  const validate = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if ((f.name ?? "").trim().length < 2) e.name = "Please enter your full name.";
      if (!/^[6-9]\d{9}$/.test(f.mobile ?? "")) e.mobile = "Enter a valid 10-digit Indian mobile number.";
      if (!/^\S+@\S+\.\S+$/.test(f.email ?? "")) e.email = "Enter a valid email address.";
      if (!/^(?=.*[A-Za-z])(?=.*\d).{8,72}$/.test(f.password ?? "")) e.password = "Use at least 8 characters with letters and numbers.";
      if (f.password !== f.password_confirmation) e.password_confirmation = "Passwords do not match.";
    }
    if (s === 1) {
      if (!f.locality_id) e.locality_id = "Choose your area in Surat.";
      if (!/^[1-9]\d{5}$/.test(f.pincode ?? "")) e.pincode = "Enter a valid 6-digit PIN code.";
      if (!f.education_level_id) e.education_level_id = "Choose your highest education.";
      if (!f.employment_status) e.employment_status = "Choose your current status.";
    }
    if (s === 2) {
      if (!consent) e.consent = "Please accept to continue.";
      if (resume && resume.size > 5 * 1024 * 1024) e.resume = "Resume must be 5 MB or smaller.";
    }
    setLocal(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate(step)) { setErr(null); setStep(step + 1); window.scrollTo({ top: 0, behavior: "smooth" }); } };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 2) return next();
    if (!validate(2)) return;
    setBusy(true); setErr(null);
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => v !== "" && v != null && fd.append(k, v.trim()));
    skills.forEach((s) => fd.append("skills[]", s));
    if (resume) fd.append("resume", resume);
    fd.append("consent", "1");
    try {
      await api.post("auth/register/job-seeker", fd);
      router.push(`/verify-email?email=${encodeURIComponent(f.email)}&sent=1`);
    } catch (x) {
      const ae = x as ApiError;
      setErr(ae);
      const bad = STEP_FIELDS.findIndex((fields) => fields.some((k) => Object.keys(ae.errors).some((ek) => ek === k || ek.startsWith(k + "."))));
      if (bad >= 0 && bad < step) setStep(bad);
    } finally {
      setBusy(false);
    }
  };

  if (!meta) return <PageLoader />;
  const o = meta.options;

  return (
    <form onSubmit={submit} noValidate>
      <ol className="mb-6 grid grid-cols-3 gap-2" aria-label="Registration steps">
        {STEPS.map((s, i) => (
          <li key={s} className="text-center">
            <div className={cx("mx-auto h-1.5 rounded-full", i <= step ? "bg-brand-600" : "bg-slate-200")} />
            <p className={cx("mt-1.5 text-xs font-semibold", i === step ? "text-brand-700" : "text-slate-500")} aria-current={i === step ? "step" : undefined}>{i + 1}. {s}</p>
          </li>
        ))}
      </ol>
      {err && !Object.keys(err.errors).length && <div className="mb-4"><Alert tone="red">{err.message}</Alert></div>}
      {err && Object.keys(err.errors).length > 0 && <div className="mb-4"><Alert tone="red">Please check the highlighted fields.</Alert></div>}

      <div className={cx("grid gap-4 sm:grid-cols-2", step !== 0 && "hidden")}>
        <Input className="sm:col-span-2" label="Full name" required autoComplete="name" maxLength={120} value={f.name ?? ""} onChange={set("name")} error={fe("name")} />
        <Input label="Mobile number" required inputMode="numeric" autoComplete="tel-national" maxLength={10} placeholder="10-digit number" value={f.mobile ?? ""} onChange={(e) => setF((s) => ({ ...s, mobile: e.target.value.replace(/\D/g, "") }))} error={fe("mobile")} />
        <Input label="Email address" type="email" required autoComplete="email" maxLength={191} value={f.email ?? ""} onChange={set("email")} error={fe("email")} hint="We'll send a code to verify it." />
        <div><Input label="Password" type="password" required autoComplete="new-password" maxLength={72} value={f.password ?? ""} onChange={set("password")} error={fe("password")} /><PasswordStrength value={f.password ?? ""} /></div>
        <Input label="Confirm password" type="password" required autoComplete="new-password" maxLength={72} value={f.password_confirmation ?? ""} onChange={set("password_confirmation")} error={fe("password_confirmation")} />
      </div>

      <div className={cx("grid gap-4 sm:grid-cols-2", step !== 1 && "hidden")}>
        <Input label="State" value="Gujarat" disabled readOnly />
        <Input label="City" value="Surat" disabled readOnly />
        <Select label="Area / locality" required options={toOptions(meta.localities)} value={f.locality_id ?? ""} placeholder="Choose your area…"
          onChange={(e) => { const l = meta.localities.find((x) => String(x.id) === e.target.value); setF((s) => ({ ...s, locality_id: e.target.value, pincode: s.pincode || l?.pincode || "" })); }} error={fe("locality_id")} />
        <Input label="PIN code" required inputMode="numeric" maxLength={6} value={f.pincode ?? ""} onChange={(e) => setF((s) => ({ ...s, pincode: e.target.value.replace(/\D/g, "") }))} error={fe("pincode")} />
        <Input className="sm:col-span-2" label="Street / landmark (optional)" maxLength={120} value={f.area ?? ""} onChange={set("area")} error={fe("area")} />
        <Select label="Highest education" required options={toOptions(meta.education_levels)} value={f.education_level_id ?? ""} onChange={set("education_level_id")} error={fe("education_level_id")} />
        <Select label="Current status" required options={toOptions(o.employment_statuses)} value={f.employment_status ?? ""} onChange={set("employment_status")} error={fe("employment_status")} />
        <Input label="Total experience (years)" type="number" min={0} max={50} step={0.5} required value={f.experience_years ?? "0"} onChange={set("experience_years")} error={fe("experience_years")} hint="Enter 0 if you are a fresher." />
        <Select label="Gender (optional)" options={toOptions(o.genders)} value={f.gender ?? ""} onChange={set("gender")} error={fe("gender")} />
        <Input label="Date of birth (optional)" type="date" value={f.date_of_birth ?? ""} onChange={set("date_of_birth")} error={fe("date_of_birth")} hint="You must be 18 or older." />
      </div>

      <div className={cx("grid gap-4 sm:grid-cols-2", step !== 2 && "hidden")}>
        <Select label="Preferred job category" options={toOptions(meta.categories)} value={f.preferred_category_id ?? ""} onChange={(e) => setF((s) => ({ ...s, preferred_category_id: e.target.value, preferred_role_id: "" }))} error={fe("preferred_category_id")} />
        <Select label="Preferred job role" options={toOptions(roles)} value={f.preferred_role_id ?? ""} onChange={set("preferred_role_id")} disabled={!roles.length} error={fe("preferred_role_id")} />
        <Select label="Preferred job type" options={toOptions(o.employment_types)} value={f.preferred_job_type ?? ""} onChange={set("preferred_job_type")} error={fe("preferred_job_type")} />
        <Select label="Preferred work mode" options={toOptions(o.work_modes)} value={f.preferred_work_mode ?? ""} onChange={set("preferred_work_mode")} error={fe("preferred_work_mode")} />
        <Select label="Preferred work area" options={toOptions(meta.localities)} value={f.preferred_locality_id ?? ""} onChange={set("preferred_locality_id")} placeholder="Anywhere in Surat" error={fe("preferred_locality_id")} />
        <Input label="Expected monthly salary (₹)" type="number" min={0} inputMode="numeric" value={f.expected_salary ?? ""} onChange={set("expected_salary")} error={fe("expected_salary")} />
        <div className="sm:col-span-2"><TagInput label="Skills" value={skills} onChange={setSkills} placeholder="e.g. Tally, Embroidery machine, Driving" error={fe("skills")} /></div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="resume">Resume (optional, PDF or Word, max 5 MB)</label>
          <input id="resume" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setResume(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-brand-50 file:px-4 file:py-2.5 file:font-semibold file:text-brand-700 hover:file:bg-brand-100" />
          {fe("resume") && <p className="mt-1.5 text-sm text-red-600">{fe("resume")}</p>}
        </div>
        <div className="sm:col-span-2">
          <Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)}
            label={<>I agree to the <Link href="/terms" target="_blank" className="font-semibold text-brand-700 underline">Terms</Link> and <Link href="/privacy-policy" target="_blank" className="font-semibold text-brand-700 underline">Privacy Policy</Link>, and consent to SuratRojgar sharing my profile with employers when I apply for or match their jobs.</>} />
          {fe("consent") && <p className="mt-1.5 text-sm text-red-600">{fe("consent")}</p>}
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        {step > 0 ? <Button type="button" variant="ghost" onClick={() => setStep(step - 1)}>← Back</Button> : <span />}
        <Button type="submit" size="lg" loading={busy}>{step < 2 ? "Continue" : "Create account"}</Button>
      </div>
    </form>
  );
}
