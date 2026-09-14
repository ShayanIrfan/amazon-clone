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

/** Which payment UI checkout should render: Stripe Payment Element or the offline mock form. */
export function usePaymentsConfig() {
  return useQuery({ queryKey: ["paymentsConfig"], queryFn: api.payments.config, staleTime: Infinity });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { addressId: string; deliverySpeed: DeliverySpeed; card?: CardInput }) => api.orders.place(data),
    onSuccess: () => {
      // The mock provider empties purchased items out of the cart server-side right away.
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["cartProducts"] });
    },
  });
}

/** After Stripe.js confirms a payment: settles the order server-side (stock, cart, status). */
export function useConfirmPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => api.orders.confirmPayment(orderId),
    onSuccess: (data) => {
      queryClient.setQueryData(["orders", data.order._id], { order: data.order });
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
    // A payment still settling (e.g. "processing") is finalized by the Stripe
    // webhook; poll so the page flips to "paid" without a manual refresh.
    refetchInterval: (query) => (query.state.data?.order.status === "pending_payment" ? 3000 : false),
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
