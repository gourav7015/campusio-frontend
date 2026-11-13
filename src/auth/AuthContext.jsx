import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, get, post, session } from '../api/client.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, school: null, loading: !!session.token });
  const [acting, setActingState] = useState(session.acting);

  const signOutLocal = useCallback(() => {
    session.token = null; session.acting = null; setActingState(null);
    setState({ user: null, school: null, loading: false });
  }, []);

  useEffect(() => { session.onUnauthorized = signOutLocal; }, [signOutLocal]);

  useEffect(() => {
    if (!session.token) return;
    get('/api/auth/me').then((r) => setState({ user: r.user, school: r.school, loading: false })).catch(signOutLocal);
  }, [signOutLocal]);

  const value = useMemo(() => ({
    ...state, acting,
    async login(loginId, password, portal) {
      const r = await api('/api/auth/login', { method: 'POST', body: { loginId, password, portal } });
      session.token = r.token; session.acting = null; setActingState(null);
      setState({ user: r.user, school: r.school, loading: false });
      return r.user;
    },
    async logout() { try { await post('/api/auth/logout'); } catch { /* already expired */ } signOutLocal(); },
    markPasswordChanged() { setState((s) => ({ ...s, user: { ...s.user, mustChangePassword: false } })); },
    setActing(s) { session.acting = s; setActingState(s); },
    refresh: () => get('/api/auth/me').then((r) => setState({ user: r.user, school: r.school, loading: false })),
  }), [state, acting, signOutLocal]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
