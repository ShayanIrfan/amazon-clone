import { createHash, randomBytes } from "node:crypto";
import type { CookieOptions, Response } from "express";
import { SessionModel, UserModel } from "../models/index.js";
import { env } from "../config.js";

export const SESSION_COOKIE = "session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const BASE_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.NODE_ENV === "production",
  path: "/",
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueSession(res: Response, userId: string, userAgent?: string) {
  const user = await UserModel.findById(userId).select("securityVersion");
  if (!user) throw new Error("Cannot create a session for a missing user");

  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await SessionModel.create({
    user: user._id,
    tokenHash: hashToken(token),
    securityVersion: user.securityVersion ?? 0,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    lastUsedAt: now,
    userAgent: userAgent?.slice(0, 300),
  });
  res.cookie(SESSION_COOKIE, token, { ...BASE_COOKIE_OPTIONS, maxAge: SESSION_TTL_MS });
}

export async function getSessionUserId(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const session = await SessionModel.findOneAndUpdate(
    { tokenHash: hashToken(token), revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } },
    { $set: { lastUsedAt: new Date() } },
    { returnDocument: "after" },
  ).select("user securityVersion");
  if (!session) return null;

  const user = await UserModel.findById(session.user).select("securityVersion");
  if (!user || (user.securityVersion ?? 0) !== session.securityVersion) return null;
  return user._id.toString();
}

export async function revokeSession(token: string | undefined) {
  if (!token) return;
  await SessionModel.updateOne({ tokenHash: hashToken(token), revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
}

export async function revokeAllSessions(userId: string) {
  await UserModel.findByIdAndUpdate(userId, { $inc: { securityVersion: 1 } });
  await SessionModel.updateMany({ user: userId, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
}

export function clearSession(res: Response) {
  res.clearCookie(SESSION_COOKIE, BASE_COOKIE_OPTIONS);
}
