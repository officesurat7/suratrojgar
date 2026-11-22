"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers";
import { Alert, Button, Modal, Textarea } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { bytes, dateTimeIST } from "@/lib/format";
import type { JobDetail } from "@/lib/types";

interface Resume { id: number; name: string; size: number; is_default: boolean; scan_status: string }
interface Contact { contact_name: string | null; contact_mobile: string | null; contact_email: string | null; office_address: string | null; company: string }

/** Apply / Save / View contact / Share actions on the job detail page. All private data comes from authenticated API calls only. */
export function JobActions({ job }: { job: JobDetail }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [state, setState] = useState<{ saved: boolean; applied: boolean } | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [done, setDone] = useState<{ application_no: string; applied_at: string } | null>(null);

  const isSeeker = user?.user_type === "job_seeker";
  const loginHref = `/login?next=${encodeURIComponent(`${pathname}#apply`)}`;

  useEffect(() => {
    if (!isSeeker) return;
    api.post<{ saved: number[]; applied: number[] }>("seeker/job-states", { ids: [job.id] })
      .then((r) => setState({ saved: r.saved.includes(job.id), applied: r.applied.includes(job.id) })).catch(() => {});
  }, [isSeeker, job.id]);

  // Arriving with #apply (from a card's Apply button or back from login) opens the form.
  useEffect(() => {
    if (loading || !job.is_active) return;
    if (typeof window !== "undefined" && window.location.hash === "#apply") {
      if (!user) { router.replace(loginHref); return; }
      if (isSeeker && state && !state.applied) setApplyOpen(true);
    }
  }, [loading, user, isSeeker, state, job.is_active, router, loginHref]);

  const startApply = () => {
    if (!user) { router.push(loginHref); return; }
    if (!isSeeker) { toast("Please log in with a job seeker account to apply.", "info"); return; }
    setApplyOpen(true);
  };
  const toggleSave = async () => {
    if (!user) { router.push(`/login?next=${encodeURIComponent(pathname)}`); return; }
    if (!isSeeker) { toast("Only job seekers can save jobs.", "info"); return; }
    const was = !!state?.saved;
    setState((s) => ({ applied: !!s?.applied, saved: !was }));
    try {
      if (was) await api.del(`seeker/saved-jobs/${job.id}`); else await api.post(`seeker/saved-jobs/${job.id}`);
      toast(was ? "Removed from saved jobs." : "Job saved.");
    } catch (e) {
      setState((s) => ({ applied: !!s?.applied, saved: was }));
      toast((e as Error).message, "error");
    }
  };
  const share = async () => {
    const url = window.location.origin + job.url;
    const text = `${job.title} at ${job.company}, ${job.location.locality?.name ?? "Surat"} – apply on SuratRojgar`;
    if (navigator.share) { try { await navigator.share({ title: job.title, text, url }); return; } catch { /* cancelled */ } }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, "_blank", "noopener");
  };

  const applied = state?.applied || !!done;
  const applyBtn = !job.is_active ? (
    <span className="flex w-full items-center justify-center rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600">No longer accepting applications</span>
  ) : applied ? (
    <Link href="/seeker/applications" className="flex w-full items-center justify-center rounded-xl bg-accent-50 px-4 py-3 text-sm font-bold text-accent-700">✓ Applied · Track application</Link>
  ) : (
    <Button size="lg" block onClick={startApply} id="apply">Apply Now</Button>
  );

  return (
    <div className="space-y-2.5" id="job-actions">
      {applyBtn}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={toggleSave} aria-pressed={!!state?.saved}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill={state?.saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}><path d="M6 3h12v18l-6-4-6 4V3Z" /></svg>
          {state?.saved ? "Saved" : "Save"}
        </Button>
        <Button variant="outline" onClick={share}>
          <svg className="h-4 w-4 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.3-.8-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.6-.3.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2.1 1.3 2.4 1.5.3.1.5.1.7-.1l.9-1.1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.2 1.2Z" /></svg>
          Share
        </Button>
      </div>
      {job.is_active && job.contact_visibility !== "hidden" && (
        <Button variant="secondary" block onClick={() => (user ? setContactOpen(true) : router.push(`/login?next=${encodeURIComponent(pathname)}`))}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
          View employer contact
        </Button>
      )}
      <p className="text-center text-xs text-slate-500">
        {job.contact_visibility === "hidden" ? "This employer accepts applications only through SuratRojgar."
          : job.contact_visibility === "applicants_only" ? "Contact details are shared after you apply."
          : "Contact details are shown only to logged-in, verified job seekers."}
      </p>
      {applyOpen && <ApplyModal job={job} onClose={() => setApplyOpen(false)} onDone={(d) => { setDone(d); setApplyOpen(false); setState((s) => ({ saved: !!s?.saved, applied: true })); }} />}
      {done && <DoneModal done={done} onClose={() => setDone(null)} />}
      {contactOpen && <ContactModal jobId={job.id} onClose={() => setContactOpen(false)} />}
    </div>
  );
}

function ApplyModal({ job, onClose, onDone }: { job: JobDetail; onClose: () => void; onDone: (d: { application_no: string; applied_at: string }) => void }) {
  const [resumes, setResumes] = useState<Resume[] | null>(null);
  const [resumeId, setResumeId] = useState<number | "">("");
  const [cover, setCover] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<{ data: Resume[] }>("seeker/resumes").then((r) => {
      setResumes(r.data);
      const def = r.data.find((x) => x.is_default) ?? r.data[0];
      if (def) setResumeId(def.id);
    }).catch(() => setResumes([]));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await api.post<{ data: { application_no: string; applied_at: string } }>(`seeker/jobs/${job.id}/apply`, {
        resume_id: resumeId || null, cover_letter: cover.trim() || null, answers,
      });
      onDone(r.data);
    } catch (x) {
      setErr(x as ApiError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Apply: ${job.title}`} size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" form="apply-form" loading={busy}>Submit application</Button></>}>
      <form id="apply-form" onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-600">{job.company} · {job.location.locality?.name ?? "Surat"}</p>
        {err && <Alert tone="red">{err.field("job") ?? err.message}</Alert>}
        <fieldset>
          <legend className="label">Resume</legend>
          {resumes === null ? <p className="text-sm text-slate-500">Loading your resumes…</p> : resumes.length === 0 ? (
            <Alert tone="amber">You have not uploaded a resume yet. You can still apply, but employers prefer one. <Link href="/seeker/resumes" className="font-semibold underline">Upload a resume</Link></Alert>
          ) : (
            <div className="space-y-2">
              {resumes.map((r) => (
                <label key={r.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${resumeId === r.id ? "border-brand-400 bg-brand-50" : "border-slate-200"}`}>
                  <input type="radio" name="resume" checked={resumeId === r.id} onChange={() => setResumeId(r.id)} className="accent-brand-600" />
                  <span className="min-w-0 flex-1 truncate font-medium text-ink">{r.name}</span>
                  <span className="shrink-0 text-xs text-slate-500">{bytes(r.size)}{r.is_default ? " · Default" : ""}</span>
                </label>
              ))}
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-600">
                <input type="radio" name="resume" checked={resumeId === ""} onChange={() => setResumeId("")} className="accent-brand-600" />
                Apply without a resume
              </label>
            </div>
          )}
          {err?.field("resume_id") && <p className="mt-1 text-sm text-red-600">{err.field("resume_id")}</p>}
        </fieldset>
        {job.questions.map((q) => (
          <Textarea key={q.id} rows={2} label={q.question} required={q.is_required} maxLength={1000}
            value={answers[q.id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} error={err?.field(`answers.${q.id}`)} />
        ))}
        <Textarea label="Message to employer (optional)" rows={4} maxLength={3000} value={cover} onChange={(e) => setCover(e.target.value)}
          placeholder="Briefly say why you are a good fit and when you can join." hint={`${cover.length}/3000`} error={err?.field("cover_letter")} />
        <p className="text-xs text-slate-500">By applying, you agree to share your profile and resume with this employer for this job, as described in our <Link href="/privacy-policy" className="underline">Privacy Policy</Link>.</p>
      </form>
    </Modal>
  );
}

function DoneModal({ done, onClose }: { done: { application_no: string; applied_at: string }; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title="Application submitted" size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Close</Button><Button href="/seeker/applications">Track applications</Button></>}>
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-accent-50 text-2xl text-accent-600">✓</div>
        <p className="text-sm text-slate-600">Your Application ID</p>
        <p className="mt-1 font-mono text-xl font-bold tracking-wide text-ink">{done.application_no}</p>
        <p className="mt-2 text-xs text-slate-500">Submitted {dateTimeIST(done.applied_at)}. A confirmation email is on its way.</p>
      </div>
    </Modal>
  );
}

function ContactModal({ jobId, onClose }: { jobId: number; onClose: () => void }) {
  const [c, setC] = useState<Contact | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api.get<{ data: Contact }>(`jobs/${jobId}/contact`).then((r) => setC(r.data)).catch((e: Error) => setErr(e.message));
  }, [jobId]);
  return (
    <Modal open onClose={onClose} title="Employer contact" size="sm">
      {err ? <Alert tone="amber">{err}</Alert> : !c ? <p className="text-sm text-slate-500">Loading…</p> : (
        <dl className="space-y-3 text-sm">
          <div><dt className="text-xs text-slate-500">Company</dt><dd className="font-semibold text-ink">{c.company}</dd></div>
          {c.contact_name && <div><dt className="text-xs text-slate-500">Contact person</dt><dd className="font-semibold text-ink">{c.contact_name}</dd></div>}
          {c.contact_mobile && <div><dt className="text-xs text-slate-500">Mobile</dt><dd><a className="font-semibold text-brand-700" href={`tel:${c.contact_mobile}`}>{c.contact_mobile}</a></dd></div>}
          {c.contact_email && <div><dt className="text-xs text-slate-500">Email</dt><dd><a className="break-all font-semibold text-brand-700" href={`mailto:${c.contact_email}`}>{c.contact_email}</a></dd></div>}
          {c.office_address && <div><dt className="text-xs text-slate-500">Address</dt><dd className="text-ink">{c.office_address}</dd></div>}
          <p className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-500">For your safety: never pay any fee to get a job. Report anyone who asks for money.</p>
        </dl>
      )}
    </Modal>
  );
}

/** Mobile sticky bar: forwards to the single JobActions panel so there is only one apply form. */
export function MobileApplyBar({ active }: { active: boolean }) {
  if (!active) return null;
  const go = () => {
    const btn = document.getElementById("apply");
    if (btn) btn.click();
    else document.getElementById("job-actions")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur lg:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      <button onClick={go} className="w-full rounded-xl bg-brand-600 py-3 text-base font-bold text-white shadow-sm active:scale-[.99]">Apply Now</button>
    </div>
  );
}

/** Counts one view per visitor per day (server de-duplicates). */
export function ViewBeacon({ jobId }: { jobId: number }) {
  useEffect(() => {
    fetch(`/api/backend/jobs/${jobId}/view`, { method: "POST", headers: { Accept: "application/json" }, keepalive: true }).catch(() => {});
  }, [jobId]);
  return null;
}
