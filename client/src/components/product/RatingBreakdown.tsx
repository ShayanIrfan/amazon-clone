import type { RatingBreakdown as Breakdown } from "../../lib/types";
import StarRating from "./StarRating";

export default function RatingBreakdown({
  breakdown,
  average,
  total,
  onSelectStar,
  selectedStar,
}: {
  breakdown: Breakdown;
  average: number;
  total: number;
  selectedStar: number | null;
  onSelectStar: (star: number | null) => void;
}) {
  return (
    <div className="h-fit rounded-2xl bg-paper p-5 lg:sticky lg:top-36">
      <div className="flex items-baseline gap-2">
        <span className="amount text-4xl font-extrabold tracking-[-0.02em] text-ink">{average.toFixed(1)}</span>
        <span className="text-sm text-slate">out of 5</span>
      </div>
      <div className="mt-1">
        <StarRating rating={average} size={16} />
      </div>
      <p className="mt-1 text-sm text-slate">{total.toLocaleString()} {total === 1 ? "rating" : "ratings"}</p>

      <div className="mt-4 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = breakdown[star as 1 | 2 | 3 | 4 | 5] ?? 0;
          const pct = total ? Math.round((count / total) * 100) : 0;
          const active = selectedStar === star;
          return (
            <button
              key={star}
              type="button"
              onClick={() => onSelectStar(active ? null : star)}
              aria-pressed={active}
              className={`flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1 text-sm transition-colors hover:bg-white ${active ? "bg-white font-semibold" : ""}`}
            >
              <span className="w-12 shrink-0 text-left text-slate">{star} star</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                <span className="block h-full rounded-full bg-marigold" style={{ width: `${pct}%` }} />
              </span>
              <span className="w-9 shrink-0 text-right text-xs text-slate">{pct}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
