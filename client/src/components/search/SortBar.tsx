import type { SortOption } from "../../lib/types";
import Select from "../ui/Select";

const OPTIONS: { value: SortOption; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "rating", label: "Avg. customer review" },
  { value: "bestseller", label: "Best sellers" },
  { value: "newest", label: "Newest arrivals" },
  { value: "discount", label: "Biggest discount" },
];

interface Props {
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

/** The sort control, shown in the search header's actions slot. */
export default function SortBar({ sort, onSortChange }: Props) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="shrink-0 font-semibold text-ink">Sort by</span>
      <Select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortOption)}
        containerClassName="min-w-[12rem]"
        aria-label="Sort results"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </label>
  );
}
