import type { OrderStatus } from "../../lib/types";

const STYLES: Record<OrderStatus, string> = {
  pending_payment: "bg-neutral-100 text-neutral-700",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  shipped: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
};

const LABELS: Record<OrderStatus, string> = {
  pending_payment: "Payment pending",
  paid: "Order placed",
  cancelled: "Cancelled",
  shipped: "Shipped",
  delivered: "Delivered",
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
