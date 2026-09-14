import mongoose, { Types } from "mongoose";
import type Stripe from "stripe";
import { OrderModel, ProductModel, UserModel } from "../models/index.js";
import { getStripe, toCents } from "./stripe.js";

type OrderDoc = NonNullable<Awaited<ReturnType<typeof OrderModel.findById>>>;

export type FinalizeResult =
  | { outcome: "paid"; order: OrderDoc }
  | { outcome: "already_final"; order: OrderDoc }
  | { outcome: "not_succeeded"; order: OrderDoc; intentStatus: string; message?: string }
  | { outcome: "refunded_out_of_stock"; order: OrderDoc }
  | { outcome: "not_found" };

class StockRaceError extends Error {}

function brandLabel(brand: string | null | undefined) {
  if (!brand) return "Card";
  const known: Record<string, string> = { amex: "American Express", mastercard: "Mastercard", visa: "Visa", discover: "Discover" };
  return known[brand] ?? brand.charAt(0).toUpperCase() + brand.slice(1);
}

async function retrieveIntent(stripe: Stripe, id: string) {
  return stripe.paymentIntents.retrieve(id, { expand: ["latest_charge"] });
}

async function refundIntent(stripe: Stripe, intent: Stripe.PaymentIntent) {
  const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
  if (charge?.refunded) return;
  await stripe.refunds.create({ payment_intent: intent.id }, { idempotencyKey: `refund_${intent.id}` });
}

/**
 * Settles a payment attempt so no money is held against an order that won't
 * ship: refunds it if it already succeeded, otherwise cancels the intent.
 * Throws if Stripe can't do either, so callers can refuse to cancel the order.
 */
export async function releaseStripePayment(paymentIntentId: string) {
  const stripe = getStripe();
  const intent = await retrieveIntent(stripe, paymentIntentId);
  if (intent.status === "succeeded") {
    await refundIntent(stripe, intent);
  } else if (intent.status !== "canceled") {
    await stripe.paymentIntents.cancel(intent.id);
  }
}

/**
 * The single place a Stripe-paid order becomes `paid`. Called from both the
 * client's confirm-payment request and the `payment_intent.succeeded` webhook,
 * so it must be idempotent and safe when both race: the pending -> paid flip
 * is a conditional update inside the same transaction as the stock decrement,
 * so exactly one caller wins and the other sees `already_final`.
 */
export async function finalizeStripeOrder(orderId: string): Promise<FinalizeResult> {
  if (!Types.ObjectId.isValid(orderId)) return { outcome: "not_found" };
  const order = await OrderModel.findById(orderId);
  if (!order?.paymentIntentId?.startsWith("pi_")) return { outcome: "not_found" };

  const stripe = getStripe();
  const intent = await retrieveIntent(stripe, order.paymentIntentId);

  if (order.status !== "pending_payment") {
    // The order was cancelled (by the shopper, or superseded by a newer
    // checkout) but its payment still went through — don't keep the money.
    if (order.status === "cancelled" && intent.status === "succeeded") await refundIntent(stripe, intent);
    return { outcome: "already_final", order };
  }

  if (intent.status !== "succeeded") {
    return { outcome: "not_succeeded", order, intentStatus: intent.status, message: intent.last_payment_error?.message };
  }

  if (intent.amount !== toCents(order.total) || intent.currency !== "usd" || intent.metadata.orderId !== order.id) {
    throw new Error(`PaymentIntent ${intent.id} does not match order ${order.id}`);
  }

  const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
  const card = charge?.payment_method_details?.card;
  const payment = { brand: brandLabel(card?.brand), last4: card?.last4 ?? "" };
  const purchasedIds = new Set(order.items.map((item) => item.product.toString()));

  let didFinalize = false;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      didFinalize = false;
      const updated = await OrderModel.findOneAndUpdate(
        { _id: order._id, status: "pending_payment" },
        { $set: { status: "paid", payment, placedAt: new Date() } },
        { session, returnDocument: "after" },
      );
      if (!updated) return; // another caller finalized it first

      for (const item of order.items) {
        const reserved = await ProductModel.findOneAndUpdate(
          { _id: item.product, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { session },
        );
        if (!reserved) throw new StockRaceError();
      }

      const user = await UserModel.findById(order.user).session(session);
      if (user) {
        const remaining = user.cart.filter((c) => c.savedForLater || !purchasedIds.has(c.product.toString()));
        user.cart.splice(0, user.cart.length, ...remaining);
        await user.save({ session });
      }
      didFinalize = true;
    });
  } catch (err) {
    if (!(err instanceof StockRaceError)) throw err;
    // Paid, but an item sold out between the quote and the payment: refund
    // rather than keep money for an order that can't ship.
    await refundIntent(stripe, intent);
    const cancelled = await OrderModel.findOneAndUpdate(
      { _id: order._id, status: "pending_payment" },
      { $set: { status: "cancelled", cancellationReason: "out_of_stock" } },
      { returnDocument: "after" },
    );
    return { outcome: "refunded_out_of_stock", order: cancelled ?? (await OrderModel.findById(order._id))! };
  } finally {
    await session.endSession();
  }

  const current = (await OrderModel.findById(order._id))!;
  return didFinalize ? { outcome: "paid", order: current } : { outcome: "already_final", order: current };
}

/**
 * A shopper who restarts checkout gets a fresh order and intent. Earlier
 * pending ones are resolved first: finalized if their payment actually went
 * through (e.g. in another tab), otherwise cancelled along with their intent.
 */
export async function supersedePendingOrders(userId: string) {
  const pending = await OrderModel.find({ user: userId, status: "pending_payment" });
  for (const order of pending) {
    if (order.paymentIntentId?.startsWith("pi_")) {
      const result = await finalizeStripeOrder(order.id);
      if (result.outcome !== "not_succeeded") continue;
      if (result.intentStatus === "processing") continue; // can't be cancelled; the webhook will settle it
      await getStripe().paymentIntents.cancel(order.paymentIntentId).catch(() => undefined);
    }
    await OrderModel.updateOne(
      { _id: order._id, status: "pending_payment" },
      { $set: { status: "cancelled", cancellationReason: "superseded" } },
    );
  }
}
