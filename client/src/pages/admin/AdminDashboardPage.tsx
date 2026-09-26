import { Link, useSearchParams } from "react-router";
import { AlertTriangle, CircleCheck, Truck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAdminActivity, useAdminStats } from "../../hooks/useAdmin";
import type { StatsRange } from "../../lib/types";
import { formatPrice } from "../../lib/format";
import ActivityList from "../../components/admin/ActivityList";
import OrdersChart from "../../components/admin/OrdersChart";
import StatCard from "../../components/admin/StatCard";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import Panel from "../../components/ui/Panel";
import Skeleton from "../../components/ui/Skeleton";

const RANGES: { value: StatsRange; label: string; days: number }[] = [
  { value: "7d", label: "7 days", days: 7 },
  { value: "30d", label: "30 days", days: 30 },
  { value: "90d", label: "90 days", days: 90 },
];
const isRange = (value: string | null): value is StatsRange => RANGES.some((r) => r.value === value);

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const range: StatsRange = isRange(params.get("range")) ? (params.get("range") as StatsRange) : "30d";
  const days = RANGES.find((r) => r.value === range)!.days;

  const stats = useAdminStats(range);
  const activity = useAdminActivity({ limit: 10 });
  const data = stats.data;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title text-ink">Dashboard</h1>
          <p className="muted mt-1">Signed in as {user?.email}.</p>
        </div>
        <div role="group" aria-label="Time range" className="flex gap-1 rounded-full border border-line bg-white p-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              aria-pressed={range === r.value}
              onClick={() => setParams(r.value === "30d" ? {} : { range: r.value }, { replace: true })}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${range === r.value ? "bg-harbor text-white" : "text-slate hover:bg-paper hover:text-ink"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {stats.isError && !data ? (
        <div className="mt-6">
          <ErrorState message="Couldn't load the dashboard." onRetry={() => stats.refetch()} />
        </div>
      ) : (
        <>
          {/* What needs doing right now, whatever the time range. */}
          <section aria-label="Needs attention" className="mt-6 grid gap-3 sm:grid-cols-2">
            {!data ? (
              <>
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </>
            ) : data.awaitingShipment === 0 && data.lowStock.count === 0 ? (
              <p className="flex items-center gap-2 rounded-2xl border border-moss/20 bg-moss/10 px-4 py-3 text-sm font-medium text-moss sm:col-span-2">
                <CircleCheck size={18} aria-hidden /> All caught up: nothing is waiting to ship and no product is running low.
              </p>
            ) : (
              <>
                <Link
                  to="/admin/orders?status=paid"
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${data.awaitingShipment ? "border-line bg-tint-butter text-ink hover:bg-tint-butter/70" : "border-line bg-white text-slate"}`}
                >
                  <Truck size={20} aria-hidden />
                  <span>
                    <strong className="amount">{data.awaitingShipment}</strong> {data.awaitingShipment === 1 ? "order is" : "orders are"} paid and waiting to ship
                  </span>
                </Link>
                <Link
                  to="/admin/products?sort=stock_low"
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${data.lowStock.count ? "border-clay/30 bg-clay/5 text-ink hover:bg-clay/10" : "border-line bg-white text-slate"}`}
                >
                  <AlertTriangle size={20} aria-hidden />
                  <span>
                    <strong className="amount">{data.lowStock.count}</strong> {data.lowStock.count === 1 ? "product has" : "products have"} fewer than {data.lowStock.threshold} left
                  </span>
                </Link>
              </>
            )}
          </section>

          <section aria-label="Key figures" className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {!data
              ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)
              : (
                <>
                  <StatCard label="Revenue" value={formatPrice(data.totals.revenue)} current={data.totals.revenue} previous={data.previous.revenue} comparedTo={`previous ${days} days`} />
                  <StatCard label="Orders" value={data.totals.orders.toLocaleString()} current={data.totals.orders} previous={data.previous.orders} comparedTo={`previous ${days} days`} />
                  <StatCard label="Units sold" value={data.totals.units.toLocaleString()} current={data.totals.units} previous={data.previous.units} comparedTo={`previous ${days} days`} />
                  <StatCard label="New customers" value={data.totals.newCustomers.toLocaleString()} current={data.totals.newCustomers} previous={data.previous.newCustomers} comparedTo={`previous ${days} days`} />
                </>
              )}
          </section>
          <p className="mt-2 text-xs text-slate">Revenue counts paid orders that weren't cancelled, minus refunds. Days are UTC.</p>

          <Panel className="mt-6 p-5">
            <h2 className="text-base font-bold text-ink">Orders per day</h2>
            <div className="mt-4">{data ? <OrdersChart days={data.ordersPerDay} /> : <Skeleton className="h-52 w-full" />}</div>
          </Panel>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Panel className="overflow-hidden">
              <h2 className="border-b border-line px-4 py-3 text-base font-bold text-ink">Top products</h2>
              {!data ? (
                <div className="space-y-3 p-4">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : data.topProducts.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate">No sales in this period yet.</p>
              ) : (
                <ol className="divide-y divide-line">
                  {data.topProducts.map((product) => (
                    <li key={product.productId} className="flex items-center gap-3 px-4 py-3">
                      <img src={product.thumbnail} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-line bg-paper object-contain" />
                      <Link to={`/admin/products/${product.productId}`} className="min-w-0 flex-1 truncate text-sm font-medium text-ink hover:text-harbor hover:underline">
                        {product.title}
                      </Link>
                      <div className="amount text-right text-sm">
                        <p className="font-medium">{product.units} sold</p>
                        <p className="text-xs text-slate">{formatPrice(product.revenue)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>

            <Panel className="overflow-hidden">
              <h2 className="border-b border-line px-4 py-3 text-base font-bold text-ink">Low stock</h2>
              {!data ? (
                <div className="space-y-3 p-4">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : data.lowStock.items.length === 0 ? (
                <EmptyState icon={CircleCheck} title="Stock looks healthy" description={`Every product has at least ${data.lowStock.threshold} in stock.`} />
              ) : (
                <>
                  <ul className="divide-y divide-line">
                    {data.lowStock.items.map((product) => (
                      <li key={product.productId} className="flex items-center gap-3 px-4 py-3">
                        <img src={product.thumbnail} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-line bg-paper object-contain" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{product.title}</span>
                        <span className={`amount text-sm font-semibold ${product.stock === 0 ? "text-clay" : "text-ink"}`}>{product.stock === 0 ? "Out of stock" : `${product.stock} left`}</span>
                        <Link to={`/admin/products/${product.productId}`} className="text-sm font-medium text-harbor hover:underline" aria-label={`Restock ${product.title}`}>
                          Edit
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {data.lowStock.count > data.lowStock.items.length && (
                    <Link to="/admin/products?sort=stock_low" className="block border-t border-line px-4 py-2.5 text-sm font-medium text-harbor hover:underline">
                      See all {data.lowStock.count} low-stock products
                    </Link>
                  )}
                </>
              )}
            </Panel>
          </div>

          <Panel className="mt-6 overflow-hidden">
            <h2 className="border-b border-line px-4 py-3 text-base font-bold text-ink">Recent activity</h2>
            <ActivityList entries={activity.data?.items} isLoading={activity.isLoading} isError={activity.isError} onRetry={() => activity.refetch()} />
          </Panel>
        </>
      )}
    </div>
  );
}
