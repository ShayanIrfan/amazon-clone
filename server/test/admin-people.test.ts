// Admin review moderation and the read-only customer directory.
// Runs against the guarded "*-test" database (see test/guard.ts).
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { createApp } from "../src/app.js";
import { OrderModel, ProductModel, ReviewModel, UserModel } from "../src/models/index.js";
import { address, makeUser, signIn as signInAs, wipeDatabase, type Session } from "./helpers.js";

const app = createApp();
const DAY = 24 * 60 * 60 * 1000;

let admin: Session;
let shopper: Session;
let kettle: string;
let toaster: string;

async function review(product: string, rating: number, reviewerName: string, comment: string, extra: Record<string, unknown> = {}) {
  return ReviewModel.create({ product, rating, reviewerName, comment, date: new Date(), verifiedPurchase: true, ...extra });
}
async function sold(userId: string, total: number, status: "paid" | "delivered" | "cancelled" | "pending_payment", extra: Record<string, unknown> = {}) {
  return OrderModel.create({
    user: userId, items: [{ product: kettle, title: "Kettle", thumbnail: "t", unitPrice: total, quantity: 1 }], address,
    subtotal: total, shipping: 0, tax: 0, total, status, ...extra,
  });
}

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  await wipeDatabase();
  await makeUser("admin@example.test", { role: "admin", name: "Store Admin" });
  const ada = await makeUser("ada@example.test", { name: "Ada Lovelace" });
  const grace = await makeUser("grace@example.test", { name: "Grace Hopper" });
  await makeUser("linus@example.test", { name: "Linus Torvalds" }); // never orders
  await makeUser("demo@example.test", { name: "Demo Shopper", isDemo: true });
  await UserModel.collection.updateOne({ email: "grace@example.test" }, { $set: { createdAt: new Date(Date.now() - 30 * DAY) } });
  admin = await signInAs(app, "admin@example.test");
  shopper = await signInAs(app, "ada@example.test");

  const mk = (sourceId: number, title: string) =>
    ProductModel.create({ sourceId, title, description: "d", category: "kitchen", price: 10, stock: 5, images: ["x"], thumbnail: "thumb", rating: 0, ratingCount: 0 });
  kettle = (await mk(1, "Kettle")).id;
  toaster = (await mk(2, "Toaster")).id;

  await review(kettle, 5, "Ada Lovelace", "Boils water beautifully", { user: ada._id });
  await review(kettle, 3, "Seeded Sam", "It is fine", { verifiedPurchase: false });
  await review(kettle, 1, "Angry Al", "Leaked on day one. TERRIBLE!!!");
  await review(toaster, 4, "Grace Hopper", "Nice toast", { user: grace._id });
  // Keep the cached ratings honest from the start, as the app itself does.
  const { recalcProductRating } = await import("../src/lib/reviews.js");
  await recalcProductRating(new mongoose.Types.ObjectId(kettle));
  await recalcProductRating(new mongoose.Types.ObjectId(toaster));

  await sold(ada.id, 50, "paid");
  await sold(ada.id, 30, "delivered", { refund: { amount: 10, at: new Date() } }); // nets to 20
  await sold(ada.id, 99, "cancelled");
  await sold(ada.id, 77, "pending_payment"); // never counts
  await sold(grace.id, 15, "paid");
});

afterAll(async () => {
  await wipeDatabase();
  await mongoose.disconnect();
});

const reviews = async (query = "") => (await admin.agent.get(`/api/admin/reviews${query}`).expect(200)).body;
const customers = async (query = "") => (await admin.agent.get(`/api/admin/customers${query}`).expect(200)).body;

describe("admin reviews", () => {
  it("is closed to customers", async () => {
    await shopper.agent.get("/api/admin/reviews").expect(403);
    await shopper.agent.delete("/api/admin/reviews/000000000000000000000000").expect(403);
  });

  it("lists reviews newest first with their product and who wrote them", async () => {
    const body = await reviews();
    expect(body.total).toBe(4);
    const ada = body.items.find((r: { reviewerName: string }) => r.reviewerName === "Ada Lovelace");
    expect(ada).toMatchObject({ rating: 5, verifiedPurchase: true, hasAccount: true, product: { title: "Kettle", thumbnail: "thumb" } });
    const sam = body.items.find((r: { reviewerName: string }) => r.reviewerName === "Seeded Sam");
    expect(sam).toMatchObject({ hasAccount: false, verifiedPurchase: false });
  });

  it("filters by rating, product and text", async () => {
    expect((await reviews("?rating=1")).items.map((r: { reviewerName: string }) => r.reviewerName)).toEqual(["Angry Al"]);
    expect((await reviews(`?productId=${toaster}`)).total).toBe(1);
    expect((await reviews("?q=toast")).items[0].reviewerName).toBe("Grace Hopper");
    expect((await reviews("?q=lovelace")).total).toBe(1); // reviewer name
    expect((await reviews("?q=.*")).total).toBe(0); // regex characters are literal
    await admin.agent.get("/api/admin/reviews?rating=9").expect(400);
    await admin.agent.get("/api/admin/reviews?productId=nope").expect(400);
  });

  it("paginates", async () => {
    const page2 = await reviews("?limit=3&page=2");
    expect(page2).toMatchObject({ total: 4, page: 2, limit: 3 });
    expect(page2.items).toHaveLength(1);
  });

  it("deletes a review, recalculates the product's rating, and records it", async () => {
    expect((await ProductModel.findById(kettle))!).toMatchObject({ rating: 3, ratingCount: 3 }); // (5+3+1)/3
    const angry = (await reviews("?rating=1")).items[0];

    await admin.agent.delete(`/api/admin/reviews/${angry._id}`).expect(204);

    expect(await ReviewModel.exists({ _id: angry._id })).toBeNull();
    expect((await ProductModel.findById(kettle))!).toMatchObject({ rating: 4, ratingCount: 2 }); // (5+3)/2
    const storefront = (await shopper.agent.get(`/api/products/${kettle}`).expect(200)).body;
    expect(storefront).toMatchObject({ rating: 4, ratingCount: 2 });

    const [entry] = (await admin.agent.get(`/api/admin/activity?entityType=review&entityId=${angry._id}`).expect(200)).body.items;
    expect(entry).toMatchObject({ action: "review.delete", actorEmail: "admin@example.test" });
    expect(entry.summary).toContain('1-star review by Angry Al on "Kettle"');
    expect(entry.changes.comment).toContain("Leaked");
  });

  it("drops a product back to no rating when its last review goes", async () => {
    const only = (await reviews(`?productId=${toaster}`)).items[0];
    await admin.agent.delete(`/api/admin/reviews/${only._id}`).expect(204);
    expect((await ProductModel.findById(toaster))!).toMatchObject({ rating: 0, ratingCount: 0 });
  });

  it("returns 404 for a review that isn't there, twice over", async () => {
    await admin.agent.delete("/api/admin/reviews/000000000000000000000000").expect(404);
    await admin.agent.delete("/api/admin/reviews/not-an-id").expect(404);
  });
});

describe("admin customers", () => {
  it("is closed to customers", async () => {
    await shopper.agent.get("/api/admin/customers").expect(403);
    await shopper.agent.get(`/api/admin/customers/${shopper.user.id}`).expect(403);
  });

  it("lists everyone with order counts and what they've spent net of refunds", async () => {
    const body = await customers();
    expect(body.total).toBe(5);
    const ada = body.items.find((c: { email: string }) => c.email === "ada@example.test");
    // Orders placed: paid, delivered, cancelled (the unpaid one isn't an order yet). Spend: 50 + (30 - 10).
    expect(ada).toMatchObject({ name: "Ada Lovelace", orders: 3, spent: 70, isAdmin: false, isDemo: false });
    expect(ada.lastOrderAt).toBeTruthy();
    expect(body.items.find((c: { email: string }) => c.email === "linus@example.test")).toMatchObject({ orders: 0, spent: 0, lastOrderAt: null });
    expect(body.items.find((c: { email: string }) => c.email === "admin@example.test").isAdmin).toBe(true);
    expect(body.items.find((c: { email: string }) => c.email === "demo@example.test").isDemo).toBe(true);
  });

  it("sorts by newest, biggest spender or most orders", async () => {
    const emails = (b: { items: { email: string }[] }) => b.items.map((c) => c.email);
    expect(emails(await customers("?sort=spent")).slice(0, 2)).toEqual(["ada@example.test", "grace@example.test"]);
    expect(emails(await customers("?sort=orders"))[0]).toBe("ada@example.test");
    const newest = emails(await customers());
    expect(newest.at(-1)).toBe("grace@example.test"); // joined 30 days ago
    await admin.agent.get("/api/admin/customers?sort=height").expect(400);
  });

  it("searches by name or email, literally", async () => {
    expect((await customers("?q=grace")).items.map((c: { email: string }) => c.email)).toEqual(["grace@example.test"]);
    expect((await customers("?q=LINUS@")).total).toBe(1);
    expect((await customers("?q=.*")).total).toBe(0);
  });

  it("paginates", async () => {
    const body = await customers("?limit=2&page=3");
    expect(body).toMatchObject({ total: 5, page: 3, limit: 2 });
    expect(body.items).toHaveLength(1);
  });

  it("shows a customer's profile and recent orders, without unpaid ones", async () => {
    const ada = (await customers("?q=ada@")).items[0];
    const body = (await admin.agent.get(`/api/admin/customers/${ada._id}`).expect(200)).body;
    expect(body.customer).toMatchObject({ name: "Ada Lovelace", email: "ada@example.test", emailVerified: true, twoFactorEnabled: false, orders: 3, spent: 70 });
    expect(body.recentOrders).toHaveLength(3);
    const delivered = body.recentOrders.find((o: { status: string }) => o.status === "delivered");
    expect(delivered).toMatchObject({ total: 30, refunded: true, itemCount: 1 });
    expect(delivered.orderNumber).toHaveLength(8);
    expect(body.recentOrders.some((o: { status: string }) => o.status === "pending_payment")).toBe(false);
    await admin.agent.get("/api/admin/customers/000000000000000000000000").expect(404);
    await admin.agent.get("/api/admin/customers/not-an-id").expect(404);
  });

  it("never exposes credentials, sessions, recovery codes, addresses or carts", async () => {
    const ada = (await customers("?q=ada@")).items[0];
    const profile = JSON.stringify((await admin.agent.get(`/api/admin/customers/${ada._id}`).expect(200)).body);
    const list = JSON.stringify(await customers());
    for (const text of [profile, list]) {
      for (const secret of ["passwordHash", "twoFactorRecoveryCodeHashes", "cartMergeKeys", "securityVersion", "tokenHash", "addresses", "\"cart\"", "1 Test St"]) {
        expect(text, secret).not.toContain(secret);
      }
    }
  });
});
