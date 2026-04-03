import { apiClient } from "./client";

export interface UserSettings {
  theme: string;
  map_style: string;
  email_notifications: boolean;
  two_factor_enabled: boolean;
  top_nav_config?: string;
}

export interface UserResourceUsage {
  resource_type: string;
  used: number;
}

export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  role: string;
  tier_id: string; // 'free' | 'pro' | 'enterprise'
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  settings: UserSettings;
  resource_usage?: UserResourceUsage[];
  saved_properties?: { property_id: string }[];
}

export const fetchUserSettings = async (): Promise<UserProfile> => {
  const response = await apiClient.get<UserProfile>("/users/me/settings");
  return response.data;
};

export const updateUserSettings = async (key: string, value: unknown) => {
  const response = await apiClient.put("/users/me/settings", { [key]: value });
  return response.data;
};

export const addSavedProperty = async (propertyId: string) => {
  const response = await apiClient.post(`/users/me/saved-properties/${propertyId}`, {});
  return response.data;
};

export const removeSavedProperty = async (propertyId: string) => {
  const response = await apiClient.delete(`/users/me/saved-properties/${propertyId}`);
  return response.data;
};
