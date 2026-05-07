import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('nst_token') || '');
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('nst_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });

  const setAuth = (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem('nst_token', nextToken);
    localStorage.setItem('nst_user', JSON.stringify(nextUser));
  };

  const logout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('nst_token');
    localStorage.removeItem('nst_user');
  };

  useEffect(() => {
    const syncFromStorage = (event) => {
      if (event.key && event.key !== 'nst_token' && event.key !== 'nst_user') return;
      const nextToken = localStorage.getItem('nst_token') || '';
      const rawUser = localStorage.getItem('nst_user');
      let nextUser = null;
      if (rawUser) {
        try {
          nextUser = JSON.parse(rawUser);
        } catch {
          nextUser = null;
        }
      }
      setToken(nextToken);
      setUser(nextUser);
    };

    window.addEventListener('storage', syncFromStorage);
    return () => window.removeEventListener('storage', syncFromStorage);
  }, []);

  const value = useMemo(
    () => ({ token, user, setAuth, logout, isAuthenticated: Boolean(token) }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
