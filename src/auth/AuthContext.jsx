import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, get, post, session } from '../api/client.js';
import { queryClient } from '../api/query';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, school: null, loading: !!session.token });
  const [acting, setActingState] = useState(session.acting);

  const signOutLocal = useCallback(() => {
    session.token = null; session.acting = null; setActingState(null);
    queryClient.clear(); // cached answers belong to the person who left; never show them to the next one
    setState({ user: null, school: null, loading: false });
  }, []);

  useEffect(() => { session.onUnauthorized = signOutLocal; }, [signOutLocal]);

  useEffect(() => {
    if (!session.token) return;
    get('/api/auth/me').then((r) => setState({ user: r.user, school: r.school, loading: false })).catch(signOutLocal);
  }, [signOutLocal]);

  const finish = (r, keep) => {
    session.keep = keep; session.token = r.token; session.acting = null; setActingState(null);
    queryClient.clear();
    setState({ user: r.user, school: r.school, loading: false });
    return r.user;
  };

  const value = useMemo(() => ({
    ...state, acting,
    /** Returns the signed-in user, or `{ twoFactor: challenge, sentTo }` when the person must now type the code just emailed to them. */
    async login(loginId, password, portal, keep = false) {
      const r = await api('/api/auth/login', { method: 'POST', body: { loginId, password, portal } });
      if (r.twoFactorRequired) return { twoFactor: r.challenge, sentTo: r.sentTo };
      return finish(r, keep);
    },
    async loginWithCode(challenge, code, keep = false) { return finish(await api('/api/auth/login/2fa', { method: 'POST', body: { challenge, code } }), keep); },
    async logout() { try { await post('/api/auth/logout'); } catch { /* already expired */ } signOutLocal(); },
    markPasswordChanged() { setState((s) => ({ ...s, user: { ...s.user, mustChangePassword: false } })); },
    setActing(s) { session.acting = s; queryClient.clear(); setActingState(s); }, // another school: nothing cached may carry over
    refresh: () => get('/api/auth/me').then((r) => setState({ user: r.user, school: r.school, loading: false })),
  }), [state, acting, signOutLocal]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
