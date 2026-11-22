"use client";

import Link from "next/link";
import { forwardRef, useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cx, STATUS_TONE } from "@/lib/format";

// ---------------- Button ----------------
type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "outline";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/20",
  secondary: "bg-brand-50 text-brand-800 hover:bg-brand-100",
  outline: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
  ghost: "text-slate-700 hover:bg-slate-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
  success: "bg-accent-600 text-white hover:bg-accent-700",
};
const SIZES = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2.5 text-[15px]", lg: "px-6 py-3 text-base" };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant; size?: keyof typeof SIZES; loading?: boolean; href?: string; block?: boolean;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, href, block, className, children, disabled, ...rest }, ref,
) {
  const cls = cx(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60",
    VARIANTS[variant], SIZES[size], block && "w-full", className,
  );
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return (
    <button ref={ref} className={cls} disabled={disabled || loading} {...rest}>
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
});

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={cx("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-500" role="status">
      <Spinner className="h-8 w-8 text-brand-600" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

// ---------------- Form fields ----------------
interface FieldProps { label?: ReactNode; error?: string; hint?: ReactNode; required?: boolean; className?: string }

export function Field({ label, error, hint, required, className, children, htmlFor }: FieldProps & { children: ReactNode; htmlFor?: string }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error ? <p className="mt-1.5 text-sm text-red-600" role="alert">{error}</p> : hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldProps>(function Input(
  { label, error, hint, required, className, id, ...rest }, ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} htmlFor={fid}>
      <input ref={ref} id={fid} required={required} aria-invalid={!!error} className={cx("input", error && "input-error")} {...rest} />
    </Field>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps>(function Textarea(
  { label, error, hint, required, className, id, rows = 4, ...rest }, ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} htmlFor={fid}>
      <textarea ref={ref} id={fid} rows={rows} required={required} aria-invalid={!!error} className={cx("input", error && "input-error")} {...rest} />
    </Field>
  );
});

export interface SelectOption { value: string | number; label: string }
export function toOptions(o: Record<string, string> | { id: number; name: string }[] | undefined): SelectOption[] {
  if (!o) return [];
  if (Array.isArray(o)) return o.map((x) => ({ value: x.id, label: x.name }));
  return Object.entries(o).map(([value, label]) => ({ value, label }));
}

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & FieldProps & { options: SelectOption[]; placeholder?: string }>(function Select(
  { label, error, hint, required, className, id, options, placeholder = "Select…", ...rest }, ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} htmlFor={fid}>
      <select ref={ref} id={fid} required={required} aria-invalid={!!error} className={cx("input pr-8", error && "input-error")} {...rest}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
});

export function Checkbox({ label, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={cx("flex cursor-pointer items-start gap-2.5 text-sm text-slate-700", className)}>
      <input type="checkbox" className="mt-0.5 h-4.5 w-4.5 shrink-0 rounded border-slate-300 accent-brand-600" {...rest} />
      <span>{label}</span>
    </label>
  );
}

/** Comma/enter separated tag input (skills). */
export function TagInput({ label, value, onChange, placeholder = "Type and press Enter", max = 20, hint, error }: {
  label?: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string; max?: number; hint?: string; error?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const add = (raw: string) => {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    const next = [...value];
    for (const p of parts) if (!next.some((x) => x.toLowerCase() === p.toLowerCase()) && next.length < max) next.push(p.slice(0, 60));
    onChange(next);
  };
  return (
    <Field label={label} hint={hint ?? `Up to ${max}. Press Enter or comma after each.`} error={error}>
      <div className="input flex min-h-[46px] flex-wrap items-center gap-1.5 py-2" onClick={() => ref.current?.focus()}>
        {value.map((t) => (
          <span key={t} className="chip">
            {t}
            <button type="button" aria-label={`Remove ${t}`} className="text-brand-700 hover:text-red-600" onClick={() => onChange(value.filter((x) => x !== t))}>×</button>
          </span>
        ))}
        <input
          ref={ref}
          className="min-w-[8rem] flex-1 border-0 bg-transparent p-0 text-[15px] outline-none focus:ring-0"
          placeholder={value.length ? "" : placeholder}
          onKeyDown={(e) => {
            const t = e.currentTarget;
            if ((e.key === "Enter" || e.key === ",") && t.value.trim()) { e.preventDefault(); add(t.value); t.value = ""; }
            if (e.key === "Backspace" && !t.value && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={(e) => { if (e.currentTarget.value.trim()) { add(e.currentTarget.value); e.currentTarget.value = ""; } }}
        />
      </div>
    </Field>
  );
}

// ---------------- Display ----------------
const TONES: Record<string, string> = {
  green: "bg-accent-50 text-accent-700 ring-accent-600/20", amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  blue: "bg-brand-50 text-brand-800 ring-brand-600/20", indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20", slate: "bg-slate-100 text-slate-700 ring-slate-500/20",
};
export function Badge({ tone = "slate", children, className }: { tone?: string; children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", TONES[tone] ?? TONES.slate, className)}>{children}</span>;
}
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "slate"}>{label ?? status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}</Badge>;
}

export function EmptyState({ title, text, action, icon = "🔍" }: { title: string; text?: ReactNode; action?: ReactNode; icon?: string }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 text-4xl" aria-hidden="true">{icon}</div>
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      {text && <p className="mt-1 max-w-md text-sm text-slate-600">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Alert({ tone = "blue", title, children }: { tone?: "blue" | "green" | "amber" | "red"; title?: string; children?: ReactNode }) {
  const map = { blue: "border-brand-200 bg-brand-50 text-brand-900", green: "border-accent-100 bg-accent-50 text-accent-700", amber: "border-amber-200 bg-amber-50 text-amber-900", red: "border-red-200 bg-red-50 text-red-800" };
  return (
    <div className={cx("rounded-xl border px-4 py-3 text-sm", map[tone])} role={tone === "red" ? "alert" : "status"}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? "mt-0.5" : ""}>{children}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, tone = "brand", href }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "brand" | "green" | "amber" | "red" | "slate"; href?: string }) {
  const bar = { brand: "bg-brand-600", green: "bg-accent-500", amber: "bg-amber-500", red: "bg-red-500", slate: "bg-slate-400" }[tone];
  const body = (
    <div className="card relative h-full overflow-hidden p-4 transition hover:shadow-md sm:p-5">
      <span className={cx("absolute inset-y-0 left-0 w-1", bar)} />
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-extrabold text-ink sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}

export function Card({ title, actions, children, className, bodyClass }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cx("card", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
          {title && <h2 className="text-base font-bold text-ink">{title}</h2>}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cx("p-4 sm:p-5", bodyClass)}>{children}</div>
    </section>
  );
}

export function Pagination({ page, last, onPage }: { page: number; last: number; onPage: (p: number) => void }) {
  if (last <= 1) return null;
  const pages: (number | "…")[] = [];
  for (let p = 1; p <= last; p++) {
    if (p === 1 || p === last || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }
  return (
    <nav className="mt-6 flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
      <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>‹ Prev</Button>
      {pages.map((p, i) => p === "…" ? <span key={`e${i}`} className="px-1 text-slate-400">…</span> : (
        <button key={p} onClick={() => onPage(p)} aria-current={p === page ? "page" : undefined}
          className={cx("h-9 min-w-9 rounded-lg px-2 text-sm font-semibold", p === page ? "bg-brand-600 text-white" : "text-slate-700 hover:bg-slate-100")}>{p}</button>
      ))}
      <Button size="sm" variant="outline" disabled={page >= last} onClick={() => onPage(page + 1)}>Next ›</Button>
    </nav>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode }[] }) {
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist">
      {items.map((it) => (
        <button key={it.value} role="tab" aria-selected={value === it.value} onClick={() => onChange(it.value)}
          className={cx("shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition", value === it.value ? "bg-ink text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50")}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

// ---------------- Modal ----------------
export function Modal({ open, onClose, title, children, footer, size = "md" }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; size?: "sm" | "md" | "lg" | "xl";
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; prev?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  const w = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size];
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" className={cx("flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl outline-none sm:rounded-2xl", w)}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <button onClick={onClose} className="-m-1 rounded-lg p-1 text-slate-500 hover:bg-slate-100" aria-label="Close">✕</button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
