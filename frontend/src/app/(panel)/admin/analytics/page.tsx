"use client";

import { useState } from "react";
import { Donut, RankBars, TrendChart } from "@/components/panel/Charts";
import { RangePicker, rangeQs, type Range } from "@/components/panel/RangePicker";
import { PageHeader } from "@/components/panel/Shell";
import { useApi, useAuth } from "@/components/providers";
import { Alert, Button, Card, PageLoader, StatCard } from "@/components/ui";
import { download } from "@/lib/api";

type Row = { label: string; value: number };
interface Visitors {
  range: { from: string; to: string }; note: string; daily: { date: string; visitors: number; page_views: number }[];
  monthly: { month: string; visitors: number; page_views: number }[]; totals: { visitors: number; page_views: number; searches: number };
  popular_pages: Row[]; search_keywords: Row[]; devices: Row[]; browsers: Row[]; sources: Row[]; most_viewed_jobs: Row[]; cities_note: string; registered_by_locality: Row[];
}
const toBars = (r: Row[]) => r.map((x) => ({ name: x.label || "(none)", value: x.value }));
const Empty = () => <p className="py-8 text-center text-sm text-slate-500">No data for this period.</p>;

export default function AnalyticsPage() {
  const { can } = useAuth();
  const [range, setRange] = useState<Range>({ range: "last_30_days" });
  const { data, error } = useApi<Visitors>(`admin/reports/visitors?${rangeQs(range)}`);
  return (
    <>
      <PageHeader title="Visitor analytics" subtitle={data ? `${data.range.from} to ${data.range.to} (IST)` : undefined}
        actions={can("reports.export") ? <Button variant="outline" size="sm" onClick={() => download(`admin/reports/export?report=visitors&${rangeQs(range)}`)}>Export CSV</Button> : null} />
      <div className="mb-4"><RangePicker value={range} onChange={setRange} /></div>
      {error ? <Alert tone="red">{error}</Alert> : !data ? <PageLoader /> : (
        <>
          <Alert tone="blue">{data.note}</Alert>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <StatCard label="Visitors (est.)" value={data.totals.visitors.toLocaleString("en-IN")} />
            <StatCard label="Page views" value={data.totals.page_views.toLocaleString("en-IN")} tone="slate" />
            <StatCard label="Job searches" value={data.totals.searches.toLocaleString("en-IN")} tone="green" />
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Card title="Daily visitors" className="lg:col-span-2"><TrendChart data={data.daily} keys={["visitors", "page_views"]} labels={{ visitors: "Visitors", page_views: "Page views" }} /></Card>
            <Card title="Devices">{data.devices.length ? <Donut data={toBars(data.devices)} /> : <Empty />}</Card>
            <Card title="Traffic sources">{data.sources.length ? <Donut data={toBars(data.sources)} /> : <Empty />}</Card>
            <Card title="Browsers">{data.browsers.length ? <RankBars data={toBars(data.browsers)} /> : <Empty />}</Card>
            <Card title="Popular pages">{data.popular_pages.length ? <RankBars data={toBars(data.popular_pages.slice(0, 12))} /> : <Empty />}</Card>
            <Card title="Most viewed jobs">{data.most_viewed_jobs.length ? <RankBars data={toBars(data.most_viewed_jobs.slice(0, 12))} /> : <Empty />}</Card>
            <Card title="Top search keywords">{data.search_keywords.length ? <RankBars data={toBars(data.search_keywords.slice(0, 15))} /> : <Empty />}</Card>
            <Card title="Registered job seekers by area (verified data)" className="lg:col-span-2">{data.registered_by_locality.length ? <RankBars data={toBars(data.registered_by_locality)} /> : <Empty />}</Card>
            <Card title="Monthly" className="lg:col-span-2">
              <div className="overflow-x-auto"><table className="w-full min-w-[360px] text-sm"><thead className="text-left text-xs uppercase text-slate-500"><tr><th className="py-2">Month</th><th>Visitors</th><th>Page views</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{data.monthly.map((m) => <tr key={m.month}><td className="py-2">{m.month}</td><td className="tabular-nums">{m.visitors}</td><td className="tabular-nums">{m.page_views}</td></tr>)}</tbody></table></div>
            </Card>
          </div>
          <p className="mt-4 text-xs text-slate-500">{data.cities_note}</p>
        </>
      )}
    </>
  );
}
