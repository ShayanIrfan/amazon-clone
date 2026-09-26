import type { OrderStatus } from "../../lib/types";
import Badge, { type BadgeTone } from "../ui/Badge";

const TONES: Record<OrderStatus, BadgeTone> = {
  pending_payment: "warning",
  paid: "info",
  shipped: "info",
  delivered: "positive",
  cancelled: "negative",
};

const LABELS: Record<OrderStatus, string> = {
  pending_payment: "Payment pending",
  paid: "Order placed",
  cancelled: "Cancelled",
  shipped: "Shipped",
  delivered: "Delivered",
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={TONES[status]}>{LABELS[status]}</Badge>;
}
