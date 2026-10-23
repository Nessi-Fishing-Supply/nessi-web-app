'use client';

import { isServer, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { handleContextRevocation } from '@/features/context/utils/handle-context-revocation';
import { FetchError } from '@/libs/fetch-error';

function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (error instanceof FetchError && error.status === 403) {
          handleContextRevocation();
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export { QueryClientProvider };
