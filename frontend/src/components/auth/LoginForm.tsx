"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { homeFor, useAuth } from "@/components/providers";
import { Alert, Button, Input } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { SessionUser } from "@/lib/types";

type Portal = "user" | "staff" | "admin" | "super";

/** Only allow same-site relative redirects after login (prevents open redirects). */
export function safeNext(n: string | null): string | null {
  if (!n || !n.startsWith("/") || n.startsWith("//") || n.startsWith("/\\")) return null;
  return n;
}

export function LoginForm({ portal }: { portal: Portal }) {
  const router = useRouter();
  const sp = useSearchParams();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  const [challenge, setChallenge] = useState<{ challenge: string; method: "totp" | "email" } | null>(null);
  const [code, setCode] = useState("");

  const finish = (u: SessionUser) => {
    setUser(u);
    const next = safeNext(sp.get("next"));
    const home = homeFor(u);
    // Only follow ?next when it belongs to the area this user may access (or is a public page)
    const ok = next && (!/^\/(seeker|employer|admin|super-admin)/.test(next) || next.startsWith(home));
    router.replace(ok ? next! : home);
    router.refresh();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await api.auth<{ user?: SessionUser; two_factor_required?: boolean; challenge?: string; method?: "totp" | "email" }>("login", { email, password, portal });
      if (r.two_factor_required && r.challenge) { setChallenge({ challenge: r.challenge, method: r.method ?? "email" }); return; }
      if (r.user) finish(r.user);
    } catch (x) {
      const ae = x as ApiError;
      if (ae.code === "email_unverified") { router.push(`/verify-email?email=${encodeURIComponent(email)}&sent=1`); return; }
      setErr(ae);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge) return;
    setBusy(true); setErr(null);
    try {
      const r = await api.auth<{ user: SessionUser }>("2fa", { challenge: challenge.challenge, code: code.trim() });
      finish(r.user);
    } catch (x) {
      const ae = x as ApiError;
      if (ae.status === 422 && !ae.field("code")) setChallenge(null);
      setErr(ae);
    } finally {
      setBusy(false);
    }
  };

  if (challenge) {
    return (
      <form onSubmit={verify} className="space-y-4">
        <Alert tone="blue" title="Two-step verification">
          {challenge.method === "totp" ? "Enter the 6-digit code from your authenticator app." : `We have emailed a 6-digit code to ${email}. It expires in 10 minutes.`}
        </Alert>
        {err && !err.field("code") && <Alert tone="red">{err.message}</Alert>}
        <Input label="Verification code" inputMode="numeric" autoComplete="one-time-code" maxLength={10} required autoFocus
          value={code} onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))} error={err?.field("code")} className="[&_input]:text-center [&_input]:text-xl [&_input]:tracking-[0.4em]" />
        <Button type="submit" block size="lg" loading={busy}>Verify and log in</Button>
        <button type="button" onClick={() => { setChallenge(null); setCode(""); setErr(null); }} className="w-full text-center text-sm font-semibold text-slate-600 hover:text-ink">← Back to login</button>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {err && <Alert tone="red">{err.message}</Alert>}
      <Input label="Email address" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} maxLength={191} error={err?.field("email")} />
      <div>
        <div className="relative">
          <Input label="Password" type={show ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} maxLength={200} error={err?.field("password")} />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-[38px] text-xs font-semibold text-slate-500 hover:text-ink">{show ? "Hide" : "Show"}</button>
        </div>
        {portal === "user" && <div className="mt-2 text-right"><Link href="/forgot-password" className="text-sm font-semibold text-brand-700 hover:underline">Forgot password?</Link></div>}
      </div>
      <Button type="submit" block size="lg" loading={busy}>Log in</Button>
    </form>
  );
}
