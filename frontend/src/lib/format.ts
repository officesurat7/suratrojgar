import type { JobCard } from "./types";

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const PERIOD: Record<string, string> = { monthly: "/month", annual: "/year", daily: "/day", hourly: "/hour" };

export function money(n: number | null | undefined): string {
  if (n === null || n === undefined) return "";
  if (n >= 100000) return "₹" + (n / 100000).toFixed(n % 100000 === 0 ? 0 : 1) + " L";
  return "₹" + inr.format(n);
}

export function salaryText(s: JobCard["salary"]): string {
  const p = PERIOD[s.period] ?? "";
  let txt: string;
  if (s.min && s.max) txt = `${money(s.min)} – ${money(s.max)}${p}`;
  else if (s.max) txt = `Up to ${money(s.max)}${p}`;
  else if (s.min) txt = `From ${money(s.min)}${p}`;
  else txt = "Salary not disclosed";
  return s.negotiable ? `${txt} (negotiable)` : txt;
}

export function experienceText(e: { min: number; max: number | null }): string {
  if (!e.min && (!e.max || e.max === 0)) return "Fresher";
  if (!e.min) return `0–${e.max} yrs`;
  if (!e.max) return `${e.min}+ yrs`;
  return `${e.min}–${e.max} yrs`;
}

const TZ = "Asia/Kolkata";
export function dateIST(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-IN", { timeZone: TZ, ...opts }).format(new Date(iso));
}
export function dateTimeIST(iso: string | null | undefined): string {
  return dateIST(iso, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  const d = Math.floor(diff / 86400);
  if (d === 1) return "yesterday";
  if (d < 30) return `${d} days ago`;
  return dateIST(iso);
}

export function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

export function cx(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(" ");
}

export const STATUS_TONE: Record<string, string> = {
  active: "green", approved: "green", selected: "green", resolved: "green", completed: "green", clean: "green",
  pending: "amber", applied: "blue", received: "blue", under_review: "amber", in_review: "amber", on_hold: "amber", draft: "slate",
  shortlisted: "indigo", interview_scheduled: "indigo", interview_completed: "indigo",
  paused: "slate", closed: "slate", expired: "slate", withdrawn: "slate", deactivated: "slate", dismissed: "slate", open: "blue",
  rejected: "red", suspended: "red", blocked: "red", infected: "red",
};
