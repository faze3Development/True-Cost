import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCheckoutSession, createCustomerPortalSession } from "@/api/stripe";
import { USER_KEYS } from "./useUser";

export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: ({
      tierId,
      priceId,
      successUrl,
      cancelUrl,
    }: {
      tierId: string;
      priceId: string;
      successUrl: string;
      cancelUrl: string;
    }) => createCheckoutSession(tierId, priceId, successUrl, cancelUrl),
  });
}

export function useCreateCustomerPortalSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (returnUrl: string) => createCustomerPortalSession(returnUrl),
    onSuccess: () => {
      // Invalidate the user data just in case the subscription was updated or modified
      queryClient.invalidateQueries({ queryKey: USER_KEYS.all });
    },
  });
}
