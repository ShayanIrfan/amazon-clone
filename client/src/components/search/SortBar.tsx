import type { SortOption } from "../../lib/types";

const OPTIONS: { value: SortOption; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "rating", label: "Avg. Customer Review" },
  { value: "bestseller", label: "Best Sellers" },
  { value: "newest", label: "Newest Arrivals" },
];

interface Props {
  total: number;
  page: number;
  limit: number;
  query?: string;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export default function SortBar({ total, page, limit, query, sort, onSortChange }: Props) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-2">
      <p className="text-sm text-neutral-700">
        {total > 0 ? (
          <>
            {from}-{to} of {total.toLocaleString()} results{query && <> for &ldquo;{query}&rdquo;</>}
          </>
        ) : (
          "Results"
        )}
      </p>
      <label className="flex items-center gap-2 text-sm text-neutral-700">
        Sort by:
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="rounded border border-neutral-300 px-2 py-1"
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
