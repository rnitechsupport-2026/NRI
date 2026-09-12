import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { TOKEN_KEY } from '../api/client.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Restore the session on first paint.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setReady(true); return; }
    api.get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setReady(true));
  }, []);

  const persist = useCallback((token, nextUser) => {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(nextUser);
  }, []);

  const login = useCallback(async (payload) => {
    const { data } = await api.post('/auth/login', payload);
    persist(data.token, data.user);
    return data.user;
  }, [persist]);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    persist(data.token, data.user);
    return data.user;
  }, [persist]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const { data } = await api.put('/auth/profile', payload);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(() => ({
    user, ready, login, register, logout, updateProfile, setUser,
    isAuthed: !!user,
    /** owner / agent / builder can post properties; builder also posts projects. */
    canPostProperty: !!user && ['owner', 'agent', 'builder', 'admin'].includes(user.role) && user.approvalStatus !== 'pending',
    canPostProject: !!user && ['builder', 'admin'].includes(user.role) && user.approvalStatus !== 'pending',
    canPostService: !!user && ['service', 'admin'].includes(user.role) && user.approvalStatus !== 'pending',
    isAdmin: !!user && user.role === 'admin',
    isEmployee: !!user && user.role === 'employee',
    isPending: !!user && user.approvalStatus === 'pending',
    managedPortals: (user && user.managedPortals) || [],
  }), [user, ready, login, register, logout, updateProfile]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
