import { Link, useNavigate } from "react-router";
import { Package } from "lucide-react";
import { useOrders, useCancelOrder } from "../hooks/useOrders";
import { useCart } from "../context/CartContext";
import { formatPrice } from "../lib/format";
import OrderStatusBadge from "../components/orders/OrderStatusBadge";
import ErrorState from "../components/common/ErrorState";
import type { Order } from "../lib/types";

export default function OrdersListPage() {
  const { data, isLoading, isError } = useOrders();
  const cancelOrder = useCancelOrder();
  const { addItem } = useCart();
  const navigate = useNavigate();

  function buyAgain(order: Order) {
    for (const item of order.items) addItem(item.product, item.quantity);
    navigate("/cart");
  }

  if (isLoading) return <div className="p-16 text-center text-neutral-500">Loading…</div>;
  if (isError) return <ErrorState message="Couldn't load your orders." />;

  const orders = data?.items ?? [];

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-16 text-center">
        <Package size={48} className="text-neutral-300" />
        <h1 className="text-xl font-bold text-neutral-900">You haven't placed any orders yet</h1>
        <Link to="/" className="mt-2 rounded-full bg-amazon-yellow px-6 py-2 text-sm font-medium text-neutral-900 hover:brightness-95">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-4">
      <h1 className="text-2xl font-medium text-neutral-900">Your Orders</h1>
      <ul className="mt-4 space-y-4">
        {orders.map((order) => (
          <li key={order._id} className="rounded-lg border border-neutral-200">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-50 px-4 py-2 text-sm">
              <div className="flex flex-wrap gap-6">
                <span>
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
                <Link to={`/orders/${order._id}`} className="rounded-full border border-neutral-300 px-4 py-1.5 text-center text-sm hover:bg-neutral-50">
                  View order details
                </Link>
                <button
                  type="button"
                  onClick={() => buyAgain(order)}
                  className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm hover:bg-neutral-50"
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
