import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { AuditEntityType } from "../lib/types";

export function useAdminActivity(params: { entityType?: AuditEntityType; entityId?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: ["admin", "activity", params],
    queryFn: () => api.admin.activity(params),
  });
}
