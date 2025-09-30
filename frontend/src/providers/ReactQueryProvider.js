import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Conditionally load ReactQueryDevtools
let ReactQueryDevtools = null;
if (process.env.NODE_ENV === 'development') {
  import('@tanstack/react-query-devtools').then((module) => {
    ReactQueryDevtools = module.ReactQueryDevtools;
  });
}

export const ReactQueryProvider = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && ReactQueryDevtools && (
        <ReactQueryDevtools />
      )}
    </QueryClientProvider>
  );
};

export { queryClient };