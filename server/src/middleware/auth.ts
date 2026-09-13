import type { Request, Response, NextFunction } from "express";
import { verifySession, SESSION_COOKIE } from "../lib/auth.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// Attaches req.userId when a valid session cookie is present, but never
// blocks the request — most routes (products, categories) want to know who's
// asking without requiring anyone to be signed in.
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token === "string") {
    const userId = verifySession(token);
    if (userId) req.userId = userId;
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  next();
}
