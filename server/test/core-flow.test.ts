// Integration test of the assignment's core loop — browse, sign up, cart,
// checkout, order history, cancel — against a real (test) MongoDB and the
// actual Express app, not a mocked one. Run with `npm test` (server
// workspace) or `npm test` at the repo root.
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../src/app.js";
import { ProductModel } from "../src/models/index.js";
import { testMailOutbox } from "../src/lib/mail.js";

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
      .send({ name: "Test Shopper", email: "flow-test@example.com", password: "Secret12345!", guestCart: [] })
      .expect(202);
    expect(res.body.verificationRequired).toBe(true);
    const verification = testMailOutbox.at(-1)!;
    await shopper
      .post("/api/auth/verify-email")
      .send({ email: verification.to, code: verification.code, guestCart: [], mergeKey: "test-flow-signup-merge-key" })
      .expect(200);
    expect((await shopper.get("/api/auth/me")).body.user.email).toBe("flow-test@example.com");
  });

  it("rejects passwords that only meet the length requirement", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ name: "Weak Password", email: "weak-password@example.com", password: "alllowercase123", guestCart: [] })
      .expect(400);
    expect(res.body.error).toBe("Password must include an uppercase letter");
  });

  it("rejects a second signup with the same email", async () => {
    const res = await shopper
      .post("/api/auth/signup")
      .send({ name: "Duplicate", email: "flow-test@example.com", password: "Secret12345!" })
      .expect(409);
    expect(res.body.code).toBe("EMAIL_ALREADY_REGISTERED");
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
    const otherSignup = await other
      .post("/api/auth/signup")
      .send({ name: "Other Shopper", email: "flow-test-2@example.com", password: "Secret12345!", guestCart: [] })
      .expect(202);
    expect(otherSignup.body.verificationRequired).toBe(true);
    const otherVerification = testMailOutbox.at(-1)!;
    await other
      .post("/api/auth/verify-email")
      .send({ email: otherVerification.to, code: otherVerification.code, guestCart: [], mergeKey: "test-other-signup-merge-key" })
      .expect(200);
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
    const reviewerSignup = await shopper
      .post("/api/auth/signup")
      .send({ name: "Reviewer", email: "reviewer@example.com", password: "Secret12345!", guestCart: [] })
      .expect(202);
    expect(reviewerSignup.body.verificationRequired).toBe(true);
    const reviewerVerification = testMailOutbox.at(-1)!;
    await shopper
      .post("/api/auth/verify-email")
      .send({ email: reviewerVerification.to, code: reviewerVerification.code, guestCart: [], mergeKey: "test-reviewer-signup-merge-key" })
      .expect(200);
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

describe("authentication hardening", () => {
  it("keeps signup unverified until a single-use email code is consumed", async () => {
    const shopper = request.agent(app);
    testMailOutbox.length = 0;
    const email = "otp-flow@example.com";
    await shopper.post("/api/auth/signup").send({ name: "OTP Shopper", email, password: "Secret12345!", guestCart: [] }).expect(202);
    await shopper.get("/api/auth/me").expect(401);

    const code = testMailOutbox.at(-1)!.code;
    await shopper.post("/api/auth/verify-email").send({ email, code: "000000", guestCart: [], mergeKey: "otp-invalid-merge-key" }).expect(400);
    await shopper.post("/api/auth/verify-email").send({ email, code, guestCart: [], mergeKey: "otp-valid-merge-key" }).expect(200);
    await shopper.post("/api/auth/verify-email").send({ email, code, guestCart: [], mergeKey: "otp-replay-merge-key" }).expect(400);
  });

  it("resets a password and revokes the previous session", async () => {
    const shopper = request.agent(app);
    testMailOutbox.length = 0;
    const email = "reset-flow@example.com";
    await shopper.post("/api/auth/signup").send({ name: "Reset Shopper", email, password: "Secret12345!", guestCart: [] }).expect(202);
    const signupCode = testMailOutbox.at(-1)!.code;
    await shopper.post("/api/auth/verify-email").send({ email, code: signupCode, guestCart: [], mergeKey: "reset-signup-merge-key" }).expect(200);
    await shopper.post("/api/auth/forgot-password").send({ email }).expect(202);
    const resetCode = testMailOutbox.at(-1)!.code;
    await shopper.post("/api/auth/reset-password").send({ email, code: resetCode, password: "Newsecret123!" }).expect(200);
    await shopper.get("/api/auth/me").expect(401);
    await shopper.post("/api/auth/login").send({ email, password: "Secret12345!", guestCart: [] }).expect(401);
    await shopper.post("/api/auth/login").send({ email, password: "Newsecret123!", guestCart: [] }).expect(200);
  });

  it("supports email two-factor login and recovery-code disable", async () => {
    const shopper = request.agent(app);
    testMailOutbox.length = 0;
    const email = "two-factor-flow@example.com";
    await shopper.post("/api/auth/signup").send({ name: "Two Factor Shopper", email, password: "Secret12345!", guestCart: [] }).expect(202);
    const signupCode = testMailOutbox.at(-1)!.code;
    await shopper.post("/api/auth/verify-email").send({ email, code: signupCode, guestCart: [], mergeKey: "2fa-signup-merge-key" }).expect(200);
    await shopper.post("/api/auth/2fa/enable/request").send({ password: "Secret12345!" }).expect(200);
    const enableCode = testMailOutbox.at(-1)!.code;
    const enabled = await shopper.post("/api/auth/2fa/enable/confirm").send({ code: enableCode }).expect(200);
    expect(enabled.body.recoveryCodes).toHaveLength(8);
    const recoveryCode = enabled.body.recoveryCodes[0];
    await shopper.post("/api/auth/logout").expect(204);
    const login = await shopper.post("/api/auth/login").send({ email, password: "Secret12345!", guestCart: [] }).expect(200);
    expect(login.body.twoFactorRequired).toBe(true);
    const loginCode = testMailOutbox.at(-1)!.code;
    await shopper.post("/api/auth/verify-login").send({ email, code: loginCode, guestCart: [], mergeKey: "2fa-login-merge-key" }).expect(200);
    await shopper.post("/api/auth/2fa/disable").send({ password: "Secret12345!", recoveryCode }).expect(200);
  });
});
