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

/**
 * CLIENT_ORIGIN covers local dev (Vite on its own port, proxying /api). In
 * production the SPA and /api share one host, reachable under several
 * hostnames (production alias, per-deployment URL), so a same-origin request
 * is allowed too. A browser can't forge Origin, and the double-submit token
 * below is still required either way.
 */
function isAllowedOrigin(req: Request, origin: string) {
  if (origin === env.CLIENT_ORIGIN) return true;
  try {
    const host = req.get("x-forwarded-host") ?? req.get("host");
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    next();
    return;
  }

  const origin = req.get("origin");
  if (origin && !isAllowedOrigin(req, origin)) {
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
