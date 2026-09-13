import { Router } from "express";
import { z } from "zod";
import mongoose, { Types } from "mongoose";
import crypto from "node:crypto";
import { UserModel, OrderModel, ProductModel } from "../models/index.js";
import { requireAuth } from "../middleware/auth.js";
import { chargeCard } from "../lib/mockPayments.js";
import { computeTotals, loadActiveCartItems, findStockShortfalls } from "../lib/orderPricing.js";

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

    res.json({ ...computeTotals(subtotal, deliverySpeed), itemCount: activeItems.length, shortfalls });
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
  card: cardSchema,
});

ordersRouter.post("/", async (req, res, next) => {
  try {
    const { addressId, deliverySpeed, card } = placeOrderSchema.parse(req.body);

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

    const subtotal = activeItems.reduce(
      (sum, item) => sum + productById.get(item.product.toString())!.price * item.quantity,
      0,
    );
    const totals = computeTotals(subtotal, deliverySpeed);
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

    res.status(201).json({ order });
  } catch (err) {
    next(err);
  }
});

class StockRaceError extends Error {}

ordersRouter.get("/", async (req, res, next) => {
  try {
    const orders = await OrderModel.find({ user: req.userId }).sort({ placedAt: -1 }).lean();
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
    if (order.status !== "paid") {
      res.status(400).json({ error: `An order that is ${order.status} can't be cancelled` });
      return;
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        for (const item of order.items) {
          await ProductModel.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }, { session });
        }
        order.status = "cancelled";
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
