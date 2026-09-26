import { Router } from "express";
import { z } from "zod";
import { AuditLogModel, AUDIT_ENTITY_TYPES } from "../../models/index.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireAdmin } from "../../middleware/admin.js";
import { adminProductsRouter } from "./products.js";
import { adminOrdersRouter } from "./orders.js";
import { adminStatsRouter } from "./stats.js";

// Everything under /api/admin needs a signed-in admin; each sub-router can
// assume req.admin is set.
export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);
adminRouter.use("/products", adminProductsRouter);
adminRouter.use("/orders", adminOrdersRouter);
adminRouter.use("/stats", adminStatsRouter);

const activityQuerySchema = z.object({
  entityType: z.enum(AUDIT_ENTITY_TYPES).optional(),
  entityId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

// Newest-first audit trail: the whole store on the dashboard, or one entity's
// history on its own page.
adminRouter.get("/activity", async (req, res, next) => {
  try {
    const { entityType, entityId, limit } = activityQuerySchema.parse(req.query);
    const filter = {
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
    };
    const items = await AuditLogModel.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({
      items: items.map((entry) => ({
        id: entry._id.toString(),
        actorEmail: entry.actorEmail,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        summary: entry.summary,
        changes: entry.changes ?? null,
        createdAt: entry.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});
