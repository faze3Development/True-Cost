import axios from "axios";
import { env } from "@/lib/env";
import { auth } from "@/lib/firebase";
import { allowMockToken, normalizeApiPath, requiresAuthForPath } from "@/security";

// Standardizing the base API client
export const apiClient = axios.create({
  baseURL: env.API_URL,
  timeout: 15000, // 15-second timeout for requests
});

// Configure a request interceptor for auth
apiClient.interceptors.request.use(async (config) => {
  const path = normalizeApiPath(config.url);
  const mustAuthenticate = requiresAuthForPath(path);

  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      console.error("Error fetching Firebase token", error);
      if (mustAuthenticate) {
        throw new APIError("Authentication required for this endpoint", 401, error);
      }
    }
    return config;
  }

  const mockToken = typeof window !== "undefined" ? localStorage.getItem("MOCK_TOKEN") : null;
  if (mockToken && allowMockToken()) {
    config.headers.Authorization = `Bearer ${mockToken}`;
    return config;
  }

  if (mustAuthenticate) {
    throw new APIError("Authentication required for this endpoint", 401, {
      code: "AUTH_REQUIRED",
      path,
    });
  }

  return config;
});

// Standardized APIError matching our backend conventions
export class APIError extends Error {
  status: number;
  originalError: any;
  
  constructor(message: string, status: number, originalError: any) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.originalError = originalError;
  }
}

// Configure a response interceptor for unified error formatting
apiClient.interceptors.response.use(
  (response) => {
    // Optionally log successful requests in development if needed
    return response;
  },
  (error) => {
    // Standardize error message for frontend consumption
    let errorMessage = "An unexpected error occurred.";
    let errorStatus = 500;
    
    if (error.response) {
      // Server responded with a status outside the 2xx range
      errorStatus = error.response.status;
      if (error.response.data && typeof error.response.data === "object" && "error" in error.response.data) {
        errorMessage = error.response.data.error;
      } else if (error.response.data && typeof error.response.data === "string") {
        errorMessage = error.response.data;
      } else {
        errorMessage = `HTTP Error ${errorStatus}: ${error.response.statusText}`;
      }
    } else if (error.request) {
      // Request was made but no response received
      errorMessage = "Network error: Unable to reach the server. Please check your connection.";
      errorStatus = 0;
    } else {
      // Something happened in setting up the request
      errorMessage = error.message;
    }

    console.error(`[API] Request failed (${errorStatus}): ${errorMessage}`, error.config?.url);
    
    // Throw a standardized class instance
    return Promise.reject(new APIError(errorMessage, errorStatus, error));
  }
);
