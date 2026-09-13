import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "positive" | "warning" | "negative" | "info";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-line/60 text-ink",
  positive: "bg-moss/10 text-moss",
  warning: "bg-marigold/15 text-marigold-dark",
  negative: "bg-clay/10 text-clay",
  info: "bg-harbor/10 text-harbor",
};

export default function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: BadgeTone }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}
