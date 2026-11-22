"use client";

import { useState } from "react";

export const PRESETS: Record<string, string> = {
  today: "Today", yesterday: "Yesterday", last_7_days: "Last 7 days", last_30_days: "Last 30 days",
  this_month: "This month", previous_month: "Previous month", this_year: "This year", previous_year: "Previous year", custom: "Custom range",
};

export interface Range { range: string; from?: string; to?: string }
export const rangeQs = (r: Range) => `range=${r.range}${r.range === "custom" && r.from && r.to ? `&from=${r.from}&to=${r.to}` : ""}`;

/** Date-range preset selector with a custom from/to option (dates in IST). */
export function RangePicker({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  const [from, setFrom] = useState(value.from ?? "");
  const [to, setTo] = useState(value.to ?? "");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select className="input w-auto py-2 text-sm" value={value.range} aria-label="Date range"
        onChange={(e) => onChange(e.target.value === "custom" ? { range: "custom", from, to } : { range: e.target.value })}>
        {Object.entries(PRESETS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      {value.range === "custom" && (
        <>
          <input type="date" className="input w-auto py-2 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
          <span className="text-sm text-slate-500">to</span>
          <input type="date" className="input w-auto py-2 text-sm" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
          <button className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={!from || !to} onClick={() => onChange({ range: "custom", from, to })}>Apply</button>
        </>
      )}
    </div>
  );
}
