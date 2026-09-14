import { useParams, useSearchParams, Link, useNavigate } from "react-router";
import { CircleCheck } from "lucide-react";
import { useOrder, useCancelOrder } from "../hooks/useOrders";
import { useCart } from "../context/CartContext";
import { formatPrice } from "../lib/format";
import OrderStatusBadge from "../components/orders/OrderStatusBadge";
import PageLoader from "../components/ui/PageLoader";
import ErrorState from "../components/ui/ErrorState";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const confirmed = searchParams.get("confirmed") === "1";
  const { data, isLoading, isError } = useOrder(id);
  const cancelOrder = useCancelOrder();
  const { addItem } = useCart();
  const navigate = useNavigate();

  if (isLoading) return <PageLoader label="Loading order details" />;
  if (isError || !data) {
    return (
      <ErrorState message="Order not found." detail="The order may no longer be available for this account." />
    );
  }

  const { order } = data;

  return (
    <div className="page-shell max-w-5xl py-6">
      {confirmed && order.status === "paid" && (
        <div className="mb-5 flex items-center gap-3 rounded-md border border-moss/30 bg-moss/10 p-4 text-moss">
          <CircleCheck size={24} />
          <div>
            <p className="font-bold">Thanks for your order!</p>
            <p className="text-sm">A confirmation has been placed in Your Orders.</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><p className="eyebrow">Purchase record</p><h1 className="page-title mt-1 text-ink">Order Details</h1></div>
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="mt-2 text-sm text-slate">
        Placed on{" "}
        {new Date(order.placedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <ul className="surface divide-y divide-line overflow-hidden rounded-md">
            {order.items.map((item, i) => (
              <li key={i} className="flex gap-3 p-3">
                <img src={item.thumbnail} alt={item.title} className="h-16 w-16 shrink-0 bg-white object-contain" />
                <div className="flex-1 text-sm">
                  <Link to={`/product/${item.product}`} className="hover:text-link hover:underline">
                    {item.title}
                  </Link>
                  <p className="amount text-neutral-500">
                    Qty: {item.quantity} × {formatPrice(item.unitPrice)}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => {
                for (const item of order.items) addItem(item.product, item.quantity);
                navigate("/cart");
              }}
              className="rounded-md border border-line-strong bg-white px-4 py-2 text-sm font-semibold text-harbor hover:bg-paper"
            >
              Buy it again
            </button>
            {order.status === "paid" && (
              <button
                type="button"
                disabled={cancelOrder.isPending}
                onClick={() => cancelOrder.mutate(order._id)}
                className="rounded-md border border-line-strong bg-white px-4 py-2 text-sm font-semibold text-clay hover:bg-paper disabled:opacity-50"
              >
                Cancel order
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface rounded-md p-4 text-sm">
            <h2 className="font-bold text-neutral-900">Shipping address</h2>
            <p className="mt-1 text-neutral-700">
              {order.address.fullName}
              <br />
              {order.address.street}
              {order.address.unit ? `, ${order.address.unit}` : ""}
              <br />
              {order.address.city}, {order.address.state} {order.address.zip}
              <br />
              {order.address.country}
            </p>
          </div>

          <div className="surface rounded-md p-4 text-sm">
            <h2 className="font-bold text-neutral-900">Payment method</h2>
            <p className="mt-1 text-neutral-700">
              {order.payment.brand} ending in {order.payment.last4}
            </p>
          </div>

          <div className="surface rounded-md p-4 text-sm">
            <h2 className="font-bold text-neutral-900">Order summary</h2>
            <dl className="amount mt-2 space-y-1">
              <div className="flex justify-between">
                <dt>Subtotal:</dt>
                <dd>{formatPrice(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Shipping:</dt>
                <dd>{order.shipping === 0 ? "FREE" : formatPrice(order.shipping)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Tax:</dt>
                <dd>{formatPrice(order.tax)}</dd>
              </div>
              <div className="my-1 border-t border-neutral-200" />
              <div className="flex justify-between font-bold">
                <dt>Total:</dt>
                <dd>{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
