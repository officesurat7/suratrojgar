"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader, Table } from "@/components/panel/Shell";
import { useApi } from "@/components/providers";
import { Alert, Button, Card, EmptyState, PageLoader } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { bytes, dateTimeIST, timeAgo } from "@/lib/format";

interface Data { path: string; writable: boolean; settings: { backup_enabled: boolean; backup_time: string; backup_retention_days: number }; data: { name: string; size: number; created_at: string }[] }

export default function BackupsPage() {
  const { toast } = useToast();
  const { data, loading, reload } = useApi<Data>("super/backups");
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());
  const run = async () => {
    setBusy(true);
    try { const r = await api.post<{ message: string }>("super/backups"); toast(r.message); reload(); }
    catch (x) { toast((x as Error).message, "error"); } finally { setBusy(false); }
  };
  if (loading && !data) return <PageLoader />;
  if (!data) return <Alert tone="red">Could not load backups.</Alert>;
  const last = data.data[0];
  const stale = !last || now - new Date(last.created_at).getTime() > 26 * 3600 * 1000;
  return (
    <>
      <PageHeader title="Backups" subtitle="Compressed MySQL dumps. Copy them off the server regularly: a backup on the same server does not protect against losing the server."
        actions={<Button size="sm" loading={busy} onClick={run} disabled={!data.writable}>Back up now</Button>} />
      <div className="mb-4 space-y-2">
        {!data.writable && <Alert tone="red">The backup folder is missing or not writable. Check BACKUP_PATH in .env on the server.</Alert>}
        {data.writable && stale && data.settings.backup_enabled && <Alert tone="amber">No backup in the last 26 hours. Check that the scheduler (cron) is running on the server.</Alert>}
        {!data.settings.backup_enabled && <Alert tone="amber">Daily backups are switched off in <Link href="/super-admin/settings" className="font-semibold underline">Site settings</Link>.</Alert>}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div>
          {!data.data.length ? <EmptyState icon="💾" title="No backups yet" /> : (
            <Table head={["File", "Size", "Created (IST)"]}>
              {data.data.map((b) => <tr key={b.name}><td className="px-4 py-2 font-mono text-xs">{b.name}</td><td className="px-4 py-2 tabular-nums">{bytes(b.size)}</td><td className="px-4 py-2 text-slate-600">{dateTimeIST(b.created_at)}</td></tr>)}
            </Table>
          )}
        </div>
        <Card title="Schedule">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Daily backup</dt><dd>{data.settings.backup_enabled ? "On" : "Off"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Time (server)</dt><dd>{data.settings.backup_time}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Kept for</dt><dd>{data.settings.backup_retention_days} days</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Last backup</dt><dd>{last ? timeAgo(last.created_at) : "Never"}</dd></div>
            <div><dt className="text-slate-500">Folder</dt><dd className="break-all font-mono text-xs">{data.path}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">To restore, follow docs/BACKUP.md. Restores are done on the server, not from this page, so a mistake here can&apos;t overwrite live data.</p>
        </Card>
      </div>
    </>
  );
}
