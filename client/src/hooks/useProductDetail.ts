import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ReviewSort } from "../lib/types";

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => api.product(id!),
    enabled: !!id,
  });
}

export function useRelatedProducts(id: string | undefined) {
  return useQuery({
    queryKey: ["relatedProducts", id],
    queryFn: () => api.relatedProducts(id!),
    enabled: !!id,
  });
}

export function useReviews(id: string | undefined, opts: { sort?: ReviewSort; star?: number; page?: number }) {
  return useQuery({
    queryKey: ["reviews", id, opts],
    queryFn: () => api.reviews(id!, opts),
    enabled: !!id,
    placeholderData: (prev) => prev,
  });
}
