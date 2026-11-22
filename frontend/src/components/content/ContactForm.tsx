"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth, useMeta } from "@/components/providers";
import { Alert, Button, Input, Select, Textarea, toOptions } from "@/components/ui";
import { api, ApiError } from "@/lib/api";

const TYPES = [
  { value: "support", label: "Help or a question" },
  { value: "job", label: "Report a job" },
  { value: "employer", label: "Report an employer" },
  { value: "grievance", label: "Privacy or data grievance" },
];

export function ContactForm({ fixedType }: { fixedType?: "grievance" }) {
  const sp = useSearchParams();
  const meta = useMeta();
  const { user } = useAuth();
  const reportJob = sp.get("report");
  const [f, setF] = useState({ type: fixedType ?? (reportJob ? "job" : "support"), reason: "", name: "", email: "", mobile: "", subject: reportJob ? `Report about job #${reportJob}` : "", description: "", website: "" });
  const [err, setErr] = useState<ApiError | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (done) return <Alert tone="green" title="Message received">{done}</Alert>;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const r = await api.post<{ message: string }>("complaints", {
        type: f.type, reason: f.type === "job" || f.type === "employer" ? f.reason || null : null,
        name: user ? null : f.name, email: user ? null : f.email, mobile: f.mobile || null,
        subject: f.subject, description: f.description, job_id: f.type === "job" && reportJob && /^\d+$/.test(reportJob) ? Number(reportJob) : null,
        ...(f.website ? { website: f.website } : {}),
      });
      setDone(r.message);
    } catch (x) { setErr(x as ApiError); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {err && !Object.keys(err.errors).length && <Alert tone="red">{err.message}</Alert>}
      {!fixedType && <Select label="What is this about?" options={TYPES} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} />}
      {(f.type === "job" || f.type === "employer") && <Select label="Reason" required options={toOptions(meta?.options.complaint_reasons)} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} error={err?.field("reason")} />}
      {user ? <p className="text-sm text-slate-600">Sending as <strong>{user.name}</strong> ({user.email}). We will reply to this email.</p> : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Your name" required autoComplete="name" maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={err?.field("name")} />
          <Input label="Email" type="email" required autoComplete="email" maxLength={191} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={err?.field("email")} />
        </div>
      )}
      <Input label="Mobile (optional)" type="tel" inputMode="numeric" autoComplete="tel" maxLength={15} value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value })} error={err?.field("mobile")} />
      <Input label="Subject" required maxLength={200} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} error={err?.field("subject")} />
      <Textarea label="Details" required rows={5} maxLength={5000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} error={err?.field("description")} hint={f.type === "grievance" ? "Tell us what data or decision your complaint is about." : undefined} />
      {/* Honeypot: hidden from people, bots tend to fill it */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden"><label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} /></label></div>
      <p className="text-xs text-slate-500">We use these details only to answer you. See our <Link href="/privacy-policy" className="underline">Privacy Policy</Link>.</p>
      <Button type="submit" loading={busy}>Send</Button>
    </form>
  );
}
