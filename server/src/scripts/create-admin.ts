// Creates an admin account, or promotes an existing one, without touching the
// catalog (unlike `npm run seed`, which wipes products). Run from the repo root:
//
//   npm run create-admin -w server -- --email admin@example.com --password '<12+ chars>' [--name "Store Admin"]
//
// It uses whatever MONGODB_URI is in server/.env, so it can bootstrap the
// production database directly. Nothing in the API can grant the admin role.
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "../db.js";
import { UserModel } from "../models/index.js";

function readArgs() {
  const args = process.argv.slice(2);
  const values: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`Unexpected argument "${key ?? ""}". Usage: --email <email> --password <password> [--name <name>]`);
    }
    values[key.slice(2)] = value;
  }
  return values;
}

async function main() {
  const raw = readArgs();
  const email = z.email().trim().toLowerCase().parse(raw.email);
  const name = (raw.name ?? "Store Admin").trim() || "Store Admin";
  const password = raw.password;
  if (password !== undefined && password.length < 12) throw new Error("Password must be at least 12 characters.");

  await connectDB();
  const existing = await UserModel.findOne({ email });

  if (existing) {
    if (existing.isDemo) throw new Error("Refusing to make the shared demo account an admin.");
    existing.role = "admin";
    existing.emailVerifiedAt ??= new Date();
    if (password) {
      existing.passwordHash = await bcrypt.hash(password, 10);
      existing.securityVersion = (existing.securityVersion ?? 0) + 1; // signs out its other sessions
    }
    await existing.save();
    console.log(`[create-admin] promoted existing account ${email}${password ? " and reset its password" : ""}`);
  } else {
    if (!password) throw new Error("A new account needs --password (at least 12 characters).");
    await UserModel.create({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: "admin",
      emailVerifiedAt: new Date(),
    });
    console.log(`[create-admin] created admin account ${email}`);
  }

  await (await import("mongoose")).default.disconnect();
}

main().catch(async (err) => {
  console.error(`[create-admin] ${err instanceof Error ? err.message : err}`);
  await (await import("mongoose")).default.disconnect().catch(() => {});
  process.exit(1);
});
