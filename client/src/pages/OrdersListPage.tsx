import { Link, useNavigate } from "react-router";
import { Package } from "lucide-react";
import { useOrders, useCancelOrder } from "../hooks/useOrders";
import { useCart } from "../context/CartContext";
import { formatPrice } from "../lib/format";
import OrderStatusBadge from "../components/orders/OrderStatusBadge";
import ErrorState from "../components/ui/ErrorState";
import type { Order } from "../lib/types";
import PageLoader from "../components/ui/PageLoader";

export default function OrdersListPage() {
  const { data, isLoading, isError, refetch } = useOrders();
  const cancelOrder = useCancelOrder();
  const { addItem } = useCart();
  const navigate = useNavigate();

  function buyAgain(order: Order) {
    for (const item of order.items) addItem(item.product, item.quantity);
    navigate("/cart");
  }

  if (isLoading) return <PageLoader label="Loading your orders" />;
  if (isError) return <ErrorState message="Couldn't load your orders." onRetry={() => refetch()} />;

  const orders = data?.items ?? [];

  if (orders.length === 0) {
    return (
      <div className="page-shell flex flex-col items-center gap-3 py-20 text-center">
        <Package size={48} className="text-neutral-300" />
        <h1 className="page-title text-ink">You haven't placed any orders yet</h1>
        <Link to="/" className="mt-2 rounded-md bg-marigold px-6 py-2.5 text-sm font-semibold text-harbor-dark hover:bg-marigold-dark">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="page-shell py-6">
      <p className="eyebrow">Account activity</p>
      <h1 className="page-title mt-1 text-ink">Your Orders</h1>
      <ul className="mt-6 space-y-4">
        {orders.map((order) => (
          <li key={order._id} className="surface overflow-hidden rounded-md">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-paper px-4 py-3 text-sm">
              <div className="flex flex-wrap gap-6">
                <span className="amount">
                  <span className="block text-neutral-500">Order placed</span>
                  {new Date(order.placedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </span>
                <span>
                  <span className="block text-neutral-500">Total</span>
                  {formatPrice(order.total)}
                </span>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>

            <div className="flex flex-wrap items-center gap-4 p-4">
              <div className="flex flex-1 gap-2 overflow-x-auto">
                {order.items.map((item, i) => (
                  <img key={i} src={item.thumbnail} alt={item.title} className="h-16 w-16 shrink-0 bg-white object-contain" />
                ))}
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                <Link to={`/orders/${order._id}`} className="rounded-md border border-line-strong bg-white px-4 py-2 text-center text-sm font-semibold text-harbor hover:bg-paper">
                  View order details
                </Link>
                <button
                  type="button"
                  onClick={() => buyAgain(order)}
                  className="rounded-md border border-line-strong bg-white px-4 py-2 text-sm font-semibold text-harbor hover:bg-paper"
                >
                  Buy it again
                </button>
                {order.status === "paid" && (
                  <button
                    type="button"
                    disabled={cancelOrder.isPending}
                    onClick={() => cancelOrder.mutate(order._id)}
                    className="text-xs text-link hover:underline disabled:opacity-50"
                  >
                    Cancel order
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
