import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { PackageSearch, Plus, Search } from "lucide-react";
import { useAdminProductMutations, useAdminProducts } from "../../hooks/useAdmin";
import type { AdminProduct, AdminProductSort, AdminProductStatus } from "../../lib/types";
import ProductTable from "../../components/admin/ProductTable";
import Pagination from "../../components/search/Pagination";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import Panel from "../../components/ui/Panel";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
import { buttonClasses } from "../../components/ui/Button";

const SORTS: { value: AdminProductSort; label: string }[] = [
  { value: "updated", label: "Recently updated" },
  { value: "title", label: "Title A–Z" },
  { value: "price_low", label: "Price: low to high" },
  { value: "price_high", label: "Price: high to low" },
  { value: "stock_low", label: "Stock: low to high" },
  { value: "stock_high", label: "Stock: high to low" },
];

const STATUSES: AdminProductStatus[] = ["active", "archived", "all"];
const isStatus = (value: string | null): value is AdminProductStatus => STATUSES.includes(value as AdminProductStatus);
const isSort = (value: string | null): value is AdminProductSort => SORTS.some((s) => s.value === value);

export default function AdminProductsPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const status: AdminProductStatus = isStatus(params.get("status")) ? (params.get("status") as AdminProductStatus) : "active";
  const sort: AdminProductSort = isSort(params.get("sort")) ? (params.get("sort") as AdminProductSort) : "updated";
  const page = Math.max(1, Number(params.get("page")) || 1);

  // Filters live in the URL so the back button and shared links work.
  function setParam(key: string, value: string, defaultValue = "") {
    const next = new URLSearchParams(params);
    if (!value || value === defaultValue) next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  }

  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]);
  useEffect(() => {
    if (search === q) return;
    const timer = setTimeout(() => setParam("q", search.trim()), 300);
    return () => clearTimeout(timer);
    // setParam closes over the current params; the debounce should only restart when the typed text changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const { data, isLoading, isError, isFetching, refetch } = useAdminProducts({ q: q || undefined, category: category || undefined, status, sort, page });
  const { setStock, archive, restore } = useAdminProductMutations();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function toggleArchive(product: AdminProduct) {
    setBusyId(product._id);
    setActionError(null);
    try {
      await (product.archivedAt ? restore : archive).mutateAsync(product._id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't update the product.");
    } finally {
      setBusyId(null);
    }
  }

  const totals = data?.totals;
  const filtered = !!(q || category || status !== "active");
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title text-ink">Products</h1>
          <p className="muted mt-1">
            {totals ? `${totals.active.toLocaleString()} active, ${totals.archived.toLocaleString()} archived` : "Loading catalog…"}
          </p>
        </div>
        <Link to="/admin/products/new" className={buttonClasses("primary", "md")}>
          <Plus size={16} aria-hidden /> New product
        </Link>
      </div>

      <Panel className="mt-5 overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
          <div className="min-w-56 flex-1">
            <label htmlFor="product-search" className="mb-1 block text-sm font-medium text-ink">
              Search
            </label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate" aria-hidden />
              <input
                id="product-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Title, brand, SKU or department"
                className="h-10 w-full rounded-md border border-line-strong bg-white pr-3 pl-9 text-sm outline-none focus:border-harbor"
              />
            </div>
          </div>
          <Select label="Department" value={category} onChange={(event) => setParam("category", event.target.value)} containerClassName="w-52">
            <option value="">All departments</option>
            {data?.categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select label="Sort by" value={sort} onChange={(event) => setParam("sort", event.target.value, "updated")} containerClassName="w-48">
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>

        <div role="group" aria-label="Status" className="flex gap-1 border-b border-line px-4 py-2">
          {STATUSES.map((value) => {
            const count = totals ? (value === "all" ? totals.active + totals.archived : totals[value]) : null;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={status === value}
                onClick={() => setParam("status", value, "active")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
                  status === value ? "bg-harbor/10 text-harbor" : "text-slate hover:bg-paper hover:text-ink"
                }`}
              >
                {value}
                {count !== null && <span className="amount ml-1.5 text-xs opacity-70">{count.toLocaleString()}</span>}
              </button>
            );
          })}
          {isFetching && !isLoading && <span className="ml-auto self-center text-xs text-slate">Updating…</span>}
        </div>

        {actionError && (
          <p role="alert" className="border-b border-line bg-clay/5 px-4 py-2 text-sm font-medium text-clay">
            {actionError}
          </p>
        )}

        {isLoading ? (
          <div className="space-y-3 p-4" aria-label="Loading products">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState message="Couldn't load products." onRetry={() => refetch()} />
        ) : data && data.items.length > 0 ? (
          <>
            <ProductTable
              items={data.items}
              busyId={busyId}
              onSetStock={(product, stock) => setStock.mutateAsync({ id: product._id, stock })}
              onToggleArchive={toggleArchive}
            />
            <Pagination page={page} totalPages={totalPages} onPageChange={(next) => setParam("page", String(next), "1")} />
          </>
        ) : (
          <EmptyState
            icon={PackageSearch}
            title={filtered ? "No products match" : "No products yet"}
            description={filtered ? "Try a different search, department or status." : "Create your first product to put it in the store."}
            action={
              filtered ? (
                <button type="button" onClick={() => setParams({}, { replace: true })} className={buttonClasses("secondary", "md")}>
                  Clear filters
                </button>
              ) : (
                <Link to="/admin/products/new" className={buttonClasses("primary", "md")}>
                  New product
                </Link>
              )
            }
          />
        )}
      </Panel>
    </div>
  );
}
