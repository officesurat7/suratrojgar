"use client";

import { useState } from "react";
import { useMeta } from "@/components/providers";
import { Alert, Button, Card, Input, Select, StatusBadge, Textarea, toOptions } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { dateIST, dateTimeIST } from "@/lib/format";
import { ApplicationTimeline, type AppHistory } from "./ApplicationTimeline";

export interface ReviewApp {
  id: number; application_no: string; status: string; status_label: string; applied_at: string; interview_at: string | null; interview_details: string | null;
  cover_letter: string | null; answers: { question_id: number; question: string; answer: string }[]; employer_notes: string | null; resume: { id: number; name: string } | null;
  job: { id: number; title: string; url: string; company: string } | null; history: AppHistory[];
  candidate: { id: number; name: string; email: string; mobile: string | null; locality: string | null; experience_years: number | null; education: string | null; expected_salary: number | null; headline: string | null } | null;
  candidate_profile?: { skills: string[]; about: string | null; employment_status: string | null; availability: string | null; gender: string | null; preferred_job_type: string | null } | null;
}

/** Candidate review panel used by employers and admins. `base` is the API prefix ("employer/applications" or "admin/applications"). */
export function ApplicationReview({ app, base, onChanged, resumePath, notesPath, notesMode = "edit", canChange = true }: { app: ReviewApp; base: string; onChanged: () => void; resumePath?: string; notesPath?: string; notesMode?: "edit" | "read"; canChange?: boolean }) {
  const meta = useMeta();
  const { toast } = useToast();
  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");
  const [iv, setIv] = useState({ at: "", details: "" });
  const [notes, setNotes] = useState(app.employer_notes ?? "");
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState("");
  const c = app.candidate;
  const statuses = Object.fromEntries(Object.entries(meta?.options.application_statuses ?? {}).filter(([k]) => !["applied", "withdrawn", app.status].includes(k)));

  const update = async () => {
    setBusy("status"); setErr(null);
    try {
      const body: Record<string, unknown> = { status, note: note || null };
      if (status === "interview_scheduled") { body.interview_at = iv.at ? new Date(iv.at).toISOString() : null; body.interview_details = iv.details || null; }
      const r = await api.put<{ message: string }>(`${base}/${app.id}/status`, body);
      toast(r.message); setStatus(""); setNote(""); onChanged();
    } catch (x) { setErr(x as ApiError); } finally { setBusy(""); }
  };
  const viewResume = async () => {
    setBusy("resume");
    try { const r = await api.get<{ url: string }>(resumePath ?? `${base}/${app.id}/resume`); window.open(r.url, "_blank", "noopener"); }
    catch (x) { toast((x as Error).message, "error"); } finally { setBusy(""); }
  };
  const saveNotes = async () => {
    setBusy("notes");
    try { const r = await api.put<{ message: string }>(notesPath ?? `${base}/${app.id}/notes`, { employer_notes: notes }); toast(r.message); }
    catch (x) { toast((x as Error).message, "error"); } finally { setBusy(""); }
  };
  const locked = app.status === "withdrawn";

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <Card title="Candidate">
          <div className="flex flex-wrap items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xl font-bold text-white">{c?.name.charAt(0)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-ink">{c?.name}</p>
              {c?.headline && <p className="text-sm text-slate-600">{c.headline}</p>}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {c?.mobile && <a href={`tel:${c.mobile}`} className="font-semibold text-brand-700">📞 {c.mobile}</a>}
                {c?.email && <a href={`mailto:${c.email}`} className="break-all font-semibold text-brand-700">✉ {c.email}</a>}
              </div>
            </div>
            {app.resume ? <Button variant="outline" size="sm" loading={busy === "resume"} onClick={viewResume}>View resume</Button> : <span className="text-xs text-slate-500">No resume attached</span>}
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div><dt className="text-xs text-slate-500">Area</dt><dd className="font-medium">{c?.locality ?? "–"}</dd></div>
            <div><dt className="text-xs text-slate-500">Experience</dt><dd className="font-medium">{c?.experience_years ?? 0} yrs</dd></div>
            <div><dt className="text-xs text-slate-500">Education</dt><dd className="font-medium">{c?.education ?? "–"}</dd></div>
            <div><dt className="text-xs text-slate-500">Expected salary</dt><dd className="font-medium">{c?.expected_salary ? `₹${c.expected_salary.toLocaleString("en-IN")}/mo` : "–"}</dd></div>
          </dl>
          {!!app.candidate_profile?.skills?.length && <div className="mt-4 flex flex-wrap gap-1.5">{app.candidate_profile.skills.map((s) => <span key={s} className="chip">{s}</span>)}</div>}
          {app.candidate_profile?.about && <p className="mt-4 whitespace-pre-line text-sm text-slate-700">{app.candidate_profile.about}</p>}
        </Card>
        {(app.cover_letter || (app.answers ?? []).length > 0) && (
          <Card title="Application">
            {app.cover_letter && <p className="whitespace-pre-line text-sm text-slate-700">{app.cover_letter}</p>}
            {(app.answers ?? []).map((a) => <div key={a.question_id} className="mt-3 text-sm"><p className="font-semibold text-ink">{a.question}</p><p className="text-slate-700">{a.answer || "–"}</p></div>)}
          </Card>
        )}
        <Card title="History"><ApplicationTimeline history={app.history} /></Card>
      </div>
      <div className="space-y-5">
        <Card title="Status">
          <div className="mb-3 flex items-center gap-2"><StatusBadge status={app.status} label={app.status_label} /><span className="text-xs text-slate-500">Applied {dateIST(app.applied_at)}</span></div>
          {app.interview_at && <p className="mb-3 rounded-lg bg-indigo-50 p-2.5 text-sm text-indigo-800">Interview: {dateTimeIST(app.interview_at)}{app.interview_details ? ` · ${app.interview_details}` : ""}</p>}
          {locked ? <Alert tone="amber">The candidate withdrew this application.</Alert> : !canChange ? <p className="text-sm text-slate-500">You can view this application but not change its status.</p> : (
            <div className="space-y-3">
              {err && !Object.keys(err.errors).length && <Alert tone="red">{err.message}</Alert>}
              <Select label="Change to" options={toOptions(statuses)} value={status} onChange={(e) => setStatus(e.target.value)} error={err?.field("status")} />
              {status === "interview_scheduled" && (
                <>
                  <Input label="Interview date and time" type="datetime-local" required value={iv.at} onChange={(e) => setIv({ ...iv, at: e.target.value })} error={err?.field("interview_at")} />
                  <Textarea label="Interview details" rows={2} maxLength={500} placeholder="Address, person to meet, documents to bring" value={iv.details} onChange={(e) => setIv({ ...iv, details: e.target.value })} error={err?.field("interview_details")} />
                </>
              )}
              <Textarea label="Message to candidate (optional)" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} hint="Included in the email to the candidate." />
              <Button block disabled={!status} loading={busy === "status"} onClick={update}>Update status</Button>
            </div>
          )}
        </Card>
        {notesMode === "edit" ? (
          <Card title="Private notes">
            <Textarea rows={4} maxLength={3000} value={notes} onChange={(e) => setNotes(e.target.value)} hint="Only you and SuratRojgar admins can see these." />
            <Button className="mt-3" size="sm" variant="secondary" loading={busy === "notes"} onClick={saveNotes}>Save notes</Button>
          </Card>
        ) : (
          <Card title="Employer's private notes">
            <p className="whitespace-pre-line text-sm text-slate-700">{app.employer_notes || "No notes."}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
