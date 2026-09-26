import type { OrderStatus } from "../../lib/types";
import Badge, { type BadgeTone } from "../ui/Badge";

// Tones follow what the admin has to do: a paid order is waiting on them.
const STATUS: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  pending_payment: { label: "Awaiting payment", tone: "neutral" },
  paid: { label: "Paid", tone: "warning" },
  shipped: { label: "Shipped", tone: "info" },
  delivered: { label: "Delivered", tone: "positive" },
  cancelled: { label: "Cancelled", tone: "negative" },
};

export const ORDER_STATUS_LABEL = Object.fromEntries(Object.entries(STATUS).map(([key, value]) => [key, value.label])) as Record<OrderStatus, string>;

export default function AdminOrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={STATUS[status].tone}>{STATUS[status].label}</Badge>;
}
