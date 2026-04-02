import { apiClient } from "./client";
import { type TopNavRuntimeConfig } from "@/routes";

export const fetchAdminTopNavConfig = async () => {
  const response = await apiClient.get("/admin/top-nav-config");
  return response.data;
};

export const updateAdminTopNavConfig = async (config: TopNavRuntimeConfig) => {
  const response = await apiClient.put("/admin/top-nav-config", config);
  return response.data;
};
