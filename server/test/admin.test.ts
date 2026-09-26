// Admin panel: access control and the audit trail. Runs against the same
// guarded "*-test" database as core-flow.test.ts (see test/guard.ts).
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../src/app.js";
import { UserModel, AuditLogModel } from "../src/models/index.js";
import { isAdminUser, recordAudit } from "../src/lib/admin.js";
import { makeUser, signIn as signInAs, wipeDatabase, type Session } from "./helpers.js";

const app = createApp();
const signIn = (email: string) => signInAs(app, email);

let admin: Session;
let customer: Session;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  await wipeDatabase();
  await makeUser("admin@example.test", { role: "admin" });
  await makeUser("customer@example.test");
  admin = await signIn("admin@example.test");
  customer = await signIn("customer@example.test");
});

afterAll(async () => {
  await wipeDatabase();
  await mongoose.disconnect();
});

describe("admin access control", () => {
  it("reports isAdmin only for admins", () => {
    expect(admin.user.isAdmin).toBe(true);
    expect(customer.user.isAdmin).toBe(false);
  });

  it("rejects signed-out requests with 401", async () => {
    await request(app).get("/api/admin/activity").expect(401);
  });

  it("rejects signed-in customers with 403", async () => {
    const res = await customer.agent.get("/api/admin/activity").expect(403);
    expect(res.body.error).toMatch(/admin/i);
  });

  it("lets admins in", async () => {
    const res = await admin.agent.get("/api/admin/activity").expect(200);
    expect(res.body.items).toEqual([]);
  });

  it("revokes access immediately when the role is removed", async () => {
    const temp = await makeUser("temp-admin@example.test", { role: "admin" });
    const session = await signIn("temp-admin@example.test");
    await session.agent.get("/api/admin/activity").expect(200);
    await UserModel.updateOne({ _id: temp._id }, { role: "customer" });
    await session.agent.get("/api/admin/activity").expect(403);
  });

  it("never lets a signup or the API set the role", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/signup")
      .send({ name: "Sneaky", email: "sneaky@example.test", password: "Password123!", role: "admin", isAdmin: true, guestCart: [] });
    const created = await UserModel.findOne({ email: "sneaky@example.test" });
    expect(created?.role).toBe("customer");
  });

  it("does not treat an ADMIN_EMAILS match as admin without a verified email", () => {
    // ADMIN_EMAILS is empty under test, so nothing matches; role alone decides.
    expect(isAdminUser({ email: "x@example.test", role: "customer", emailVerifiedAt: new Date() })).toBe(false);
    expect(isAdminUser({ email: "x@example.test", role: "admin", emailVerifiedAt: null })).toBe(true);
  });

  it("never treats the shared demo account as admin", () => {
    expect(isAdminUser({ email: "demo@example.test", role: "admin", isDemo: true })).toBe(false);
  });
});

describe("audit trail", () => {
  it("records entries and returns them newest first, filterable by entity", async () => {
    const actor = { id: admin.user.id, email: "admin@example.test" };
    await recordAudit({ actor, action: "product.update", entityType: "product", entityId: "p1", summary: "Changed price", changes: { price: { from: 10, to: 12 } } });
    await recordAudit({ actor, action: "order.ship", entityType: "order", entityId: "o1", summary: "Marked shipped" });
    await recordAudit({ actor: "stripe", action: "order.refund", entityType: "order", entityId: "o1", summary: "Refunded in Stripe" });

    const all = await admin.agent.get("/api/admin/activity").expect(200);
    expect(all.body.items.map((i: { action: string }) => i.action)).toEqual(["order.refund", "order.ship", "product.update"]);
    expect(all.body.items[0].actorEmail).toBe("stripe");

    const one = await admin.agent.get("/api/admin/activity?entityType=order&entityId=o1").expect(200);
    expect(one.body.items).toHaveLength(2);

    const edit = all.body.items.find((i: { action: string }) => i.action === "product.update");
    expect(edit.changes).toEqual({ price: { from: 10, to: 12 } });
  });

  it("caps the page size", async () => {
    await admin.agent.get("/api/admin/activity?limit=500").expect(400);
    expect(await AuditLogModel.countDocuments()).toBe(3);
  });
});
