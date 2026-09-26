import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import request from "supertest";
import type { Express } from "express";
import { UserModel } from "../src/models/index.js";

export const PASSWORD = "Password123!";

/**
 * Empties every collection in the (guarded, `*-test`) database. Used instead
 * of dropDatabase(), which needs a higher Atlas role than the app's own
 * readWrite user; indexes are kept, so unique constraints still apply.
 */
export async function wipeDatabase() {
  const db = mongoose.connection.db!;
  for (const { name } of await db.listCollections({}, { nameOnly: true }).toArray()) {
    if (name.startsWith("system.")) continue;
    await db.collection(name).deleteMany({});
  }
}

/** A verified account, created directly in the database. */
export async function makeUser(email: string, extra: Record<string, unknown> = {}) {
  return UserModel.create({
    name: "Test Person",
    email,
    passwordHash: await bcrypt.hash(PASSWORD, 4),
    emailVerifiedAt: new Date(),
    ...extra,
  });
}

/** Signs in through the real endpoint and returns a cookie-keeping agent. */
export async function signIn(app: Express, email: string) {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({ email, password: PASSWORD }).expect(200);
  return { agent, user: res.body.user as { id: string; isAdmin: boolean } };
}

export type Session = Awaited<ReturnType<typeof signIn>>;

export const card = { number: "4242424242424242", expiry: "12/30", cvv: "123", name: "Test Person" };

export const address = { fullName: "Test Person", phone: "5550100", street: "1 Test St", city: "Karachi", state: "Sindh", zip: "75300", country: "Pakistan" };
