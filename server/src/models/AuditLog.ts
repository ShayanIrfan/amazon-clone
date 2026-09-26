import { Schema, model } from "mongoose";
import type { InferSchemaType } from "mongoose";

export const AUDIT_ENTITY_TYPES = ["product", "order", "review", "user", "system"] as const;

// Append-only record of what an admin (or Stripe, on their behalf) changed.
// Actor email is copied in so the trail still reads correctly if the account
// is later removed.
const auditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    actorEmail: { type: String, required: true },
    action: { type: String, required: true }, // e.g. "product.update", "order.ship"
    entityType: { type: String, enum: AUDIT_ENTITY_TYPES, required: true },
    entityId: { type: String, required: true },
    summary: { type: String, required: true },
    // { field: { from, to } } for edits; free-form for other actions.
    changes: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export type AuditLog = InferSchemaType<typeof auditLogSchema>;
export const AuditLogModel = model("AuditLog", auditLogSchema);
