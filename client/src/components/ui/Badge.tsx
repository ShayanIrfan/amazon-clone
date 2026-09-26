import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "positive" | "warning" | "negative" | "info";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-paper text-slate",
  positive: "bg-moss/10 text-moss",
  warning: "bg-tint-butter text-amber-ink",
  negative: "bg-clay/10 text-clay",
  info: "bg-harbor/10 text-harbor",
};

const DOT_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-slate",
  positive: "bg-moss",
  warning: "bg-marigold-dark",
  negative: "bg-clay",
  info: "bg-harbor",
};

export default function Badge({ children, tone = "neutral", dot = true }: { children: ReactNode; tone?: BadgeTone; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[tone]}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[tone]}`} aria-hidden />}
      {children}
    </span>
  );
}
