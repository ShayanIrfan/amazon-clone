import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import Panel from "../ui/Panel";

interface Props {
  label: string;
  value: string;
  current: number;
  previous: number;
  /** "the previous 30 days", for the comparison line. */
  comparedTo: string;
  icon?: ReactNode;
}

/** How this period compares with the last one, in words a shopkeeper can read at a glance. */
function comparison(current: number, previous: number) {
  if (previous === 0) return current === 0 ? { text: "No change", tone: "text-slate", direction: 0 } : { text: "New this period", tone: "text-moss", direction: 1 };
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 0.5) return { text: "No change", tone: "text-slate", direction: 0 };
  const rounded = Math.abs(change) >= 10 ? Math.round(Math.abs(change)) : Math.abs(change).toFixed(1);
  return change > 0
    ? { text: `Up ${rounded}%`, tone: "text-moss", direction: 1 }
    : { text: `Down ${rounded}%`, tone: "text-clay", direction: -1 };
}

export default function StatCard({ label, value, current, previous, comparedTo, icon }: Props) {
  const delta = comparison(current, previous);
  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="eyebrow">{label}</h3>
        {icon && <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mint text-harbor">{icon}</span>}
      </div>
      <p className="amount mt-3 text-2xl font-extrabold tracking-[-0.03em] text-ink">{value}</p>
      <div className="mt-2 flex items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${delta.direction > 0 ? "bg-moss/10 text-moss" : delta.direction < 0 ? "bg-clay/10 text-clay" : "bg-paper text-slate"}`}>
          {delta.direction > 0 && <ArrowUpRight size={13} aria-hidden />}
          {delta.direction < 0 && <ArrowDownRight size={13} aria-hidden />}
          {delta.text}
        </span>
        <span className="text-xs text-slate">vs {comparedTo}</span>
      </div>
    </Panel>
  );
}
