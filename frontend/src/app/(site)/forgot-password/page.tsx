"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard, PasswordStrength } from "@/components/auth/AuthCard";
import { ResendCode } from "@/components/auth/VerifyEmailForm";
import { Alert, Button, Input } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  const [info, setInfo] = useState("");

  const request = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await api.post<{ message: string }>("auth/forgot-password", { email });
      setInfo(r.message);
      setStep(2);
    } catch (x) { setErr(x as ApiError); } finally { setBusy(false); }
  };
  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await api.post<{ message: string }>("auth/reset-password", { email, code, password, password_confirmation: confirm });
      toast(r.message);
      router.replace("/login");
    } catch (x) { setErr(x as ApiError); } finally { setBusy(false); }
  };

  return (
    <AuthCard title="Reset your password" subtitle={step === 1 ? "Enter your registered email. We'll send a 6-digit reset code." : "Enter the code from your email and choose a new password."}
      footer={<Link href="/login" className="font-semibold text-brand-700 hover:underline">← Back to login</Link>}>
      {step === 1 ? (
        <form onSubmit={request} className="space-y-4">
          {err && <Alert tone="red">{err.field("email") ?? err.message}</Alert>}
          <Input label="Email address" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" block size="lg" loading={busy}>Send reset code</Button>
        </form>
      ) : (
        <form onSubmit={reset} className="space-y-4">
          {info && <Alert tone="blue">{info}</Alert>}
          {err && !err.field("code") && !err.field("password") && <Alert tone="red">{err.message}</Alert>}
          <Input label="6-digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} error={err?.field("code")} />
          <div>
            <Input label="New password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} error={err?.field("password")} />
            <PasswordStrength value={password} />
          </div>
          <Input label="Confirm new password" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} error={confirm && confirm !== password ? "Passwords do not match." : undefined} />
          <Button type="submit" block size="lg" loading={busy} disabled={code.length !== 6 || !password || password !== confirm}>Update password</Button>
          <ResendCode email={email} purpose="password_reset" />
        </form>
      )}
    </AuthCard>
  );
}
