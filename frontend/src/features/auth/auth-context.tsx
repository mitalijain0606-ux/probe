import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authService from '@/services/auth.service';
import type { User } from '@/types/api';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('uho_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(!user && !!localStorage.getItem('uho_token'));

  useEffect(() => {
    const token = localStorage.getItem('uho_token');
    if (!token) {
      setIsLoading(false);
      setUser(null);
      localStorage.removeItem('uho_user');
      return;
    }
    authService
      .me()
      .then((freshUser) => {
        setUser(freshUser);
        localStorage.setItem('uho_user', JSON.stringify(freshUser));
      })
      .catch((err: any) => {
        const isAuthError =
          err?.response?.status === 401 ||
          err?.status === 401 ||
          err?.message?.toLowerCase().includes('401') ||
          err?.message?.toLowerCase().includes('unauthorized') ||
          err?.message?.toLowerCase().includes('jwt') ||
          err?.message?.toLowerCase().includes('token') ||
          err?.message?.toLowerCase().includes('invalid');

        if (isAuthError) {
          localStorage.removeItem('uho_token');
          localStorage.removeItem('uho_user');
          setUser(null);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: loggedInUser, token } = await authService.login({ email, password });
    localStorage.setItem('uho_token', token);
    localStorage.setItem('uho_user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { user: registeredUser, token } = await authService.register({ name, email, password });
    localStorage.setItem('uho_token', token);
    localStorage.setItem('uho_user', JSON.stringify(registeredUser));
    setUser(registeredUser);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout().catch(() => undefined);
    localStorage.removeItem('uho_token');
    localStorage.removeItem('uho_user');
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
