import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { AdminOrderStatusFilter, AdminProductInput, AdminProductSort, AdminProductStatus, AuditEntityType, CustomerSort, StatsRange } from "../lib/types";

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

export interface AdminOrderQuery {
  q?: string;
  status?: AdminOrderStatusFilter;
  page?: number;
}

export function useAdminOrders(params: AdminOrderQuery) {
  return useQuery({
    queryKey: ["admin", "orders", params],
    queryFn: () => api.admin.orders.list(params),
    placeholderData: (previous) => previous,
  });
}

export function useAdminOrder(id: string | undefined) {
  return useQuery({
    queryKey: ["admin", "order", id],
    queryFn: () => api.admin.orders.get(id!),
    enabled: !!id,
  });
}

/** Shipping or cancelling changes what the customer sees and, for cancellations, stock, so refresh everything. */
export function useAdminOrderMutations() {
  const queryClient = useQueryClient();
  const refreshAll = () => queryClient.invalidateQueries();
  return {
    setStatus: useMutation({
      mutationFn: ({ id, status }: { id: string; status: "shipped" | "delivered" }) => api.admin.orders.setStatus(id, status),
      onSuccess: refreshAll,
    }),
    cancel: useMutation({ mutationFn: (id: string) => api.admin.orders.cancel(id), onSuccess: refreshAll }),
  };
}

export function useAdminStats(range: StatsRange) {
  return useQuery({
    queryKey: ["admin", "stats", range],
    queryFn: () => api.admin.stats(range),
    placeholderData: (previous) => previous, // keep the old numbers up while a new range loads
  });
}

export function useAdminReviews(params: { q?: string; rating?: number; productId?: string; page?: number }) {
  return useQuery({
    queryKey: ["admin", "reviews", params],
    queryFn: () => api.admin.reviews.list(params),
    placeholderData: (previous) => previous,
  });
}

/** Deleting a review changes the product's rating everywhere, so refresh everything on screen. */
export function useAdminReviewMutations() {
  const queryClient = useQueryClient();
  return {
    remove: useMutation({
      mutationFn: (id: string) => api.admin.reviews.remove(id),
      onSuccess: () => queryClient.invalidateQueries(),
    }),
  };
}

export function useAdminCustomers(params: { q?: string; sort?: CustomerSort; page?: number }) {
  return useQuery({
    queryKey: ["admin", "customers", params],
    queryFn: () => api.admin.customers.list(params),
    placeholderData: (previous) => previous,
  });
}

export function useAdminCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ["admin", "customer", id],
    queryFn: () => api.admin.customers.get(id!),
    enabled: !!id,
  });
}
