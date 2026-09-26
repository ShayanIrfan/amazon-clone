import { Check, CircleX } from "lucide-react";
import type { Order, OrderStatus } from "../../lib/types";

type TrackedOrder = Pick<Order, "status" | "placedAt" | "statusHistory">;

const STEPS = ["Placed", "Paid", "Shipped", "Delivered"] as const;

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** How many of the four steps are done for each status. Cancelled orders don't use the tracker. */
const REACHED: Record<Exclude<OrderStatus, "cancelled">, number> = {
  pending_payment: 1,
  paid: 2,
  shipped: 3,
  delivered: 4,
};

/**
 * Placed -> Paid -> Shipped -> Delivered, shared by the customer's order page
 * and the admin's. Dates come from the order itself: placedAt covers the first
 * two steps, statusHistory the later ones (older orders may have no date for them).
 */
export default function OrderStatusTracker({ order }: { order: TrackedOrder }) {
  if (order.status === "cancelled") {
    const cancelledAt = order.statusHistory?.findLast((entry) => entry.status === "cancelled")?.at;
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-clay" role="status">
        <CircleX size={18} aria-hidden />
        Cancelled{cancelledAt ? ` on ${formatDate(cancelledAt)}` : ""}
      </div>
    );
  }

  const reached = REACHED[order.status];
  const shippedAt = order.statusHistory?.find((entry) => entry.status === "shipped")?.at;
  const deliveredAt = order.statusHistory?.find((entry) => entry.status === "delivered")?.at;
  const dates: (string | undefined)[] = [order.placedAt, reached >= 2 ? order.placedAt : undefined, shippedAt, deliveredAt];

  return (
    <ol aria-label="Order progress" className="grid grid-cols-4">
      {STEPS.map((label, index) => {
        const done = index < reached;
        const current = index === reached - 1;
        const date = done ? dates[index] : undefined;
        return (
          <li key={label} aria-current={current ? "step" : undefined} className="relative flex flex-col items-center text-center">
            {/* Connector to the previous step, coloured once that step is reached. */}
            {index > 0 && (
              <span aria-hidden className={`absolute top-3.5 right-1/2 h-0.5 w-full ${done ? "bg-harbor" : "bg-line"}`} />
            )}
            <span
              className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border text-xs ${
                done ? "border-harbor bg-harbor text-white" : "border-line-strong bg-white text-slate"
              }`}
            >
              {done ? <Check size={14} aria-hidden /> : index + 1}
            </span>
            <span className={`mt-1.5 text-xs sm:text-sm ${done ? "font-semibold text-ink" : "text-slate"}`}>
              {label}
              {done && <span className="sr-only"> (done)</span>}
            </span>
            <span className="text-[0.7rem] text-slate">{date ? formatDate(date) : " "}</span>
          </li>
        );
      })}
    </ol>
  );
}
