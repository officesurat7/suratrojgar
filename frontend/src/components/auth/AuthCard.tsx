import Link from "next/link";
import type { ReactNode } from "react";

export function AuthCard({ title, subtitle, children, footer, wide = false, badge }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean; badge?: ReactNode }) {
  return (
    <div className="relative min-h-[calc(100vh-72px)] bg-gradient-to-b from-brand-50 to-[var(--background)] px-4 py-8 sm:py-14">
      <div className={`mx-auto w-full ${wide ? "max-w-3xl" : "max-w-md"}`}>
        <div className="card p-5 sm:p-8">
          {badge && <div className="mb-3">{badge}</div>}
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-slate-600">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-5 text-center text-sm text-slate-600">{footer}</div>}
        <p className="mt-6 text-center text-xs text-slate-500">Protected by rate limiting and encrypted connections. <Link href="/privacy-policy" className="underline">Privacy Policy</Link></p>
      </div>
    </div>
  );
}

export function PasswordStrength({ value }: { value: string }) {
  const checks = [value.length >= 8, /[a-zA-Z]/.test(value), /\d/.test(value), /[^a-zA-Z0-9]/.test(value) || value.length >= 12];
  const score = checks.filter(Boolean).length;
  const label = ["Too short", "Weak", "Fair", "Good", "Strong"][score];
  const color = ["bg-slate-200", "bg-red-500", "bg-amber-500", "bg-brand-500", "bg-accent-500"][score];
  if (!value) return null;
  return (
    <div className="mt-1.5" aria-live="polite">
      <div className="flex gap-1">{[0, 1, 2, 3].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < score ? color : "bg-slate-200"}`} />)}</div>
      <p className="mt-1 text-xs text-slate-500">Password strength: {label}. Use 8+ characters with letters and numbers.</p>
    </div>
  );
}
