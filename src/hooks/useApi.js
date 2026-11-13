import { useCallback, useEffect, useRef, useState } from 'react';
import { get } from '../api/client.js';

/** GET a path (skip when null). Re-fetches when path/query change or reload() is called. */
export function useApi(path, query) {
  const [state, setState] = useState({ data: null, loading: !!path, error: null });
  const key = path ? path + JSON.stringify(query || {}) : null;
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!path) { setState({ data: null, loading: false, error: null }); return; }
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await get(path, query);
      if (id === seq.current) setState({ data, loading: false, error: null });
    } catch (error) {
      if (id === seq.current) setState({ data: null, loading: false, error });
    }
  }, [key]);

  // Fetch-on-change is the purpose of this hook; the state update happens after the request resolves.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

export function useForm(initial) {
  const [values, setValues] = useState(initial);
  const set = (name, value) => setValues((v) => ({ ...v, [name]: value }));
  const bind = (name) => ({ value: values[name] ?? '', onChange: (e) => set(name, e.target.type === 'checkbox' ? e.target.checked : e.target.value) });
  return { values, set, setValues, bind, reset: () => setValues(initial) };
}
