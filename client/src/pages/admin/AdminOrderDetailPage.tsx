import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ChevronLeft, PackageCheck, Truck, XCircle } from "lucide-react";
import { useAdminActivity, useAdminOrder, useAdminOrderMutations } from "../../hooks/useAdmin";
import { formatPrice } from "../../lib/format";
import ActivityList from "../../components/admin/ActivityList";
import AdminOrderStatusBadge from "../../components/admin/AdminOrderStatusBadge";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import OrderStatusTracker from "../../components/orders/OrderStatusTracker";
import Button from "../../components/ui/Button";
import ErrorState from "../../components/ui/ErrorState";
import PageLoader from "../../components/ui/PageLoader";
import Panel from "../../components/ui/Panel";

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const detail = useAdminOrder(id);
  const activity = useAdminActivity({ entityType: "order", entityId: id, limit: 15 }, !!id);
  const { setStatus, cancel } = useAdminOrderMutations();

  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  if (detail.isLoading) return <PageLoader label="Loading order" />;
  if (detail.isError || !detail.data) {
    return <ErrorState message="Order not found." detail="It may have been removed." onRetry={() => detail.refetch()} />;
  }

  const { order, customer } = detail.data;
  const stripePayment = !!order.paymentIntentId?.startsWith("pi_");
  const canCancel = order.status === "paid" || order.status === "pending_payment";
  const address = order.address;

  async function advance(status: "shipped" | "delivered") {
    setError(null);
    try {
      await setStatus.mutateAsync({ id: order._id, status });
      setNotice(status === "shipped" ? "Marked as shipped. The customer can see it on their order." : "Marked as delivered.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update the order.");
    }
  }

  async function confirmCancellation() {
    setCancelError(null);
    try {
      await cancel.mutateAsync(order._id);
      setConfirmCancel(false);
      setNotice(order.status === "paid" && stripePayment ? "Order cancelled and refunded. Stock has been restored." : "Order cancelled. Stock has been restored.");
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Couldn't cancel the order.");
    }
  }

  return (
    <div>
      <Link to="/admin/orders" className="inline-flex items-center gap-1 text-sm font-medium text-harbor hover:underline">
        <ChevronLeft size={16} aria-hidden /> Orders
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="page-title amount text-ink">Order #{order.orderNumber}</h1>
            <AdminOrderStatusBadge status={order.status} />
          </div>
          <p className="muted mt-1">Placed {formatWhen(order.placedAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {order.status === "paid" && (
            <Button onClick={() => advance("shipped")} loading={setStatus.isPending}>
              <Truck size={16} aria-hidden /> Mark as shipped
            </Button>
          )}
          {order.status === "shipped" && (
            <Button onClick={() => advance("delivered")} loading={setStatus.isPending}>
              <PackageCheck size={16} aria-hidden /> Mark as delivered
            </Button>
          )}
          {canCancel && (
            <Button variant="danger" onClick={() => setConfirmCancel(true)}>
              <XCircle size={16} aria-hidden /> {order.status === "paid" ? "Cancel and refund" : "Cancel order"}
            </Button>
          )}
        </div>
      </div>

      {notice && (
        <p role="status" className="mt-4 rounded-xl border border-moss/20 bg-moss/10 px-4 py-2.5 text-sm font-medium text-moss">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-clay/30 bg-clay/5 px-4 py-2.5 text-sm font-medium text-clay">
          {error}
        </p>
      )}
      {order.refund && (
        <p className="mt-4 rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink">
          Stripe refunded <span className="amount font-semibold">{formatPrice(order.refund.amount)}</span> on {formatWhen(order.refund.at)}.
          {(order.status === "shipped" || order.status === "delivered") && " The order had already shipped, so its status was left as it is."}
        </p>
      )}

      <Panel className="mt-5 p-5">
        <OrderStatusTracker order={order} />
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <Panel className="overflow-hidden">
            <h2 className="border-b border-line px-4 py-3 text-lg font-semibold text-ink">Items</h2>
            <ul className="divide-y divide-line">
              {order.items.map((item, index) => (
                <li key={index} className="flex items-center gap-3 px-4 py-3">
                  <img src={item.thumbnail} alt="" className="h-12 w-12 shrink-0 rounded-xl border border-line bg-white object-contain" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/admin/products/${item.product}`} className="line-clamp-2 text-sm font-medium text-ink hover:text-harbor hover:underline">
                      {item.title}
                    </Link>
                    <p className="amount text-xs text-slate">
                      {item.quantity} × {formatPrice(item.unitPrice)}
                    </p>
                  </div>
                  <p className="amount text-sm font-medium">{formatPrice(item.unitPrice * item.quantity)}</p>
                </li>
              ))}
            </ul>
            <dl className="amount space-y-1 border-t border-line bg-paper px-4 py-3 text-sm">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd>{formatPrice(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Delivery ({order.deliverySpeed})</dt>
                <dd>{order.shipping === 0 ? "FREE" : formatPrice(order.shipping)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Tax</dt>
                <dd>{formatPrice(order.tax)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-bold">
                <dt>Total</dt>
                <dd>{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </Panel>
        </div>

        <div className="min-w-0 space-y-4">
          <Panel className="p-4 text-sm">
            <h2 className="text-lg font-semibold text-ink">Customer</h2>
            {customer ? (
              <div className="mt-2 space-y-0.5">
                <p className="font-medium text-ink">{customer.name}</p>
                <p className="break-all text-slate">{customer.email}</p>
                <p className="pt-1 text-slate">
                  {customer.orderCount} {customer.orderCount === 1 ? "order" : "orders"}
                  {customer.joinedAt && ` · joined ${new Date(customer.joinedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-slate">This account no longer exists.</p>
            )}
          </Panel>

          <Panel className="p-4 text-sm">
            <h2 className="text-lg font-semibold text-ink">Shipping address</h2>
            <p className="mt-2 text-ink">
              {address.fullName}
              <br />
              {address.street}
              {address.unit ? `, ${address.unit}` : ""}
              <br />
              {address.city}, {address.state} {address.zip}
              <br />
              {address.country}
            </p>
            <p className="mt-1 text-slate">{address.phone}</p>
          </Panel>

          <Panel className="p-4 text-sm">
            <h2 className="text-lg font-semibold text-ink">Payment</h2>
            <p className="mt-2 text-ink">
              {order.payment?.last4 ? `${order.payment.brand ?? "Card"} ending in ${order.payment.last4}` : order.status === "pending_payment" ? "Awaiting payment" : "Card"}
            </p>
            {order.paymentIntentId && (
              <p className="mt-1 break-all font-mono text-xs text-slate" title="Payment reference">
                {stripePayment ? "Stripe " : "Test "}
                {order.paymentIntentId}
              </p>
            )}
          </Panel>

          <Panel className="overflow-hidden">
            <h2 className="border-b border-line px-4 py-3 text-lg font-semibold text-ink">Activity</h2>
            <ActivityList entries={activity.data?.items} isLoading={activity.isLoading} isError={activity.isError} onRetry={() => activity.refetch()} />
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title={order.status === "paid" ? "Cancel and refund this order?" : "Cancel this order?"}
        confirmLabel={order.status === "paid" ? "Cancel and refund" : "Cancel order"}
        busy={cancel.isPending}
        error={cancelError}
        onConfirm={confirmCancellation}
        onCancel={() => {
          setConfirmCancel(false);
          setCancelError(null);
        }}
      >
        {order.status === "paid"
          ? stripePayment
            ? `The full ${formatPrice(order.total)} is refunded to the customer's card in Stripe and the items go back into stock. This can't be undone.`
            : "The items go back into stock. This was a test payment, so there is no card charge to refund. This can't be undone."
          : "This order was never paid, so nothing is refunded and no stock changes. This can't be undone."}
      </ConfirmDialog>
    </div>
  );
}
