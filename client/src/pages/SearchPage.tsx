import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { SearchX, SlidersHorizontal, X } from "lucide-react";
import { useProducts, useCategories } from "../hooks/useProducts";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { useDialogFocus } from "../hooks/useDialogFocus";
import FilterSidebar from "../components/search/FilterSidebar";
import SortBar from "../components/search/SortBar";
import Pagination from "../components/search/Pagination";
import ProductCard from "../components/product/ProductCard";
import PageHeader from "../components/ui/PageHeader";
import { ProductCardSkeleton } from "../components/ui/Skeleton";
import Skeleton from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import type { SortOption } from "../lib/types";

const EMPTY_FACETS = { brands: [], priceRange: null };
const GRID = "grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 xl:grid-cols-4";

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  const q = params.get("q") ?? undefined;
  const category = params.get("category") ?? undefined;
  const brand = params.get("brand")?.split(",").filter(Boolean) ?? [];
  const minRating = params.get("minRating") ? Number(params.get("minRating")) : null;
  const urlMinPrice = params.get("minPrice") ?? "";
  const urlMaxPrice = params.get("maxPrice") ?? "";
  const inStock = params.get("inStock") === "1";
  const sort = (params.get("sort") as SortOption) ?? "featured";
  const page = Number(params.get("page")) || 1;

  // Local until "Go" is pressed, so the URL (and its refetch) doesn't change on every keystroke.
  const [priceDraft, setPriceDraft] = useState({ min: urlMinPrice, max: urlMaxPrice });

  const { data, isLoading, isFetching, isError, refetch } = useProducts({
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
  const { data: categoryData } = useCategories();
  const categories = categoryData?.items ?? [];

  useEscapeKey(filtersOpen, () => setFiltersOpen(false));
  useDialogFocus(filtersOpen, filterPanelRef);

  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    if (!("page" in patch)) next.delete("page"); // any filter/sort change resets paging
    setParams(next);
  }

  function clearAll() {
    setPriceDraft({ min: "", max: "" });
    setParams(q ? { q } : {});
  }

  const facets = data?.facets ?? EMPTY_FACETS;
  const total = data?.total ?? 0;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const categoryName = category ? categories.find((c) => c.slug === category)?.name ?? categoryLabel(category) : undefined;
  const heading = categoryName ?? (q ? `Results for “${q}”` : "All products");
  const activeCount = brand.length + (minRating ? 1 : 0) + (inStock ? 1 : 0) + (urlMinPrice || urlMaxPrice ? 1 : 0);
  const hasAnyFilter = activeCount > 0 || !!category;

  const filterProps = {
    facets,
    categories,
    selectedCategory: category,
    selectedBrands: brand,
    minRating,
    minPrice: priceDraft.min,
    maxPrice: priceDraft.max,
    inStock,
    onSetCategory: (slug: string | null) => update({ category: slug }),
    onToggleBrand: (b: string) =>
      update({ brand: brand.includes(b) ? brand.filter((x) => x !== b).join(",") || null : [...brand, b].join(",") }),
    onSetRating: (r: number | null) => update({ minRating: r ? String(r) : null }),
    onPriceChange: (min: string, max: string) => setPriceDraft({ min, max }),
    onApplyPrice: () => update({ minPrice: priceDraft.min || null, maxPrice: priceDraft.max || null }),
    onToggleInStock: (v: boolean) => update({ inStock: v ? "1" : null }),
  };

  // Active-filter chips: each removes exactly one filter.
  const chips: { key: string; label: string; onRemove: () => void }[] = [];
  if (categoryName) chips.push({ key: "cat", label: categoryName, onRemove: () => update({ category: null }) });
  for (const b of brand) chips.push({ key: `brand-${b}`, label: b, onRemove: () => filterProps.onToggleBrand(b) });
  if (minRating) chips.push({ key: "rating", label: `${minRating}★ & up`, onRemove: () => update({ minRating: null }) });
  if (urlMinPrice || urlMaxPrice)
    chips.push({
      key: "price",
      label: `$${urlMinPrice || "0"} – $${urlMaxPrice || "∞"}`,
      onRemove: () => {
        setPriceDraft({ min: "", max: "" });
        update({ minPrice: null, maxPrice: null });
      },
    });
  if (inStock) chips.push({ key: "stock", label: "In stock", onRemove: () => update({ inStock: null }) });

  return (
    <div className="page-shell py-8">
      <PageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: categoryName ?? (q ? "Search" : "All products") }]}
        eyebrow="Browse the catalog"
        title={heading}
        description={total > 0 ? `${total.toLocaleString()} ${total === 1 ? "item" : "items"}` : undefined}
        actions={<SortBar sort={sort} onSortChange={(s) => update({ sort: s === "featured" ? null : s })} />}
      />

      {/* Mobile: filters open in a drawer so results aren't pushed down the page. */}
      <button
        type="button"
        onClick={() => setFiltersOpen(true)}
        className="mt-6 flex h-11 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink lg:hidden"
      >
        <SlidersHorizontal size={16} aria-hidden />
        Filters{activeCount > 0 && ` (${activeCount})`}
      </button>

      <div className="mt-6 grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="lg:sticky lg:top-36">
            <FilterSidebar {...filterProps} />
          </div>
        </aside>

        <div className="min-w-0">
          {chips.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={c.onRemove}
                  aria-label={`Remove filter ${c.label}`}
                  className="flex h-8 items-center gap-1.5 rounded-full bg-mint px-3 text-xs font-semibold text-harbor transition-colors hover:bg-mint-strong"
                >
                  {c.label} <X size={13} aria-hidden />
                </button>
              ))}
              <button type="button" onClick={clearAll} className="px-2 text-xs font-semibold text-slate hover:text-ink hover:underline">
                Clear all
              </button>
            </div>
          )}

          {isError ? (
            <ErrorState message="Couldn't load these results." onRetry={() => refetch()} />
          ) : isLoading ? (
            <div className={GRID} role="status" aria-label="Loading products">
              {Array.from({ length: 8 }, (_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : !data?.items.length ? (
            <EmptyState
              icon={SearchX}
              title={q ? `No results for “${q}”` : "No products match those filters"}
              description="Try fewer filters, check your spelling, or browse a department below."
              action={
                <div className="flex flex-col items-center gap-4">
                  {hasAnyFilter && (
                    <button type="button" onClick={clearAll} className="h-10 rounded-full bg-harbor px-5 text-sm font-semibold text-white hover:bg-harbor-dark">
                      Clear filters
                    </button>
                  )}
                  <div className="flex flex-wrap justify-center gap-2">
                    {categories.slice(0, 6).map((c) => (
                      <Link key={c.slug} to={`/search?category=${c.slug}`} className="flex h-8 items-center rounded-full border border-line bg-white px-3 text-xs font-semibold text-ink hover:bg-paper">
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </div>
              }
            />
          ) : (
            <>
              <div className={`${GRID} ${isFetching ? "opacity-60" : ""}`}>
                {data.items.map((p) => (
                  <ProductCard key={p._id} product={p} />
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} onPageChange={(p) => update({ page: String(p) })} />
            </>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div onClick={() => setFiltersOpen(false)} className="absolute inset-0 bg-harbor-dark/40" />
          <div ref={filterPanelRef} className="absolute top-0 left-0 flex h-full w-80 max-w-[88vw] flex-col bg-white">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-lg font-extrabold text-ink">Filters</h2>
              <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-paper">
                <X size={20} aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <FilterSidebar {...filterProps} />
            </div>
            <div className="border-t border-line p-4">
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="h-12 w-full rounded-full bg-harbor text-sm font-semibold text-white hover:bg-harbor-dark"
              >
                Show {total.toLocaleString()} {total === 1 ? "result" : "results"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function categoryLabel(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
