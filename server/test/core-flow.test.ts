// Integration test of the assignment's core loop — browse, sign up, cart,
// checkout, order history, cancel — against a real (test) MongoDB and the
// actual Express app, not a mocked one. Run with `npm test` (server
// workspace) or `npm test` at the repo root.
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../src/app.js";
import { ProductModel } from "../src/models/index.js";

const app = createApp();
let productId: string;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  await mongoose.connection.db!.dropDatabase(); // start every run from a clean slate

  const product = await ProductModel.create({
    sourceId: 999001,
    title: "Test Widget",
    description: "A widget for automated testing.",
    category: "test",
    price: 49.99,
    discountPercentage: 0,
    rating: 0,
    ratingCount: 0,
    stock: 5,
    tags: ["test"],
    brand: "TestBrand",
    sku: "TW-1",
    minimumOrderQuantity: 1,
    images: ["https://example.com/widget.jpg"],
    thumbnail: "https://example.com/widget.jpg",
  });
  productId = product._id.toString();
});

afterAll(async () => {
  await mongoose.connection.db!.dropDatabase();
  await mongoose.disconnect();
});

describe("core shopping flow", () => {
  // supertest's agent persists cookies across calls, like a real browser tab.
  const shopper = request.agent(app);
  let addressId: string;
  let orderId: string;

  it("lists the seeded product on the browse endpoint", async () => {
    const res = await shopper.get("/api/products?category=test").expect(200);
    expect(res.body.items.map((p: { _id: string }) => p._id)).toContain(productId);
  });

  it("signs up a new account", async () => {
    const res = await shopper
      .post("/api/auth/signup")
      .send({ name: "Test Shopper", email: "flow-test@example.com", password: "secret123", guestCart: [] })
      .expect(201);
    expect(res.body.user.email).toBe("flow-test@example.com");
  });

  it("rejects a second signup with the same email", async () => {
    await shopper
      .post("/api/auth/signup")
      .send({ name: "Duplicate", email: "flow-test@example.com", password: "secret123" })
      .expect(409);
  });

  it("adds two of the product to the cart", async () => {
    const res = await shopper
      .put("/api/cart")
      .send({ items: [{ productId, quantity: 2, savedForLater: false }] })
      .expect(200);
    expect(res.body.items).toEqual([expect.objectContaining({ productId, quantity: 2 })]);
  });

  it("adds a delivery address", async () => {
    const res = await shopper
      .post("/api/addresses")
      .send({ fullName: "Test Shopper", phone: "2065550137", street: "1 Test St", city: "Seattle", state: "WA", zip: "98101" })
      .expect(201);
    addressId = res.body.items[0]._id;
    expect(res.body.items[0].isDefault).toBe(true); // first address is always the default
  });

  it("quotes the order total correctly: 2x$49.99 + free standard shipping + 8% tax", async () => {
    const res = await shopper.get("/api/orders/quote?deliverySpeed=standard").expect(200);
    expect(res.body.subtotal).toBeCloseTo(99.98);
    expect(res.body.shipping).toBe(0);
    expect(res.body.tax).toBeCloseTo(8.0);
    expect(res.body.total).toBeCloseTo(107.98);
  });

  it("rejects a declined test card without touching stock or the cart", async () => {
    await shopper
      .post("/api/orders")
      .send({ addressId, deliverySpeed: "standard", card: { number: "4000000000009995", expiry: "12/30", cvv: "123", name: "Test Shopper" } })
      .expect(402);

    expect((await ProductModel.findById(productId))!.stock).toBe(5);
    const cart = await shopper.get("/api/cart").expect(200);
    expect(cart.body.items).toHaveLength(1);
  });

  it("rejects a malformed card", async () => {
    await shopper
      .post("/api/orders")
      .send({ addressId, deliverySpeed: "standard", card: { number: "1234", expiry: "12/30", cvv: "123", name: "Test Shopper" } })
      .expect(400);
  });

  it("places an order with a valid card, decrementing stock and clearing the cart", async () => {
    const res = await shopper
      .post("/api/orders")
      .send({ addressId, deliverySpeed: "standard", card: { number: "4242424242424242", expiry: "12/30", cvv: "123", name: "Test Shopper" } })
      .expect(201);

    orderId = res.body.order._id;
    expect(res.body.order.status).toBe("paid");
    expect(res.body.order.total).toBeCloseTo(107.98);

    expect((await ProductModel.findById(productId))!.stock).toBe(3);
    const cart = await shopper.get("/api/cart").expect(200);
    expect(cart.body.items).toHaveLength(0);
  });

  it("shows the order in order history", async () => {
    const res = await shopper.get("/api/orders").expect(200);
    expect(res.body.items.map((o: { _id: string }) => o._id)).toContain(orderId);
  });

  it("hides the order from someone else, without revealing it exists", async () => {
    const other = request.agent(app);
    await other
      .post("/api/auth/signup")
      .send({ name: "Other Shopper", email: "flow-test-2@example.com", password: "secret123", guestCart: [] })
      .expect(201);
    await other.get(`/api/orders/${orderId}`).expect(404);
  });

  it("cancels the order and restocks the product", async () => {
    const res = await shopper.post(`/api/orders/${orderId}/cancel`).expect(200);
    expect(res.body.order.status).toBe("cancelled");
    expect((await ProductModel.findById(productId))!.stock).toBe(5);
  });

  it("refuses to cancel an already-cancelled order", async () => {
    await shopper.post(`/api/orders/${orderId}/cancel`).expect(400);
  });
});

describe("review eligibility (purchase-gated)", () => {
  const shopper = request.agent(app);

  it("won't let an unauthenticated request write a review", async () => {
    await shopper.post(`/api/products/${productId}/reviews`).send({ rating: 5, comment: "Great!" }).expect(401);
  });

  it("won't let a signed-in shopper who hasn't bought it review it", async () => {
    await shopper
      .post("/api/auth/signup")
      .send({ name: "Reviewer", email: "reviewer@example.com", password: "secret123", guestCart: [] })
      .expect(201);
    await shopper.post(`/api/products/${productId}/reviews`).send({ rating: 5, comment: "Great!" }).expect(403);
  });

  it("recalculates the product's rating once a real purchaser reviews it", async () => {
    // Buy it first — same product, fresh (uncancelled) order.
    const addr = await shopper
      .post("/api/addresses")
      .send({ fullName: "Reviewer", phone: "2065550137", street: "1 Test St", city: "Seattle", state: "WA", zip: "98101" })
      .expect(201);
    await shopper.put("/api/cart").send({ items: [{ productId, quantity: 1, savedForLater: false }] }).expect(200);
    await shopper
      .post("/api/orders")
      .send({
        addressId: addr.body.items[0]._id,
        deliverySpeed: "standard",
        card: { number: "4242424242424242", expiry: "12/30", cvv: "123", name: "Reviewer" },
      })
      .expect(201);

    const res = await shopper.post(`/api/products/${productId}/reviews`).send({ rating: 4, comment: "Pretty good." }).expect(201);
    expect(res.body.review.rating).toBe(4);

    const product = await ProductModel.findById(productId);
    expect(product!.rating).toBe(4);
    expect(product!.ratingCount).toBe(1);
  });
});
