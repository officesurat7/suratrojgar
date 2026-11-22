"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordStrength } from "@/components/auth/AuthCard";
import { useMeta } from "@/components/providers";
import { Alert, Button, Checkbox, Input, PageLoader, Select, Textarea, toOptions } from "@/components/ui";
import { api, ApiError } from "@/lib/api";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-slate-100 pt-5 first:border-0 first:pt-0">
      <legend className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function RegisterEmployer() {
  const meta = useMeta();
  const router = useRouter();
  const [f, setF] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const fe = (k: string) => err?.field(k);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const body: Record<string, unknown> = { ...f, state: "Gujarat", city: "Surat", consent };
      if (body.gstin) body.gstin = String(body.gstin).toUpperCase();
      await api.post("auth/register/employer", body);
      router.push(`/verify-email?email=${encodeURIComponent(f.email ?? "")}&sent=1`);
    } catch (x) {
      setErr(x as ApiError);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(false);
    }
  };

  if (!meta) return <PageLoader />;
  return (
    <form onSubmit={submit} className="space-y-6">
      {err && <Alert tone="red">{Object.keys(err.errors).length ? "Please check the highlighted fields." : err.message}</Alert>}
      <Group title="Company">
        <Input className="sm:col-span-2" label="Company / business name" required maxLength={150} value={f.company_name ?? ""} onChange={set("company_name")} error={fe("company_name")} />
        <Select label="Company type" required options={toOptions(meta.options.company_types)} value={f.company_type ?? ""} onChange={set("company_type")} error={fe("company_type")} />
        <Select label="Business category" required options={toOptions(meta.business_categories)} value={f.business_category_id ?? ""} onChange={set("business_category_id")} error={fe("business_category_id")} />
        <Input label="Website (optional)" type="url" placeholder="https://" maxLength={255} value={f.website ?? ""} onChange={set("website")} error={fe("website")} />
        <Input label="GSTIN (optional)" maxLength={15} placeholder="24ABCDE1234F1Z5" value={f.gstin ?? ""} onChange={(e) => setF((s) => ({ ...s, gstin: e.target.value.toUpperCase() }))} error={fe("gstin")} hint="Speeds up verification." />
      </Group>
      <Group title="Contact person">
        <Input label="Contact person name" required autoComplete="name" maxLength={120} value={f.contact_person ?? ""} onChange={set("contact_person")} error={fe("contact_person")} />
        <Input label="Mobile number" required inputMode="numeric" maxLength={10} value={f.mobile ?? ""} onChange={(e) => setF((s) => ({ ...s, mobile: e.target.value.replace(/\D/g, "") }))} error={fe("mobile")} hint="Never shown publicly." />
        <Input className="sm:col-span-2" label="Business email" type="email" required autoComplete="email" maxLength={191} value={f.email ?? ""} onChange={set("email")} error={fe("email")} hint="Used for login. We'll send a verification code." />
        <div><Input label="Password" type="password" required autoComplete="new-password" maxLength={72} value={f.password ?? ""} onChange={set("password")} error={fe("password")} /><PasswordStrength value={f.password ?? ""} /></div>
        <Input label="Confirm password" type="password" required autoComplete="new-password" maxLength={72} value={f.password_confirmation ?? ""} onChange={set("password_confirmation")} error={f.password_confirmation && f.password_confirmation !== f.password ? "Passwords do not match." : undefined} />
      </Group>
      <Group title="Business address">
        <Input label="State" value="Gujarat" disabled readOnly />
        <Input label="City" value="Surat" disabled readOnly />
        <Select label="Area / locality" required options={toOptions(meta.localities)} value={f.locality_id ?? ""} placeholder="Choose area…"
          onChange={(e) => { const l = meta.localities.find((x) => String(x.id) === e.target.value); setF((s) => ({ ...s, locality_id: e.target.value, pincode: s.pincode || l?.pincode || "" })); }} error={fe("locality_id")} />
        <Input label="PIN code" required inputMode="numeric" maxLength={6} value={f.pincode ?? ""} onChange={(e) => setF((s) => ({ ...s, pincode: e.target.value.replace(/\D/g, "") }))} error={fe("pincode")} />
        <Textarea className="sm:col-span-2" rows={2} label="Full address" required maxLength={500} value={f.address ?? ""} onChange={set("address")} error={fe("address")} hint="Private. Used only for verification; never shown on job listings." />
      </Group>
      <div>
        <Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)}
          label={<>I confirm these details are true and agree to the <Link href="/terms" target="_blank" className="font-semibold text-brand-700 underline">Terms</Link> and <Link href="/privacy-policy" target="_blank" className="font-semibold text-brand-700 underline">Privacy Policy</Link>. I will not charge job seekers any fee.</>} />
        {fe("consent") && <p className="mt-1.5 text-sm text-red-600">{fe("consent")}</p>}
      </div>
      <Button type="submit" size="lg" block loading={busy} disabled={!consent}>Register company</Button>
      <p className="text-center text-xs text-slate-500">After email verification, our team verifies your business (usually within 1 working day). You can prepare job drafts meanwhile.</p>
    </form>
  );
}
