import { Router } from "express";
import { z } from "zod";
import { OrderModel, UserModel } from "../../models/index.js";
import { parsePagination } from "../../lib/pagination.js";
import { escapeRegex } from "../../lib/catalog.js";
import { isAdminUser, orderNumber } from "../../lib/admin.js";

// Read-only. Deliberately returns no password hashes, sessions, recovery codes,
// addresses or cart contents: an admin needs to see who bought what, not to
// impersonate anyone.
export const adminCustomersRouter = Router();

const ID_PATTERN = /^[a-f0-9]{24}$/i;
const SOLD = ["paid", "shipped", "delivered"];
const round2 = (n: number) => Math.round(n * 100) / 100;

const SORTS = ["joined", "spent", "orders"] as const;
const listQuerySchema = z.object({
  q: z.string().trim().optional(),
  sort: z.enum(SORTS).default("joined"),
});

type Totals = { orders: number; spent: number; lastOrderAt: Date | null };

/** Per-customer order counts (placed orders, cancelled included) and net spend on sales. */
async function totalsByUser(): Promise<Map<string, Totals>> {
  const rows = await OrderModel.aggregate<{ _id: unknown; orders: number; spent: number; lastOrderAt: Date }>([
    { $match: { status: { $ne: "pending_payment" } } },
    {
      $group: {
        _id: "$user",
        orders: { $sum: 1 },
        spent: {
          $sum: {
            $cond: [{ $in: ["$status", SOLD] }, { $subtract: ["$total", { $ifNull: ["$refund.amount", 0] }] }, 0],
          },
        },
        lastOrderAt: { $max: "$placedAt" },
      },
    },
  ]);
  return new Map(rows.map((r) => [String(r._id), { orders: r.orders, spent: round2(r.spent), lastOrderAt: r.lastOrderAt }]));
}

const EMPTY: Totals = { orders: 0, spent: 0, lastOrderAt: null };

adminCustomersRouter.get("/", async (req, res, next) => {
  try {
    const { q, sort } = listQuerySchema.parse(req.query);
    const { page, limit, skip } = parsePagination({ page: req.query.page, limit: req.query.limit ?? 20 });

    const filter: Record<string, unknown> = {};
    if (q) {
      const re = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ email: re }, { name: re }];
    }

    // Sorting by spend or order count needs every customer's totals, which is
    // cheap at this scale (one grouped query, then a sort in memory).
    const [users, totals] = await Promise.all([
      UserModel.find(filter).select("name email createdAt role isDemo emailVerifiedAt").lean(),
      totalsByUser(),
    ]);
    const rows = users.map((user) => {
      const t = totals.get(user._id.toString()) ?? EMPTY;
      return {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        joinedAt: user.createdAt,
        orders: t.orders,
        spent: t.spent,
        lastOrderAt: t.lastOrderAt,
        isAdmin: isAdminUser(user),
        isDemo: !!user.isDemo,
      };
    });
    rows.sort((a, b) => {
      if (sort === "spent") return b.spent - a.spent || b.orders - a.orders;
      if (sort === "orders") return b.orders - a.orders || b.spent - a.spent;
      return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
    });

    res.json({ items: rows.slice(skip, skip + limit), total: rows.length, page, limit });
  } catch (err) {
    next(err);
  }
});

adminCustomersRouter.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (typeof id !== "string" || !ID_PATTERN.test(id)) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    const user = await UserModel.findById(id).select("name email createdAt role isDemo emailVerifiedAt twoFactorEnabled").lean();
    if (!user) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    const [totals, recent] = await Promise.all([
      totalsByUser().then((map) => map.get(id) ?? EMPTY),
      OrderModel.find({ user: id, status: { $ne: "pending_payment" } }).sort({ placedAt: -1 }).limit(10).lean(),
    ]);

    res.json({
      customer: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        joinedAt: user.createdAt,
        emailVerified: !!(user.emailVerifiedAt || user.isDemo),
        twoFactorEnabled: !!user.twoFactorEnabled,
        isAdmin: isAdminUser(user),
        isDemo: !!user.isDemo,
        orders: totals.orders,
        spent: totals.spent,
        lastOrderAt: totals.lastOrderAt,
      },
      recentOrders: recent.map((order) => ({
        _id: order._id.toString(),
        orderNumber: orderNumber(order._id.toString()),
        status: order.status,
        total: order.total,
        placedAt: order.placedAt,
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        refunded: !!order.refund?.at,
      })),
    });
  } catch (err) {
    next(err);
  }
});
