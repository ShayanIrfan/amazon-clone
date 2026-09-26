import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { OrderModel, ORDER_STATUSES, UserModel } from "../../models/index.js";
import { parsePagination } from "../../lib/pagination.js";
import { escapeRegex } from "../../lib/catalog.js";
import { orderNumber, recordAudit } from "../../lib/admin.js";
import { cancelOpenOrder } from "../../lib/orderCancellation.js";
import { releaseStripePayment } from "../../lib/orderFulfillment.js";
import { stripeConfigured } from "../../config.js";

export const adminOrdersRouter = Router();

const ID_PATTERN = /^[a-f0-9]{24}$/i;
const actorOf = (req: Request) => ({ id: req.admin!.id, email: req.admin!.email });

const listQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: z.enum([...ORDER_STATUSES, "all"]).default("all"),
});

function idParam(req: Request, res: Response) {
  const { id } = req.params;
  if (typeof id !== "string" || !ID_PATTERN.test(id)) {
    res.status(404).json({ error: "Order not found" });
    return null;
  }
  return id;
}

type Customer = { id: string; name: string; email: string } | null;

async function customersById(userIds: unknown[]) {
  const users = await UserModel.find({ _id: { $in: userIds } })
    .select("name email")
    .lean();
  return new Map<string, Customer>(users.map((u) => [u._id.toString(), { id: u._id.toString(), name: u.name, email: u.email }]));
}

adminOrdersRouter.get("/", async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const { page, limit, skip } = parsePagination({ page: req.query.page, limit: req.query.limit ?? 20 });

    const filter: Record<string, unknown> = {};
    if (query.status !== "all") filter.status = query.status;

    if (query.q) {
      // An order number (any tail of the id) or part of a customer's name or email.
      const or: Record<string, unknown>[] = [];
      if (/^[a-f0-9]{4,24}$/i.test(query.q)) {
        or.push({ $expr: { $regexMatch: { input: { $toString: "$_id" }, regex: `${query.q}$`, options: "i" } } });
      }
      const re = new RegExp(escapeRegex(query.q), "i");
      const users = await UserModel.find({ $or: [{ email: re }, { name: re }] })
        .select("_id")
        .limit(200)
        .lean();
      if (users.length) or.push({ user: { $in: users.map((u) => u._id) } });
      // No id-shaped text and no matching customer: nothing can match.
      filter.$or = or.length ? or : [{ _id: null }];
    }

    const [orders, total, grouped] = await Promise.all([
      OrderModel.find(filter).sort({ placedAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      OrderModel.countDocuments(filter),
      OrderModel.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    ]);

    const customers = await customersById(orders.map((o) => o.user));
    const counts: Record<string, number> = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
    for (const row of grouped) counts[row._id] = row.n;

    res.json({
      items: orders.map((order) => ({
        _id: order._id.toString(),
        orderNumber: orderNumber(order._id.toString()),
        status: order.status,
        total: order.total,
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        placedAt: order.placedAt,
        thumbnails: order.items.slice(0, 3).map((item) => item.thumbnail ?? ""),
        firstItemTitle: order.items[0]?.title ?? "",
        extraItems: Math.max(0, order.items.length - 1),
        refunded: !!order.refund?.at,
        customer: customers.get(order.user.toString()) ?? null,
      })),
      total,
      page,
      limit,
      counts,
    });
  } catch (err) {
    next(err);
  }
});

async function orderDetail(id: string) {
  const order = await OrderModel.findById(id).lean();
  if (!order) return null;
  const [customers, orderCount, joined] = await Promise.all([
    customersById([order.user]),
    OrderModel.countDocuments({ user: order.user, status: { $ne: "pending_payment" } }),
    UserModel.findById(order.user).select("createdAt").lean(),
  ]);
  const customer = customers.get(order.user.toString());
  return {
    order: { ...order, orderNumber: orderNumber(id) },
    customer: customer ? { ...customer, orderCount, joinedAt: joined?.createdAt ?? null } : null,
  };
}

adminOrdersRouter.get("/:id", async (req, res, next) => {
  try {
    const id = idParam(req, res);
    if (!id) return;
    const detail = await orderDetail(id);
    if (!detail) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

const statusSchema = z.object({ status: z.enum(["shipped", "delivered"]) });
// The only moves an admin can make. Payment is confirmed by Stripe alone, never by an admin.
const PREVIOUS_STATUS = { shipped: "paid", delivered: "shipped" } as const;

adminOrdersRouter.post("/:id/status", async (req, res, next) => {
  try {
    const id = idParam(req, res);
    if (!id) return;
    const { status } = statusSchema.parse(req.body);
    const from = PREVIOUS_STATUS[status];

    // Conditional on the current status, so two admins clicking at once can't both apply it.
    const updated = await OrderModel.findOneAndUpdate(
      { _id: id, status: from },
      { $set: { status }, $push: { statusHistory: { status, at: new Date(), by: "admin" } } },
      { returnDocument: "after" },
    ).lean();
    if (!updated) {
      const current = await OrderModel.findById(id).select("status").lean();
      if (!current) {
        res.status(404).json({ error: "Order not found" });
        return;
      }
      res.status(409).json({
        error: `Only ${from} orders can be marked ${status}. This order is ${current.status.replace("_", " ")}.`,
        code: "INVALID_TRANSITION",
      });
      return;
    }

    await recordAudit({
      actor: actorOf(req),
      action: status === "shipped" ? "order.ship" : "order.deliver",
      entityType: "order",
      entityId: id,
      summary: `Marked order #${orderNumber(id)} as ${status}`,
    });
    res.json(await orderDetail(id));
  } catch (err) {
    next(err);
  }
});

adminOrdersRouter.post("/:id/cancel", async (req, res, next) => {
  try {
    const id = idParam(req, res);
    if (!id) return;
    const order = await OrderModel.findById(id);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    if (order.status !== "paid" && order.status !== "pending_payment") {
      res.status(409).json({
        error: `A ${order.status.replace("_", " ")} order can't be cancelled.`,
        code: "INVALID_TRANSITION",
      });
      return;
    }

    const refunds = order.status === "paid" && stripeConfigured && !!order.paymentIntentId?.startsWith("pi_");
    if (stripeConfigured && order.paymentIntentId?.startsWith("pi_")) {
      try {
        await releaseStripePayment(order.paymentIntentId);
      } catch (err) {
        console.error("[admin orders] refund/cancel with Stripe failed", err);
        res.status(502).json({ error: "Stripe couldn't refund this payment, so the order wasn't cancelled. Try again." });
        return;
      }
    }

    const { changed, order: after } = await cancelOpenOrder(id, { reason: "cancelled_by_admin", by: "admin" });
    if (after?.status !== "cancelled") {
      res.status(409).json({ error: "This order can no longer be cancelled.", code: "INVALID_TRANSITION" });
      return;
    }
    if (changed) {
      await recordAudit({
        actor: actorOf(req),
        action: "order.cancel",
        entityType: "order",
        entityId: id,
        summary: `Cancelled order #${orderNumber(id)}${refunds ? ` and refunded $${order.total.toFixed(2)}` : ""}`,
      });
    }
    res.json(await orderDetail(id));
  } catch (err) {
    next(err);
  }
});
