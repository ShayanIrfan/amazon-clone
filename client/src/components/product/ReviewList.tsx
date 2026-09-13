import { BadgeCheck } from "lucide-react";
import type { Review, ReviewSort } from "../../lib/types";
import StarRating from "./StarRating";
import Pagination from "../search/Pagination";

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
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-2">
        <h2 className="text-lg font-bold text-neutral-900">
          {starFilter ? `${starFilter}-star reviews` : "Customer Reviews"} ({total.toLocaleString()})
        </h2>
        <div className="flex items-center gap-3">
          {starFilter && (
            <button type="button" onClick={onClearStarFilter} className="text-sm text-link hover:underline">
              Clear filter
            </button>
          )}
          <label className="flex items-center gap-2 text-sm">
            Sort by:
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value as ReviewSort)}
              className="rounded border border-neutral-300 px-2 py-1"
            >
              {(Object.keys(SORT_LABELS) as ReviewSort[]).map((s) => (
                <option key={s} value={s}>
                  {SORT_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {reviews.length === 0 ? (
        <p className="py-8 text-center text-neutral-500">No reviews match this filter.</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {reviews.map((r) => (
            <li key={r._id} className="py-4">
              <div className="flex items-center gap-2">
                <StarRating rating={r.rating} />
                <span className="font-medium text-neutral-900">{r.reviewerName}</span>
              </div>
              {r.verifiedPurchase && (
                <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amazon-orange">
                  <BadgeCheck size={14} /> Verified Purchase
                </p>
              )}
              <p className="mt-1 text-xs text-neutral-500">
                {new Date(r.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
              <p className="mt-2 text-sm text-neutral-800">{r.comment}</p>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / limit))} onPageChange={onPageChange} />
    </div>
  );
}
