import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  login as apiLogin,
  clearSession,
  getSession,
  type AdminSession,
} from '../lib/auth';

interface AuthContextValue {
  session: AdminSession | null;
  isAuthenticated: boolean;
  /** Throws AuthError (with a user-safe message) on failure. */
  login: (email: string, password: string, turnstileToken?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Hydrate synchronously from storage so a refresh on /admin doesn't flash the login.
  const [session, setSession] = useState<AdminSession | null>(() => getSession());

  const login = useCallback(async (email: string, password: string, turnstileToken?: string) => {
    const next = await apiLogin(email, password, turnstileToken);
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, isAuthenticated: Boolean(session), login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
