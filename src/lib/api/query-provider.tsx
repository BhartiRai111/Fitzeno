"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "./types";

/**
 * One QueryClient per browser tab (created lazily inside component state,
 * not at module scope) — the standard Next.js App Router pattern, so a
 * server-rendered request can never leak cached data across users. React
 * Query is the one new dependency this integration phase adds: this app
 * now has dozens of list/detail/mutation endpoints that all need the same
 * loading/error/cache/invalidation handling, which is exactly what it's
 * for — hand-rolling that per-hook would just be a worse, unmaintained
 * version of the same thing.
 */
function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // A 401 is handled by the API client's own refresh-and-retry —
        // by the time it reaches React Query as an error, retrying the
        // query again won't help. A 403/404 is a real, stable answer,
        // not a transient failure. Only genuinely transient failures
        // (network errors, 5xx) are worth an automatic retry.
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status < 500) return false;
          return failureCount < 2;
        },
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(createQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
