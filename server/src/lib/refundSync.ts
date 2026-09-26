import type Stripe from "stripe";
import { OrderModel } from "../models/index.js";
import { getStripe } from "./stripe.js";
import { cancelOpenOrder } from "./orderCancellation.js";
import { APP_REFUND_SOURCE } from "./orderFulfillment.js";
import { orderNumber, recordAudit } from "./admin.js";

type RefundedCharge = Pick<Stripe.Charge, "id" | "payment_intent" | "refunded" | "amount_refunded">;

async function refundIssuedByApp(chargeId: string) {
  const refunds = await getStripe().refunds.list({ charge: chargeId, limit: 10 });
  return refunds.data.some((refund) => refund.metadata?.source === APP_REFUND_SOURCE);
}

/**
 * Keeps orders in step with refunds made outside the app (typically from the
 * Stripe Dashboard). Stripe also sends this event for the refunds the app makes
 * itself; those are recognised by their metadata and left to the app's own
 * cancel flow. Safe to receive repeatedly: the refund is recorded once, and
 * cancelOpenOrder lets exactly one caller cancel and restock.
 *
 * Only full refunds are handled; a partial refund doesn't change what was sold.
 * A refunded order that has already shipped keeps its status (the goods are
 * gone), with the refund recorded and an audit entry for someone to follow up.
 */
export async function handleChargeRefunded(
  charge: RefundedCharge,
  isAppRefund: (chargeId: string) => Promise<boolean> = refundIssuedByApp,
): Promise<"ignored" | "recorded" | "cancelled"> {
  const intentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!intentId || !charge.refunded) return "ignored";

  const order = await OrderModel.findOne({ paymentIntentId: intentId });
  if (!order) return "ignored";

  const recorded = await OrderModel.updateOne(
    { _id: order._id, "refund.at": { $exists: false } },
    { $set: { refund: { amount: charge.amount_refunded / 100, at: new Date() } } },
  );
  const firstTime = recorded.modifiedCount === 1;
  const ref = `#${orderNumber(order.id)}`;

  if (order.status === "shipped" || order.status === "delivered") {
    if (firstTime) {
      await recordAudit({
        actor: "stripe",
        action: "order.refund_recorded",
        entityType: "order",
        entityId: order.id,
        summary: `Order ${ref} was refunded in Stripe after it ${order.status === "shipped" ? "shipped" : "was delivered"}; its status was left as is`,
      });
    }
    return "recorded";
  }
  if (order.status !== "paid") return "recorded";
  if (await isAppRefund(charge.id)) return "recorded"; // the app is cancelling this order itself

  const { changed } = await cancelOpenOrder(order.id, { reason: "refunded_in_stripe", by: "stripe" });
  if (changed) {
    await recordAudit({
      actor: "stripe",
      action: "order.refunded_in_stripe",
      entityType: "order",
      entityId: order.id,
      summary: `Order ${ref} was refunded in Stripe, so it was cancelled and its stock restored`,
    });
  }
  return changed ? "cancelled" : "recorded";
}
