import { useEffect, useRef, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { get } from '../api/client.js';

/**
 * GET a path (skip when null), kept in the app's one shared cache.
 * - Coming back to a screen shows what was fetched before at once; it is asked for again quietly in the background once it is older than `staleTime` (a minute unless the screen says otherwise).
 * - When the query changes (a filter, another date) the previous answer stays in `data` while the new one loads; `stale` is true meanwhile when the change is more than a search or page (another date, class, tab), and `Async` then shows the loading shape instead of the old answer, for a screen whose layout depends on the query and must not draw the old answer in the new shape.
 * - With no connection the request is still tried, so the screen can say so (the cache would otherwise wait silently). Network failures are already retried by the api client, so the cache does not retry again.
 * - Anything the person saves refreshes the cache (see api/query.ts). `reload()` asks again now, for what is on screen.
 */
/** What a screen is showing, ignoring typing in a search box and paging: the old answer is a fair stand-in for those, but not for another date, class or tab. */
function screenKey([path, query]) {
  const { q, page, limit, ...rest } = query || {}; // eslint-disable-line no-unused-vars
  return JSON.stringify([path, rest]);
}

export function useApi(path, query, options = {}) {
  const qc = useQueryClient();
  const key = [path, query ?? {}];
  const q = useQuery({ queryKey: key, queryFn: () => get(path, query), enabled: !!path, retry: false, placeholderData: keepPreviousData, ...options });
  const keyText = JSON.stringify(key);
  const latest = useRef(key); // reload() always asks for what is on screen now, even when it was called from a form opened earlier
  useEffect(() => { latest.current = JSON.parse(keyText); }, [keyText]);
  const [reload] = useState(() => () => qc.refetchQueries({ queryKey: latest.current, exact: true }).then(() => undefined));
  const [settled, setSettled] = useState(null); // the question the on-screen answer was actually given for
  const asked = screenKey(key);
  if (q.data !== undefined && !q.isPlaceholderData && settled !== asked) setSettled(asked);
  const stale = q.isPlaceholderData && settled !== asked;
  return { data: q.data ?? null, loading: !!path && q.isFetching, error: q.error ?? null, stale, reload };
}

export function useForm(initial) {
  const [values, setValues] = useState(initial);
  const set = (name, value) => setValues((v) => ({ ...v, [name]: value }));
  const bind = (name) => ({ value: values[name] ?? '', onChange: (e) => set(name, e.target.type === 'checkbox' ? e.target.checked : e.target.value) });
  return { values, set, setValues, bind, reset: () => setValues(initial) };
}
