// Admin order management: listing and search, the fulfilment state machine,
// admin cancellation, cancel races, and refunds made in Stripe.
// Runs against the guarded "*-test" database (see test/guard.ts).
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { createApp } from "../src/app.js";
import supertest from "supertest";
import { OrderModel, ProductModel } from "../src/models/index.js";
import { handleChargeRefunded } from "../src/lib/refundSync.js";
import { address, card, makeUser, signIn as signInAs, wipeDatabase, type Session } from "./helpers.js";

const app = createApp();
const signIn = (email: string) => signInAs(app, email);

let admin: Session;
let alice: Session;
let bob: Session;
let productId: string;
const START_STOCK = 20;

const stockNow = async () => (await ProductModel.findById(productId))!.stock;
const auditFor = async (entityId: string) =>
  ((await admin.agent.get(`/api/admin/activity?entityType=order&entityId=${entityId}`).expect(200)).body.items as { action: string; actorEmail: string; summary: string }[]);

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  await wipeDatabase();
  await makeUser("admin@example.test", { role: "admin" });
  await makeUser("alice@example.test", { name: "Alice Anderson" });
  await makeUser("bob@example.test", { name: "Bob Brown" });
  admin = await signIn("admin@example.test");
  alice = await signIn("alice@example.test");
  bob = await signIn("bob@example.test");
  const product = await ProductModel.create({
    sourceId: 5001, title: "Order Test Kettle", description: "For order tests.", category: "kitchen", price: 25, stock: START_STOCK,
    images: ["https://example.test/k.jpg"], thumbnail: "https://example.test/k.jpg",
  });
  productId = product.id;
});

afterAll(async () => {
  await wipeDatabase();
  await mongoose.disconnect();
});

/** A real purchase through the API (mock card payment), so stock and cart behave as they do for shoppers. */
async function buy(session: Session, quantity = 1) {
  await session.agent.put("/api/cart").send({ items: [{ productId, quantity, savedForLater: false }] }).expect(200);
  let addressId = (await session.agent.get("/api/addresses").expect(200)).body.items[0]?._id;
  if (!addressId) addressId = (await session.agent.post("/api/addresses").send(address).expect(201)).body.items[0]._id;
  const res = await session.agent.post("/api/orders").send({ addressId, deliverySpeed: "standard", card }).expect(201);
  return res.body.order as { _id: string; status: string; total: number };
}

/** An order inserted directly, for states and payment ids the mock checkout can't produce. */
async function seedOrder(userId: string, status: "paid" | "pending_payment" | "shipped", paymentIntentId?: string) {
  if (status !== "pending_payment") await ProductModel.updateOne({ _id: productId }, { $inc: { stock: -1 } });
  return OrderModel.create({
    user: userId,
    items: [{ product: productId, title: "Order Test Kettle", thumbnail: "x", unitPrice: 25, quantity: 1 }],
    address,
    subtotal: 25, shipping: 0, tax: 2, total: 27,
    status,
    paymentIntentId,
    payment: { brand: "Visa", last4: "4242" },
  });
}

describe("admin orders: access", () => {
  it("is closed to customers and signed-out visitors", async () => {
    await alice.agent.get("/api/admin/orders").expect(403);
    await alice.agent.post("/api/admin/orders/000000000000000000000000/cancel").expect(403);
    await supertest(app).get("/api/admin/orders").expect(401);
  });
});

describe("admin orders: listing, search and detail", () => {
  let aliceOrder: { _id: string; total: number };
  let bobOrder: { _id: string };

  beforeAll(async () => {
    aliceOrder = await buy(alice, 2);
    bobOrder = await buy(bob, 1);
    await seedOrder(bob.user.id, "pending_payment");
  });

  it("lists every customer's orders with who bought what, newest first, plus status counts", async () => {
    const res = await admin.agent.get("/api/admin/orders").expect(200);
    expect(res.body.total).toBe(3);
    expect(res.body.counts).toMatchObject({ paid: 2, pending_payment: 1, shipped: 0, delivered: 0, cancelled: 0 });
    const first = res.body.items.find((o: { _id: string }) => o._id === aliceOrder._id);
    expect(first).toMatchObject({
      orderNumber: aliceOrder._id.slice(-8).toUpperCase(),
      status: "paid",
      itemCount: 2, // units, not lines
      total: aliceOrder.total,
      firstItemTitle: "Order Test Kettle",
      refunded: false,
      customer: { name: "Alice Anderson", email: "alice@example.test" },
    });
    expect(res.body.items[0].placedAt >= res.body.items.at(-1).placedAt).toBe(true);
  });

  it("filters by status", async () => {
    const paid = (await admin.agent.get("/api/admin/orders?status=paid").expect(200)).body;
    expect(paid.items.map((o: { status: string }) => o.status)).toEqual(["paid", "paid"]);
    expect((await admin.agent.get("/api/admin/orders?status=pending_payment").expect(200)).body.total).toBe(1);
    expect((await admin.agent.get("/api/admin/orders?status=delivered").expect(200)).body.items).toEqual([]);
    await admin.agent.get("/api/admin/orders?status=bogus").expect(400);
  });

  it("finds an order by its number, however much of it is typed and in any case", async () => {
    const number = aliceOrder._id.slice(-8);
    for (const q of [number, number.toUpperCase(), number.slice(-5)]) {
      const res = await admin.agent.get(`/api/admin/orders?q=${q}`).expect(200);
      expect(res.body.items.map((o: { _id: string }) => o._id), `q=${q}`).toContain(aliceOrder._id);
    }
  });

  it("finds orders by customer email or name", async () => {
    const byEmail = (await admin.agent.get("/api/admin/orders?q=alice@").expect(200)).body.items;
    expect(byEmail.map((o: { _id: string }) => o._id)).toEqual([aliceOrder._id]);
    const byName = (await admin.agent.get("/api/admin/orders?q=brown").expect(200)).body.items;
    expect(byName).toHaveLength(2); // Bob's paid order and his unpaid one
  });

  it("returns nothing for text that matches no order or customer, and treats regex characters literally", async () => {
    expect((await admin.agent.get("/api/admin/orders?q=zzzzzz").expect(200)).body.items).toEqual([]);
    expect((await admin.agent.get("/api/admin/orders?q=.*").expect(200)).body.items).toEqual([]);
  });

  it("paginates", async () => {
    const res = await admin.agent.get("/api/admin/orders?limit=2&page=2").expect(200);
    expect(res.body).toMatchObject({ total: 3, page: 2, limit: 2 });
    expect(res.body.items).toHaveLength(1);
  });

  it("shows the full order with the customer's history", async () => {
    const res = await admin.agent.get(`/api/admin/orders/${bobOrder._id}`).expect(200);
    expect(res.body.order).toMatchObject({ status: "paid", orderNumber: bobOrder._id.slice(-8).toUpperCase(), payment: { brand: "Visa" } });
    expect(res.body.order.items[0]).toMatchObject({ title: "Order Test Kettle", quantity: 1 });
    expect(res.body.order.address.city).toBe("Karachi");
    expect(res.body.customer).toMatchObject({ name: "Bob Brown", email: "bob@example.test", orderCount: 1 }); // unpaid orders aren't counted
    expect(res.body.customer.joinedAt).toBeTruthy();
    await admin.agent.get("/api/admin/orders/not-an-id").expect(404);
    await admin.agent.get("/api/admin/orders/000000000000000000000000").expect(404);
  });
});

describe("admin orders: fulfilment", () => {
  let order: { _id: string };

  beforeAll(async () => {
    order = await buy(alice, 1);
  });

  it("only allows the next step, and never lets an admin mark an order paid", async () => {
    const early = await admin.agent.post(`/api/admin/orders/${order._id}/status`).send({ status: "delivered" }).expect(409);
    expect(early.body.code).toBe("INVALID_TRANSITION");
    await admin.agent.post(`/api/admin/orders/${order._id}/status`).send({ status: "paid" }).expect(400);
    await admin.agent.post(`/api/admin/orders/${order._id}/status`).send({ status: "cancelled" }).expect(400);
    await admin.agent.post(`/api/admin/orders/${order._id}/status`).send({}).expect(400);
    expect((await OrderModel.findById(order._id))!.status).toBe("paid");
  });

  it("marks an order shipped, recording who and when, and tells the customer", async () => {
    const res = await admin.agent.post(`/api/admin/orders/${order._id}/status`).send({ status: "shipped" }).expect(200);
    expect(res.body.order.status).toBe("shipped");
    expect(res.body.order.statusHistory).toEqual([expect.objectContaining({ status: "shipped", by: "admin" })]);
    const mine = (await alice.agent.get(`/api/orders/${order._id}`).expect(200)).body.order;
    expect(mine.status).toBe("shipped");
    expect(mine.statusHistory[0].status).toBe("shipped");
    expect((await auditFor(order._id)).map((a) => a.action)).toContain("order.ship");
  });

  it("refuses to ship twice", async () => {
    const res = await admin.agent.post(`/api/admin/orders/${order._id}/status`).send({ status: "shipped" }).expect(409);
    expect(res.body.error).toMatch(/only paid orders/i);
  });

  it("stops a shipped order from being cancelled by anyone", async () => {
    await alice.agent.post(`/api/orders/${order._id}/cancel`).expect(400);
    const res = await admin.agent.post(`/api/admin/orders/${order._id}/cancel`).expect(409);
    expect(res.body.code).toBe("INVALID_TRANSITION");
  });

  it("marks it delivered", async () => {
    const res = await admin.agent.post(`/api/admin/orders/${order._id}/status`).send({ status: "delivered" }).expect(200);
    expect(res.body.order.status).toBe("delivered");
    expect(res.body.order.statusHistory.map((h: { status: string }) => h.status)).toEqual(["shipped", "delivered"]);
    await admin.agent.post(`/api/admin/orders/${order._id}/status`).send({ status: "shipped" }).expect(409);
  });
});

describe("admin orders: cancellation", () => {
  it("cancels a paid order, restocks it once, and records it", async () => {
    const before = await stockNow();
    const order = await buy(bob, 3);
    expect(await stockNow()).toBe(before - 3);

    const res = await admin.agent.post(`/api/admin/orders/${order._id}/cancel`).expect(200);
    expect(res.body.order).toMatchObject({ status: "cancelled", cancellationReason: "cancelled_by_admin" });
    expect(res.body.order.statusHistory).toEqual([expect.objectContaining({ status: "cancelled", by: "admin" })]);
    expect(await stockNow()).toBe(before);

    await admin.agent.post(`/api/admin/orders/${order._id}/cancel`).expect(409);
    expect(await stockNow()).toBe(before); // still just the one restock
    const audit = await auditFor(order._id);
    expect(audit.filter((a) => a.action === "order.cancel")).toHaveLength(1);
  });

  it("cancels an unpaid order without touching stock", async () => {
    const before = await stockNow();
    const unpaid = (await OrderModel.findOne({ status: "pending_payment" }))!;
    await admin.agent.post(`/api/admin/orders/${unpaid._id}/cancel`).expect(200);
    expect(await stockNow()).toBe(before);
    expect((await OrderModel.findById(unpaid._id))!.cancellationReason).toBe("cancelled_by_admin");
  });

  it("records a customer cancellation in the history too", async () => {
    const order = await buy(alice, 1);
    const res = await alice.agent.post(`/api/orders/${order._id}/cancel`).expect(200);
    expect(res.body.order.statusHistory).toEqual([expect.objectContaining({ status: "cancelled", by: "customer" })]);
    expect(res.body.order.cancellationReason).toBe("cancelled_by_customer");
  });

  it("restocks exactly once when the customer and an admin cancel at the same moment", async () => {
    const before = await stockNow();
    const order = await buy(alice, 2);
    expect(await stockNow()).toBe(before - 2);

    const [byCustomer, byAdmin] = await Promise.all([
      alice.agent.post(`/api/orders/${order._id}/cancel`),
      admin.agent.post(`/api/admin/orders/${order._id}/cancel`),
    ]);
    expect([byCustomer.status, byAdmin.status].every((s) => s === 200 || s === 409)).toBe(true);
    expect([byCustomer.status, byAdmin.status]).toContain(200);
    expect((await OrderModel.findById(order._id))!.status).toBe("cancelled");
    expect(await stockNow()).toBe(before); // not before + 2
  });
});

describe("refunds made in Stripe", () => {
  const dashboardRefund = async () => false; // no app metadata: someone refunded it by hand
  const appRefund = async () => true;
  const bobId = () => bob.user.id;

  const charge = (pi: string, over: Record<string, unknown> = {}) => ({ id: `ch_${pi}`, payment_intent: pi, refunded: true, amount_refunded: 2700, ...over });

  it("cancels and restocks a paid order that was refunded in the Dashboard, and says so", async () => {
    const before = await stockNow();
    const order = await seedOrder(bobId(), "paid", "pi_dash_1");
    expect(await stockNow()).toBe(before - 1);

    expect(await handleChargeRefunded(charge("pi_dash_1"), dashboardRefund)).toBe("cancelled");
    const after = (await OrderModel.findById(order._id))!;
    expect(after).toMatchObject({ status: "cancelled", cancellationReason: "refunded_in_stripe" });
    expect(after.refund).toMatchObject({ amount: 27 });
    expect(after.statusHistory[0]).toMatchObject({ status: "cancelled", by: "stripe" });
    expect(await stockNow()).toBe(before);
    const audit = await auditFor(order.id);
    expect(audit[0]).toMatchObject({ action: "order.refunded_in_stripe", actorEmail: "stripe" });
  });

  it("is safe when Stripe delivers the same event again, or twice at once", async () => {
    const before = await stockNow();
    const order = await seedOrder(bobId(), "paid", "pi_dash_2");
    const results = await Promise.all([
      handleChargeRefunded(charge("pi_dash_2"), dashboardRefund),
      handleChargeRefunded(charge("pi_dash_2"), dashboardRefund),
    ]);
    expect(results.filter((r) => r === "cancelled")).toHaveLength(1);
    expect(await handleChargeRefunded(charge("pi_dash_2"), dashboardRefund)).toBe("recorded");
    expect(await stockNow()).toBe(before);
    expect((await auditFor(order.id)).filter((a) => a.action === "order.refunded_in_stripe")).toHaveLength(1);
  });

  it("leaves refunds the app made itself to the app's own cancel flow", async () => {
    const order = await seedOrder(bobId(), "paid", "pi_app_1");
    expect(await handleChargeRefunded(charge("pi_app_1"), appRefund)).toBe("recorded");
    const after = (await OrderModel.findById(order._id))!;
    expect(after.status).toBe("paid"); // the app cancels it and restocks itself
    expect(after.refund?.amount).toBe(27);
    await OrderModel.updateOne({ _id: order._id }, { status: "cancelled" });
    await ProductModel.updateOne({ _id: productId }, { $inc: { stock: 1 } });
  });

  it("records a refund on a shipped order without changing it, and flags it once", async () => {
    const before = await stockNow();
    const order = await seedOrder(bobId(), "shipped", "pi_ship_1");
    expect(await handleChargeRefunded(charge("pi_ship_1"), dashboardRefund)).toBe("recorded");
    expect(await handleChargeRefunded(charge("pi_ship_1"), dashboardRefund)).toBe("recorded");
    const after = (await OrderModel.findById(order._id))!;
    expect(after.status).toBe("shipped");
    expect(after.refund?.amount).toBe(27);
    expect(await stockNow()).toBe(before - 1); // the goods left, so no restock
    expect((await auditFor(order.id)).filter((a) => a.action === "order.refund_recorded")).toHaveLength(1);
    await ProductModel.updateOne({ _id: productId }, { $inc: { stock: 1 } });
  });

  it("ignores partial refunds, unknown payments and charges with no payment intent", async () => {
    const order = await seedOrder(bobId(), "paid", "pi_partial_1");
    expect(await handleChargeRefunded(charge("pi_partial_1", { refunded: false, amount_refunded: 500 }), dashboardRefund)).toBe("ignored");
    expect((await OrderModel.findById(order._id))!.status).toBe("paid");
    expect(await handleChargeRefunded(charge("pi_nobody_knows"), dashboardRefund)).toBe("ignored");
    expect(await handleChargeRefunded({ id: "ch_x", payment_intent: null, refunded: true, amount_refunded: 1 }, dashboardRefund)).toBe("ignored");
    await OrderModel.updateOne({ _id: order._id }, { status: "cancelled" });
    await ProductModel.updateOne({ _id: productId }, { $inc: { stock: 1 } });
  });
});
