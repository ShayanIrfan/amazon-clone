import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { AdminProductInput, AdminProductSort, AdminProductStatus, AuditEntityType } from "../lib/types";

export function useAdminActivity(params: { entityType?: AuditEntityType; entityId?: string; limit?: number } = {}, enabled = true) {
  return useQuery({
    queryKey: ["admin", "activity", params],
    queryFn: () => api.admin.activity(params),
    enabled,
  });
}

export interface AdminProductQuery {
  q?: string;
  category?: string;
  status?: AdminProductStatus;
  sort?: AdminProductSort;
  page?: number;
}

export function useAdminProducts(params: AdminProductQuery) {
  return useQuery({
    queryKey: ["admin", "products", params],
    queryFn: () => api.admin.products.list(params),
    placeholderData: (previous) => previous, // keep the table on screen while a filter reloads
  });
}

export function useAdminProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["admin", "product", id],
    queryFn: () => api.admin.products.get(id!),
    enabled: !!id,
  });
}

/**
 * Every product write can change what shoppers see (prices, stock, search,
 * departments, the home page), so a success refreshes everything on screen
 * and marks the rest stale, admin and storefront alike.
 */
export function useAdminProductMutations() {
  const queryClient = useQueryClient();
  const refreshAll = () => queryClient.invalidateQueries();

  return {
    create: useMutation({
      mutationFn: (input: AdminProductInput) => api.admin.products.create(input),
      onSuccess: refreshAll,
    }),
    update: useMutation({
      mutationFn: ({ id, ...input }: Partial<AdminProductInput> & { id: string; expectedUpdatedAt: string }) =>
        api.admin.products.update(id, input),
      onSuccess: refreshAll,
    }),
    setStock: useMutation({
      mutationFn: ({ id, stock }: { id: string; stock: number }) => api.admin.products.setStock(id, stock),
      onSuccess: refreshAll,
    }),
    archive: useMutation({ mutationFn: (id: string) => api.admin.products.archive(id), onSuccess: refreshAll }),
    restore: useMutation({ mutationFn: (id: string) => api.admin.products.restore(id), onSuccess: refreshAll }),
    remove: useMutation({ mutationFn: (id: string) => api.admin.products.remove(id), onSuccess: refreshAll }),
  };
}
