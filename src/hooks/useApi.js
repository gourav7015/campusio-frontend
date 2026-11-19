import { useCallback, useEffect, useRef, useState } from 'react';
import { get } from '../api/client.js';

/** GET a path (skip when null). Re-fetches when path/query change or reload() is called. */
export function useApi(path, query) {
  const [state, setState] = useState({ data: null, loading: !!path, error: null });
  const key = path ? path + JSON.stringify(query || {}) : null;
  const seq = useRef(0);
  const latest = useRef({ path, query }); // reload() always asks for what is on screen now, even when it was called from a form opened earlier

  const load = useCallback(async () => {
    const { path, query } = latest.current;
    if (!path) { setState({ data: null, loading: false, error: null }); return; }
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await get(path, query);
      if (id === seq.current) setState({ data, loading: false, error: null });
    } catch (error) {
      if (id === seq.current) setState({ data: null, loading: false, error });
    }
  }, []);

  // Fetch-on-change is the purpose of this hook; the state update happens after the request resolves.
  useEffect(() => { latest.current = { path, query }; load(); }, [key, load]);
  return { ...state, reload: load };
}

export function useForm(initial) {
  const [values, setValues] = useState(initial);
  const set = (name, value) => setValues((v) => ({ ...v, [name]: value }));
  const bind = (name) => ({ value: values[name] ?? '', onChange: (e) => set(name, e.target.type === 'checkbox' ? e.target.checked : e.target.value) });
  return { values, set, setValues, bind, reset: () => setValues(initial) };
}
