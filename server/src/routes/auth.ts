import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { Types, type HydratedDocument } from "mongoose";
import { UserModel, type User } from "../models/index.js";
import { signSession, sessionCookieOptions, BASE_COOKIE_OPTIONS, SESSION_COOKIE } from "../lib/auth.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

// Generous enough not to bother a normal demo session, tight enough to blunt
// credential-stuffing/brute-force against /login and /signup.
authRouter.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));

const emailSchema = z.email().trim().toLowerCase();
const guestCartItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  savedForLater: z.boolean().optional().default(false),
});

// Merges a client-held guest cart into a user document's own cart. An
// existing line for the same product keeps ITS savedForLater state and just
// gains the guest's quantity; only a genuinely new product takes the guest's
// savedForLater flag. Invalid product ids are skipped, not rejected — a
// stale id shouldn't fail the whole sign-in.
function mergeGuestCart(user: HydratedDocument<User>, guestItems: z.infer<typeof guestCartItemSchema>[]) {
  for (const g of guestItems) {
    if (!Types.ObjectId.isValid(g.productId)) continue;
    const existing = user.cart.find((c) => c.product.toString() === g.productId);
    if (existing) existing.quantity += g.quantity;
    else user.cart.push({ product: new Types.ObjectId(g.productId), quantity: g.quantity, savedForLater: g.savedForLater, addedAt: new Date() });
  }
}

function publicUser(user: HydratedDocument<User>) {
  return { id: user._id.toString(), name: user.name, email: user.email, isDemo: user.isDemo };
}

function issueSession(res: import("express").Response, userId: string) {
  res.cookie(SESSION_COOKIE, signSession(userId), sessionCookieOptions());
}

authRouter.post("/check-email", async (req, res, next) => {
  try {
    const email = emailSchema.parse(req.body?.email);
    const exists = await UserModel.exists({ email });
    res.json({ exists: !!exists });
  } catch (err) {
    next(err);
  }
});

const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(100),
  email: emailSchema,
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
  guestCart: z.array(guestCartItemSchema).optional().default([]),
});

authRouter.post("/signup", async (req, res, next) => {
  try {
    const { name, email, password, guestCart } = signupSchema.parse(req.body);

    const existing = await UserModel.findOne({ email });
    if (existing) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new UserModel({ name, email, passwordHash, cart: [] });
    mergeGuestCart(user, guestCart);
    await user.save();

    issueSession(res, user._id.toString());
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
  guestCart: z.array(guestCartItemSchema).optional().default([]),
});

// Same generic message either way — never reveal which half was wrong.
const INVALID_CREDENTIALS = { error: "Invalid email or password" };

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password, guestCart } = loginSchema.parse(req.body);

    const user = await UserModel.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json(INVALID_CREDENTIALS);
      return;
    }

    mergeGuestCart(user, guestCart);
    await user.save();

    issueSession(res, user._id.toString());
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

const demoSchema = z.object({ guestCart: z.array(guestCartItemSchema).optional().default([]) });
const DEMO_EMAIL = "demo@amazon-clone.test"; // seeded by server/src/seed/index.ts

authRouter.post("/demo", async (req, res, next) => {
  try {
    const { guestCart } = demoSchema.parse(req.body);

    const user = await UserModel.findOne({ email: DEMO_EMAIL });
    if (!user) {
      res.status(500).json({ error: "Demo account isn't seeded — run `npm run seed`" });
      return;
    }

    mergeGuestCart(user, guestCart);
    await user.save();

    issueSession(res, user._id.toString());
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE, BASE_COOKIE_OPTIONS);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.userId);
    if (!user) {
      res.status(401).json({ error: "Not signed in" });
      return;
    }
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});
