import mongoose, { type HydratedDocument } from "mongoose";
import { OrderModel, ProductModel } from "../models/index.js";
import type { Order } from "../models/Order.js";

export type CancellationReason = "cancelled_by_customer" | "cancelled_by_admin" | "refunded_in_stripe";
export type Actor = "customer" | "admin" | "stripe" | "system";

type OrderDoc = HydratedDocument<Order>;

/**
 * The one way an open order becomes `cancelled`. The status flip is a
 * conditional update inside the same transaction as the restock, so when a
 * customer, an admin and a Stripe refund webhook race, exactly one of them
 * changes the order and gives the stock back; the rest see `changed: false`.
 *
 * Paid orders had stock taken, so it is returned. Unpaid ones never took any.
 * Shipped and delivered orders are never cancelled here.
 */
export async function cancelOpenOrder(
  orderId: string,
  { reason, by }: { reason: CancellationReason; by: Actor },
): Promise<{ changed: boolean; order: OrderDoc | null }> {
  const session = await mongoose.startSession();
  let changed = false;
  try {
    await session.withTransaction(async () => {
      changed = false; // withTransaction can retry the whole callback
      const before = await OrderModel.findOneAndUpdate(
        { _id: orderId, status: { $in: ["paid", "pending_payment"] } },
        {
          $set: { status: "cancelled", cancellationReason: reason },
          $push: { statusHistory: { status: "cancelled", at: new Date(), by } },
        },
        { session, returnDocument: "before" },
      );
      if (!before) return;
      changed = true;
      if (before.status === "paid") {
        for (const item of before.items) {
          await ProductModel.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }, { session });
        }
      }
    });
  } finally {
    await session.endSession();
  }
  return { changed, order: await OrderModel.findById(orderId) };
}
