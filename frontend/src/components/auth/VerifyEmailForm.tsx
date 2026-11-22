"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { homeFor, useAuth } from "@/components/providers";
import { Alert, Button, Input } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { SessionUser } from "@/lib/types";

/** Shared resend button with a visible countdown (server enforces the real cooldown and hourly cap). */
export function ResendCode({ email, purpose, initial = 60 }: { email: string; purpose: "register" | "password_reset"; initial?: number }) {
  const [wait, setWait] = useState(initial);
  const [msg, setMsg] = useState<{ tone: "green" | "red"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);
  const resend = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await api.post<{ message: string; retry_after?: number }>("auth/resend-otp", { email, purpose });
      setMsg({ tone: "green", text: r.message });
      setWait(r.retry_after ?? 60);
    } catch (e) {
      const ae = e as ApiError;
      setMsg({ tone: "red", text: ae.message });
      if (typeof ae.data.retry_after === "number") setWait(ae.data.retry_after as number);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2 text-center">
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <button type="button" disabled={wait > 0 || busy || !email} onClick={resend} className="text-sm font-semibold text-brand-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline">
        {wait > 0 ? `Resend code in ${wait}s` : busy ? "Sending…" : "Resend code"}
      </button>
    </div>
  );
}

export function VerifyEmailForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const { setUser } = useAuth();
  const [email, setEmail] = useState(sp.get("email") ?? "");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await api.auth<{ user: SessionUser }>("verify-email", { email, code });
      setUser(r.user);
      router.replace(homeFor(r.user) + "?welcome=1");
      router.refresh();
    } catch (x) {
      setErr(x as ApiError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {sp.get("sent") && <Alert tone="blue">If this email can be registered, a code is on its way. It expires in 10 minutes.</Alert>}
      {err && !err.field("code") && !err.field("email") && <Alert tone="red">{err.message}</Alert>}
      <Input label="Email address" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={err?.field("email")} autoComplete="email" />
      <Input label="6-digit code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required autoFocus={!!email}
        value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} error={err?.field("code")} className="[&_input]:text-center [&_input]:text-2xl [&_input]:tracking-[0.5em]" />
      <Button type="submit" block size="lg" loading={busy} disabled={code.length !== 6}>Verify email</Button>
      <ResendCode email={email} purpose="register" />
    </form>
  );
}
