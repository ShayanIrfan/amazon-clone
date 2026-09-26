import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Receipt, Search } from "lucide-react";
import { useAdminOrders } from "../../hooks/useAdmin";
import type { AdminOrderStatusFilter, OrderStatus } from "../../lib/types";
import { formatPrice } from "../../lib/format";
import AdminOrderStatusBadge, { ORDER_STATUS_LABEL } from "../../components/admin/AdminOrderStatusBadge";
import Pagination from "../../components/search/Pagination";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import Panel from "../../components/ui/Panel";
import Skeleton from "../../components/ui/Skeleton";
import { buttonClasses } from "../../components/ui/Button";

const FILTERS: AdminOrderStatusFilter[] = ["all", "paid", "shipped", "delivered", "pending_payment", "cancelled"];
const isFilter = (value: string | null): value is AdminOrderStatusFilter => FILTERS.includes(value as AdminOrderStatusFilter);
const filterLabel = (filter: AdminOrderStatusFilter) => (filter === "all" ? "All" : ORDER_STATUS_LABEL[filter]);

const formatWhen = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function AdminOrdersPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const status: AdminOrderStatusFilter = isFilter(params.get("status")) ? (params.get("status") as AdminOrderStatusFilter) : "all";
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

  const { data, isLoading, isError, isFetching, refetch } = useAdminOrders({ q: q || undefined, status, page });
  const counts = data?.counts;
  const totalCount = counts ? Object.values(counts).reduce((sum, n) => sum + n, 0) : null;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const filtered = !!(q || status !== "all");
  const awaitingShipment = counts?.paid ?? 0;

  return (
    <div>
      <h1 className="page-title text-ink">Orders</h1>
      <p className="muted mt-1">
        {counts ? (awaitingShipment ? `${awaitingShipment} paid and waiting to ship` : "Nothing waiting to ship") : "Loading orders…"}
      </p>

      <Panel className="mt-5 overflow-hidden">
        <div className="border-b border-line p-4">
          <label htmlFor="order-search" className="mb-1 block text-sm font-medium text-ink">
            Search
          </label>
          <div className="relative max-w-xl">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate" aria-hidden />
            <input
              id="order-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Order number, customer name or email"
              className="h-10 w-full rounded-md border border-line-strong bg-white pr-3 pl-9 text-sm outline-none focus:border-harbor"
            />
          </div>
        </div>

        <div role="group" aria-label="Status" className="flex flex-wrap gap-1 border-b border-line px-4 py-2">
          {FILTERS.map((value) => {
            const count = counts ? (value === "all" ? totalCount : counts[value as OrderStatus]) : null;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={status === value}
                onClick={() => setParam("status", value, "all")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  status === value ? "bg-harbor/10 text-harbor" : "text-slate hover:bg-paper hover:text-ink"
                }`}
              >
                {filterLabel(value)}
                {count !== null && <span className="amount ml-1.5 text-xs opacity-70">{count.toLocaleString()}</span>}
              </button>
            );
          })}
          {isFetching && !isLoading && <span className="ml-auto self-center text-xs text-slate">Updating…</span>}
        </div>

        {isLoading ? (
          <div className="space-y-3 p-4" aria-label="Loading orders">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState message="Couldn't load orders." onRetry={() => refetch()} />
        ) : data && data.items.length > 0 ? (
          <>
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-line bg-paper text-xs text-slate">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-medium">Order</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Customer</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Items</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Total</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.items.map((order) => (
                    <tr key={order._id}>
                      <td className="px-4 py-3">
                        <Link to={`/admin/orders/${order._id}`} className="amount font-medium text-ink hover:text-harbor hover:underline">
                          #{order.orderNumber}
                        </Link>
                        <p className="text-xs text-slate">{formatWhen(order.placedAt)}</p>
                      </td>
                      <td className="px-3 py-3">
                        {order.customer ? (
                          <>
                            <p className="text-ink">{order.customer.name}</p>
                            <p className="text-xs text-slate">{order.customer.email}</p>
                          </>
                        ) : (
                          <span className="text-slate">Deleted account</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2" aria-hidden>
                            {order.thumbnails.map((src, i) => (
                              <img key={i} src={src} alt="" loading="lazy" className="h-8 w-8 rounded-md border border-white bg-white object-contain ring-1 ring-line" />
                            ))}
                          </div>
                          <div className="min-w-0">
                            <p className="line-clamp-1 max-w-48 text-ink">{order.firstItemTitle}</p>
                            <p className="text-xs text-slate">
                              {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                              {order.extraItems > 0 && ` · +${order.extraItems} more`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="amount px-3 py-3 text-right">
                        {formatPrice(order.total)}
                        {order.refunded && <span className="block text-xs text-clay">Refunded</span>}
                      </td>
                      <td className="px-3 py-3">
                        <AdminOrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/admin/orders/${order._id}`} className="text-sm font-medium text-harbor hover:underline" aria-label={`View order ${order.orderNumber}`}>
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
            icon={Receipt}
            title={filtered ? "No orders match" : "No orders yet"}
            description={filtered ? "Try a different search or status." : "Orders appear here as soon as someone checks out."}
            action={
              filtered ? (
                <button type="button" onClick={() => setParams({}, { replace: true })} className={buttonClasses("secondary", "md")}>
                  Clear filters
                </button>
              ) : undefined
            }
          />
        )}
      </Panel>
    </div>
  );
}
