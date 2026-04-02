import { apiClient } from "./client";

export const createCheckoutSession = async (
  tierId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
) => {
  const response = await apiClient.post("/stripe/checkout", {
    tier_id: tierId,
    price_id: priceId,
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
  return response.data;
};
