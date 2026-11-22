import { StatusBadge } from "@/components/ui";
import { dateTimeIST } from "@/lib/format";

export interface AppHistory { from: string | null; to: string; label: string; note: string | null; at: string }

export function ApplicationTimeline({ history }: { history: AppHistory[] }) {
  if (!history.length) return <p className="text-sm text-slate-500">No status changes yet.</p>;
  return (
    <ol className="relative space-y-5 border-l-2 border-slate-200 pl-5">
      {[...history].reverse().map((h, i) => (
        <li key={i} className="relative">
          <span className={`absolute -left-[27px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white ${i === 0 ? "bg-brand-600" : "bg-slate-300"}`} />
          <div className="flex flex-wrap items-center gap-2"><StatusBadge status={h.to} label={h.label} /><span className="text-xs text-slate-500">{dateTimeIST(h.at)}</span></div>
          {h.note && <p className="mt-1 text-sm text-slate-600">{h.note}</p>}
        </li>
      ))}
    </ol>
  );
}
