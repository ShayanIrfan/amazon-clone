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
    <Panel className="p-4">
      <div className="flex items-center justify-between gap-2 text-sm text-slate">
        <h3 className="font-medium">{label}</h3>
        {icon}
      </div>
      <p className="amount mt-2 text-3xl font-semibold tracking-[-0.03em] text-ink">{value}</p>
      <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${delta.tone}`}>
        {delta.direction > 0 && <ArrowUpRight size={14} aria-hidden />}
        {delta.direction < 0 && <ArrowDownRight size={14} aria-hidden />}
        {delta.text}
      </p>
      <p className="text-xs text-slate">vs {comparedTo}</p>
    </Panel>
  );
}
