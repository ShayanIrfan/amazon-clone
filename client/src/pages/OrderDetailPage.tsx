import { useState } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router";
import { CircleCheck } from "lucide-react";
import { useOrder, useCancelOrder } from "../hooks/useOrders";
import { useCart } from "../context/CartContext";
import { formatPrice } from "../lib/format";
import OrderStatusBadge from "../components/orders/OrderStatusBadge";
import OrderStatusTracker from "../components/orders/OrderStatusTracker";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import Panel from "../components/ui/Panel";
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
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (isLoading) return <PageLoader label="Loading order details" />;
  if (isError || !data) {
    return <ErrorState message="Order not found." detail="The order may no longer be available for this account." />;
  }

  const { order } = data;
  const cancellable = order.status === "paid";

  return (
    <div className="page-shell max-w-5xl py-8">
      <Breadcrumbs className="mb-6" items={[{ label: "Your orders", to: "/orders" }, { label: `#${order._id.slice(-8).toUpperCase()}` }]} />

      {confirmed && order.status === "paid" && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-mint p-5 text-harbor">
          <CircleCheck size={24} aria-hidden />
          <div>
            <p className="font-bold">Thanks for your order!</p>
            <p className="text-sm">A confirmation is saved in Your orders.</p>
          </div>
        </div>
      )}
      {order.status === "pending_payment" && (
        <div role="status" className="mb-6 rounded-2xl border border-line bg-tint-butter p-5 text-sm text-ink">
          <p className="font-bold">Confirming your payment</p>
          <p>This page updates on its own once Stripe confirms the payment.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Purchase record</p>
          <h1 className="page-title mt-1 text-ink">Order details</h1>
          <p className="mt-2 text-sm text-slate">
            Placed on {new Date(order.placedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <Panel className="mt-6 p-5 sm:p-6">
        <OrderStatusTracker order={order} />
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <Panel className="divide-y divide-line px-5">
            {order.items.map((item, i) => (
              <div key={i} className="flex gap-4 py-4">
                <Link to={`/product/${item.product}`} className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-paper p-2">
                  <img src={item.thumbnail} alt="" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                </Link>
                <div className="flex-1 text-sm">
                  <Link to={`/product/${item.product}`} className="font-semibold text-ink hover:text-harbor">
                    {item.title}
                  </Link>
                  <p className="amount mt-1 text-slate">
                    Qty {item.quantity} × {formatPrice(item.unitPrice)}
                  </p>
                </div>
                <span className="amount shrink-0 text-sm font-semibold text-ink">{formatPrice(item.unitPrice * item.quantity)}</span>
              </div>
            ))}
          </Panel>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                for (const item of order.items) addItem(item.product, item.quantity);
                navigate("/cart");
              }}
              className="h-10 rounded-full border border-line bg-white px-5 text-sm font-semibold text-ink transition-colors hover:bg-paper"
            >
              Buy it again
            </button>
            {cancellable &&
              (confirmCancel ? (
                <div className="flex items-center gap-2 rounded-full bg-clay/5 py-1 pr-1 pl-4">
                  <span className="text-sm font-semibold text-clay">Cancel this order?</span>
                  <button
                    type="button"
                    disabled={cancelOrder.isPending}
                    onClick={() => cancelOrder.mutate(order._id)}
                    className="h-8 rounded-full bg-clay px-4 text-sm font-semibold text-white transition-colors hover:bg-clay-dark disabled:opacity-50"
                  >
                    {cancelOrder.isPending ? "Cancelling…" : "Yes, cancel"}
                  </button>
                  <button type="button" onClick={() => setConfirmCancel(false)} className="h-8 rounded-full px-3 text-sm font-semibold text-slate hover:text-ink">
                    Keep
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmCancel(true)}
                  className="h-10 rounded-full border border-line bg-white px-5 text-sm font-semibold text-clay transition-colors hover:bg-clay/5"
                >
                  Cancel order
                </button>
              ))}
          </div>
          {cancellable && <p className="mt-2 text-xs text-slate">Cancel any time before it ships for a full refund.</p>}
        </div>

        <div className="space-y-4">
          <Panel className="p-5 text-sm">
            <h2 className="text-base font-bold text-ink">Shipping address</h2>
            <p className="mt-2 text-slate">
              {order.address.fullName}
              <br />
              {order.address.street}
              {order.address.unit ? `, ${order.address.unit}` : ""}
              <br />
              {order.address.city}, {order.address.state} {order.address.zip}
              <br />
              {order.address.country}
            </p>
          </Panel>

          <Panel className="p-5 text-sm">
            <h2 className="text-base font-bold text-ink">Payment</h2>
            <p className="mt-2 text-slate">
              {order.payment?.last4
                ? `${order.payment.brand ?? "Card"} ending in ${order.payment.last4}`
                : order.status === "pending_payment"
                  ? "Awaiting payment confirmation"
                  : (order.payment?.brand ?? "Card")}
            </p>
            {order.refund && (
              <p className="mt-2 font-semibold text-moss">
                Refunded {formatPrice(order.refund.amount)} on{" "}
                {new Date(order.refund.at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
          </Panel>

          <Panel className="p-5 text-sm">
            <h2 className="text-base font-bold text-ink">Order summary</h2>
            <dl className="mt-3 space-y-2.5">
              <div className="flex justify-between">
                <dt className="text-slate">Subtotal</dt>
                <dd className="amount font-semibold text-ink">{formatPrice(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate">Delivery</dt>
                <dd className={`amount font-semibold ${order.shipping === 0 ? "text-moss" : "text-ink"}`}>{order.shipping === 0 ? "Free" : formatPrice(order.shipping)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate">Tax</dt>
                <dd className="amount font-semibold text-ink">{formatPrice(order.tax)}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-line pt-3">
                <dt className="font-bold text-ink">Total</dt>
                <dd className="amount text-lg font-extrabold text-ink">{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}
