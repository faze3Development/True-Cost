import axios from "axios";
import { env } from "@/lib/env";

// Standardizing the base API client
export const apiClient = axios.create({
  baseURL: env.API_URL,
});

import { auth } from "@/lib/firebase";

// Configure a request interceptor for auth
apiClient.interceptors.request.use(async (config) => {
  // If we have a firebase user, attach their token
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      console.error("Error fetching Firebase token", error);
    }
  } else {
    // Fallback for local development if mock auth is still needed, 
    // or just pass without token until the user logs in.
    const mockToken = typeof window !== "undefined" ? localStorage.getItem("MOCK_TOKEN") : null;
    if (mockToken) {
       config.headers.Authorization = `Bearer ${mockToken}`;
    }
  }
  return config;
});
