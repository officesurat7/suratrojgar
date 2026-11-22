"use client";

import { useState } from "react";
import { Alert, Button, Modal, Select, Textarea } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";

/** Suspend / block / reactivate an account, with a required reason when restricting. */
export function StatusControl({ endpoint, current, onDone, options = ["active", "suspended", "blocked"] }: { endpoint: string; current: string; onDone: () => void; options?: string[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const labels: Record<string, string> = { active: "Active (reactivate)", suspended: "Suspended (temporary)", blocked: "Blocked (permanent)" };
  const submit = async () => {
    setBusy(true); setErr(null);
    try { const r = await api.put<{ message: string }>(endpoint, { status, reason: reason || null }); toast(r.message); setOpen(false); setReason(""); onDone(); }
    catch (x) { setErr(x as ApiError); } finally { setBusy(false); }
  };
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => { setStatus(options.find((o) => o !== current) ?? ""); setOpen(true); }}>Change account status</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Change account status" size="sm"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button variant={status === "active" ? "success" : "danger"} loading={busy} onClick={submit}>Confirm</Button></>}>
        <div className="space-y-3">
          {err && !Object.keys(err.errors).length && <Alert tone="red">{err.message}</Alert>}
          <Select label="New status" options={options.filter((o) => o !== current).map((o) => ({ value: o, label: labels[o] ?? o }))} value={status} onChange={(e) => setStatus(e.target.value)} error={err?.field("status")} />
          <Textarea label={status === "active" ? "Note (optional)" : "Reason (shown to the user)"} rows={3} maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)} error={err?.field("reason")} />
          {status !== "active" && <p className="text-xs text-slate-500">The user is signed out of all devices. Their active jobs are hidden while the account is restricted.</p>}
        </div>
      </Modal>
    </>
  );
}
