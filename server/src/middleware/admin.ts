import type { Request, Response, NextFunction } from "express";
import { UserModel } from "../models/index.js";
import { isAdminUser } from "../lib/admin.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: { id: string; email: string; name: string };
    }
  }
}

/**
 * Runs after requireAuth. The role is read from the database on every request
 * rather than trusted from the session, so removing someone's admin access
 * takes effect immediately. Signed-in non-admins get 403.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await UserModel.findById(req.userId).select("role email name emailVerifiedAt isDemo");
    if (!user || !isAdminUser(user)) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    req.admin = { id: user._id.toString(), email: user.email, name: user.name };
    next();
  } catch (err) {
    next(err);
  }
}
