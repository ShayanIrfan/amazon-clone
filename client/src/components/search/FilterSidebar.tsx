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
    <aside className="w-full shrink-0 space-y-6 pr-4 sm:w-56">
      {hasFilters && (
        <button type="button" onClick={onClearAll} className="text-sm text-link hover:underline">
          Clear all filters
        </button>
      )}

      {facets.brands.length > 0 && (
        <div>
          <h3 className="mb-2 font-bold text-neutral-900">Brand</h3>
          <ul className="space-y-1.5">
            {facets.brands.slice(0, 10).map((b) => (
              <li key={b.name}>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(b.name)}
                    onChange={() => onToggleBrand(b.name)}
                    className="accent-amazon-orange"
                  />
                  {b.name} <span className="text-neutral-400">({b.count})</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="mb-2 font-bold text-neutral-900">Customer Review</h3>
        <ul className="space-y-1.5">
          {RATINGS.map((r) => (
            <li key={r}>
              <button
                type="button"
                onClick={() => onSetRating(minRating === r ? null : r)}
                className={`text-sm hover:underline ${minRating === r ? "font-bold text-amazon-red" : "text-neutral-700"}`}
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
          <h3 className="mb-2 font-bold text-neutral-900">Price</h3>
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
              className="w-16 rounded border border-neutral-300 px-1.5 py-1 text-sm"
            />
            <span className="text-neutral-400">–</span>
            <input
              type="number"
              min={0}
              placeholder={`$${facets.priceRange.max}`}
              value={maxPrice}
              onChange={(e) => onPriceChange(minPrice, e.target.value)}
              className="w-16 rounded border border-neutral-300 px-1.5 py-1 text-sm"
            />
            <button type="submit" className="rounded border border-neutral-300 px-2 py-1 text-sm hover:bg-neutral-100">
              Go
            </button>
          </form>
        </div>
      )}

      <div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => onToggleInStock(e.target.checked)}
            className="accent-amazon-orange"
          />
          In Stock only
        </label>
      </div>
    </aside>
  );
}
