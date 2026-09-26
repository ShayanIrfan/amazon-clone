// Dashboard statistics: revenue net of refunds, order counts, per-day series,
// top products, low stock and change against the previous period.
// Runs against the guarded "*-test" database (see test/guard.ts).
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { createApp } from "../src/app.js";
import { OrderModel, ProductModel, UserModel } from "../src/models/index.js";
import type { ORDER_STATUSES } from "../src/models/index.js";
import { address, makeUser, signIn as signInAs, wipeDatabase, type Session } from "./helpers.js";

const app = createApp();
const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const daysAgo = (n: number) => new Date(now - n * DAY);
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

let admin: Session;
let customer: Session;
let p1: string; // low stock
let p2: string;

async function order(status: (typeof ORDER_STATUSES)[number], ago: number, items: [string, number, number][], total: number, extra: Record<string, unknown> = {}) {
  return OrderModel.create({
    user: customer.user.id,
    items: items.map(([product, quantity, unitPrice]) => ({ product, title: product === p1 ? "Kettle" : "Toaster", thumbnail: "t", unitPrice, quantity })),
    address,
    subtotal: total, shipping: 0, tax: 0, total,
    status,
    placedAt: daysAgo(ago),
    ...extra,
  });
}

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  await wipeDatabase();
  await makeUser("admin@example.test", { role: "admin" });
  const shopper = await makeUser("shopper@example.test");
  await makeUser("old@example.test");
  await makeUser("demo@example.test", { isDemo: true });
  // createdAt is immutable to Mongoose, so back-date it through the raw collection.
  await UserModel.collection.updateOne({ email: "old@example.test" }, { $set: { createdAt: daysAgo(45) } });
  admin = await signInAs(app, "admin@example.test");
  customer = await signInAs(app, "shopper@example.test");
  expect(customer.user.id).toBe(shopper.id);

  const mk = (sourceId: number, title: string, stock: number, extra: Record<string, unknown> = {}) =>
    ProductModel.create({ sourceId, title, description: "d", category: "kitchen", price: 10, stock, images: ["x"], thumbnail: "x", ...extra });
  p1 = (await mk(1, "Kettle", 3)).id;
  p2 = (await mk(2, "Toaster", 50)).id;
  await mk(3, "Archived Lamp", 1, { archivedAt: new Date() }); // low stock but archived: must not count

  await order("paid", 1, [[p1, 2, 25]], 54);
  await order("shipped", 3, [[p2, 1, 10], [p1, 1, 25]], 37.8);
  await order("delivered", 3, [[p2, 3, 10]], 32.4, { refund: { amount: 10.8, at: new Date() } });
  await order("cancelled", 2, [[p1, 4, 25]], 108);
  await order("pending_payment", 0, [[p2, 9, 10]], 97.2);
  await order("paid", 20, [[p2, 1, 10]], 10.8);
  await order("paid", 40, [[p2, 2, 10]], 21.6);
});

afterAll(async () => {
  await wipeDatabase();
  await mongoose.disconnect();
});

const stats = async (query = "") => (await admin.agent.get(`/api/admin/stats${query}`).expect(200)).body;

describe("admin dashboard stats", () => {
  it("is closed to customers and validates the range", async () => {
    await customer.agent.get("/api/admin/stats").expect(403);
    await admin.agent.get("/api/admin/stats?range=1y").expect(400);
  });

  it("defaults to 30 days", async () => {
    const body = await stats();
    expect(body.range).toBe("30d");
    expect(body.ordersPerDay).toHaveLength(30);
  });

  it("counts only sales, and nets refunds off revenue (7 days)", async () => {
    const { totals } = await stats("?range=7d");
    expect(totals.orders).toBe(3); // paid, shipped, delivered; not the cancelled or unpaid ones
    expect(totals.revenue).toBeCloseTo(54 + 37.8 + 32.4 - 10.8);
    expect(totals.units).toBe(2 + 2 + 3);
  });

  it("widens with the range and compares with the period before it", async () => {
    const thirty = await stats("?range=30d");
    expect(thirty.totals.orders).toBe(4);
    expect(thirty.totals.revenue).toBeCloseTo(113.4 + 10.8);
    expect(thirty.previous.orders).toBe(1); // the order from 40 days ago
    expect(thirty.previous.revenue).toBeCloseTo(21.6);

    const ninety = await stats("?range=90d");
    expect(ninety.totals.orders).toBe(5);
    expect(ninety.ordersPerDay).toHaveLength(90);

    const week = await stats("?range=7d");
    expect(week.previous).toMatchObject({ orders: 0, revenue: 0, units: 0 });
  });

  it("returns one entry per day, zero-filled, ending today", async () => {
    const { ordersPerDay } = await stats("?range=7d");
    expect(ordersPerDay).toHaveLength(7);
    expect(ordersPerDay.at(-1).date).toBe(dayKey(new Date(now)));
    const byDate = Object.fromEntries(ordersPerDay.map((d: { date: string }) => [d.date, d]));
    expect(byDate[dayKey(daysAgo(3))]).toMatchObject({ orders: 2 });
    expect(byDate[dayKey(daysAgo(3))].revenue).toBeCloseTo(37.8 + 32.4);
    expect(byDate[dayKey(daysAgo(1))]).toMatchObject({ orders: 1, revenue: 54 });
    expect(byDate[dayKey(daysAgo(5))]).toMatchObject({ orders: 0, revenue: 0 });
    expect(ordersPerDay.reduce((sum: number, d: { orders: number }) => sum + d.orders, 0)).toBe(3);
  });

  it("ranks top products by units sold", async () => {
    const { topProducts } = await stats("?range=7d");
    expect(topProducts.map((p: { title: string }) => p.title)).toEqual(["Toaster", "Kettle"]);
    expect(topProducts[0]).toMatchObject({ productId: p2, units: 4 });
    expect(topProducts[0].revenue).toBeCloseTo(40);
    expect(topProducts[1]).toMatchObject({ productId: p1, units: 3 });
  });

  it("counts new customers, leaving out admins and the demo account", async () => {
    expect((await stats("?range=7d")).totals.newCustomers).toBe(1); // the shopper, created just now
    const ninety = await stats("?range=90d");
    expect(ninety.totals.newCustomers).toBe(2); // plus the account from 45 days ago
    expect((await stats("?range=30d")).previous.newCustomers).toBe(1);
  });

  it("reports what needs attention", async () => {
    const body = await stats();
    expect(body.awaitingShipment).toBe(3); // three paid orders, whatever their age
    expect(body.lowStock.count).toBe(1); // the archived lamp doesn't count
    expect(body.lowStock.items).toEqual([expect.objectContaining({ productId: p1, title: "Kettle", stock: 3 })]);
    expect(body.lowStock.threshold).toBe(10);
  });

  it("reflects a change straight away", async () => {
    await ProductModel.updateOne({ _id: p2 }, { $set: { stock: 2 } });
    const body = await stats();
    expect(body.lowStock.count).toBe(2);
    expect(body.lowStock.items.map((i: { stock: number }) => i.stock)).toEqual([2, 3]); // lowest first
  });
});
