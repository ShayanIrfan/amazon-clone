import { createHash, randomBytes } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { Types, type HydratedDocument } from "mongoose";
import { UserModel, type User } from "../models/index.js";
import { clearSession, issueSession, revokeAllSessions, revokeSession, SESSION_COOKIE } from "../lib/auth.js";
import { challengeMessage, consumeChallenge, ChallengeError, issueChallenge } from "../lib/challenges.js";
import { env } from "../config.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false });
const signupLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false });
const verificationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const loginCodeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const resetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const securityLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });

const emailSchema = z.email().trim().toLowerCase();
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be 72 characters or fewer")
  .refine((value) => !/\s/.test(value), "Password cannot contain spaces")
  .refine((value) => /[a-z]/.test(value), "Password must include a lowercase letter")
  .refine((value) => /[A-Z]/.test(value), "Password must include an uppercase letter")
  .refine((value) => /\d/.test(value), "Password must include a number")
  .refine((value) => /[^A-Za-z0-9]/.test(value), "Password must include a special character");
const guestCartItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive().max(99),
  savedForLater: z.boolean().optional().default(false),
});
const guestCartSchema = z.array(guestCartItemSchema).max(100).optional().default([]);
const mergeKeySchema = z.string().min(16).max(120).optional();

function publicUser(user: HydratedDocument<User>) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    isDemo: user.isDemo,
    emailVerified: Boolean(user.emailVerifiedAt || user.isDemo),
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
  };
}

function mergeGuestCart(user: HydratedDocument<User>, guestItems: z.infer<typeof guestCartSchema>, mergeKey?: string) {
  if (mergeKey && user.cartMergeKeys.includes(mergeKey)) return;
  for (const guestItem of guestItems) {
    if (!Types.ObjectId.isValid(guestItem.productId)) continue;
    const existing = user.cart.find((item) => item.product.toString() === guestItem.productId);
    if (existing) existing.quantity += guestItem.quantity;
    else {
      user.cart.push({
        product: new Types.ObjectId(guestItem.productId),
        quantity: guestItem.quantity,
        savedForLater: guestItem.savedForLater,
        addedAt: new Date(),
      });
    }
  }
  if (mergeKey) user.cartMergeKeys = [...user.cartMergeKeys.filter((key) => key !== mergeKey), mergeKey].slice(-20);
}

function challengeResponse(res: import("express").Response, error: unknown) {
  const response = challengeMessage(error);
  if (!response) return false;
  res.status(response.status).json(response);
  return true;
}

function hashRecoveryCode(code: string) {
  return createHash("sha256").update(`${env.OTP_SECRET}:recovery:${code}`).digest("hex");
}

function generateRecoveryCodes() {
  return Array.from({ length: 8 }, () => randomBytes(5).toString("hex").toUpperCase());
}

function consumeRecoveryCode(user: HydratedDocument<User>, input: string) {
  const hash = hashRecoveryCode(input.trim().toUpperCase());
  const index = user.twoFactorRecoveryCodeHashes.indexOf(hash);
  if (index === -1) return false;
  user.twoFactorRecoveryCodeHashes.splice(index, 1);
  return true;
}

function userAgent(req: import("express").Request) {
  return req.get("user-agent") ?? undefined;
}

const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(100),
  email: emailSchema,
  password: passwordSchema,
  guestCart: guestCartSchema,
  mergeKey: mergeKeySchema,
});

authRouter.post("/signup", signupLimiter, async (req, res, next) => {
  try {
    const { name, email, password } = signupSchema.parse(req.body);
    const existing = await UserModel.findOne({ email });
    if (existing) {
      res.status(409).json({
        error: "An account with this email already exists. Sign in instead.",
        code: "EMAIL_ALREADY_REGISTERED",
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = new UserModel({ name, email, passwordHash, cart: [], emailVerifiedAt: undefined });
    await user.save();
    await issueChallenge({ email, userId: user._id.toString(), purpose: "email_verification" });
    res.status(202).json({ verificationRequired: true, email });
  } catch (error) {
    if (challengeResponse(res, error)) return;
    next(error);
  }
});

const verifyEmailSchema = z.object({ email: emailSchema, code: z.string(), guestCart: guestCartSchema, mergeKey: mergeKeySchema });
authRouter.post("/verify-email", verificationLimiter, async (req, res, next) => {
  try {
    const { email, code, guestCart, mergeKey } = verifyEmailSchema.parse(req.body);
    const user = await UserModel.findOne({ email });
    if (!user) {
      res.status(400).json({ error: "That code is not valid.", code: "INVALID" });
      return;
    }
    await consumeChallenge({ email, purpose: "email_verification", code });
    user.emailVerifiedAt ??= new Date();
    mergeGuestCart(user, guestCart, mergeKey);
    await user.save();
    await issueSession(res, user._id.toString(), userAgent(req));
    res.json({ user: publicUser(user) });
  } catch (error) {
    if (challengeResponse(res, error)) return;
    next(error);
  }
});

authRouter.post("/resend-verification", verificationLimiter, async (req, res, next) => {
  try {
    const email = emailSchema.parse(req.body?.email);
    const user = await UserModel.findOne({ email });
    if (user && !user.emailVerifiedAt && !user.isDemo) {
      try {
        await issueChallenge({ email, userId: user._id.toString(), purpose: "email_verification" });
      } catch (error) {
        if (!(error instanceof ChallengeError && error.code === "COOLDOWN")) throw error;
      }
    }
    res.status(202).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password"), guestCart: guestCartSchema, mergeKey: mergeKeySchema });
authRouter.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const { email, password, guestCart, mergeKey } = loginSchema.parse(req.body);
    const user = await UserModel.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid email or password", code: "INVALID_CREDENTIALS" });
      return;
    }
    if (!user.emailVerifiedAt && !user.isDemo) {
      try {
        await issueChallenge({ email, userId: user._id.toString(), purpose: "email_verification" });
      } catch (error) {
        if (!(error instanceof ChallengeError && error.code === "COOLDOWN")) throw error;
      }
      res.status(403).json({ error: "Email verification required.", code: "EMAIL_VERIFICATION_REQUIRED", email });
      return;
    }
    if (user.twoFactorEnabled && !user.isDemo) {
      try {
        await issueChallenge({ email, userId: user._id.toString(), purpose: "login_2fa" });
      } catch (error) {
        if (!(error instanceof ChallengeError && error.code === "COOLDOWN")) throw error;
      }
      res.json({ twoFactorRequired: true, email });
      return;
    }
    mergeGuestCart(user, guestCart, mergeKey);
    await user.save();
    await issueSession(res, user._id.toString(), userAgent(req));
    res.json({ user: publicUser(user) });
  } catch (error) {
    if (challengeResponse(res, error)) return;
    next(error);
  }
});

const verifyLoginSchema = z.object({ email: emailSchema, code: z.string(), guestCart: guestCartSchema, mergeKey: mergeKeySchema });
authRouter.post("/verify-login", loginCodeLimiter, async (req, res, next) => {
  try {
    const { email, code, guestCart, mergeKey } = verifyLoginSchema.parse(req.body);
    const user = await UserModel.findOne({ email });
    if (!user || !user.twoFactorEnabled) {
      res.status(400).json({ error: "That code is not valid.", code: "INVALID" });
      return;
    }
    await consumeChallenge({ email, purpose: "login_2fa", code });
    mergeGuestCart(user, guestCart, mergeKey);
    await user.save();
    await issueSession(res, user._id.toString(), userAgent(req));
    res.json({ user: publicUser(user) });
  } catch (error) {
    if (challengeResponse(res, error)) return;
    next(error);
  }
});

authRouter.post("/resend-login-code", loginCodeLimiter, async (req, res, next) => {
  try {
    const email = emailSchema.parse(req.body?.email);
    const user = await UserModel.findOne({ email });
    if (user?.twoFactorEnabled && !user.isDemo) {
      try {
        await issueChallenge({ email, userId: user._id.toString(), purpose: "login_2fa" });
      } catch (error) {
        if (!(error instanceof ChallengeError && error.code === "COOLDOWN")) throw error;
      }
    }
    res.status(202).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/forgot-password", resetLimiter, async (req, res, next) => {
  try {
    const email = emailSchema.parse(req.body?.email);
    const user = await UserModel.findOne({ email });
    if (user && !user.isDemo) {
      try {
        await issueChallenge({ email, userId: user._id.toString(), purpose: "password_reset" });
      } catch (error) {
        if (!(error instanceof ChallengeError && error.code === "COOLDOWN")) throw error;
      }
    }
    res.status(202).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

const resetPasswordSchema = z.object({ email: emailSchema, code: z.string(), password: passwordSchema });
authRouter.post("/reset-password", resetLimiter, async (req, res, next) => {
  try {
    const { email, code, password } = resetPasswordSchema.parse(req.body);
    const user = await UserModel.findOne({ email });
    if (!user || user.isDemo) {
      res.status(400).json({ error: "That code is not valid.", code: "INVALID" });
      return;
    }
    await consumeChallenge({ email, purpose: "password_reset", code });
    user.passwordHash = await bcrypt.hash(password, 12);
    user.emailVerifiedAt ??= new Date();
    await user.save();
    await revokeAllSessions(user._id.toString());
    res.json({ ok: true });
  } catch (error) {
    if (challengeResponse(res, error)) return;
    next(error);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    await revokeSession(req.cookies?.[SESSION_COOKIE]);
    clearSession(res);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout-all", requireAuth, async (req, res, next) => {
  try {
    await revokeAllSessions(req.userId!);
    clearSession(res);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.userId);
    if (!user) {
      res.status(401).json({ error: "Not signed in" });
      return;
    }
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/security", requireAuth, async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.userId).select("twoFactorEnabled twoFactorRecoveryCodeHashes");
    if (!user) return res.status(401).json({ error: "Not signed in" });
    res.json({ twoFactorEnabled: Boolean(user.twoFactorEnabled), recoveryCodesRemaining: user.twoFactorRecoveryCodeHashes.length });
  } catch (error) {
    next(error);
  }
});

const passwordChangeSchema = z.object({ currentPassword: z.string().min(1), newPassword: passwordSchema });
authRouter.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = passwordChangeSchema.parse(req.body);
    const user = await UserModel.findById(req.userId);
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    await revokeAllSessions(user._id.toString());
    await issueSession(res, user._id.toString(), userAgent(req));
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

const enableTwoFactorSchema = z.object({ password: z.string().min(1) });
authRouter.post("/2fa/enable/request", requireAuth, securityLimiter, async (req, res, next) => {
  try {
    const { password } = enableTwoFactorSchema.parse(req.body);
    const user = await UserModel.findById(req.userId);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: "Password is incorrect" });
      return;
    }
    await issueChallenge({ email: user.email, userId: user._id.toString(), purpose: "enable_2fa" });
    res.json({ challengeSent: true });
  } catch (error) {
    if (challengeResponse(res, error)) return;
    next(error);
  }
});

authRouter.post("/2fa/enable/confirm", requireAuth, securityLimiter, async (req, res, next) => {
  try {
    const code = z.string().parse(req.body?.code);
    const user = await UserModel.findById(req.userId);
    if (!user) return res.status(401).json({ error: "Not signed in" });
    await consumeChallenge({ email: user.email, purpose: "enable_2fa", code });
    const recoveryCodes = generateRecoveryCodes();
    user.twoFactorEnabled = true;
    user.twoFactorRecoveryCodeHashes = recoveryCodes.map(hashRecoveryCode);
    await user.save();
    res.json({ twoFactorEnabled: true, recoveryCodes });
  } catch (error) {
    if (challengeResponse(res, error)) return;
    next(error);
  }
});

authRouter.post("/2fa/disable", requireAuth, async (req, res, next) => {
  try {
    const { password, recoveryCode } = z.object({ password: z.string().min(1), recoveryCode: z.string().min(1) }).parse(req.body);
    const user = await UserModel.findById(req.userId);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: "Password is incorrect" });
    if (!user.twoFactorEnabled || !consumeRecoveryCode(user, recoveryCode)) return res.status(400).json({ error: "A valid recovery code is required" });
    user.twoFactorEnabled = false;
    await user.save();
    res.json({ twoFactorEnabled: false, recoveryCodesRemaining: user.twoFactorRecoveryCodeHashes.length });
  } catch (error) {
    next(error);
  }
});
