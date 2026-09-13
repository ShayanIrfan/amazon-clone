import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useRecentlyViewed() {
  return useQuery({ queryKey: ["recentlyViewed"], queryFn: api.users.recentlyViewed });
}

export function useRemoveRecentlyViewed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => api.users.removeRecentlyViewed(productId),
    onSuccess: (data) => queryClient.setQueryData(["recentlyViewed"], data),
  });
}
