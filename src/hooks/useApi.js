import { useEffect, useRef, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { get } from '../api/client.js';

/**
 * GET a path (skip when null), kept in the app's one shared cache.
 * - Coming back to a screen shows what was fetched before at once; it is asked for again quietly in the background once it is older than `staleTime` (a minute unless the screen says otherwise).
 * - When the query changes (a filter, another date) the previous answer stays on screen while the new one loads, as before; `stale` is true meanwhile, for a screen whose layout depends on the query and must not draw the old answer in the new shape.
 * - With no connection the request is still tried, so the screen can say so (the cache would otherwise wait silently). Network failures are already retried by the api client, so the cache does not retry again.
 * - Anything the person saves refreshes the cache (see api/query.ts). `reload()` asks again now, for what is on screen.
 */
export function useApi(path, query, options = {}) {
  const qc = useQueryClient();
  const key = [path, query ?? {}];
  const q = useQuery({ queryKey: key, queryFn: () => get(path, query), enabled: !!path, retry: false, placeholderData: keepPreviousData, ...options });
  const keyText = JSON.stringify(key);
  const latest = useRef(key); // reload() always asks for what is on screen now, even when it was called from a form opened earlier
  useEffect(() => { latest.current = JSON.parse(keyText); }, [keyText]);
  const [reload] = useState(() => () => qc.refetchQueries({ queryKey: latest.current, exact: true }).then(() => undefined));
  return { data: q.data ?? null, loading: !!path && q.isFetching, error: q.error ?? null, stale: q.isPlaceholderData, reload };
}

export function useForm(initial) {
  const [values, setValues] = useState(initial);
  const set = (name, value) => setValues((v) => ({ ...v, [name]: value }));
  const bind = (name) => ({ value: values[name] ?? '', onChange: (e) => set(name, e.target.type === 'checkbox' ? e.target.checked : e.target.value) });
  return { values, set, setValues, bind, reset: () => setValues(initial) };
}
