import { BadgeCheck, X } from "lucide-react";
import type { Review, ReviewSort } from "../../lib/types";
import StarRating from "./StarRating";
import Pagination from "../search/Pagination";
import Select from "../ui/Select";

interface Props {
  reviews: Review[];
  total: number;
  page: number;
  limit: number;
  sort: ReviewSort;
  starFilter: number | null;
  onSortChange: (sort: ReviewSort) => void;
  onPageChange: (page: number) => void;
  onClearStarFilter: () => void;
}

const SORT_LABELS: Record<ReviewSort, string> = {
  recent: "Most Recent",
  highest: "Highest Rating",
  lowest: "Lowest Rating",
};

export default function ReviewList({
  reviews,
  total,
  page,
  limit,
  sort,
  starFilter,
  onSortChange,
  onPageChange,
  onClearStarFilter,
}: Props) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold text-ink">{total.toLocaleString()} {total === 1 ? "review" : "reviews"}</h3>
          {starFilter && (
            <button
              type="button"
              onClick={onClearStarFilter}
              aria-label={`Clear ${starFilter}-star filter`}
              className="flex h-8 items-center gap-1.5 rounded-full bg-mint px-3 text-xs font-semibold text-harbor hover:bg-mint-strong"
            >
              {starFilter} star <X size={13} aria-hidden />
            </button>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="shrink-0 font-semibold text-ink">Sort by</span>
          <Select value={sort} onChange={(e) => onSortChange(e.target.value as ReviewSort)} aria-label="Sort reviews">
            {(Object.keys(SORT_LABELS) as ReviewSort[]).map((s) => (
              <option key={s} value={s}>
                {SORT_LABELS[s]}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {reviews.length === 0 ? (
        <p className="rounded-2xl bg-paper py-10 text-center text-sm text-slate">No reviews match this filter.</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r._id} className="rounded-2xl border border-line p-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <StarRating rating={r.rating} />
                <span className="font-semibold text-ink">{r.reviewerName}</span>
                {r.verifiedPurchase && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-moss">
                    <BadgeCheck size={14} aria-hidden /> Verified purchase
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-slate">
                {new Date(r.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink">{r.comment}</p>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / limit))} onPageChange={onPageChange} />
    </div>
  );
}
