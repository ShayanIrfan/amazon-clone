import type { Facets } from "../../lib/types";

interface Props {
  facets: Facets;
  selectedBrands: string[];
  minRating: number | null;
  minPrice: string;
  maxPrice: string;
  inStock: boolean;
  onToggleBrand: (brand: string) => void;
  onSetRating: (rating: number | null) => void;
  onPriceChange: (min: string, max: string) => void;
  onApplyPrice: () => void;
  onToggleInStock: (value: boolean) => void;
  onClearAll: () => void;
}

const RATINGS = [4, 3, 2, 1];

export default function FilterSidebar({
  facets,
  selectedBrands,
  minRating,
  minPrice,
  maxPrice,
  inStock,
  onToggleBrand,
  onSetRating,
  onPriceChange,
  onApplyPrice,
  onToggleInStock,
  onClearAll,
}: Props) {
  const hasFilters = selectedBrands.length > 0 || minRating != null || inStock || minPrice !== "" || maxPrice !== "";

  return (
    <aside className="w-full shrink-0 space-y-7 pr-4 sm:w-60">
      {hasFilters && (
        <button type="button" onClick={onClearAll} className="text-sm font-semibold text-harbor hover:underline">
          Clear all filters
        </button>
      )}

      {facets.brands.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-ink">Brand</h3>
          <ul className="space-y-1.5">
            {facets.brands.slice(0, 10).map((b) => (
              <li key={b.name}>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate">
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(b.name)}
                    onChange={() => onToggleBrand(b.name)}
                    className="accent-harbor"
                  />
                  {b.name} <span className="text-neutral-400">({b.count})</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
          <h3 className="mb-3 text-sm font-semibold text-ink">Customer Review</h3>
        <ul className="space-y-1.5">
          {RATINGS.map((r) => (
            <li key={r}>
              <button
                type="button"
                onClick={() => onSetRating(minRating === r ? null : r)}
                className={`text-sm hover:underline ${minRating === r ? "font-bold text-clay" : "text-slate"}`}
              >
                {"★".repeat(r)}
                {"☆".repeat(5 - r)} &amp; Up
              </button>
            </li>
          ))}
        </ul>
      </div>

      {facets.priceRange && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-ink">Price</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onApplyPrice();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="number"
              min={0}
              placeholder={`$${facets.priceRange.min}`}
              value={minPrice}
              onChange={(e) => onPriceChange(e.target.value, maxPrice)}
              className="h-9 w-20 rounded-md border border-line-strong px-2 text-sm outline-none focus:border-harbor"
            />
            <span className="text-neutral-400">–</span>
            <input
              type="number"
              min={0}
              placeholder={`$${facets.priceRange.max}`}
              value={maxPrice}
              onChange={(e) => onPriceChange(minPrice, e.target.value)}
              className="h-9 w-20 rounded-md border border-line-strong px-2 text-sm outline-none focus:border-harbor"
            />
            <button type="submit" className="h-9 rounded-md border border-line-strong px-2 text-sm font-semibold text-harbor hover:bg-paper">
              Go
            </button>
          </form>
        </div>
      )}

      <div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => onToggleInStock(e.target.checked)}
            className="accent-harbor"
          />
          In Stock only
        </label>
      </div>
    </aside>
  );
}
