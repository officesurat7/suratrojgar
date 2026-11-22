"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const SERIES = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#0ea5e9", "#64748b", "#ec4899"];
const axis = { fontSize: 11, fill: "#64748b" };
const short = (d: string) => { const [, m, day] = d.split("-"); return `${+day}/${+m}`; };

/** Time series (date on X). Each key gets a colour from SERIES. */
export function TrendChart({ data, keys, labels, height = 260 }: { data: Record<string, string | number>[]; keys: string[]; labels?: Record<string, string>; height?: number }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>{keys.map((k, i) => <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={SERIES[i]} stopOpacity={0.25} /><stop offset="100%" stopColor={SERIES[i]} stopOpacity={0} /></linearGradient>)}</defs>
          <CartesianGrid stroke="#eef2f7" vertical={false} />
          <XAxis dataKey="date" tickFormatter={short} tick={axis} tickLine={false} axisLine={false} minTickGap={16} />
          <YAxis allowDecimals={false} tick={axis} tickLine={false} axisLine={false} width={44} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} labelFormatter={(l) => String(l)} />
          {keys.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
          {keys.map((k, i) => <Area key={k} type="monotone" dataKey={k} name={labels?.[k] ?? k} stroke={SERIES[i]} strokeWidth={2} fill={`url(#g-${k})`} dot={false} />)}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal bars for ranked categories (labels can be long). */
export function RankBars({ data, height }: { data: { name: string; value: number }[]; height?: number }) {
  const h = height ?? Math.max(160, data.length * 30 + 20);
  return (
    <div style={{ height: h }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#eef2f7" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={axis} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" width={120} tick={{ ...axis, fill: "#334155" }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} cursor={{ fill: "#f1f5f9" }} />
          <Bar dataKey="value" name="Count" fill="#2563eb" radius={[0, 6, 6, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Donut({ data, height = 220 }: { data: { name: string; value: number }[]; height?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <p className="py-10 text-center text-sm text-slate-500">No data for this period.</p>;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="none">
            {data.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} formatter={(v) => [`${v} (${Math.round((Number(v) / total) * 100)}%)`, ""]} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
