"use client";

import { useState } from "react";
import { RankBars, TrendChart } from "@/components/panel/Charts";
import { RangePicker, rangeQs, type Range } from "@/components/panel/RangePicker";
import { PageHeader, Table } from "@/components/panel/Shell";
import { useApi, useAuth, useMeta } from "@/components/providers";
import { Alert, Button, Card, EmptyState, PageLoader, Tabs } from "@/components/ui";
import { download } from "@/lib/api";

const DIMS = { day: "By day", locality: "By area", category: "By category", role: "By role", job: "By job", employer: "By employer", salary_range: "By salary", employment_type: "By job type", education: "By education", experience: "By experience", status: "By status" } as const;
type Dim = keyof typeof DIMS;

export default function ReportsPage() {
  const { can } = useAuth();
  const meta = useMeta();
  const [range, setRange] = useState<Range>({ range: "last_30_days" });
  const [dim, setDim] = useState<Dim>("day");
  const { data, loading, error } = useApi<{ range: { from: string; to: string }; rows: { label: string; value: number }[] }>(`admin/reports/applications?dimension=${dim}&${rangeQs(range)}`);
  const pretty = (l: string) => dim === "status" ? meta?.options.application_statuses[l] ?? l : dim === "employment_type" ? meta?.options.employment_types[l] ?? l : l;
  const rows = (data?.rows ?? []).map((r) => ({ name: pretty(r.label), value: r.value }));
  const total = rows.reduce((s, r) => s + r.value, 0);

  return (
    <>
      <PageHeader title="Application reports" subtitle={data ? `${data.range.from} to ${data.range.to} (IST) · ${total} applications` : undefined}
        actions={can("reports.export") ? <Button variant="outline" size="sm" onClick={() => download(`admin/reports/export?report=applications&dimension=${dim}&${rangeQs(range)}`)}>Export CSV</Button> : null} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><RangePicker value={range} onChange={setRange} /></div>
      <Tabs value={dim} onChange={setDim} items={Object.entries(DIMS).map(([value, label]) => ({ value: value as Dim, label }))} />
      <div className="mt-4">
        {error ? <Alert tone="red">{error}</Alert> : loading && !data ? <PageLoader /> : !rows.length ? <EmptyState icon="📊" title="No applications in this period" /> : (
          <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
            <Card title={DIMS[dim]}>{dim === "day" ? <TrendChart data={(data?.rows ?? []).map((r) => ({ date: r.label, applications: r.value }))} keys={["applications"]} /> : <RankBars data={rows.slice(0, 20)} />}</Card>
            <Table head={[DIMS[dim].replace("By ", ""), "Applications", "Share"]}>
              {rows.map((r) => (
                <tr key={r.name}><td className="px-4 py-2.5">{r.name}</td><td className="px-4 py-2.5 font-semibold tabular-nums">{r.value}</td><td className="px-4 py-2.5 tabular-nums text-slate-500">{total ? Math.round((r.value / total) * 100) : 0}%</td></tr>
              ))}
            </Table>
          </div>
        )}
      </div>
    </>
  );
}
