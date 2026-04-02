import { apiClient } from "./client";
import { type TopNavRuntimeConfig } from "@/routes";

export const fetchUserSettings = async () => {
  const response = await apiClient.get("/users/me/settings");
  return response.data;
};

export const updateUserSettings = async (key: string, value: unknown) => {
  const response = await apiClient.put("/users/me/settings", { [key]: value });
  return response.data;
};
