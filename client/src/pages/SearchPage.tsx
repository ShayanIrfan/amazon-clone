import { useState } from "react";
import { useSearchParams } from "react-router";
import { useProducts } from "../hooks/useProducts";
import { useEscapeKey } from "../hooks/useEscapeKey";
import FilterSidebar from "../components/search/FilterSidebar";
import SortBar from "../components/search/SortBar";
import Pagination from "../components/search/Pagination";
import ProductCard from "../components/product/ProductCard";
import type { SortOption } from "../lib/types";
import { SearchX, SlidersHorizontal, TriangleAlert, X } from "lucide-react";

const EMPTY_FACETS = { brands: [], priceRange: null };

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const q = params.get("q") ?? undefined;
  const category = params.get("category") ?? undefined;
  const brand = params.get("brand")?.split(",").filter(Boolean) ?? [];
  const minRating = params.get("minRating") ? Number(params.get("minRating")) : null;
  const urlMinPrice = params.get("minPrice") ?? "";
  const urlMaxPrice = params.get("maxPrice") ?? "";
  const inStock = params.get("inStock") === "1";

  // Local until "Go" is pressed, so the URL (and the refetch it triggers)
  // doesn't change on every keystroke.
  const [priceDraft, setPriceDraft] = useState({ min: urlMinPrice, max: urlMaxPrice });
  const sort = (params.get("sort") as SortOption) ?? "featured";
  const page = Number(params.get("page")) || 1;

  const { data, isLoading, isFetching, isError } = useProducts({
    q,
    category,
    brand,
    minRating: minRating ?? undefined,
    minPrice: urlMinPrice ? Number(urlMinPrice) : undefined,
    maxPrice: urlMaxPrice ? Number(urlMaxPrice) : undefined,
    inStock,
    sort,
    page,
  });

  useEscapeKey(filtersOpen, () => setFiltersOpen(false));

  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    if (!("page" in patch)) next.delete("page"); // any filter/sort change resets paging
    setParams(next);
  }

  const facets = data?.facets ?? EMPTY_FACETS;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const heading = category ? categoryLabel(category) : q ? `Results for "${q}"` : "All Products";
  const activeFilterCount = brand.length + (minRating ? 1 : 0) + (inStock ? 1 : 0) + (urlMinPrice || urlMaxPrice ? 1 : 0);

  const filterProps = {
    facets,
    selectedBrands: brand,
    minRating,
    minPrice: priceDraft.min,
    maxPrice: priceDraft.max,
    inStock,
    onToggleBrand: (b: string) =>
      update({ brand: brand.includes(b) ? brand.filter((x) => x !== b).join(",") || null : [...brand, b].join(",") }),
    onSetRating: (r: number | null) => update({ minRating: r ? String(r) : null }),
    onPriceChange: (min: string, max: string) => setPriceDraft({ min, max }),
    onApplyPrice: () => update({ minPrice: priceDraft.min || null, maxPrice: priceDraft.max || null, page: null }),
    onToggleInStock: (v: boolean) => update({ inStock: v ? "1" : null }),
    onClearAll: () => {
      setPriceDraft({ min: "", max: "" });
      setParams(q ? { q } : category ? { category } : {});
    },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900">{heading}</h1>
        {category && (
          <button type="button" onClick={() => update({ category: null })} className="text-sm text-link hover:underline">
            Clear department
          </button>
        )}
      </div>

      {/* Mobile-only: filters live behind a button instead of stacking above
          results, so the actual products aren't pushed halfway down the page. */}
      <button
        type="button"
        onClick={() => setFiltersOpen(true)}
        className="mt-3 flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-1.5 text-sm sm:hidden"
      >
        <SlidersHorizontal size={16} />
        Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
      </button>

      <div className="mt-4 flex flex-col gap-6 sm:flex-row">
        <div className="hidden sm:block">
          <FilterSidebar {...filterProps} />
        </div>

        {filtersOpen && (
          <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true" aria-label="Filters">
            <div onClick={() => setFiltersOpen(false)} className="absolute inset-0 bg-black/50" />
            <div className="absolute top-0 right-0 flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-neutral-200 p-4">
                <h2 className="font-bold text-neutral-900">Filters</h2>
                <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters">
                  <X size={22} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <FilterSidebar {...filterProps} />
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="m-4 rounded-full bg-amazon-yellow py-2 text-sm font-medium text-neutral-900 hover:brightness-95"
              >
                Show results
              </button>
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <SortBar
            total={data?.total ?? 0}
            page={page}
            limit={data?.limit ?? 16}
            query={q}
            sort={sort}
            onSortChange={(s) => update({ sort: s === "featured" ? null : s })}
          />

          {isError ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-neutral-600">
              <TriangleAlert size={40} className="text-neutral-300" />
              <p className="text-lg font-medium">Something went wrong loading these results.</p>
              <p className="text-sm">Check your connection and try again.</p>
            </div>
          ) : isLoading ? (
            <div className="py-16 text-center text-neutral-500">Loading…</div>
          ) : !data?.items.length ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-neutral-600">
              <SearchX size={40} className="text-neutral-300" />
              <p className="text-lg font-medium">No results{q && <> for &ldquo;{q}&rdquo;</>}</p>
              <p className="text-sm">Try checking your spelling, using fewer filters, or a more general search.</p>
            </div>
          ) : (
            <div
              className={`grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 ${isFetching ? "opacity-60" : ""}`}
            >
              {data.items.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} onPageChange={(p) => update({ page: String(p) })} />
        </div>
      </div>
    </div>
  );
}

function categoryLabel(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
