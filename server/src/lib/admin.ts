import { env } from "../config.js";
import { AuditLogModel, type AuditLog } from "../models/index.js";
import type { AUDIT_ENTITY_TYPES } from "../models/AuditLog.js";

const adminEmails = new Set(
  env.ADMIN_EMAILS.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

/**
 * Admin = `role: "admin"` in the database, or an ADMIN_EMAILS match on an
 * account whose email has been verified (so nobody can claim an address they
 * don't own). The shared demo shopper is never an admin.
 */
export function isAdminUser(user: {
  role?: string | null;
  email: string;
  emailVerifiedAt?: Date | null;
  isDemo?: boolean | null;
}) {
  if (user.isDemo) return false;
  if (user.role === "admin") return true;
  return !!user.emailVerifiedAt && adminEmails.has(user.email.toLowerCase());
}

type Actor = { id: string; email: string };

/**
 * Writes one audit entry. `changes` is a { field: { from, to } } map for
 * edits, or any small JSON-safe object describing the action.
 */
export async function recordAudit(entry: {
  actor: Actor | "stripe" | "system";
  action: string;
  entityType: (typeof AUDIT_ENTITY_TYPES)[number];
  entityId: string;
  summary: string;
  changes?: Record<string, unknown>;
}) {
  const { actor, ...rest } = entry;
  await AuditLogModel.create({
    ...rest,
    actor: typeof actor === "string" ? undefined : actor.id,
    actorEmail: typeof actor === "string" ? actor : actor.email,
  });
}

/** Compares two plain objects and returns only the fields that differ. */
export function diffFields(before: Record<string, unknown>, after: Record<string, unknown>, fields: string[]) {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const field of fields) {
    if (JSON.stringify(before[field] ?? null) !== JSON.stringify(after[field] ?? null)) {
      changes[field] = { from: before[field] ?? null, to: after[field] ?? null };
    }
  }
  return changes;
}

export type AuditEntry = Pick<AuditLog, "actorEmail" | "action" | "entityType" | "entityId" | "summary" | "changes">;
