import { Router } from "express";
import { z } from "zod";
import { OrderModel, ProductModel, UserModel } from "../../models/index.js";
import { ACTIVE_PRODUCT } from "../../lib/catalog.js";

export const adminStatsRouter = Router();

// An order counts as a sale once it is paid and stays one unless cancelled.
const SOLD = ["paid", "shipped", "delivered"];
const LOW_STOCK = 10;
const DAY = 24 * 60 * 60 * 1000;
const RANGES = { "7d": 7, "30d": 30, "90d": 90 } as const;

const round2 = (n: number) => Math.round(n * 100) / 100;
const dayKey = (date: Date) => date.toISOString().slice(0, 10);

/** Days are UTC, and the window ends at the end of today so "7d" means today plus the six days before. */
function windowFor(days: number, now = new Date()) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const start = new Date(end.getTime() - days * DAY);
  return { start, end };
}

async function totalsFor(start: Date, end: Date) {
  const [sales] = await OrderModel.aggregate<{ orders: number; gross: number; refunded: number; units: number }>([
    { $match: { status: { $in: SOLD }, placedAt: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: null,
        orders: { $sum: 1 },
        gross: { $sum: "$total" },
        // A refund recorded on a shipped or delivered order is money handed back.
        refunded: { $sum: { $ifNull: ["$refund.amount", 0] } },
        units: { $sum: { $sum: "$items.quantity" } },
      },
    },
  ]);
  const newCustomers = await UserModel.countDocuments({
    createdAt: { $gte: start, $lt: end },
    role: { $ne: "admin" },
    isDemo: { $ne: true },
  });
  return {
    revenue: round2((sales?.gross ?? 0) - (sales?.refunded ?? 0)),
    orders: sales?.orders ?? 0,
    units: sales?.units ?? 0,
    newCustomers,
  };
}

adminStatsRouter.get("/", async (req, res, next) => {
  try {
    const { range } = z.object({ range: z.enum(["7d", "30d", "90d"]).default("30d") }).parse(req.query);
    const days = RANGES[range];
    const { start, end } = windowFor(days);
    const previousStart = new Date(start.getTime() - days * DAY);

    const [totals, previous, perDayRows, topProducts, awaitingShipment, lowStockCount, lowStockItems] = await Promise.all([
      totalsFor(start, end),
      totalsFor(previousStart, start),
      OrderModel.aggregate<{ _id: string; orders: number; revenue: number }>([
        { $match: { status: { $in: SOLD }, placedAt: { $gte: start, $lt: end } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$placedAt", timezone: "UTC" } },
            orders: { $sum: 1 },
            revenue: { $sum: "$total" },
          },
        },
      ]),
      OrderModel.aggregate<{ _id: unknown; title: string; thumbnail: string; units: number; revenue: number }>([
        { $match: { status: { $in: SOLD }, placedAt: { $gte: start, $lt: end } } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            title: { $first: "$items.title" },
            thumbnail: { $first: "$items.thumbnail" },
            units: { $sum: "$items.quantity" },
            revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.quantity"] } },
          },
        },
        { $sort: { units: -1, revenue: -1, title: 1 } },
        { $limit: 5 },
      ]),
      OrderModel.countDocuments({ status: "paid" }),
      ProductModel.countDocuments({ ...ACTIVE_PRODUCT, stock: { $lt: LOW_STOCK } }),
      ProductModel.find({ ...ACTIVE_PRODUCT, stock: { $lt: LOW_STOCK } })
        .sort({ stock: 1, title: 1 })
        .limit(6)
        .select("title thumbnail stock")
        .lean(),
    ]);

    // Every day in the window gets a bar, even the ones with no orders.
    const byDay = new Map(perDayRows.map((row) => [row._id, row]));
    const ordersPerDay = Array.from({ length: days }, (_, i) => {
      const date = dayKey(new Date(start.getTime() + i * DAY));
      const row = byDay.get(date);
      return { date, orders: row?.orders ?? 0, revenue: round2(row?.revenue ?? 0) };
    });

    res.json({
      range,
      from: start.toISOString(),
      to: end.toISOString(),
      totals,
      previous,
      awaitingShipment,
      ordersPerDay,
      topProducts: topProducts.map((p) => ({
        productId: String(p._id),
        title: p.title,
        thumbnail: p.thumbnail ?? "",
        units: p.units,
        revenue: round2(p.revenue),
      })),
      lowStock: {
        threshold: LOW_STOCK,
        count: lowStockCount,
        items: lowStockItems.map((p) => ({ productId: p._id.toString(), title: p.title, thumbnail: p.thumbnail ?? "", stock: p.stock })),
      },
    });
  } catch (err) {
    next(err);
  }
});
