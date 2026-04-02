"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";

interface QueryProviderProps {
  children: ReactNode;
}

// Ensures a single QueryClient instance per client session
export function QueryProvider({ children }: QueryProviderProps) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 1, // 1 minute
        gcTime: 1000 * 60 * 5, // 5 minutes
        retry: (failureCount, error: any) => {
          // Do not retry on 401 Unauthorized or 404 Not Found
          if (error?.response?.status === 401 || error?.response?.status === 404) {
            return false;
          }
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
        refetchOnWindowFocus: false, // Prevent redundant fetches on focus
        refetchOnReconnect: "always",
        refetchOnMount: true,
      },
      mutations: {
        retry: false, // Idempotency - avoid retrying mutations implicitly
      }
    }
  }));

  return (
    <QueryClientProvider client={client}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
