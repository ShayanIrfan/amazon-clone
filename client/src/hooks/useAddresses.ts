import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { AddressInput } from "../lib/types";

export function useAddresses() {
  return useQuery({ queryKey: ["addresses"], queryFn: api.addresses.list });
}

export function useAddAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddressInput) => api.addresses.add(data),
    onSuccess: (data) => queryClient.setQueryData(["addresses"], data),
  });
}

export function useRemoveAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.addresses.remove(id),
    onSuccess: (data) => queryClient.setQueryData(["addresses"], data),
  });
}

export function useSetDefaultAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.addresses.setDefault(id),
    onSuccess: (data) => queryClient.setQueryData(["addresses"], data),
  });
}
