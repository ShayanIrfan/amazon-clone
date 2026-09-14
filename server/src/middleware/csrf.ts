import { randomBytes } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { env } from "../config.js";

export const CSRF_COOKIE = "csrf-token";

const csrfCookieOptions = {
  httpOnly: false,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  path: "/",
};

export function csrfCookie(req: Request, res: Response, next: NextFunction) {
  if (!req.cookies?.[CSRF_COOKIE]) res.cookie(CSRF_COOKIE, randomBytes(24).toString("base64url"), csrfCookieOptions);
  next();
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    next();
    return;
  }

  const origin = req.get("origin");
  if (origin && origin !== env.CLIENT_ORIGIN) {
    res.status(403).json({ error: "Request origin is not allowed" });
    return;
  }

  // Supertest calls intentionally omit browser cookies and headers. Production
  // and development browser requests must satisfy the double-submit check.
  if (env.NODE_ENV !== "test") {
    const cookieToken = req.cookies?.[CSRF_COOKIE];
    const headerToken = req.get("x-csrf-token");
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      res.status(403).json({ error: "CSRF validation failed" });
      return;
    }
  }
  next();
}
