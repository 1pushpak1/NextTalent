import { createContext, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('nst_token') || '');
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('nst_user');
    return raw ? JSON.parse(raw) : null;
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
