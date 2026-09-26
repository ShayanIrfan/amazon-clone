import { useState } from "react";
import { Star } from "lucide-react";
import type { Category, Facets } from "../../lib/types";

interface Props {
  facets: Facets;
  categories: Category[];
  selectedCategory?: string;
  selectedBrands: string[];
  minRating: number | null;
  minPrice: string;
  maxPrice: string;
  inStock: boolean;
  onSetCategory: (slug: string | null) => void;
  onToggleBrand: (brand: string) => void;
  onSetRating: (rating: number | null) => void;
  onPriceChange: (min: string, max: string) => void;
  onApplyPrice: () => void;
  onToggleInStock: (value: boolean) => void;
}

const RATINGS = [4, 3, 2];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line py-5 first:border-t-0 first:pt-0">
      <h3 className="mb-3 text-sm font-bold text-ink">{title}</h3>
      {children}
    </div>
  );
}

export default function FilterSidebar({
  facets,
  categories,
  selectedCategory,
  selectedBrands,
  minRating,
  minPrice,
  maxPrice,
  inStock,
  onSetCategory,
  onToggleBrand,
  onSetRating,
  onPriceChange,
  onApplyPrice,
  onToggleInStock,
}: Props) {
  const [showAllBrands, setShowAllBrands] = useState(false);
  const brands = showAllBrands ? facets.brands : facets.brands.slice(0, 6);

  return (
    <div className="text-sm">
      {categories.length > 0 && (
        <Section title="Department">
          <ul className="space-y-1">
            <li>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-slate hover:text-ink">
                <input type="radio" name="department" checked={!selectedCategory} onChange={() => onSetCategory(null)} className="h-4 w-4 accent-harbor" />
                All departments
              </label>
            </li>
            {categories.map((c) => (
              <li key={c.slug}>
                <label className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 hover:text-ink ${selectedCategory === c.slug ? "font-semibold text-harbor" : "text-slate"}`}>
                  <input type="radio" name="department" checked={selectedCategory === c.slug} onChange={() => onSetCategory(c.slug)} className="h-4 w-4 accent-harbor" />
                  {c.name}
                </label>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {facets.brands.length > 0 && (
        <Section title="Brand">
          <ul className="space-y-1">
            {brands.map((b) => (
              <li key={b.name}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-slate hover:text-ink">
                  <input type="checkbox" checked={selectedBrands.includes(b.name)} onChange={() => onToggleBrand(b.name)} className="h-4 w-4 shrink-0 accent-harbor" />
                  <span className="flex-1">{b.name}</span>
                  <span className="text-xs text-line-strong">{b.count}</span>
                </label>
              </li>
            ))}
          </ul>
          {facets.brands.length > 6 && (
            <button type="button" onClick={() => setShowAllBrands((v) => !v)} className="mt-2 px-1 text-sm font-semibold text-harbor hover:underline">
              {showAllBrands ? "Show less" : `Show all ${facets.brands.length}`}
            </button>
          )}
        </Section>
      )}

      {facets.priceRange && (
        <Section title="Price">
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
              aria-label="Minimum price"
              placeholder={`$${facets.priceRange.min}`}
              value={minPrice}
              onChange={(e) => onPriceChange(e.target.value, maxPrice)}
              className="h-10 w-full rounded-xl border border-line-strong px-3 text-sm outline-none transition-colors focus:border-harbor focus:ring-4 focus:ring-harbor/10"
            />
            <span className="text-line-strong">–</span>
            <input
              type="number"
              min={0}
              aria-label="Maximum price"
              placeholder={`$${facets.priceRange.max}`}
              value={maxPrice}
              onChange={(e) => onPriceChange(minPrice, e.target.value)}
              className="h-10 w-full rounded-xl border border-line-strong px-3 text-sm outline-none transition-colors focus:border-harbor focus:ring-4 focus:ring-harbor/10"
            />
            <button type="submit" className="h-10 shrink-0 rounded-full bg-harbor px-4 text-sm font-semibold text-white transition-colors hover:bg-harbor-dark">
              Go
            </button>
          </form>
        </Section>
      )}

      <Section title="Customer rating">
        <ul className="space-y-1">
          {RATINGS.map((r) => {
            const active = minRating === r;
            return (
              <li key={r}>
                <button
                  type="button"
                  onClick={() => onSetRating(active ? null : r)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5 hover:text-ink ${active ? "font-semibold text-harbor" : "text-slate"}`}
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-full border border-line-strong">
                    {active && <span className="h-2 w-2 rounded-full bg-harbor" />}
                  </span>
                  <span className="flex text-marigold" aria-hidden>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} size={14} fill={i < r ? "currentColor" : "none"} className={i < r ? "" : "text-line-strong"} strokeWidth={i < r ? 0 : 1.5} />
                    ))}
                  </span>
                  <span className="text-xs">&amp; up</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Availability">
        <button
          type="button"
          role="switch"
          aria-checked={inStock}
          onClick={() => onToggleInStock(!inStock)}
          className="flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-slate"
        >
          <span className="font-medium text-ink">In stock only</span>
          <span className={`relative h-6 w-10 rounded-full transition-colors ${inStock ? "bg-harbor" : "bg-line-strong"}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${inStock ? "left-[1.125rem]" : "left-0.5"}`} />
          </span>
        </button>
      </Section>
    </div>
  );
}
