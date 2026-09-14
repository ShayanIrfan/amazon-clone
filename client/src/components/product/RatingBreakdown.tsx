import type { RatingBreakdown as Breakdown } from "../../lib/types";

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
    <div>
      <p className="text-lg font-semibold text-ink">{average.toFixed(1)} out of 5</p>
      <p className="text-sm text-slate">{total.toLocaleString()} global ratings</p>
      <div className="mt-3 space-y-1">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = breakdown[star as 1 | 2 | 3 | 4 | 5] ?? 0;
          const pct = total ? Math.round((count / total) * 100) : 0;
          return (
            <button
              key={star}
              type="button"
              onClick={() => onSelectStar(selectedStar === star ? null : star)}
              className={`flex w-full items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-paper ${
                selectedStar === star ? "bg-paper" : ""
              }`}
            >
              <span className="w-12 shrink-0 text-harbor">{star} star</span>
              <span className="h-3 flex-1 overflow-hidden rounded-sm bg-line">
                <span className="block h-full bg-marigold" style={{ width: `${pct}%` }} />
              </span>
              <span className="w-10 shrink-0 text-right text-slate">{pct}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
