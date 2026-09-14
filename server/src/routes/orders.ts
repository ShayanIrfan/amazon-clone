import { Router } from "express";
import { z } from "zod";
import mongoose, { Types } from "mongoose";
import crypto from "node:crypto";
import { UserModel, OrderModel, ProductModel } from "../models/index.js";
import { requireAuth } from "../middleware/auth.js";
import { chargeCard } from "../lib/mockPayments.js";
import { computeTotals, loadActiveCartItems, findStockShortfalls } from "../lib/orderPricing.js";
import { stripeConfigured } from "../config.js";
import { getStripe, toCents } from "../lib/stripe.js";
import { finalizeStripeOrder, releaseStripePayment, supersedePendingOrders } from "../lib/orderFulfillment.js";

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

const deliverySpeedSchema = z.enum(["standard", "expedited"]);

// Preview of what placing the order right now would cost, so the checkout
// review step shows real numbers without submitting a card first. Uses the
// exact same pricing function POST / does, so the two can't disagree.
ordersRouter.get("/quote", async (req, res, next) => {
  try {
    const deliverySpeed = deliverySpeedSchema.parse(req.query.deliverySpeed ?? "standard");
    const user = await UserModel.findById(req.userId);
    if (!user) {
      res.status(401).json({ error: "Not signed in" });
      return;
    }

    const { activeItems, productById } = await loadActiveCartItems(user);
    if (!activeItems.length) {
      // 200 with itemCount 0, not a 400 — this is a read-only preview, and the
      // checkout page uses itemCount to render its own empty-cart state.
      // (Placing an order against an empty cart is what actually gets rejected.)
      res.json({ subtotal: 0, shipping: 0, tax: 0, total: 0, itemCount: 0, shortfalls: [] });
      return;
    }

    const shortfalls = findStockShortfalls(activeItems, productById);
    const subtotal = activeItems.reduce(
      (sum, item) => sum + (productById.get(item.product.toString())?.price ?? 0) * item.quantity,
      0,
    );

    // Units, not lines — matches the header's cart count ("Items (3)" for 3 of one product).
    const itemCount = activeItems.reduce((sum, item) => sum + item.quantity, 0);
    res.json({ ...computeTotals(subtotal, deliverySpeed), itemCount, shortfalls });
  } catch (err) {
    next(err);
  }
});

const cardSchema = z.object({
  number: z.string().min(1),
  expiry: z.string().min(1),
  cvv: z.string().min(1),
  name: z.string().min(1),
});

const placeOrderSchema = z.object({
  addressId: z.string(),
  deliverySpeed: deliverySpeedSchema,
  // Mock provider only. With Stripe the card never reaches this server.
  card: cardSchema.optional(),
});

ordersRouter.post("/", async (req, res, next) => {
  try {
    const { addressId, deliverySpeed, card } = placeOrderSchema.parse(req.body);

    // Resolve abandoned Stripe checkouts first — one may even have been paid in
    // another tab, which changes what's left in the cart below.
    if (stripeConfigured) await supersedePendingOrders(req.userId!);

    const user = await UserModel.findById(req.userId);
    if (!user) {
      res.status(401).json({ error: "Not signed in" });
      return;
    }

    const address = Types.ObjectId.isValid(addressId) ? user.addresses.id(addressId) : null;
    if (!address) {
      res.status(400).json({ error: "Select a delivery address" });
      return;
    }

    const { activeItems, productById } = await loadActiveCartItems(user);
    if (!activeItems.length) {
      res.status(400).json({ error: "Your cart is empty" });
      return;
    }

    const shortfalls = findStockShortfalls(activeItems, productById);
    if (shortfalls.length) {
      res.status(409).json({ error: "Some items are no longer available in the quantity you have", shortfalls });
      return;
    }

    const subtotal = activeItems.reduce(
      (sum, item) => sum + productById.get(item.product.toString())!.price * item.quantity,
      0,
    );
    const totals = computeTotals(subtotal, deliverySpeed);
    const orderFields = {
      user: user._id,
      items: activeItems.map((item) => {
        const p = productById.get(item.product.toString())!;
        return { product: p._id, title: p.title, thumbnail: p.thumbnail, unitPrice: p.price, quantity: item.quantity };
      }),
      address: {
        fullName: address.fullName,
        phone: address.phone,
        street: address.street,
        unit: address.unit,
        city: address.city,
        state: address.state,
        zip: address.zip,
        country: address.country,
      },
      deliverySpeed,
      ...totals,
    };

    if (stripeConfigured) {
      // Stock and the cart are only touched once the payment succeeds (see
      // lib/orderFulfillment.ts); until then this is just a pending order.
      const order = await OrderModel.create({ ...orderFields, status: "pending_payment" });
      try {
        const intent = await getStripe().paymentIntents.create(
          {
            amount: toCents(order.total),
            currency: "usd",
            // Cards only (3-D Secure is handled in-page by Stripe.js). Listing the
            // type explicitly keeps Dashboard-enabled methods such as bank debits
            // and Klarna out of the Payment Element; order fulfillment also
            // expects a card charge (brand + last 4).
            payment_method_types: ["card"],
            metadata: { orderId: order.id, userId: user.id },
            description: `amazon-clone order ${order.id}`,
          },
          { idempotencyKey: `order_${order.id}` },
        );
        order.paymentIntentId = intent.id;
        await order.save();
        res.status(201).json({ order, clientSecret: intent.client_secret, provider: "stripe" });
      } catch (err) {
        await OrderModel.updateOne({ _id: order._id }, { $set: { status: "cancelled", cancellationReason: "payment_setup_failed" } });
        throw err;
      }
      return;
    }

    if (!card) {
      res.status(400).json({ error: "Enter your card details" });
      return;
    }

    // Validate and "charge" the card before touching stock/orders — a
    // declined or malformed card should leave the cart untouched.
    const charge = chargeCard(card);
    if (charge.status === "invalid") {
      res.status(400).json({ error: charge.error });
      return;
    }
    if (charge.status === "declined") {
      res.status(402).json({ error: charge.reason });
      return;
    }

    const purchasedIds = new Set(activeItems.map((i) => i.product.toString()));
    const session = await mongoose.startSession();
    let order;
    try {
      await session.withTransaction(async () => {
        // Atomic per-item guard: the pre-check above can go stale between
        // request start and here (another tab/session buying the same item).
        for (const item of activeItems) {
          const updated = await ProductModel.findOneAndUpdate(
            { _id: item.product, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity } },
            { session, returnDocument: "after" },
          );
          if (!updated) throw new StockRaceError();
        }

        const [created] = await OrderModel.create(
          [
            {
              ...orderFields,
              status: "paid",
              paymentIntentId: `mock_${crypto.randomUUID()}`,
              payment: { brand: charge.brand, last4: charge.last4 },
            },
          ],
          { session },
        );
        order = created;

        // Purchased items leave the cart; anything saved for later stays.
        user.cart.splice(0, user.cart.length, ...user.cart.filter((c) => c.savedForLater || !purchasedIds.has(c.product.toString())));
        await user.save({ session });
      });
    } catch (err) {
      if (err instanceof StockRaceError) {
        res.status(409).json({ error: "One of your items sold out while you were checking out. Please review your cart." });
        return;
      }
      throw err;
    } finally {
      await session.endSession();
    }

    res.status(201).json({ order, provider: "mock" });
  } catch (err) {
    next(err);
  }
});

class StockRaceError extends Error {}

// Called by the checkout right after Stripe.js confirms the payment. The
// webhook does the same job independently; whichever arrives first wins.
ordersRouter.post("/:id/confirm-payment", async (req, res, next) => {
  try {
    if (!stripeConfigured) {
      res.status(400).json({ error: "Card payments are processed immediately in this environment" });
      return;
    }
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const owned = await OrderModel.exists({ _id: req.params.id, user: req.userId });
    if (!owned) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const result = await finalizeStripeOrder(req.params.id);
    switch (result.outcome) {
      case "paid":
      case "already_final":
        res.json({ order: result.order });
        return;
      case "refunded_out_of_stock":
        res.status(409).json({ error: "An item sold out while you were paying. Your payment has been refunded.", order: result.order });
        return;
      case "not_succeeded":
        if (result.intentStatus === "processing") {
          res.status(202).json({ order: result.order, paymentStatus: "processing" });
          return;
        }
        res.status(402).json({ error: result.message ?? "Your payment didn't go through. Try another card." });
        return;
      case "not_found":
        res.status(404).json({ error: "Order not found" });
        return;
    }
  } catch (err) {
    next(err);
  }
});

ordersRouter.get("/", async (req, res, next) => {
  try {
    // Pending orders are unpaid checkout attempts, not purchases.
    const orders = await OrderModel.find({ user: req.userId, status: { $ne: "pending_payment" } }).sort({ placedAt: -1 }).lean();
    res.json({ items: orders });
  } catch (err) {
    next(err);
  }
});

ordersRouter.get("/:id", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const order = await OrderModel.findOne({ _id: req.params.id, user: req.userId }).lean();
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

ordersRouter.post("/:id/cancel", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const order = await OrderModel.findOne({ _id: req.params.id, user: req.userId });
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    if (order.status !== "paid" && order.status !== "pending_payment") {
      res.status(400).json({ error: `An order that is ${order.status} can't be cancelled` });
      return;
    }

    const stripePaid = stripeConfigured && order.paymentIntentId?.startsWith("pi_");
    if (stripePaid) {
      try {
        await releaseStripePayment(order.paymentIntentId!);
      } catch (err) {
        console.error("[orders] refund/cancel with Stripe failed", err);
        res.status(502).json({ error: "We couldn't refund your payment, so the order wasn't cancelled. Try again." });
        return;
      }
    }

    // Stock was never taken for an unpaid order, so there's nothing to restock.
    if (order.status === "pending_payment") {
      order.status = "cancelled";
      order.cancellationReason = "cancelled_by_customer";
      await order.save();
      res.json({ order });
      return;
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        for (const item of order.items) {
          await ProductModel.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }, { session });
        }
        order.status = "cancelled";
        order.cancellationReason = "cancelled_by_customer";
        await order.save({ session });
      });
    } finally {
      await session.endSession();
    }

    res.json({ order });
  } catch (err) {
    next(err);
  }
});
