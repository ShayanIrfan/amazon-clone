import jwt from "jsonwebtoken";
import { env } from "../config.js";
import type { CookieOptions } from "express";

export const SESSION_COOKIE = "session";

// No maxAge here on purpose — issueSession adds it when setting the cookie,
// and clearCookie must be called with exactly the attributes used to set it
// (minus maxAge/expires, which is how it invalidates the cookie).
export const BASE_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.NODE_ENV === "production",
};

const SESSION_TTL = "30d";
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function signSession(userId: string): string {
  return jwt.sign({ sub: userId }, env.SESSION_SECRET, { expiresIn: SESSION_TTL });
}

export function verifySession(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.SESSION_SECRET);
    if (typeof payload === "object" && typeof payload.sub === "string") return payload.sub;
    return null;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(): CookieOptions {
  return { ...BASE_COOKIE_OPTIONS, maxAge: SESSION_MAX_AGE_MS };
}
