import { Link, useNavigate } from "react-router";
import { ArrowRight, Package } from "lucide-react";
import { useOrders } from "../hooks/useOrders";
import { useCart } from "../context/CartContext";
import { formatPrice } from "../lib/format";
import OrderStatusBadge from "../components/orders/OrderStatusBadge";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import type { Order } from "../lib/types";

const MAX_THUMBS = 4;

export default function OrdersListPage() {
  const { data, isLoading, isError, refetch } = useOrders();
  const { addItem } = useCart();
  const navigate = useNavigate();

  function buyAgain(order: Order) {
    for (const item of order.items) addItem(item.product, item.quantity);
    navigate("/cart");
  }

  if (isLoading) {
    return (
      <div className="page-shell py-8">
        <Skeleton className="h-9 w-48" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }
  if (isError) return <ErrorState message="Couldn't load your orders." onRetry={() => refetch()} />;

  const orders = data?.items ?? [];

  if (orders.length === 0) {
    return (
      <div className="page-shell py-8">
        <Panel className="p-4 sm:p-8">
          <EmptyState
            icon={Package}
            title="No orders yet"
            description="When you place an order, it'll show up here with its status and details."
            action={
              <Link to="/search" className="flex h-11 items-center gap-2 rounded-full bg-harbor px-6 text-sm font-semibold text-white! hover:bg-harbor-dark">
                Start shopping <ArrowRight size={16} aria-hidden />
              </Link>
            }
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className="page-shell py-8">
      <PageHeader eyebrow="Account activity" title="Your orders" description={`${orders.length} ${orders.length === 1 ? "order" : "orders"}`} />

      <ul className="mt-6 space-y-4">
        {orders.map((order) => {
          const extra = order.items.length - MAX_THUMBS;
          return (
            <li key={order._id}>
              <Panel className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper px-5 py-3.5 text-sm">
                  <div className="flex flex-wrap gap-x-8 gap-y-2">
                    <span>
                      <span className="block text-xs text-slate">Order placed</span>
                      <span className="font-semibold text-ink">
                        {new Date(order.placedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                    </span>
                    <span>
                      <span className="block text-xs text-slate">Total</span>
                      <span className="amount font-semibold text-ink">{formatPrice(order.total)}</span>
                    </span>
                    <span>
                      <span className="block text-xs text-slate">Order #</span>
                      <span className="font-mono text-xs font-semibold text-ink">{order._id.slice(-8).toUpperCase()}</span>
                    </span>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="flex items-center gap-3">
                    {order.items.slice(0, MAX_THUMBS).map((item, i) => (
                      <div key={i} className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-paper p-2">
                        <img src={item.thumbnail} alt={item.title} className="max-h-full max-w-full object-contain mix-blend-multiply" />
                      </div>
                    ))}
                    {extra > 0 && (
                      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-paper text-sm font-semibold text-slate">+{extra}</span>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => buyAgain(order)}
                      className="h-10 rounded-full border border-line bg-white px-5 text-sm font-semibold text-ink transition-colors hover:bg-paper"
                    >
                      Buy again
                    </button>
                    <Link
                      to={`/orders/${order._id}`}
                      className="flex h-10 items-center rounded-full bg-harbor px-5 text-sm font-semibold text-white! transition-colors hover:bg-harbor-dark"
                    >
                      View order
                    </Link>
                  </div>
                </div>
              </Panel>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
