import { QueryClient, useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { api as rawApi, get } from './client.js';

type ApiFn = (path: string, o?: { method?: string; body?: unknown; query?: Record<string, unknown>; form?: FormData }) => Promise<unknown>;
const api = rawApi as unknown as ApiFn;

/** One cache for the whole app. Data is fresh for 30 seconds; failed reads retry once, never a 4xx. */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: (n, e) => { const status = (e as unknown as { status?: number }).status; return n < 1 && !(status && status < 500); } } },
});

// a change made anywhere refreshes what dashboards and lists have cached (client.js announces it)
if (typeof window !== 'undefined') window.addEventListener('atk:changed', () => { void queryClient.invalidateQueries(); });

export type Params = Record<string, string | number | boolean | undefined | null>;

/** Typed GET. `path` null skips the request. */
export function useGet<T>(path: string | null, params?: Params, options?: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn' | 'enabled'>) {
  return useQuery<T, Error>({ queryKey: [path, params ?? {}], queryFn: () => get(path as string, params) as Promise<T>, enabled: !!path, ...options });
}

/** Typed write that refreshes the listed cache prefixes on success. */
export function useWrite<TBody = unknown, TRes = unknown>(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string | ((b: TBody) => string), invalidate: string[] = []) {
  const qc = useQueryClient();
  return useMutation<TRes, Error, TBody>({
    mutationFn: (body) => api(typeof path === 'function' ? path(body) : path, { method, body: method === 'DELETE' ? undefined : body }) as Promise<TRes>,
    onSuccess: () => Promise.all(invalidate.map((p) => qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === 'string' && (q.queryKey[0] as string).startsWith(p) }))),
  });
}
