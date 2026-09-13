import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { CardInput, DeliverySpeed } from "../lib/types";

export function useOrderQuote(deliverySpeed: DeliverySpeed) {
  return useQuery({
    queryKey: ["orderQuote", deliverySpeed],
    queryFn: () => api.orders.quote(deliverySpeed),
    placeholderData: (prev) => prev,
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { addressId: string; deliverySpeed: DeliverySpeed; card: CardInput }) => api.orders.place(data),
    onSuccess: () => {
      // The order just emptied the purchased items out of the cart server-side.
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["cartProducts"] });
    },
  });
}

export function useOrders() {
  return useQuery({ queryKey: ["orders"], queryFn: api.orders.list });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => api.orders.get(id!),
    enabled: !!id,
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.orders.cancel(id),
    onSuccess: (data) => {
      queryClient.setQueryData(["orders", data.order._id], data);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
