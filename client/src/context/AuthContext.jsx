import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthToken } from '../api/client.js';

const AuthContext = createContext(null);
const STORAGE_KEY = 'kisan-connect-auth';

function readStoredAuth() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { user: null, token: null };
  } catch (error) {
    return { user: null, token: null };
  }
}

export function AuthProvider({ children }) {
  const initialAuth = readStoredAuth();
  const [user, setUser] = useState(initialAuth.user);
  const [token, setToken] = useState(initialAuth.token);
  const [authLoading, setAuthLoading] = useState(Boolean(initialAuth.token));

  useEffect(() => {
    setAuthToken(token);

    if (!token) {
      localStorage.removeItem(STORAGE_KEY);
      setAuthLoading(false);
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
  }, [token, user]);

  useEffect(() => {
    let mounted = true;

    async function refreshUser() {
      if (!token) {
        return;
      }

      try {
        const response = await api.get('/auth/me');
        if (mounted) {
          setUser(response.data.user);
        }
      } catch (error) {
        if (mounted) {
          logout();
        }
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    }

    refreshUser();
    return () => {
      mounted = false;
    };
  }, []);

  async function login(payload) {
    const response = await api.post('/auth/login', payload);
    setUser(response.data.user);
    setToken(response.data.token);
    return response.data.user;
  }

  async function register(payload) {
    const response = await api.post('/auth/register', payload);
    setUser(response.data.user);
    setToken(response.data.token);
    return response.data.user;
  }

  function logout() {
    setUser(null);
    setToken(null);
    setAuthToken(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      authLoading,
      login,
      register,
      logout
    }),
    [user, token, authLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
