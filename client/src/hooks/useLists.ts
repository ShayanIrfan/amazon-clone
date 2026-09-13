import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useLists() {
  return useQuery({ queryKey: ["lists"], queryFn: api.lists.list });
}

export function useCreateList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.lists.create(name),
    onSuccess: (data) => queryClient.setQueryData(["lists"], data),
  });
}

export function useDeleteList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.lists.remove(id),
    onSuccess: (data) => queryClient.setQueryData(["lists"], data),
  });
}

export function useAddToList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, productId }: { listId: string; productId: string }) => api.lists.addItem(listId, productId),
    onSuccess: (data) => queryClient.setQueryData(["lists"], data),
  });
}

export function useRemoveFromList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, productId }: { listId: string; productId: string }) => api.lists.removeItem(listId, productId),
    onSuccess: (data) => queryClient.setQueryData(["lists"], data),
  });
}
