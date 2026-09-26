import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Search, UserX } from "lucide-react";
import { useAdminCustomers } from "../../hooks/useAdmin";
import type { CustomerSort } from "../../lib/types";
import { formatPrice } from "../../lib/format";
import Pagination from "../../components/search/Pagination";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import Panel from "../../components/ui/Panel";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
import { buttonClasses } from "../../components/ui/Button";

const SORTS: { value: CustomerSort; label: string }[] = [
  { value: "joined", label: "Newest first" },
  { value: "spent", label: "Biggest spenders" },
  { value: "orders", label: "Most orders" },
];
const isSort = (value: string | null): value is CustomerSort => SORTS.some((s) => s.value === value);

const formatDay = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function AdminCustomersPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const sort: CustomerSort = isSort(params.get("sort")) ? (params.get("sort") as CustomerSort) : "joined";
  const page = Math.max(1, Number(params.get("page")) || 1);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const { data, isLoading, isError, isFetching, refetch } = useAdminCustomers({ q: q || undefined, sort, page });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div>
      <h1 className="page-title text-ink">Customers</h1>
      <p className="muted mt-1">{data ? `${data.total.toLocaleString()} ${data.total === 1 ? "account" : "accounts"}` : "Loading customers…"}</p>

      <Panel className="mt-5 overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
          <div className="min-w-56 flex-1">
            <label htmlFor="customer-search" className="mb-1 block text-sm font-medium text-ink">
              Search
            </label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate" aria-hidden />
              <input
                id="customer-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name or email"
                className="h-10 w-full rounded-xl border border-line-strong bg-white pr-3 pl-9 text-sm outline-none focus:border-harbor"
              />
            </div>
          </div>
          <Select label="Sort by" value={sort} onChange={(event) => setParam("sort", event.target.value, "joined")} containerClassName="w-48">
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          {isFetching && !isLoading && <span className="pb-2.5 text-xs text-slate">Updating…</span>}
        </div>

        {isLoading ? (
          <div className="space-y-3 p-4" aria-label="Loading customers">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState message="Couldn't load customers." onRetry={() => refetch()} />
        ) : data && data.items.length > 0 ? (
          <>
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-line bg-paper text-xs text-slate">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-medium">Customer</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Joined</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Orders</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Spent</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Last order</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.items.map((customer) => (
                    <tr key={customer._id}>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link to={`/admin/customers/${customer._id}`} className="font-medium text-ink hover:text-harbor hover:underline">
                            {customer.name}
                          </Link>
                          {customer.isAdmin && <Badge tone="info">Admin</Badge>}
                          {customer.isDemo && <Badge tone="neutral">Demo</Badge>}
                        </div>
                        <p className="text-xs text-slate">{customer.email}</p>
                      </td>
                      <td className="px-3 py-3 text-slate">{formatDay(customer.joinedAt)}</td>
                      <td className="amount px-3 py-3 text-right">{customer.orders}</td>
                      <td className="amount px-3 py-3 text-right">{formatPrice(customer.spent)}</td>
                      <td className="px-3 py-3 text-slate">{customer.lastOrderAt ? formatDay(customer.lastOrderAt) : "No orders"}</td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/admin/customers/${customer._id}`} className="text-sm font-medium text-harbor hover:underline" aria-label={`View ${customer.name}`}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={(next) => setParam("page", String(next), "1")} />
          </>
        ) : (
          <EmptyState
            icon={UserX}
            title={q ? "No customers match" : "No customers yet"}
            description={q ? "Try a different name or email." : "Accounts appear here as people sign up."}
            action={
              q ? (
                <button type="button" onClick={() => setParams({}, { replace: true })} className={buttonClasses("secondary", "md")}>
                  Clear search
                </button>
              ) : undefined
            }
          />
        )}
      </Panel>
    </div>
  );
}
