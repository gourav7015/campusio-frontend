import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/** The app's shared cache, fresh for each test so one test's answers never reach the next. */
export const Q = ({ children }) => {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};
