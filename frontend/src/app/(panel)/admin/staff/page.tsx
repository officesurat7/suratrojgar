"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/panel/Shell";
import { useApi, useAuth } from "@/components/providers";
import { Alert, Badge, Button, EmptyState, Input, Modal, PageLoader, Select, StatusBadge } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { timeAgo } from "@/lib/format";

interface Perm { name: string; label: string; group: string; grantable: boolean; super_only: boolean }
interface Member { id: number; name: string; email: string; mobile: string | null; user_type: "admin_staff" | "admin"; status: string; designation: string | null; department: string | null; two_factor_enabled: boolean; last_login_at: string | null; permissions: string[] }

function MemberForm({ m, perms, onClose, onSaved }: { m: Member | null; perms: Perm[]; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [f, setF] = useState({ user_type: m?.user_type ?? "admin_staff", name: m?.name ?? "", email: m?.email ?? "", mobile: m?.mobile ?? "", designation: m?.designation ?? "", department: m?.department ?? "" });
  const [sel, setSel] = useState<Set<string>>(new Set(m?.user_type === "admin_staff" ? m.permissions : []));
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const groups = useMemo(() => perms.reduce<Record<string, Perm[]>>((a, p) => { (a[p.group] ??= []).push(p); return a; }, {}), [perms]);
  const toggle = (n: string) => { const s = new Set(sel); if (s.has(n)) s.delete(n); else s.add(n); setSel(s); };
  const save = async () => {
    setBusy(true); setErr(null);
    const body: Record<string, unknown> = { name: f.name, designation: f.designation || null, department: f.department || null };
    if (f.user_type === "admin_staff") body.permissions = [...sel];
    if (!m) Object.assign(body, { user_type: f.user_type, email: f.email, mobile: f.mobile || null });
    try { const r = await api[m ? "put" : "post"]<{ message: string }>(m ? `admin/staff/${m.id}` : "admin/staff", body); toast(r.message); onSaved(); onClose(); }
    catch (x) { setErr(x as ApiError); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={m ? `Edit ${m.name}` : "Add staff or admin"} size="lg" footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>{m ? "Save changes" : "Create account"}</Button></>}>
      <div className="space-y-3">
        {err && !Object.keys(err.errors).length && <Alert tone="red">{err.message}</Alert>}
        {!m && user?.user_type === "super_admin" && <Select label="Account type" options={[{ value: "admin_staff", label: "Admin Staff (chosen permissions)" }, { value: "admin", label: "Admin (all admin permissions)" }]} value={f.user_type} onChange={(e) => setF({ ...f, user_type: e.target.value as Member["user_type"] })} />}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Full name" required maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={err?.field("name")} />
          <Input label="Email" type="email" required disabled={!!m} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={err?.field("email")} />
          {!m && <Input label="Mobile (optional)" inputMode="numeric" maxLength={13} value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value })} error={err?.field("mobile")} />}
          <Input label="Designation" maxLength={100} value={f.designation} onChange={(e) => setF({ ...f, designation: e.target.value })} />
          <Input label="Department" maxLength={100} value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} />
        </div>
        {!m && <Alert tone="blue">No password is set here. The person gets an email code to choose their own password, then logs in at the {f.user_type === "admin" ? "Admin" : "Staff"} login page.</Alert>}
        {f.user_type === "admin_staff" && (
          <div>
            <div className="mb-2 flex items-center justify-between"><p className="text-sm font-semibold text-ink">Permissions ({sel.size})</p><Button size="sm" variant="ghost" onClick={() => setSel(new Set())}>Clear all</Button></div>
            {err?.field("permissions") && <p className="mb-2 text-sm text-red-600">{err.field("permissions")}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(groups).map(([g, ps]) => (
                <fieldset key={g} className="rounded-lg border border-slate-200 p-3">
                  <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{g}</legend>
                  {ps.map((p) => (
                    <label key={p.name} className={`flex items-start gap-2 py-1 text-sm ${p.grantable ? "" : "opacity-50"}`}>
                      <input type="checkbox" className="mt-0.5" disabled={!p.grantable} checked={sel.has(p.name)} onChange={() => toggle(p.name)} />
                      <span>{p.label}{p.super_only && <span className="ml-1 text-xs text-slate-500">(Super Admin only)</span>}</span>
                    </label>
                  ))}
                </fieldset>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">You can only grant permissions you have yourself.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function StaffPage() {
  const { user } = useAuth();
  const { toast, confirm } = useToast();
  const { data, loading, reload } = useApi<{ data: Member[] }>("admin/staff");
  const { data: perms } = useApi<{ data: Perm[] }>("admin/staff/permissions");
  const [edit, setEdit] = useState<Member | null | "new">(null);
  const labels = useMemo(() => Object.fromEntries((perms?.data ?? []).map((p) => [p.name, p.label])), [perms]);
  const act = async (m: Member, what: "suspend" | "activate" | "reset") => {
    const text = what === "reset" ? "Signs them out everywhere, removes two-step verification and emails a code to set a new password." : what === "suspend" ? "They are signed out and cannot log in until reactivated." : "They can log in again.";
    if (!(await confirm({ title: `${what === "reset" ? "Reset" : what === "suspend" ? "Suspend" : "Reactivate"} ${m.name}?`, text, confirmLabel: what === "reset" ? "Reset account" : what === "suspend" ? "Suspend" : "Reactivate", danger: what !== "activate" }))) return;
    try {
      const r = what === "reset" ? await api.post<{ message: string }>(`admin/staff/${m.id}/reset`) : await api.put<{ message: string }>(`admin/staff/${m.id}/status`, { status: what === "suspend" ? "suspended" : "active" });
      toast(r.message); reload();
    } catch (x) { toast((x as Error).message, "error"); }
  };
  return (
    <>
      <PageHeader title="Staff & admins" subtitle={user?.user_type === "super_admin" ? "Create Admins and Admin Staff, and choose what each staff member can do." : "Create Admin Staff and choose what each person can do."}
        actions={<Button size="sm" onClick={() => setEdit("new")} disabled={!perms}>Add account</Button>} />
      {loading && !data ? <PageLoader /> : !data?.data.length ? <EmptyState icon="🧑‍💼" title="No staff accounts yet" /> : (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.data.map((m) => (
            <li key={m.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{m.name} {m.id === user?.id && <span className="text-xs text-slate-500">(you)</span>}</p>
                  <p className="truncate text-xs text-slate-500">{m.email}{m.designation ? ` · ${m.designation}` : ""}{m.department ? `, ${m.department}` : ""}</p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1"><Badge tone={m.user_type === "admin" ? "blue" : "slate"}>{m.user_type === "admin" ? "Admin" : "Staff"}</Badge><StatusBadge status={m.status} /></div>
              </div>
              <p className="mt-2 text-xs text-slate-500">{m.two_factor_enabled ? "🔒 Two-step verification on" : "Two-step verification off"} · Last login {m.last_login_at ? timeAgo(m.last_login_at) : "never"}</p>
              <div className="mt-2 flex flex-wrap gap-1">{m.permissions.slice(0, 8).map((p) => <span key={p} className="chip text-xs">{labels[p] ?? p}</span>)}{m.permissions.length > 8 && <span className="text-xs text-slate-500">+{m.permissions.length - 8} more</span>}{!m.permissions.length && <span className="text-xs text-amber-700">No permissions yet</span>}</div>
              {m.id !== user?.id && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <Button size="sm" variant="outline" onClick={() => setEdit(m)} disabled={!perms}>Edit</Button>
                  {m.status === "active" ? <Button size="sm" variant="ghost" onClick={() => act(m, "suspend")}>Suspend</Button> : <Button size="sm" variant="ghost" onClick={() => act(m, "activate")}>Reactivate</Button>}
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => act(m, "reset")}>Reset password & 2FA</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {edit && perms && <MemberForm m={edit === "new" ? null : edit} perms={perms.data} onClose={() => setEdit(null)} onSaved={reload} />}
    </>
  );
}
